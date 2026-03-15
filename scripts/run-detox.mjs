import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const cwd = process.cwd();
const rawArgs = process.argv.slice(2);
const command = rawArgs[0] && !rawArgs[0].startsWith('-') ? rawArgs[0] : 'test';
const passthroughArgs = rawArgs[0] && !rawArgs[0].startsWith('-')
  ? rawArgs.slice(1)
  : rawArgs;

function readOption(args, name) {
  const index = args.indexOf(name);
  if (index === -1) {
    return null;
  }

  return args[index + 1] || null;
}

function removeOption(args, name) {
  const index = args.indexOf(name);
  if (index === -1) {
    return args;
  }

  return args.filter((_, currentIndex) => currentIndex !== index && currentIndex !== index + 1);
}

function getDefaultConfiguration() {
  return process.platform === 'darwin' ? 'ios.sim.debug' : 'android.emu.debug';
}

function getDetoxBinary() {
  return path.join(
    cwd,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'detox.cmd' : 'detox',
  );
}

function hasGeneratedIosProject() {
  const iosDir = path.join(cwd, 'ios');
  if (!existsSync(iosDir)) {
    return false;
  }

  return readdirSync(iosDir).some((entry) => entry.endsWith('.xcworkspace'));
}

function hasGeneratedAndroidProject() {
  return existsSync(path.join(cwd, 'android', 'app'))
    && existsSync(path.join(cwd, 'android', 'gradlew'));
}

function canRunJava() {
  const result = spawnSync('java', ['-version'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });

  return result.status === 0;
}

const configuration = readOption(passthroughArgs, '--configuration') || getDefaultConfiguration();
const filteredArgs = removeOption(passthroughArgs, '--configuration');
const blockers = [];
const detoxBinary = getDetoxBinary();
const androidSdkRoot = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || '';

if (!existsSync(detoxBinary)) {
  blockers.push(
    'Detox is not installed locally. Run `npm install -D detox` from `/home/thomashowells0894/fitness-app` first.',
  );
}

if (configuration.startsWith('ios')) {
  if (process.platform !== 'darwin') {
    blockers.push(
      `Configuration \`${configuration}\` requires macOS and Xcode. Use \`npm run test:e2e:android\` on ${process.platform}.`,
    );
  }

  if (!hasGeneratedIosProject()) {
    blockers.push(
      'The generated iOS native project is missing. Run `npx expo prebuild --platform ios` on macOS before Detox build/test.',
    );
  }
}

if (configuration.startsWith('android')) {
  if (!hasGeneratedAndroidProject()) {
    blockers.push(
      'The generated Android native project is missing. Run `npx expo prebuild --platform android` before Detox build/test.',
    );
  }

  if (!androidSdkRoot) {
    blockers.push(
      'ANDROID_SDK_ROOT is not set. Export your Android SDK path, for example `export ANDROID_SDK_ROOT=$HOME/Android/Sdk`.',
    );
  }

  if (command === 'build' && !canRunJava()) {
    blockers.push(
      'Java is not available on PATH. Install JDK 17 and ensure `java -version` succeeds before running Detox Android builds.',
    );
  }
}

if (blockers.length > 0) {
  console.error('Cannot run Detox yet:');
  for (const [index, blocker] of blockers.entries()) {
    console.error(`${index + 1}. ${blocker}`);
  }
  process.exit(1);
}

const child = spawn(
  detoxBinary,
  [command, '--configuration', configuration, ...filteredArgs],
  {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  },
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(`Failed to start Detox: ${error.message}`);
  process.exit(1);
});
