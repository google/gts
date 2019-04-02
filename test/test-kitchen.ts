import chalk from 'chalk';
import * as cp from 'child_process';
import * as fs from 'fs-extra';
import * as ncp from 'ncp';
import * as pify from 'pify';
import * as tmp from 'tmp';
import * as assert from 'assert';

interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

const pkg = require('../../package.json');

const simpleExecp = pify(cp.exec);
const renamep = pify(fs.rename);
const movep = pify(fs.move);
const ncpp = pify(ncp.ncp);

// TODO: improve the typedefinitions in @types/node. Right now they specify
// the return type to be Error.
interface ExecError extends Error {
  code: number;
}

function isExecError(err: Error | ExecError): err is ExecError {
  return err && (err as ExecError).code !== undefined;
}

// cp.exec doesn't fit the (err ^ result) pattern because a process can write
// to stdout/stderr and still exit with error code != 0.
// In most cases simply promisifying cp.exec is adequate, but it's not if we
// need to see console output for a process that exited with a non-zero exit
// code, so we define a more exhaustive promsified cp.exec here.
// TODO: replace this code with a npm modules that promisifies exec.
const execp = (
  command: string,
  execOptions?: cp.ExecOptions
): Promise<ExecResult> => {
  return new Promise(resolve => {
    cp.exec(
      command,
      execOptions || {},
      (err: cp.ExecException | null, stdout, stderr) => {
        resolve({
          exitCode: err && isExecError(err) ? err.code : 0,
          stdout,
          stderr,
        });
      }
    );
  });
};

const keep = !!process.env.GTS_KEEP_TEMPDIRS;
const stagingDir = tmp.dirSync({ keep, unsafeCleanup: true });
const stagingPath = stagingDir.name;
const execOpts = {
  cwd: `${stagingPath}/kitchen`,
};

console.log(`${chalk.blue(`${__filename} staging area: ${stagingPath}`)}`);

describe('🚰 kitchen sink', () => {
  // Create a staging directory with temp fixtures used to test on a fresh application.
  before(async () => {
    await simpleExecp('npm pack');
    const tarball = `${pkg.name}-${pkg.version}.tgz`;
    await renamep(tarball, 'gts.tgz');
    await movep('gts.tgz', `${stagingPath}/gts.tgz`);
    await ncpp('test/fixtures', `${stagingPath}/`);
  });

  // CLEAN UP - remove the staging directory when done.
  after('cleanup staging', () => {
    if (!keep) {
      stagingDir.removeCallback();
    }
  });

  it('it should run init', async () => {
    const nodeVersion = Number(process.version.slice(1).split('.')[0]);
    if (nodeVersion < 8) {
      await simpleExecp('npm install', execOpts);
      await simpleExecp('./node_modules/.bin/gts init -y', execOpts);
    } else {
      // It's important to use `-n` here because we don't want to overwrite
      // the version of gts installed, as it will trigger the npm install.
      await simpleExecp(
        `npx -p ${stagingPath}/gts.tgz --ignore-existing gts init -n`,
        execOpts
      );
    }

    // Ensure config files got generated.
    fs.accessSync(`${stagingPath}/kitchen/tsconfig.json`);
    fs.accessSync(`${stagingPath}/kitchen/tslint.json`);
    fs.accessSync(`${stagingPath}/kitchen/prettier.config.js`);

    // Compilation shouldn't have happened. Hence no `build` directory.
    const dirContents = fs.readdirSync(`${stagingPath}/kitchen`);
    assert.strictEqual(dirContents.indexOf('build'), -1);
  });

  it('should use as a non-locally installed module', async () => {
    // Use from a directory different from where we have locally installed. This
    // simulates use as a globally installed module.
    const GTS = `${stagingPath}/kitchen/node_modules/.bin/gts`;
    const tmpDir = tmp.dirSync({ keep, unsafeCleanup: true });
    const opts = { cwd: `${tmpDir.name}/kitchen` };

    // Copy test files.
    await ncpp('test/fixtures', `${tmpDir.name}/`);
    // Test package.json expects a gts tarball from ../gts.tgz.
    await ncpp(`${stagingPath}/gts.tgz`, `${tmpDir.name}/gts.tgz`);
    // It's important to use `-n` here because we don't want to overwrite
    // the version of gts installed, as it will trigger the npm install.
    await simpleExecp(`${GTS} init -n`, opts);

    // The `extends` field must use the local gts path.
    const tsconfigJson = fs.readFileSync(
      `${tmpDir.name}/kitchen/tsconfig.json`,
      'utf8'
    );
    const tsconfig = JSON.parse(tsconfigJson);
    assert.deepStrictEqual(
      tsconfig.extends,
      './node_modules/gts/tsconfig-google.json'
    );

    // server.ts has a lint error. Should error.
    await assert.rejects(() => simpleExecp(`${GTS} check src/server.ts`, opts));

    if (!keep) {
      tmpDir.removeCallback();
    }
  });

  it('should terminate generated json files with newline', async () => {
    const GTS = `${stagingPath}/kitchen/node_modules/.bin/gts`;
    await simpleExecp(`${GTS} init -y`, execOpts);
    assert.ok(
      fs
        .readFileSync(`${stagingPath}/kitchen/package.json`, 'utf8')
        .endsWith('\n')
    );
    assert.ok(
      fs
        .readFileSync(`${stagingPath}/kitchen/tsconfig.json`, 'utf8')
        .endsWith('\n')
    );
    assert.ok(
      fs
        .readFileSync(`${stagingPath}/kitchen/tslint.json`, 'utf8')
        .endsWith('\n')
    );
  });

  it('should check before fix', async () => {
    const { exitCode, stdout } = await execp('npm run check', execOpts);
    assert.strictEqual(exitCode, 1);
    assert.notStrictEqual(stdout.indexOf('prettier reported errors'), -1);
  });

  it('should fix', async () => {
    const preFix = fs
      .readFileSync(`${stagingPath}/kitchen/src/server.ts`, 'utf8')
      .split(/[\n\r]+/);
    await simpleExecp('npm run fix', execOpts);
    const postFix = fs
      .readFileSync(`${stagingPath}/kitchen/src/server.ts`, 'utf8')
      .split(/[\n\r]+/);
    assert.strictEqual(preFix[0].trim() + ';', postFix[0]); // fix should have added a semi-colon
  });

  it('should check after fix', async () => {
    await simpleExecp('npm run check', execOpts);
  });

  it('should build', async () => {
    await simpleExecp('npm run compile', execOpts);
    fs.accessSync(`${stagingPath}/kitchen/build/src/server.js`);
    fs.accessSync(`${stagingPath}/kitchen/build/src/server.js.map`);
    fs.accessSync(`${stagingPath}/kitchen/build/src/server.d.ts`);
  });

  // Verify the `gts clean` command actually removes the output dir
  it('should clean', async () => {
    await simpleExecp('npm run clean', execOpts);
    assert.throws(() => fs.accessSync(`${stagingPath}/kitchen/build`));
  });
});
