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

import {Options} from '../src/cli';
import * as format from '../src/format';
import {nop} from '../src/util';

import {withFixtures} from './fixtures';

// clang-format won't pass this code because of trailing spaces.
const BAD_CODE = 'export const foo = 2;  ';

const OPTIONS: Options = {
  gtsRootDir: './',
  targetRootDir: './',
  dryRun: false,
  yes: false,
  no: false,
  logger: {log: console.log, error: console.error, dir: nop}
};

test.serial('format should return false for ill-formatted files', async t => {
  await withFixtures(
      {'tsconfig.json': JSON.stringify({files: ['a.ts']}), 'a.ts': BAD_CODE},
      async () => {
        const result = await format.format(OPTIONS, [], false);
        t.false(result);
      });
});

test.serial('format should only look in root files', async t => {
  await withFixtures(
      {
        'tsconfig.json': JSON.stringify({files: ['a.ts']}),
        'a.ts': 'import {foo} from \'./b\';\n',
        'b.ts': BAD_CODE
      },
      async () => {
        const result = await format.format(OPTIONS, [], false);
        t.true(result);
      });
});

// TODO: Add more tests
