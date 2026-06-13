import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const jsDirectory = new URL('../js/', import.meta.url);
const files = readdirSync(jsDirectory)
  .filter(file => file.endsWith('.js'));

for (const file of files) {
  const filePath = fileURLToPath(new URL(file, jsDirectory));
  const result = spawnSync(
    process.execPath,
    ['--check', filePath],
    { stdio: 'inherit' }
  );
  if (result.status !== 0) process.exit(result.status || 1);
}
