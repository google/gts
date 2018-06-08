/**
 * Copyright 2017 Google Inc. All Rights Reserved.
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
import * as fs from 'fs';
import * as path from 'path';

import {clean} from '../src/clean';
import {Options} from '../src/cli';
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

test.failing.serial('should gracefully error if tsconfig is missing', t => {
  return withFixtures({}, async () => {
    await clean(OPTIONS);
  });
});

test.serial(
    'should gracefully error if tsconfig does not have valid outDir', t => {
      return withFixtures({'tsconfig.json': JSON.stringify({})}, async () => {
        const deleted = await clean(OPTIONS);
        t.is(deleted, false);
      });
    });

test.serial('should avoid deleting .', t => {
  return withFixtures(
      {'tsconfig.json': JSON.stringify({compilerOptions: {outDir: '.'}})},
      async () => {
        const deleted = await clean(OPTIONS);
        t.is(deleted, false);
      });
});

test.failing.serial('should ensure that outDir is local to targetRoot', t => {
  return withFixtures(
      {'tsconfig.json': JSON.stringify({compilerOptions: {outDir: '../out'}})},
      async () => {
        const deleted = await clean(OPTIONS);
        t.is(deleted, false);
      });
});

test.serial('should remove outDir', t => {
  const OUT = 'outputDirectory';
  return withFixtures(
      {
        'tsconfig.json': JSON.stringify({compilerOptions: {outDir: OUT}}),
        [OUT]: {}
      },
      async (dir) => {
        const outputPath = path.join(dir, OUT);
        // make sure the output directory exists.
        fs.accessSync(outputPath);
        const deleted = await clean(OPTIONS);
        t.is(deleted, true);
        // make sure the directory has been deleted.
        t.throws(() => {
          fs.accessSync(outputPath);
        });
      });
});
