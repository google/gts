import test from 'ava';
import * as chalk from 'chalk';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as ncp from 'ncp';
import * as path from 'path';
import * as pify from 'pify';
import * as rimraf from 'rimraf';

const rimrafp = pify(rimraf);
const mkdirp = pify(fs.mkdir);
const execp = pify(cp.exec);
const renamep = pify(fs.rename);
const ncpp = pify(ncp.ncp);

const stagingPath = path.normalize('./staging');

/**
 * Create a staging directory with temp fixtures used
 * to test on a fresh application.
 */
test.before(async () => {
  try {
    await mkdirp(stagingPath);
    const tarball: string = await execp('npm pack');
    await renamep(tarball.trim(), 'staging/google-ts-style.tgz');
    await ncpp('test/fixtures', 'staging/');
    const execOpts = {cwd: 'staging/kitchen'};
    await execp('npm install', execOpts);
    await execp('npm run build', execOpts);
    console.log(
        `${chalk.blue.bold('**** Staging area prepared for tests ****')}`);
  } catch (e) {
    console.error('Failed to prepare test staging sandbox.');
    console.error(e);
    throw e;
  }
});

/**
 * Verify the `gts clean` command actually removes the
 * output dir
 */
test('clean', t => {
  return new Promise((resolve) => {
    cp.spawn('npm', ['run', 'clean'], {
        stdio: 'inherit',
        cwd: 'staging/kitchen'
      }).on('close', () => {
      const buildPath = 'staging/kitchen/build';
      fs.exists(buildPath, exists => {
        t.false(exists);
        resolve();
      });
    });
  });
});


/**
 * CLEAN UP - remove the staging directory when done.
 */
test.after.always('cleanup staging', async () => {
  await rimrafp(stagingPath);
});
