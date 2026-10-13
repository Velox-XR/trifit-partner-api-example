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
export function validateImage(file) {
  if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) throw new Error('Choose a PNG, JPEG or WebP image of at most 5 MiB.');
}
export function safeResultUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('The result URL could not be confirmed.');
  return url.href;
}
