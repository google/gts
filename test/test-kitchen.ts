import chalk from 'chalk';
import * as cp from 'child_process';
import * as fs from 'fs-extra';
import * as tmp from 'tmp';
import * as assert from 'assert';
import * as path from 'path';

const spawn = require('cross-spawn');
const pkg = require('../../package.json');
const keep = !!process.env.GTS_KEEP_TEMPDIRS;
const stagingDir = tmp.dirSync({ keep, unsafeCleanup: true });
const stagingPath = stagingDir.name;
const execOpts = {
  cwd: `${stagingPath}${path.sep}kitchen`,
  encoding: 'utf8',
};

console.log(`${chalk.blue(`${__filename} staging area: ${stagingPath}`)}`);

describe('🚰 kitchen sink', () => {
  // Create a staging directory with temp fixtures used to test on a fresh application.
  before(() => {
    console.log('running before hook.');
    cp.execSync('npm pack');
    const tarball = `${pkg.name}-${pkg.version}.tgz`;
    fs.renameSync(tarball, 'gts.tgz');
    const targetPath = path.resolve(stagingPath, 'gts.tgz');
    console.log('moving packed tar to ', targetPath);
    fs.moveSync('gts.tgz', targetPath);
    fs.copySync('test/fixtures', `${stagingPath}${path.sep}`);
    console.log(fs.readdirSync(stagingPath));
    console.log(fs.readdirSync(path.join(stagingPath, 'kitchen')));
  });
  // CLEAN UP - remove the staging directory when done.
  after('cleanup staging', () => {
    if (!keep) {
      stagingDir.removeCallback();
    }
  });

  it('it should run init', () => {
    const nodeVersion = Number(process.version.slice(1).split('.')[0]);
    if (nodeVersion < 8 || process.platform === 'win32') {
      spawn.sync('./node_modules/.bin/gts', ['init', '-y'], execOpts);
    } else {
      const args = [
        '-p',
        path.resolve(stagingPath, 'gts.tgz'),
        '--ignore-existing',
        'gts',
        'init',
        // It's important to use `-n` here because we don't want to overwrite
        // the version of gts installed, as it will trigger the npm install.
        '-n',
      ];

      const res = spawn.sync('npx', args, execOpts);
      console.log('out: ', res.stdout + '');
      console.log('error: ', res.stderr + '');
    }

    // Ensure config files got generated.
    fs.accessSync(`${stagingPath}/kitchen/tsconfig.json`);
    fs.accessSync(`${stagingPath}/kitchen/tslint.json`);
    fs.accessSync(`${stagingPath}/kitchen/prettier.config.js`);

    // Compilation shouldn't have happened. Hence no `build` directory.
    const dirContents = fs.readdirSync(`${stagingPath}/kitchen`);
    assert.strictEqual(dirContents.indexOf('build'), -1);
  });

  it('should use as a non-locally installed module', () => {
    // Use from a directory different from where we have locally installed. This
    // simulates use as a globally installed module.
    const GTS = path.resolve(stagingPath, 'kitchen/node_modules/.bin/gts');
    const tmpDir = tmp.dirSync({ keep, unsafeCleanup: true });
    const opts = { cwd: `${tmpDir.name}/kitchen` };

    // Copy test files.
    fs.copySync('test/fixtures', `${tmpDir.name}/`);
    // Test package.json expects a gts tarball from ../gts.tgz.
    fs.copySync(`${stagingPath}/gts.tgz`, `${tmpDir.name}/gts.tgz`);
    // It's important to use `-n` here because we don't want to overwrite
    // the version of gts installed, as it will trigger the npm install.
    spawn.sync(GTS, ['init', '-n'], opts);

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
    assert.throws(() => cp.execSync(`${GTS} check src/server.ts`, opts));

    if (!keep) {
      tmpDir.removeCallback();
    }
  });

  it('should terminate generated json files with newline', () => {
    const GTS = path.resolve(stagingPath, 'kitchen/node_modules/.bin/gts');
    spawn.sync(GTS, ['init', '-y'], execOpts);
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

  it('should check before fix', () => {
    assert.throws(
      () => {
        cp.execSync('npm run check', execOpts);
        // tslint:disable-next-line no-any
      },
      (err: any) => {
        assert.strictEqual(err.status, 1);
        assert.notStrictEqual(
          err.stdout.indexOf('prettier reported errors'),
          -1
        );
        return true;
      }
    );
  });

  it('should fix', () => {
    const preFix = fs
      .readFileSync(`${stagingPath}/kitchen/src/server.ts`, 'utf8')
      .split(/[\n\r]+/);

    cp.execSync('npm run fix', execOpts);
    const postFix = fs
      .readFileSync(`${stagingPath}/kitchen/src/server.ts`, 'utf8')
      .split(/[\n\r]+/);
    assert.strictEqual(preFix[0].trim() + ';', postFix[0]); // fix should have added a semi-colon
  });

  it('should check after fix', () => {
    cp.execSync('npm run check', execOpts);
  });

  it('should build', () => {
    cp.execSync('npm run compile', execOpts);
    fs.accessSync(`${stagingPath}/kitchen/build/src/server.js`);
    fs.accessSync(`${stagingPath}/kitchen/build/src/server.js.map`);
    fs.accessSync(`${stagingPath}/kitchen/build/src/server.d.ts`);
  });

  // Verify the `gts clean` command actually removes the output dir
  it('should clean', () => {
    cp.execSync('npm run clean', execOpts);
    assert.throws(() => fs.accessSync(`${stagingPath}/kitchen/build`));
  });
});
