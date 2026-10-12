const base = new URL('./', location.href);
const message = document.querySelector('#requests-status');
async function read(path) {
  const response = await fetch(new URL(path, base), { credentials: 'same-origin', signal: AbortSignal.timeout(30000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Demo temporarily unavailable.');
  return data;
}
async function refresh() {
  const button = document.querySelector('#refresh'); button.disabled = true;
  try {
    const session = await read('api/session');
    document.querySelector('#mode').textContent = session.configured ? `Real DressMe demo · partner demo · one active generation · minimum ${session.gapSeconds} seconds between starts.` : 'Preview only — SDK downloads work; live generation is not enabled.';
    const { requests } = await read('api/requests');
    const list = document.querySelector('#requests'); list.replaceChildren();
    message.textContent = requests.length ? 'Your most recent requests. Status is read from the saved queue, without submitting again.' : 'No requests in this session yet. Open the demo to try DressMe.';
    for (const item of requests) {
      const row = document.createElement('article'); row.className = 'request-row';
      const content = document.createElement('div');
      const state = document.createElement('strong'); state.textContent = item.status.replaceAll('_', ' ');
      const details = document.createElement('p'); details.textContent = `${new Date(item.createdAt).toLocaleString()} · ${item.id}`;
      content.append(state, details); row.append(content);
      if (item.status === 'succeeded') {
        const show = document.createElement('button'); show.type = 'button'; show.textContent = 'View result';
        show.addEventListener('click', async () => {
          show.disabled = true;
          try { const result = await read(`api/requests/${encodeURIComponent(item.id)}/result`); document.querySelector('#result img').src = result.url; document.querySelector('#result').hidden = false; }
          catch { message.textContent = 'Result unavailable or expired. No generation was resubmitted.'; }
          finally { show.disabled = false; }
        }); row.append(show);
      }
      list.append(row);
    }
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
}
document.querySelector('#refresh').addEventListener('click', refresh);
read('api/sdk').then(sdk => { document.querySelector('#checksum').textContent = `ZIP SHA-256: ${sdk.sha256}`; }).catch(() => { document.querySelector('#checksum').textContent = 'Download checksum is temporarily unavailable.'; });
await refresh();
