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
import * as path from 'path';

import {Options} from '../src/cli';
import * as lint from '../src/lint';
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

const BAD_CODE = `throw 'hello world';`;
const GOOD_CODE = `throw new Error('hello world');`;

test.serial('createProgram should return an object', async t => {
  await withFixtures({'tsconfig.json': '{}'}, async () => {
    const program = lint.createProgram(OPTIONS);
    t.truthy(program);
  });
});

test.serial('lint should return true on good code', async t => {
  await withFixtures(
      {
        'tsconfig.json': JSON.stringify({files: ['a.ts']}),
        'a.ts': GOOD_CODE,
      },
      async () => {
        const okay = lint.lint(OPTIONS);
        t.is(okay, true);
      });
});

test.serial('lint should return false on bad code', async t => {
  await withFixtures(
      {
        'tsconfig.json': JSON.stringify({files: ['a.ts']}),
        'a.ts': BAD_CODE,
      },
      async () => {
        const okay = lint.lint(OPTIONS);
        t.is(okay, false);
      });
});

test.serial('lint should lint files listed in tsconfig.files', async t => {
  await withFixtures(
      {
        'tsconfig.json': JSON.stringify({files: ['a.ts']}),
        'a.ts': GOOD_CODE,
        'b.ts': BAD_CODE
      },
      async () => {
        const okay = lint.lint(OPTIONS);
        t.is(okay, true);
      });
});

test.serial(
    'lint should lint *.ts files when no files or inlcude has been specified',
    async t => {
      await withFixtures(
          {
            'tsconfig.json': JSON.stringify({}),
            'a.ts': GOOD_CODE,
            'b.ts': BAD_CODE
          },
          async () => {
            const okay = lint.lint(OPTIONS);
            t.is(okay, false);
          });
    });

test.serial('lint should not lint files listed in exclude', async t => {
  await withFixtures(
      {
        'tsconfig.json': JSON.stringify({exclude: ['b.*']}),
        'a.ts': GOOD_CODE,
        'b.ts': BAD_CODE
      },
      async () => {
        const okay = lint.lint(OPTIONS);
        t.is(okay, true);
      });
});

test.serial('lint should lint globs listed in include', async t => {
  await withFixtures(
      {
        'tsconfig.json': JSON.stringify({include: ['dirb/*']}),
        dira: {'a.ts': GOOD_CODE},
        dirb: {'b.ts': BAD_CODE}
      },
      async () => {
        const okay = lint.lint(OPTIONS);
        t.is(okay, false);
      });
});

test.serial('lint should lint only specified files', async t => {
  await withFixtures(
      {
        'tsconfig.json': JSON.stringify({}),
        dira: {'a.ts': GOOD_CODE},
        dirb: {'b.ts': BAD_CODE}
      },
      async () => {
        const aOkay = lint.lint(OPTIONS, ['dira/a.ts']);
        t.is(aOkay, true);
        const bOkay = lint.lint(OPTIONS, ['dirb/b.ts']);
        t.is(bOkay, false);
      });
});

test.serial('lint should not throw for unrecognized files', async t => {
  await withFixtures(
      {
        'tsconfig.json': JSON.stringify({}),
        'a.ts': GOOD_CODE,
      },
      async () => {
        lint.lint(OPTIONS, ['z.ts']);
        t.pass();
      });
});

test.serial('lint should prefer user config file over default', async t => {
  const CUSTOM_LINT_CODE = 'const t: Object;';

  // By defualt the above should fail lint.
  await withFixtures(
      {
        'tsconfig.json': JSON.stringify({files: ['a.ts']}),
        'a.ts': CUSTOM_LINT_CODE
      },
      async () => {
        const okay = lint.lint(OPTIONS);
        t.is(okay, false);
      });

  // User should be able to override the default config.
  await withFixtures(
      {
        'tsconfig.json': JSON.stringify({files: ['a.ts']}),
        'tslint.json': JSON.stringify({}),
        'a.ts': CUSTOM_LINT_CODE
      },
      async () => {
        const okay = lint.lint(OPTIONS);
        t.is(okay, true);
      });
});

// TODO: test for when tsconfig.json is missing.
