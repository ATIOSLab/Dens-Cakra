import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runScript(fileName: string) {
  execFileSync(process.execPath, [path.join(__dirname, fileName)], {
    stdio: 'inherit',
  });
}

try {
  runScript('seed-master.js');
  runScript('seed-wilayah.js');
  runScript('seed-role-accounts.js');
  console.log('Completed full baseline seed.');
} catch (error) {
  console.error('Failed to run full baseline seed.', error);
  process.exitCode = 1;
}
