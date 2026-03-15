import { spawn } from 'node:child_process';
import path from 'node:path';

const quiet = process.argv.includes('--quiet');

const sharedArgs = [
  '--ext',
  '.js,.jsx,.ts,.tsx',
  '--cache',
  '--cache-strategy',
  'metadata',
  '--concurrency',
  'off',
];

if (quiet) {
  sharedArgs.push('--quiet');
}

const pathGroups = [
  { name: 'app', paths: ['app'] },
  { name: 'components', paths: ['components'] },
  { name: 'context-hooks', paths: ['context', 'hooks'] },
  { name: 'lib-services', paths: ['lib', 'services', 'types'] },
  {
    name: 'constants-data',
    paths: [
      'constants',
      'data/exercises.ts',
      'data/leaderboardData.ts',
      'data/mealDatabase.ts',
      'data/micronutrients.ts',
      'data/tourSteps.ts',
    ],
  },
  { name: 'nonproduct', paths: ['__tests__', 'e2e', 'supabase', 'eslint.config.js', '.eslintrc.js', 'jest.config.js', 'babel.config.js', 'metro.config.js'] },
];

const executable = process.execPath;
const eslintBin = path.resolve('node_modules/eslint/bin/eslint.js');
const cacheRoot = '.eslintcache-shards';

function runEslint(group) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      executable,
      [
        eslintBin,
        ...group.paths,
        ...sharedArgs,
        '--cache-location',
        `${cacheRoot}/${group.name}`,
      ],
      {
      stdio: 'inherit',
      }
    );

    child.on('error', reject);
    child.on('exit', (code) => {
      resolve(code ?? 1);
    });
  });
}

try {
  const codes = await Promise.all(pathGroups.map(runEslint));
  process.exit(codes.every((code) => code === 0) ? 0 : 1);
} catch (error) {
  console.error(error);
  process.exit(1);
}
