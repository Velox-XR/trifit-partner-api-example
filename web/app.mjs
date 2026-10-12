const form = document.querySelector('#try-on');
const button = document.querySelector('#submit');
const status = document.querySelector('#status');
const base = new URL('./', location.href);
const storageKey = 'velox-demo-pending-request';
let pending = sessionStorage.getItem(storageKey);
let configured = false;
async function request(path, options) {
  const response = await fetch(new URL(path.replace(/^\//, ''), base), { ...options, signal: AbortSignal.timeout(120000), credentials: 'same-origin' });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'Request could not be confirmed.'), { notAccepted: data.notAccepted === true });
  return data;
}
function display(state) {
  const descriptions = {
    uploading: 'Uploading your inputs. No generation has started yet.',
    queued: `In the shared demo queue · position ${state.position}.`,
    running: 'Your DressMe request has been accepted. Waiting for its result…',
    succeeded: 'Your real DressMe result is ready.',
    failed: 'This generation failed. It will not be retried automatically.',
    upload_failed: 'The upload could not be completed. No generation was submitted. Contact the demo operator before retrying.',
    submitting: 'Confirming the generation submission…',
    needs_review: 'The request needs operator review. It has not been submitted again.'
  };
  status.textContent = descriptions[state.status] || 'Checking your request…';
  if (state.queuePaused && state.status === 'queued') status.textContent += ' The queue is paused for review.';
}
async function poll() {
  if (!pending) return;
  document.querySelector('#receipt').textContent = `Your request reference: ${pending}`;
  try {
    const state = await request(`/api/requests/${pending}`); display(state);
    if (state.status === 'succeeded') {
      const result = await request(`/api/requests/${pending}/result`);
      document.querySelector('#result img').src = result.url;
      document.querySelector('#result').hidden = false;
    }
    if (['succeeded', 'failed'].includes(state.status)) {
      pending = null; sessionStorage.removeItem(storageKey); button.disabled = !configured; button.textContent = 'Join the demo queue ↗'; return;
    }
    if (['needs_review', 'upload_failed'].includes(state.status)) return;
    setTimeout(poll, 3000);
  } catch (error) {
    status.textContent = `${error.message} Keep the request reference and reload to check it. Do not submit again.`;
  }
}
async function file(input) {
  const selected = input.files[0];
  if (!selected || !['image/png', 'image/jpeg', 'image/webp'].includes(selected.type) || selected.size > 5 * 1024 * 1024 || !selected.size) throw new Error('Choose two PNG, JPEG or WebP images of at most 5 MiB each.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Image could not be read.'));
    reader.onload = () => resolve({ type: selected.type, base64: reader.result.split(',')[1] });
    reader.readAsDataURL(selected);
  });
}
form.addEventListener('submit', async event => {
  event.preventDefault(); if (pending || !configured || !form.reportValidity()) return;
  button.disabled = true;
  try {
    const product = await file(form.elements.product); const personal = await file(form.elements.personal);
    pending = crypto.randomUUID(); sessionStorage.setItem(storageKey, pending);
    document.querySelector('#result').hidden = true;
    document.querySelector('#receipt').textContent = `Your request reference: ${pending}`;
    status.textContent = 'Sending your images. Keep this page open…';
    const state = await request('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: pending, product, personal, consent: true }) });
    display(state); form.reset(); await poll();
  } catch (error) {
    if (error.notAccepted) { pending = null; sessionStorage.removeItem(storageKey); document.querySelector('#receipt').textContent = ''; }
    status.textContent = pending ? `${error.message} Keep your request reference; reload to check it before retrying.` : error.message;
    button.disabled = Boolean(pending);
  }
});
try {
  const session = await request('/api/session'); configured = session.configured;
  document.querySelector('#gap').textContent = `${session.gapSeconds} seconds`;
  document.querySelector('#mode').textContent = configured ? 'Real DressMe integration · shared demo queue · one active generation. Usage may incur charges for the operator.' : 'Preview only — generation is disabled. Velox must supply the private demo configuration before this can generate real results.';
  button.disabled = !configured || Boolean(pending);
  if (configured && pending) await poll();
} catch { document.querySelector('#mode').textContent = 'Demo unavailable. No request has been sent.'; }
