import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { signIn } from './oauth.mjs';
import { AccountExample, Receipts, connectMcp } from './client.mjs';

const help = `Velox TriFit — personal account example (Production)

npm run account:example              Read allowance/library/existing results
npm run account:example -- --actions Also enable explicitly confirmed uploads/try-ons

No Partner API key. Sign in on TriFit's browser page with your existing email
or Google identity. Your real account quotas apply; no separate free credits.
This terminal never asks for a password, email code or pasted access token.

Commands after sign-in: allowance, library, upload, try-on, result, logout, quit
Uploads/try-ons require --actions AND a confirmation for each action.
No automatic retries. Use result with the saved request ID after uncertainty.
Result reads are manual; wait at least five seconds between status checks.
Receipts/images: .account-example/ (private, ignored by Git; preserve for recovery).
No photo is uploaded and no generation runs simply by starting or signing in.`;

async function main() {
  const flags = process.argv.slice(2);
  if (flags.includes('--help')) { console.log(help); return; }
  if (flags.some(flag => flag !== '--actions')) throw new Error('Only --actions and --help are supported.');
  if (!stdin.isTTY) throw new Error('Run in an interactive terminal. CI must not sign in or generate. Use npm test.');
  console.log(help);
  const receipts = new Receipts(fileURLToPath(new URL('../../.account-example/', import.meta.url)));
  try { await receipts.lock(); } catch { throw new Error('Another example may be running, or an earlier run stopped unexpectedly. Preserve .account-example; see the recovery instructions.'); }
  const terminal = createInterface({ input: stdin, output: stdout });
  let client, session;
  try {
    if ((await terminal.question('Open a real Production account connection now? Type CONNECT: ')).trim() !== 'CONNECT') return;
    session = await signIn({ actions: flags.includes('--actions') });
    client = await connectMcp(session);
    const example = new AccountExample({ client, receipts, actions: flags.includes('--actions') });
    const account = await example.account();
    console.log(`Connected: ${account.name} | Production | existing TriFit account allowance`);
    console.log(JSON.stringify(await example.allowance(), null, 2));
    let lastRead = 0;
    while (true) {
      const command = (await terminal.question('\nTriFit command (help for options): ')).trim();
      try {
        if (command === 'quit') break;
        if (command === 'logout') { await session.revoke(); console.log('This example connection revoked. Account/photos/quotas were not deleted.'); break; }
        if (command === 'help') console.log(help);
        else if (command === 'allowance') console.log(JSON.stringify(await example.allowance(), null, 2));
        else if (command === 'library') {
          const kind = (await terminal.question('Kind: photos / products / looks / requests / all [all]: ')).trim() || 'all';
          if (!['photos', 'products', 'looks', 'requests', 'all'].includes(kind)) throw new Error('Unknown library kind.');
          const offset = Number((await terminal.question('Offset [0]; use nextOffset from the last page for more: ')).trim() || 0);
          if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10000) throw new Error('Invalid offset.');
          console.log(JSON.stringify(await example.library(kind, offset), null, 2));
        } else if (command === 'upload') {
          if (!flags.includes('--actions')) throw new Error('Restart with --actions and approve the extra permissions first.');
          const role = (await terminal.question('Image role: personal / product: ')).trim();
          const path = resolve((await terminal.question('Local image file path: ')).trim().replace(/^"(.*)"$/, '$1'));
          const info = await stat(path);
          if (!info.isFile() || info.size > 24 * 1024 * 1024) throw new Error('Select a file up to 24 MiB.');
          const type = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }[extname(path).toLowerCase()];
          const confirmed = (await terminal.question('Save this photo in your TriFit library (also selects its website slot)? Type UPLOAD: ')).trim() === 'UPLOAD';
          if (!confirmed) { console.log('Cancelled.'); continue; }
          console.log(JSON.stringify(await example.upload(role, await readFile(path), type, true), null, 2));
        } else if (command === 'try-on') {
          if (!flags.includes('--actions')) throw new Error('Restart with --actions and approve try-on permission first.');
          const person = (await terminal.question('Personal image asset ID from your account: ')).trim();
          const product = (await terminal.question('Clothing image asset ID from your account: ')).trim();
          console.log(JSON.stringify(await example.allowance(), null, 2));
          const confirmed = (await terminal.question('Process these images and spend account allowance on ONE real DressMe request? Type GENERATE: ')).trim() === 'GENERATE';
          if (!confirmed) { console.log('Cancelled.'); continue; }
          console.log(JSON.stringify(await example.generate(person, product, true), null, 2));
          console.log('Use result with the saved requestId. No automatic polling or resubmission.');
        } else if (command === 'result') {
          const id = (await terminal.question('Saved requestId (not an image ID): ')).trim();
          if (Date.now() - lastRead < 5000) throw new Error('Wait at least five seconds between status reads.');
          lastRead = Date.now();
          console.log(JSON.stringify(await example.result(id), null, 2));
        } else if (command !== 'help' && command !== 'allowance' && command !== 'library') console.log('Unknown command. Type help.');
      } catch (error) { console.error(error.message); }
    }
  } finally {
    terminal.close();
    try { await client?.close(); } finally { await receipts.unlock(); }
    // Tokens stay in memory only; closing does not promise grant revocation or media deletion.
  }
}

main().catch(error => {
  // Network/MCP errors may contain private response details. Do not dump stacks or tokens.
  console.error('Account example stopped. No automatic retry. Check sign-in, permissions, connectivity and saved receipts.');
  if (/interactive terminal|Only --actions|Another example/.test(error.message)) console.error(error.message);
  process.exitCode = 1;
});
