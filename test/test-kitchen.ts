import test from 'ava';
import * as chalk from 'chalk';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as ncp from 'ncp';
import * as path from 'path';
import * as pify from 'pify';
import * as rimraf from 'rimraf';
import * as tmp from 'tmp';

interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

const pkg = require('../../package.json');

const rimrafp = pify(rimraf);
const mkdirp = pify(fs.mkdir);
const simpleExecp = pify(cp.exec);
const renamep = pify(fs.rename);
const ncpp = pify(ncp.ncp);

const execp =
    (command: string, execOptions?: cp.ExecOptions): Promise<ExecResult> => {
      return new Promise((resolve) => {
        cp.exec(
            command, execOptions || {},
            (err: Error&{code: number}, stdout, stderr) => {
              resolve({exitCode: err ? err.code : 0, stdout, stderr});
            });
      });
    };

const keep = !!process.env.GTS_KEEP_TEMPDIRS;
const stagingDir = tmp.dirSync({keep: keep, unsafeCleanup: true});
const stagingPath = stagingDir.name;
const execOpts = {
  cwd: `${stagingPath}/kitchen`
};

console.log(`${chalk.blue(`${__filename} staging area: ${stagingPath}`)}`);

/**
 * Create a staging directory with temp fixtures used
 * to test on a fresh application.
 */
test.before(async () => {
  await simpleExecp('npm pack');
  const tarball = `${pkg.name}-${pkg.version}.tgz`;
  await renamep(tarball, `${stagingPath}/gts.tgz`);
  await ncpp('test/fixtures', `${stagingPath}/`);
  await simpleExecp('npm install', execOpts);
});

test.serial('init', async t => {
  await simpleExecp('./node_modules/.bin/gts init -y', execOpts);
  fs.accessSync(`${stagingPath}/kitchen/tsconfig.json`);
  t.pass();
});

test.serial('check before fix', async t => {
  const {exitCode, stdout} = await execp('npm run check', execOpts);
  t.deepEqual(exitCode, 1);
  t.notDeepEqual(stdout.indexOf('clang-format reported errors'), -1);
  t.pass();
});

test.serial('fix', async t => {
  const preFix = fs.readFileSync(`${stagingPath}/kitchen/src/server.ts`, 'utf8')
                     .split('\n');
  await simpleExecp('npm run fix', execOpts);
  const postFix =
      fs.readFileSync(`${stagingPath}/kitchen/src/server.ts`, 'utf8')
          .split('\n');
  t.deepEqual(
      preFix[0].trim() + ';',
      postFix[0]);  // fix should have added a semi-colon
  t.pass();
});

test.serial('check after fix', async t => {
  await simpleExecp('npm run check', execOpts);
  t.pass();
});

test.serial('build', async t => {
  await simpleExecp('npm run compile', execOpts);
  fs.accessSync(`${stagingPath}/kitchen/build/src/server.js`);
  fs.accessSync(`${stagingPath}/kitchen/build/src/server.js.map`);
  fs.accessSync(`${stagingPath}/kitchen/build/src/server.d.ts`);
  t.pass();
});

/**
 * Verify the `gts clean` command actually removes the
 * output dir
 */
test.serial('clean', async t => {
  await simpleExecp('npm run clean', execOpts);
  t.throws(() => {
    fs.accessSync(`${stagingPath}/kitchen/build`);
  });
});


/**
 * CLEAN UP - remove the staging directory when done.
 */
test.after.always('cleanup staging', async () => {
  if (!keep) {
    stagingDir.removeCallback();
  }
});
