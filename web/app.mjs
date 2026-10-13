import { finalStates, reviewStates, blocksSubmission, statusLabel, statusMessage, progressStage, prepareImage, safeResultUrl, durationText } from './workspace.mjs';

const $ = selector => document.querySelector(selector);
const form = $('#try-on'), submit = $('#submit'), status = $('#status');
const base = new URL('./', location.href), storageKey = 'velox-demo-pending-request';
const trays = { personal: [], product: [] }, selected = { personal: null, product: null };
const previews = new Map(), records = new Map();
let pending, configured = false, historyVerified = false, posting = false, preparing = false, pollTimer, polling = false;
const inputErrors = { personal: [], product: [] };
let reviewId = null, reviewTab = 'result', resultUrl = null, resultError = '', reviewSequence = 0;
let downloading = false;
try { pending = sessionStorage.getItem(storageKey); } catch { /* History remains the recovery source. */ }

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
async function request(path, options) {
  const response = await fetch(new URL(path.replace(/^\//, ''), base), { ...options, signal: AbortSignal.timeout(120000), credentials: 'same-origin' });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'Request could not be confirmed.'), { notAccepted: data.notAccepted === true });
  return data;
}
function remember(id) {
  pending = id;
  // Never clear an uncertain reference because browser storage is unavailable.
  try { if (id) sessionStorage.setItem(storageKey, id); else sessionStorage.removeItem(storageKey); } catch { /* Read-only history recovers it after reload. */ }
}
function controls() {
  submit.disabled = preparing || !configured || !historyVerified || posting || Boolean(pending) || !selected.personal || !selected.product;
  submit.textContent = preparing ? 'Preparing your images…' : pending || posting ? 'Request in progress' : 'Create my DressMe look ↗';
  $('#selection-hint').textContent = preparing ? 'Resizing locally in your browser. Your original files are unchanged.' : pending ? 'Finish or resolve the existing request before starting another.' : !configured ? 'You can explore the trays. Generation is not enabled.' : !historyVerified ? 'Confirming your existing requests before allowing a new one.' : !selected.personal || !selected.product ? 'Select one photo and one product to get started.' : 'One pair selected. A new generation starts only when you submit.';
  for (const role of ['personal', 'product']) {
    $('#' + role + '-files').disabled = preparing || posting;
    const holder = $('#selected-' + role); holder.replaceChildren();
    if (selected[role]) {
      const img = node('img'); img.src = selected[role].url; img.alt = selected[role].file.name;
      holder.append(img);
    } else holder.textContent = role === 'personal' ? 'Choose a photo above' : 'Choose a product above';
  }
}
function feedback(element, message, kind = 'info') {
  element.dataset.state = kind;
  element.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  element.textContent = message;
}
function showInputErrors(focus = false) {
  const panel = $('#input-errors'), messages = Object.values(inputErrors).flat();
  panel.replaceChildren(); panel.hidden = !messages.length;
  if (!messages.length) return;
  panel.append(node('strong', '', 'Some images could not be added.'));
  const list = node('ul'); for (const message of messages) list.append(node('li', '', message)); panel.append(list);
  panel.append(node('p', '', 'Nothing has been uploaded. Any images already in your trays are still available.'));
  if (focus) { panel.focus(); panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
}
function display(state) {
  records.set(state.id, { ...records.get(state.id), ...state });
  feedback(status, statusMessage(state), state.status === 'failed' || reviewStates.has(state.status) ? 'error' : 'info');
  $('#receipt').textContent = 'Your request reference: ' + state.id;
  $('#check-request').hidden = !pending;
  for (const step of document.querySelectorAll('[data-stage]')) {
    const current = Number(step.dataset.stage) === progressStage(state.status);
    step.classList.toggle('complete', Number(step.dataset.stage) < progressStage(state.status));
    if (current) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current');
  }
  renderHistory();
}
function gallery(role) {
  const list = $('#' + role + '-library'); list.replaceChildren();
  if (!trays[role].length) {
    list.append(node('p', 'empty-library', role === 'personal' ? 'Add a shopper photo to preview it here.' : 'Add product images to start your collection.'));
  }
  for (const item of trays[role]) {
    const card = node('article', 'image-card');
    card.dataset.selected = String(selected[role] === item);
    const choose = node('button', 'image-choice'); choose.type = 'button';
    choose.setAttribute('aria-label', 'Select ' + item.file.name);
    choose.setAttribute('aria-pressed', String(selected[role] === item));
    const img = node('img'); img.src = item.url; img.alt = item.file.name;
    choose.append(img, node('span', 'image-name', item.file.name), node('span', 'image-selection', selected[role] === item ? 'Selected ✓' : 'Select image'));
    choose.addEventListener('click', () => { selected[role] = item; form.elements.consent.checked = false; gallery(role); controls(); if (!reviewId) renderReview(); });
    const remove = node('button', 'remove-preview', 'Remove from tray'); remove.type = 'button';
    remove.setAttribute('aria-label', 'Remove ' + item.file.name + ' from local tray');
    remove.addEventListener('click', () => {
      trays[role] = trays[role].filter(candidate => candidate !== item);
      if (selected[role] === item) selected[role] = trays[role][0] || null;
      // Submitted input previews own separate object URLs and remain reviewable.
      URL.revokeObjectURL(item.url);
      form.elements.consent.checked = false; gallery(role); controls(); if (!reviewId) renderReview();
    });
    card.append(choose, remove); list.append(card);
  }
}
for (const role of ['personal', 'product']) {
  const input = $('#' + role + '-files');
  input.addEventListener('change', async () => {
    if (preparing || posting) return;
    const files = [...input.files]; input.value = '';
    if (!files.length) return;
    preparing = true; controls();
    const messages = [], prepared = []; let added = 0;
    inputErrors[role] = []; showInputErrors();
    input.setAttribute('aria-busy', 'true');
    try {
      for (const file of files) {
        let url;
        try {
          if (trays[role].length >= 8) throw new Error('The tray holds 8 images. Remove a local preview before adding more.');
          feedback($('#' + role + '-status'), 'Preparing ' + file.name + '… Resizing locally; nothing is uploaded.', 'busy');
          const result = await prepareImage(file);
          url = URL.createObjectURL(result.file);
          const item = { file: result.file, url }; trays[role].push(item); selected[role] = item; added++;
          prepared.push(file.name + ': ' + (result.resized ? 'automatically resized to ' : 'ready at ') + result.width + ' × ' + result.height + '.');
        } catch (error) { if (url) URL.revokeObjectURL(url); messages.push(file.name + ': ' + error.message); }
      }
    } finally {
      preparing = false; input.removeAttribute('aria-busy'); form.elements.consent.checked = false;
      inputErrors[role] = messages;
      feedback($('#' + role + '-status'), [added ? added + ' image(s) ready. Your originals are unchanged. Nothing uploaded.' : '', ...prepared, ...messages].filter(Boolean).join(' '), messages.length ? 'error' : 'success');
      gallery(role); controls(); if (!reviewId) renderReview(); showInputErrors(messages.length > 0);
    }
  });
}
function media(url, label) {
  const figure = node('figure', 'review-image');
  if (url) {
    const img = node('img'); img.alt = label; img.referrerPolicy = 'no-referrer'; img.src = url;
    img.addEventListener('error', () => { figure.replaceChildren(node('p', 'small', 'This image is unavailable or expired. No request was resubmitted.')); });
    figure.append(img);
  } else figure.append(node('p', 'small', label + ' preview unavailable. Local inputs disappear when this page reloads.'));
  figure.append(node('figcaption', '', label)); return figure;
}
function renderReview() {
  const stage = $('#result'), state = records.get(reviewId), pair = reviewId ? previews.get(reviewId) : selected;
  const shopper = pair?.personal?.url, product = pair?.product?.url;
  stage.replaceChildren(); stage.classList.toggle('comparison', reviewTab === 'compare');
  $('#review-state').textContent = state ? statusLabel(state) : 'Ready when you are';
  for (const button of document.querySelectorAll('[data-review]')) button.setAttribute('aria-pressed', String(button.dataset.review === reviewTab));
  const open = $('#open-result'); open.hidden = !resultUrl;
  $('#request-duration').textContent = durationText(state);
  $('#download-request').hidden = state?.status !== 'succeeded';
  $('#download-request').disabled = downloading;
  if (resultUrl) open.href = resultUrl; else open.removeAttribute('href');
  if (reviewTab === 'personal') stage.append(media(shopper, 'Shopper input'));
  else if (reviewTab === 'product') stage.append(media(product, 'Product input'));
  else if (reviewTab === 'compare' && resultUrl) stage.append(media(shopper, 'Original shopper'), media(resultUrl, 'DressMe preview'));
  else if (resultUrl) stage.append(media(resultUrl, 'DressMe AI outfit preview'));
  else {
    const empty = node('div', 'result-empty');
    empty.append(node('span', '', '✦'), node('h3', '', state ? statusLabel(state) : 'A new look, made for you.'), node('p', '', resultError || (state ? statusMessage(state) : 'Select your images and create a DressMe look. Review the inputs and compare them with the finished preview here.')));
    stage.append(empty);
  }
  $('#review-details').textContent = reviewId ? 'Reviewing request ' + reviewId + '. ' + (pair ? 'These are the inputs captured when this request was sent.' : 'Original inputs are no longer in this page’s memory.') : 'Input previews stay in this page’s memory and disappear on reload. Nothing is uploaded until you submit.';
}
async function review(id, { resetTab = true } = {}) {
  const sequence = ++reviewSequence; reviewId = id; resultUrl = null; resultError = '';
  if (resetTab) reviewTab = 'result';
  renderReview(); renderHistory();
  if (records.get(id)?.status !== 'succeeded') return;
  try {
    const result = await request('/api/requests/' + encodeURIComponent(id) + '/result');
    if (sequence !== reviewSequence) return;
    resultUrl = safeResultUrl(result.url);
  } catch (error) {
    if (sequence !== reviewSequence) return;
    resultError = 'The generation completed, but its result is unavailable or expired. No generation was resubmitted.';
  }
  if (sequence === reviewSequence) renderReview();
}
for (const button of document.querySelectorAll('[data-review]')) button.addEventListener('click', () => { reviewTab = button.dataset.review; renderReview(); });
function renderHistory() {
  const list = $('#history'); list.replaceChildren();
  $('#download-all').disabled = downloading || ![...records.values()].some(r => r.status === 'succeeded');
  const sorted = [...records.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 25);
  for (const item of sorted) {
    const row = node('article', 'history-row'); row.dataset.selected = String(reviewId === item.id);
    const info = node('div'), badge = node('span', 'pill', statusLabel(item));
    badge.dataset.status = item.status;
    info.append(badge, node('p', 'small', item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Current request'), node('code', '', item.id));
    info.append(node('p', 'small', durationText(item)));
    const open = node('button', 'quiet', item.status === 'succeeded' ? 'Review result' : 'Review request'); open.type = 'button';
    open.addEventListener('click', () => { void review(item.id); });
    row.append(info, open); list.append(row);
  }
}
async function downloadAssets(id) {
  if (downloading) return;
  downloading = true; renderHistory(); $('#download-request').disabled = true;
  feedback($('#download-status'), 'Preparing your private asset ZIP…');
  try {
    const path = 'api/requests/' + (id ? encodeURIComponent(id) + '/' : '') + 'download.zip';
    const response = await fetch(new URL(path, base), { credentials: 'same-origin', signal: AbortSignal.timeout(120000) });
    if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'ZIP download failed.'); }
    if (!response.headers.get('content-type')?.startsWith('application/zip')) throw new Error('ZIP download could not be confirmed.');
    const url = URL.createObjectURL(await response.blob()), link = node('a');
    link.href = url; link.download = id ? 'velox-look-' + id + '.zip' : 'velox-demo-assets.zip'; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    feedback($('#download-status'), 'Your asset ZIP is ready. No generation was submitted.');
  } catch (error) { feedback($('#download-status'), error.name === 'TimeoutError' ? 'ZIP preparation timed out. Try downloading one look.' : error.message, 'error'); }
  finally { downloading = false; renderHistory(); $('#download-request').disabled = false; }
}
$('#download-request').addEventListener('click', () => { if (reviewId) void downloadAssets(reviewId); });
$('#download-all').addEventListener('click', () => void downloadAssets());
async function history({ reconcile = true } = {}) {
  const button = $('#refresh-history'); button.disabled = true;
  try {
    const data = await request('/api/requests');
    for (const item of data.requests) records.set(item.id, item);
    historyVerified = true;
    if (reconcile && !pending) {
      const active = data.requests.find(blocksSubmission);
      if (active) remember(active.id);
    }
    $('#history-status').textContent = data.requests.length ? 'Your requests only. Select a row to review its inputs and result.' : 'No requests yet. Your next DressMe request will appear here.';
    renderHistory(); controls();
  } catch {
    // Initial uncertainty must not expose another submission path.
    $('#history-status').textContent = 'Request history could not be confirmed. Refresh history to check; no request has been sent again.';
  } finally { button.disabled = false; }
}
async function poll() {
  clearTimeout(pollTimer);
  if (!pending || polling || posting) return;
  const id = pending; polling = true;
  $('#check-request').disabled = true;
  try {
    const state = await request('/api/requests/' + encodeURIComponent(id)); display(state);
    if (!reviewId || reviewId === id) {
      if (state.status === 'succeeded') await review(id, { resetTab: false });
      else { reviewId = id; renderReview(); }
    }
    if (finalStates.has(state.status)) {
      remember(null); $('#check-request').hidden = true;
      await history({ reconcile: false });
    } else if (!reviewStates.has(state.status)) pollTimer = setTimeout(poll, 3000);
  } catch {
    feedback(status, 'The request status could not be confirmed. Keep your reference and use “Check this request”. Do not submit again.', 'error');
    $('#receipt').textContent = 'Your request reference: ' + id;
    $('#check-request').hidden = false;
  } finally { polling = false; $('#check-request').disabled = false; controls(); }
}
$('#check-request').addEventListener('click', poll);
$('#refresh-history').addEventListener('click', async () => { await history(); if (pending) await poll(); });
function encoded(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onerror = () => reject(new Error('Image could not be read. Nothing has been submitted.'));
    reader.onload = () => resolve({ type: file.type, base64: reader.result.split(',')[1] });
    reader.readAsDataURL(file);
  });
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (preparing || pending || posting || !configured || !historyVerified || !selected.personal || !selected.product || !form.reportValidity()) return;
  posting = true; controls();
  const pair = { personal: selected.personal, product: selected.product };
  let id;
  try {
    const product = await encoded(pair.product.file), personal = await encoded(pair.personal.file);
    id = crypto.randomUUID(); remember(id);
    previews.set(id, { personal: { url: URL.createObjectURL(pair.personal.file) }, product: { url: URL.createObjectURL(pair.product.file) } });
    // Keep memory bounded without changing server data or request receipts.
    if (previews.size > 25) {
      const first = previews.keys().next().value, removed = previews.get(first);
      URL.revokeObjectURL(removed.personal.url); URL.revokeObjectURL(removed.product.url); previews.delete(first);
    }
    reviewSequence++; reviewId = id; reviewTab = 'result'; resultUrl = null; resultError = '';
    display({ id, status: 'uploading', createdAt: Date.now() }); renderReview();
    const state = await request('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, product, personal, consent: true }) });
    display(state); form.elements.consent.checked = false;
  } catch (error) {
    if (error.notAccepted) {
      remember(null); records.delete(id);
      const pair = previews.get(id);
      if (pair) { URL.revokeObjectURL(pair.personal.url); URL.revokeObjectURL(pair.product.url); previews.delete(id); }
      reviewSequence++; reviewId = null; resultUrl = null; renderReview(); renderHistory();
      $('#receipt').textContent = ''; $('#check-request').hidden = true;
    }
    feedback(status, pending ? 'Submission could not be confirmed. Keep your reference and check this request before doing anything else. It will not be sent again.' : error.message, 'error');
    if (pending) $('#check-request').hidden = false;
  } finally {
    posting = false; controls();
    // This is only a GET status check, never a retry of the submission.
    if (pending) await poll();
  }
});
try {
  const session = await request('/api/session'); configured = session.configured;
  $('#gap').textContent = session.gapSeconds + ' seconds';
  $('#connection-badge').textContent = configured ? 'Live DressMe integration' : 'Preview only · no generation';
  $('#mode').textContent = configured ? 'Real DressMe integration · one active generation · shared demo allowance. Usage can incur charges for the operator. Quotas and availability still apply.' : 'Preview only — generation is disabled. Explore the workspace locally; no images can be uploaded or generated here.';
  await history(); controls();
  if (pending) await poll();
} catch {
  $('#connection-badge').textContent = 'Connection unavailable';
  $('#mode').textContent = 'Demo unavailable. No new request has been sent.';
  controls();
}
