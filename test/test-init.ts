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
import path from 'path';

import {Options} from '../src/cli';
import * as init from '../src/init';
import {nop} from '../src/util';
import {withFixtures} from './fixtures';

const OPTIONS: Options = {
  gtsRootDir: path.resolve(__dirname, '../..'),
  targetRootDir: './',
  dryRun: false,
  yes: false,
  no: false,
  logger: {log: nop, error: nop, dir: nop}
};

test('addScripts should add a scripts section if none exists', async t => {
  const pkg: init.PackageJson = {};
  const result = await init.addScripts(pkg, OPTIONS);
  t.is(result, true);  // made edits.
  t.truthy(pkg.scripts);
  ['check', 'clean', 'compile', 'fix', 'prepare', 'pretest', 'posttest']
      .forEach(s => {
        t.truthy(pkg.scripts![s]);
      });
});

test('addScripts should not edit existing scripts on no', async t => {
  const SCRIPTS = {
    check: `fake check`,
    clean: 'fake clean',
    compile: `fake tsc -p .`,
    fix: `fake fix`,
    prepare: `fake run compile`,
    pretest: `fake run compile`,
    posttest: `fake run check`
  };
  const pkg: init.PackageJson = {scripts: Object.assign({}, SCRIPTS)};
  const optionsWithNo = Object.assign({}, OPTIONS, {no: true});
  const result = await init.addScripts(pkg, optionsWithNo);
  t.is(result, false);  // no edits.
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
    posttest: `fake run check`
  };
  const pkg: init.PackageJson = {scripts: Object.assign({}, SCRIPTS)};
  const optionsWithYes = Object.assign({}, OPTIONS, {yes: true});
  const result = await init.addScripts(pkg, optionsWithYes);
  t.is(result, true);  // made edits.
  t.notDeepEqual(pkg.scripts, SCRIPTS);
});

test('addDependencies should add a deps section if none exists', async t => {
  const pkg: init.PackageJson = {};
  const result = await init.addDependencies(pkg, OPTIONS);
  t.is(result, true);  // made edits.
  t.truthy(pkg.devDependencies);
});

test('addDependencies should not edit existing deps on no', async t => {
  const DEPS = {gts: 'something', typescript: 'or the other'};
  const pkg: init.PackageJson = {devDependencies: Object.assign({}, DEPS)};
  const optionsWithNo = Object.assign({}, OPTIONS, {no: true});
  const result = await init.addDependencies(pkg, optionsWithNo);
  t.is(result, false);  // no edits.
  t.deepEqual(pkg.devDependencies, DEPS);
});

test('addDependencies should edit existing deps on yes', async t => {
  const DEPS = {gts: 'something', typescript: 'or the other'};
  const pkg: init.PackageJson = {devDependencies: Object.assign({}, DEPS)};
  const optionsWithYes = Object.assign({}, OPTIONS, {yes: true});
  const result = await init.addDependencies(pkg, optionsWithYes);
  t.is(result, true);  // made edits.
  t.notDeepEqual(pkg.devDependencies, DEPS);
});

// TODO: this test has not been completed yet.
// test.serial('init should read local package.json', t => {
//   return withFixtures(
//       {'package.json': JSON.stringify({some: 'property'})}, async () => {
//         const optionsWithDryRun = Object.assign({}, OPTIONS, {dryRun: true});
//         const result = await init.init(optionsWithDryRun);
//         t.truthy(result);
//       });
// });

// TODO: need more tests.
