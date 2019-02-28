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

import test from 'ava';
import * as path from 'path';

import { Options } from '../src/cli';
import * as init from '../src/init';
import { nop, readJsonp as readJson } from '../src/util';

import { withFixtures } from './fixtures';

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
const OPTIONS_DRY_RUN = Object.assign({}, OPTIONS, { dryRun: true });
const OPTIONS_YARN = Object.assign({}, OPTIONS_YES, { yarn: true });

function hasExpectedScripts(packageJson: init.PackageJson): boolean {
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

function hasExpectedDependencies(packageJson: init.PackageJson): boolean {
  return (
    !!packageJson.devDependencies &&
    ['gts', 'typescript'].every(d => !!packageJson.devDependencies![d])
  );
}

test('addScripts should add a scripts section if none exists', async t => {
  const pkg: init.PackageJson = {};
  const result = await init.addScripts(pkg, OPTIONS);
  t.is(result, true); // made edits.
  t.truthy(pkg.scripts);
  t.truthy(hasExpectedScripts(pkg));
});

test('addScripts should not edit existing scripts on no', async t => {
  const SCRIPTS = {
    check: `fake check`,
    clean: 'fake clean',
    compile: `fake tsc -p .`,
    fix: `fake fix`,
    prepare: `fake run compile`,
    pretest: `fake run compile`,
    posttest: `fake run check`,
  };
  const pkg: init.PackageJson = { scripts: Object.assign({}, SCRIPTS) };

  const result = await init.addScripts(pkg, OPTIONS_NO);
  t.is(result, false); // no edits.
  t.deepEqual(pkg.scripts, SCRIPTS);
});

test('addScripts should edit existing scripts on yes', async t => {
  const SCRIPTS = {
    check: `fake check`,
    clean: 'fake clean',
    compile: `fake tsc -p .`,
    fix: `fake fix`,
    prepare: `fake run compile`,
    pretest: `fake run compile`,
    posttest: `fake run check`,
  };
  const pkg: init.PackageJson = { scripts: Object.assign({}, SCRIPTS) };
  const result = await init.addScripts(pkg, OPTIONS_YES);
  t.is(result, true); // made edits.
  t.notDeepEqual(pkg.scripts, SCRIPTS);
});

test('addDependencies should add a deps section if none exists', async t => {
  const pkg: init.PackageJson = {};
  const result = await init.addDependencies(pkg, OPTIONS);
  t.is(result, true); // made edits.
  t.truthy(pkg.devDependencies);
});

test('addDependencies should not edit existing deps on no', async t => {
  const DEPS = { gts: 'something', typescript: 'or the other' };
  const pkg: init.PackageJson = { devDependencies: Object.assign({}, DEPS) };
  const OPTIONS_NO = Object.assign({}, OPTIONS, { no: true });
  const result = await init.addDependencies(pkg, OPTIONS_NO);
  t.is(result, false); // no edits.
  t.deepEqual(pkg.devDependencies, DEPS);
});

test('addDependencies should edit existing deps on yes', async t => {
  const DEPS = { gts: 'something', typescript: 'or the other' };
  const pkg: init.PackageJson = { devDependencies: Object.assign({}, DEPS) };

  const result = await init.addDependencies(pkg, OPTIONS_YES);
  t.is(result, true); // made edits.
  t.notDeepEqual(pkg.devDependencies, DEPS);
});

// TODO: test generateConfigFile

// init
test.serial('init should read local package.json', t => {
  const originalContents = { some: 'property' };
  return withFixtures(
    { 'package.json': JSON.stringify(originalContents) },
    async () => {
      // TODO: this test causes `npm install` to run in the fixture directory.
      // This may make it sensitive to the network, npm resiliency. Find a
      // way to mock npm.
      const result = await init.init(OPTIONS_YES);
      t.truthy(result);
      const contents = await readJson('./package.json');

      t.not(contents, originalContents, 'the file should have been modified');
      t.is(
        contents.some,
        originalContents.some,
        'unrelated property should have preserved'
      );
    }
  );
});

test.serial('init should handle missing package.json', t => {
  return withFixtures({}, async () => {
    // TODO: this test causes `npm install` to run in the fixture directory.
    // This may make it sensitive to the network, npm resiliency. Find a way to
    // mock npm.
    const result = await init.init(OPTIONS_YES);
    t.truthy(result);
    const contents = await readJson('./package.json');
    t.truthy(hasExpectedScripts(contents));
    t.truthy(hasExpectedDependencies(contents));
  });
});

test.serial('init should support yarn', t => {
  return withFixtures(
    {
      'package.json': JSON.stringify({ name: 'test' }),
      'yarn.lock': '',
    },
    async () => {
      const result = await init.init(OPTIONS_YARN);
      t.truthy(result);

      const contents = await readJson('./package.json');
      t.truthy(contents.scripts.prepare === 'yarn run compile');
    }
  );
});

// TODO: need more tests.
