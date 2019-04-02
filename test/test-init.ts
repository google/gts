/**
 * Copyright 2018 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as assert from 'assert';
import * as path from 'path';
import { nop, readJsonp as readJson } from '../src/util';
import { Options } from '../src/cli';
import { PackageJson } from 'package-json';
import { withFixtures } from 'inline-fixtures';
import * as init from '../src/init';

const OPTIONS: Options = {
  gtsRootDir: path.resolve(__dirname, '../..'),
  targetRootDir: './',
  dryRun: false,
  yes: false,
  no: false,
  logger: { log: nop, error: nop, dir: nop },
};
const OPTIONS_YES = Object.assign({}, OPTIONS, { yes: true });
const OPTIONS_NO = Object.assign({}, OPTIONS, { no: true });
const OPTIONS_YARN = Object.assign({}, OPTIONS_YES, { yarn: true });

function hasExpectedScripts(packageJson: PackageJson): boolean {
  return (
    !!packageJson.scripts &&
    [
      'check',
      'clean',
      'compile',
      'fix',
      'prepare',
      'pretest',
      'posttest',
    ].every(s => !!packageJson.scripts![s])
  );
}

function hasExpectedDependencies(packageJson: PackageJson): boolean {
  return (
    !!packageJson.devDependencies &&
    ['gts', 'typescript'].every(d => !!packageJson.devDependencies![d])
  );
}

describe('init', () => {
  it('addScripts should add a scripts section if none exists', async () => {
    const pkg: PackageJson = {};
    const result = await init.addScripts(pkg, OPTIONS);
    assert.strictEqual(result, true); // made edits.
    assert.ok(pkg.scripts);
    assert.strictEqual(hasExpectedScripts(pkg), true);
  });

  it('addScripts should not edit existing scripts on no', async () => {
    const SCRIPTS = {
      check: `fake check`,
      clean: 'fake clean',
      compile: `fake tsc -p .`,
      fix: `fake fix`,
      prepare: `fake run compile`,
      pretest: `fake run compile`,
      posttest: `fake run check`,
    };
    const pkg: PackageJson = { scripts: Object.assign({}, SCRIPTS) };
    const result = await init.addScripts(pkg, OPTIONS_NO);
    assert.strictEqual(result, false); // no edits.
    assert.deepStrictEqual(pkg.scripts, SCRIPTS);
  });

  it('addScripts should edit existing scripts on yes', async () => {
    const SCRIPTS = {
      check: `fake check`,
      clean: 'fake clean',
      compile: `fake tsc -p .`,
      fix: `fake fix`,
      prepare: `fake run compile`,
      pretest: `fake run compile`,
      posttest: `fake run check`,
    };
    const pkg: PackageJson = { scripts: Object.assign({}, SCRIPTS) };
    const result = await init.addScripts(pkg, OPTIONS_YES);
    assert.strictEqual(result, true); // made edits.
    assert.notDeepStrictEqual(pkg.scripts, SCRIPTS);
  });

  it('addDependencies should add a deps section if none exists', async () => {
    const pkg: PackageJson = {};
    const result = await init.addDependencies(pkg, OPTIONS);
    assert.strictEqual(result, true); // made edits.
    assert.ok(pkg.devDependencies);
  });

  it('addDependencies should not edit existing deps on no', async () => {
    const DEPS = { gts: 'something', typescript: 'or the other' };
    const pkg: PackageJson = { devDependencies: Object.assign({}, DEPS) };
    const OPTIONS_NO = Object.assign({}, OPTIONS, { no: true });
    const result = await init.addDependencies(pkg, OPTIONS_NO);
    assert.strictEqual(result, false); // no edits.
    assert.deepStrictEqual(pkg.devDependencies, DEPS);
  });

  it('addDependencies should edit existing deps on yes', async () => {
    const DEPS = { gts: 'something', typescript: 'or the other' };
    const pkg: PackageJson = { devDependencies: Object.assign({}, DEPS) };
    const result = await init.addDependencies(pkg, OPTIONS_YES);
    assert.strictEqual(result, true); // made edits.
    assert.notDeepStrictEqual(pkg.devDependencies, DEPS);
  });

  // TODO: test generateConfigFile

  // init
  it('init should read local package.json', () => {
    const originalContents = { some: 'property' };
    return withFixtures(
      { 'package.json': JSON.stringify(originalContents) },
      async () => {
        // TODO: this test causes `npm install` to run in the fixture directory.
        // This may make it sensitive to the network, npm resiliency. Find a
        // way to mock npm.
        const result = await init.init(OPTIONS_YES);
        assert.strictEqual(result, true);
        const contents = await readJson('./package.json');

        assert.notStrictEqual(
          contents,
          originalContents,
          'the file should have been modified'
        );
        assert.strictEqual(
          contents.some,
          originalContents.some,
          'unrelated property should have preserved'
        );
      }
    );
  });

  it('init should handle missing package.json', () => {
    return withFixtures({}, async () => {
      // TODO: this test causes `npm install` to run in the fixture directory.
      // This may make it sensitive to the network, npm resiliency. Find a way to
      // mock npm.
      const result = await init.init(OPTIONS_YES);
      assert.strictEqual(result, true);
      const contents = await readJson('./package.json');
      assert.strictEqual(hasExpectedScripts(contents), true);
      assert.strictEqual(hasExpectedDependencies(contents), true);
    });
  });

  it('init should support yarn', () => {
    return withFixtures(
      {
        'package.json': JSON.stringify({ name: 'test' }),
        'yarn.lock': '',
      },
      async () => {
        const result = await init.init(OPTIONS_YARN);
        assert.strictEqual(result, true);

        const contents = await readJson('./package.json');
        const cmd = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
        assert.strictEqual(contents.scripts.prepare, cmd + ' run compile');
      }
    );
  });
});
