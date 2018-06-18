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
import fs from 'fs';
import * as path from 'path';

import {Options} from '../src/cli';
import * as format from '../src/format';
import {nop} from '../src/util';

import {withFixtures} from './fixtures';

// clang-format won't pass this code because of trailing spaces.
const BAD_CODE = 'export const foo = [ 2 ];';
const GOOD_CODE = 'export const foo = [2];';

const OPTIONS: Options = {
  gtsRootDir: path.resolve(__dirname, '../..'),
  targetRootDir: './',
  dryRun: false,
  yes: false,
  no: false,
  logger: {log: console.log, error: console.error, dir: nop}
};

test.serial('format should return false for well-formatted files', t => {
  return withFixtures(
      {'tsconfig.json': JSON.stringify({files: ['a.ts']}), 'a.ts': GOOD_CODE},
      async () => {
        const result = await format.format(OPTIONS, [], false);
        t.true(result);
      });
});

test.serial('format should return false for ill-formatted files', t => {
  return withFixtures(
      {'tsconfig.json': JSON.stringify({files: ['a.ts']}), 'a.ts': BAD_CODE},
      async () => {
        const result = await format.format(OPTIONS, [], false);
        t.false(result);
      });
});

test.serial('format should only look in root files', t => {
  return withFixtures(
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

test.serial('format should auto fix problems', t => {
  return withFixtures(
      {'tsconfig.json': JSON.stringify({files: ['a.ts']}), 'a.ts': BAD_CODE},
      async (fixturesDir) => {
        const result = await format.format(OPTIONS, [], true);
        t.true(result);
        const contents =
            fs.readFileSync(path.join(fixturesDir, 'a.ts'), 'utf8');
        t.deepEqual(contents, GOOD_CODE);
      });
});

test.serial('format should format files listed in tsconfig.files', t => {
  return withFixtures(
      {
        'tsconfig.json': JSON.stringify({files: ['a.ts']}),
        'a.ts': GOOD_CODE,
        'b.ts': BAD_CODE
      },
      async () => {
        const okay = await format.format(OPTIONS);
        t.true(okay);
      });
});

test.serial(
    'format should format *.ts files when no files or inlcude has been specified',
    async t => {
      return withFixtures(
          {
            'tsconfig.json': JSON.stringify({}),
            'a.ts': GOOD_CODE,
            'b.ts': BAD_CODE
          },
          async () => {
            const okay = await format.format(OPTIONS);
            t.false(okay);
          });
    });

test.serial(
    'format files listed in tsconfig.files when empty list is provided',
    async t => {
      return withFixtures(
          {
            'tsconfig.json': JSON.stringify({files: ['a.ts']}),
            'a.ts': BAD_CODE,
            'b.ts': BAD_CODE
          },
          async (fixturesDir) => {
            const okay = await format.format(OPTIONS, [], true);
            t.is(okay, true);
            const contents =
                fs.readFileSync(path.join(fixturesDir, 'a.ts'), 'utf8');
            t.deepEqual(contents, GOOD_CODE);
          });
    });

test.serial('skip files listed in exclude', t => {
  return withFixtures(
      {
        'tsconfig.json': JSON.stringify({exclude: ['b.*']}),
        'a.ts': GOOD_CODE,
        'b.ts': BAD_CODE
      },
      async () => {
        const okay = await format.format(OPTIONS);
        t.is(okay, true);
      });
});

test.serial('format globs listed in include', t => {
  return withFixtures(
      {
        'tsconfig.json': JSON.stringify({include: ['dirb/*']}),
        dira: {'a.ts': GOOD_CODE},
        dirb: {'b.ts': BAD_CODE}
      },
      async () => {
        const okay = await format.format(OPTIONS);
        t.is(okay, false);
      });
});

test.serial('format should not auto fix on dry-run', t => {
  return withFixtures(
      {'tsconfig.json': JSON.stringify({files: ['a.ts']}), 'a.ts': BAD_CODE},
      async (fixturesDir) => {
        const optionsWithDryRun = Object.assign({}, OPTIONS, {dryRun: true});
        const okay = await format.format(optionsWithDryRun, [], true);
        t.is(okay, false);
        const contents =
            fs.readFileSync(path.join(fixturesDir, 'a.ts'), 'utf8');
        t.deepEqual(contents, BAD_CODE);
      });
});

test.serial('format should use user provided config', t => {
  return withFixtures(
      {
        'tsconfig.json': JSON.stringify({files: ['a.ts']}),
        '.clang-format': 'Language: JavaScript',
        'a.ts':
            BAD_CODE  // but actually good under the custom JS format config.
      },
      async () => {
        const result = await format.format(OPTIONS, [], false);
        t.true(result);
      });
});
