// UI-only helpers. No credentials, network calls, submission or retry policy here.
export const finalStates = new Set(['succeeded', 'failed']);
export const reviewStates = new Set(['needs_review', 'upload_failed']);
export const blocksSubmission = state => !finalStates.has(state.status);
export function statusLabel(state) {
  return ({ uploading: 'Uploading', queued: 'Queued', submitting: 'Confirming', running: 'Generating', succeeded: 'Complete', failed: 'Failed', upload_failed: 'Upload needs review', needs_review: 'Needs review' })[state.status] || 'Checking';
}
export function statusMessage(state) {
  return ({
    uploading: 'Uploading your inputs. No generation has started yet.',
    queued: `In the shared demo queue${Number.isInteger(state.position) && state.position > 0 ? ` · position ${state.position}` : ''}.${state.queuePaused ? ' The queue is paused for review.' : ''}`,
    running: 'Your DressMe request has been accepted. Waiting for its result…',
    succeeded: 'Your DressMe generation completed. Open its result to review it.',
    failed: 'This generation failed. It will not be retried automatically.',
    upload_failed: 'The upload could not be completed. No generation was submitted. Contact the demo operator before retrying.',
    submitting: 'Confirming the generation submission. Do not submit it again.',
    needs_review: 'The request needs operator review. It has not been submitted again.'
  })[state.status] || 'Checking your request. Do not submit it again.';
}
export function progressStage(status) {
  return ({ uploading: 0, queued: 1, submitting: 2, running: 2, succeeded: 3 })[status] ?? -1;
}
export function durationText(state, now = Date.now()) {
  const seconds = ms => ms < 1000 ? (ms / 1000).toFixed(2) + 's' : (ms / 1000).toFixed(1) + 's';
  const timing = state?.timing;
  if (!state) return 'Duration appears here after you submit.';
  const parts = [];
  if (Number.isFinite(timing?.totalMs)) parts.push('Total: ' + seconds(timing.totalMs));
  else if (['uploading', 'queued', 'submitting', 'running'].includes(state.status) && Number.isFinite(state.createdAt)) parts.push('Elapsed: ' + seconds(Math.max(0, now - state.createdAt)));
  else parts.push('Duration unavailable for this older request');
  for (const [key, label] of [['uploadMs', 'Upload'], ['queueMs', 'Demo queue'], ['generationMs', 'Submission to completion observed'], ['apiTotalMs', 'API recorded duration']]) if (Number.isFinite(timing?.[key])) parts.push(label + ': ' + seconds(timing[key]));
  if (state.completionSource) parts.push(({ webhook: 'Completion: verified webhook', 'polling-recovery': 'Completion: polling recovery', 'polling-only': 'Completion: polling' })[state.completionSource]);
  else if (state.completionMode === 'webhook-first') parts.push('Waiting for signed webhook');
  return parts.join(' · ');
}
export function validateImage(file) {
  if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) throw new Error('Choose a PNG, JPEG or WebP image of at most 5 MiB.');
}
export const imageLimits = Object.freeze({ sourceBytes: 32 * 1024 * 1024, sourcePixels: 100000000, edge: 2048, uploadBytes: 5 * 1024 * 1024 });

