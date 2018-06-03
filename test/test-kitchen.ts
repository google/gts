import test from 'ava';
import chalk from 'chalk';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as ncp from 'ncp';
import * as path from 'path';
import pify from 'pify';
import rimraf from 'rimraf';
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

// TODO: improve the typedefinitions in @types/node. Right now they specify
// the return type to be Error.
interface ExecError extends Error {
  code: number;
}

function isExecError(err: Error|ExecError): err is ExecError {
  return (err as ExecError).code !== undefined;
}

// cp.exec doesn't fit the (err ^ result) pattern because a process can write
// to stdout/stderr and still exit with error code != 0.
// In most cases simply promisifying cp.exec is adequate, but it's not if we
// need to see console output for a process that exited with a non-zero exit
// code, so we define a more exhaustive promsified cp.exec here.
// TODO: replace this code with a npm modules that promisifies exec.
const execp =
    (command: string, execOptions?: cp.ExecOptions): Promise<ExecResult> => {
      return new Promise((resolve) => {
        cp.exec(
            command, execOptions || {},
            (err: Error|ExecError|null, stdout, stderr) => {
              resolve({
                exitCode: err && isExecError(err) ? err.code : 0,
                stdout,
                stderr
              });
            });
      });
    };

const keep = !!process.env.GTS_KEEP_TEMPDIRS;
const stagingDir = tmp.dirSync({keep, unsafeCleanup: true});
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
});

test.serial('init', async t => {
  const nodeVersion = Number(process.version.slice(1).split('.')[0]);
  if (nodeVersion < 8) {
    await simpleExecp('npm install', execOpts);
    await simpleExecp('./node_modules/.bin/gts init -y', execOpts);
  } else {
    // It's important to use `-n` here because we don't want to overwrite
    // the version of gts installed, as it will trigger the npm install.
    await simpleExecp(
        `npx -p ${stagingPath}/gts.tgz --ignore-existing gts init -n`,
        execOpts);
  }

  // Ensure config files got generated.
  fs.accessSync(`${stagingPath}/kitchen/tsconfig.json`);
  fs.accessSync(`${stagingPath}/kitchen/tslint.json`);
  fs.accessSync(`${stagingPath}/kitchen/.clang-format`);

  // Compilation shouldn't have happened. Hence no `build` directory.
  const dirContents = fs.readdirSync(`${stagingPath}/kitchen`);
  t.is(dirContents.indexOf('build'), -1);

  t.pass();
});

test.serial('use as a non-locally installed module', async t => {
  // Use from a directory different from where we have locally installed. This
  // simulates use as a globally installed module.
  const GTS = `${stagingPath}/kitchen/node_modules/.bin/gts`;
  const tmpDir = tmp.dirSync({keep, unsafeCleanup: true});
  const opts = {cwd: `${tmpDir.name}/kitchen`};

  // Copy test files.
  await ncpp('test/fixtures', `${tmpDir.name}/`);
  // Test package.json expects a gts tarball from ../gts.tgz.
  await ncpp(`${stagingPath}/gts.tgz`, `${tmpDir.name}/gts.tgz`);
  // It's important to use `-n` here because we don't want to overwrite
  // the version of gts installed, as it will trigger the npm install.
  await simpleExecp(`${GTS} init -n`, opts);

  // The `extends` field must use the local gts path.
  const tsconfigJson =
      fs.readFileSync(`${tmpDir.name}/kitchen/tsconfig.json`, 'utf8');
  const tsconfig = JSON.parse(tsconfigJson);
  t.deepEqual(tsconfig.extends, './node_modules/gts/tsconfig-google.json');

  // server.ts has a lint error. Should error.
  await t.throws(simpleExecp(`${GTS} check src/server.ts`, opts));

  if (!keep) {
    tmpDir.removeCallback();
  }
  t.pass();
});

test.serial('generated json files should terminate with newline', async t => {
  await simpleExecp('./node_modules/.bin/gts init -y', execOpts);
  t.truthy(fs.readFileSync(`${stagingPath}/kitchen/package.json`, 'utf8')
               .endsWith('\n'));
  t.truthy(fs.readFileSync(`${stagingPath}/kitchen/tsconfig.json`, 'utf8')
               .endsWith('\n'));
  t.truthy(fs.readFileSync(`${stagingPath}/kitchen/tslint.json`, 'utf8')
               .endsWith('\n'));
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
