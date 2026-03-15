import { spawn } from 'node:child_process';

const dryRun = process.argv.includes('--dry-run');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const steps = [
  { name: 'Lint', args: ['run', 'lint'] },
  { name: 'Typecheck', args: ['run', 'typecheck'] },
  { name: 'Logic Tests', args: ['run', 'test:ci'] },
  { name: 'Web Build Check', args: ['run', 'build:web'] },
];

function runStep(step) {
  return new Promise((resolve, reject) => {
    const child = spawn(npmCommand, step.args, {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${step.name} failed with exit code ${code ?? 1}.`));
    });
  });
}

async function main() {
  for (const [index, step] of steps.entries()) {
    console.log(`\n[${index + 1}/${steps.length}] ${step.name}`);
    console.log(`> ${npmCommand} ${step.args.join(' ')}`);

    if (dryRun) {
      continue;
    }

    await runStep(step);
  }

  console.log(`\nRelease gate ${dryRun ? 'previewed' : 'passed'}.`);
}

main().catch((error) => {
  console.error(`\nRelease gate failed: ${error.message}`);
  process.exit(1);
});