// Inspect dimensions before decoding: a tiny compressed file may describe a huge bitmap.
// No network, metadata retention or writes to the original file.
export function imageDimensions(bytes) {
  const view = new DataView(bytes), size = view.byteLength;
  const byte = n => view.getUint8(n), word = n => view.getUint16(n), ascii = (n, count) => String.fromCharCode(...new Uint8Array(bytes, n, count));
  if (size >= 24 && view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a && ascii(12, 4) === 'IHDR') return { width: view.getUint32(16), height: view.getUint32(20), type: 'image/png' };
  if (size >= 4 && word(0) === 0xffd8) {
    let offset = 2;
    while (offset + 4 <= size && byte(offset) === 0xff) {
      while (offset < size && byte(offset) === 0xff) offset++;
      if (offset >= size) break;
      const marker = byte(offset++);
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || marker >= 0xd0 && marker <= 0xd7) continue;
      if (offset + 2 > size) break;
      const length = word(offset);
      if (length < 2 || offset + length > size) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 8) return { width: word(offset + 5), height: word(offset + 3), type: 'image/jpeg' };
      offset += length;
    }
  }
  if (size >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
    const chunk = ascii(12, 4), uint24 = n => byte(n) | byte(n + 1) << 8 | byte(n + 2) << 16;
    if (chunk === 'VP8X') return { width: 1 + uint24(24), height: 1 + uint24(27), type: 'image/webp' };
    if (chunk === 'VP8 ' && uint24(23) === 0x2a019d) return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff, type: 'image/webp' };
    if (chunk === 'VP8L' && byte(20) === 0x2f) return { width: 1 + (byte(21) | (byte(22) & 0x3f) << 8), height: 1 + (byte(22) >> 6 | byte(23) << 2 | (byte(24) & 0x0f) << 10), type: 'image/webp' };
  }
  throw new Error('This image could not be read. Choose a valid JPEG, PNG or WebP photo.');
}
export function imageSize(width, height, edge = imageLimits.edge) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > imageLimits.sourcePixels) throw new Error('This image exceeds the 100-megapixel safety limit. Choose a smaller photo.');
  const scale = Math.min(1, edge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
function bounded(promise, message, ms = 30000) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); })]).finally(() => clearTimeout(timer));
}
const browserImages = {
  async decode(file) {
    const url = URL.createObjectURL(file), image = new Image(); image.src = url;
    try {
      await bounded(image.decode(), 'Preparing this image took too long. Please choose it again.');
      return { image, width: image.naturalWidth, height: image.naturalHeight, close() { image.src = ''; URL.revokeObjectURL(url); } };
    } catch (error) { image.src = ''; URL.revokeObjectURL(url); throw error; }
  },
  async encode(decoded, width, height, type, quality) {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    try {
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not prepare this photo. Try a different browser.');
      if (type === 'image/jpeg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height); }
      context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
      // Modern browser image decoding applies EXIF orientation before drawing.
      context.drawImage(decoded.image, 0, 0, width, height);
      const blob = await bounded(new Promise(resolve => canvas.toBlob(resolve, type, quality)), 'Your browser could not finish preparing this photo. Please try again.');
      if (!blob?.size) throw new Error('Your browser could not prepare this photo. Please choose another image.');
      return blob;
    } finally { canvas.width = canvas.height = 0; }
  }
};
export async function prepareImage(file, images = browserImages) {
  if (!file?.size) throw new Error('This file is empty. Choose a JPEG, PNG or WebP photo.');
  if (file.size > imageLimits.sourceBytes) throw new Error('This file exceeds the 32 MiB safety limit. Choose a smaller photo.');
  const header = imageDimensions(await bounded(file.arrayBuffer(), 'This file could not be read in time. Please choose it again.'));
  imageSize(header.width, header.height);
  const decoded = await images.decode(file);
  try {
    let { width, height } = imageSize(decoded.width, decoded.height);
    let blob = await images.encode(decoded, width, height, header.type, .9);
    // Lossless PNG can still exceed the API byte cap. Bound work and reduce locally.
    for (let attempt = 0; blob.size > imageLimits.uploadBytes && attempt < 4; attempt++) {
      if (attempt) { width = Math.max(1, Math.floor(width * .8)); height = Math.max(1, Math.floor(height * .8)); }
      blob = await images.encode(decoded, width, height, 'image/jpeg', .85 - attempt * .1);
    }
    validateImage(blob);
    const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[blob.type];
    const prepared = new File([blob], (file.name || 'photo').replace(/\.[^.]*$/, '') + '.' + extension, { type: blob.type });
    return { file: prepared, width, height, resized: decoded.width !== width || decoded.height !== height };
  } finally { decoded.close(); }
}
export function safeResultUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('The result URL could not be confirmed.');
  return url.href;
}
