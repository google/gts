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

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

import { Options } from '../src/cli';
import * as format from '../src/format';
import { nop } from '../src/util';

import { withFixtures } from './fixtures';

describe('format', () => {
  const BAD_CODE = 'export const foo = [ "2" ];';
  const GOOD_CODE = "export const foo = ['2'];\n";
  const CODE_WITH_TABS = `module.exports = {
\treallyLongIdentified: 4,
\tanotherSuperLongIdentifier,
\tthisCannotFitOnTheSameLine
};\n`;
  const PRETTIER_FORMAT_MESSAGE =
    'prettier reported errors... run `gts fix` to address.';

  const OPTIONS: Options = {
    gtsRootDir: path.resolve(__dirname, '../..'),
    targetRootDir: './',
    dryRun: false,
    yes: false,
    no: false,
    logger: { log: console.log, error: console.error, dir: nop },
  };

  it('format should return true for well-formatted files', () => {
    return withFixtures(
      {
        'tsconfig.json': JSON.stringify({ files: ['a.ts'] }),
        'a.ts': GOOD_CODE,
      },
      async () => {
        const result = await format.format(OPTIONS, [], false);
        assert.strictEqual(result, true);
      }
    );
  });

  it('format should return false for ill-formatted files', () => {
    return withFixtures(
      {
        'tsconfig.json': JSON.stringify({ files: ['a.ts'] }),
        'a.ts': BAD_CODE,
      },
      async () => {
        const result = await format.format(OPTIONS, [], false);
        assert.strictEqual(result, false);
      }
    );
  });

  it('format should only look in root files', () => {
    return withFixtures(
      {
        'tsconfig.json': JSON.stringify({ files: ['a.ts'] }),
        'a.ts': "import { foo } from './b';\n",
        'b.ts': BAD_CODE,
      },
      async () => {
        const result = await format.format(OPTIONS, [], false);
        assert.strictEqual(result, true);
      }
    );
  });

  it('format should auto fix problems', () => {
    return withFixtures(
      {
        'tsconfig.json': JSON.stringify({ files: ['a.ts'] }),
        'a.ts': BAD_CODE,
      },
      async fixturesDir => {
        const result = await format.format(OPTIONS, [], true);
        assert.strictEqual(result, true);
        const contents = fs.readFileSync(
          path.join(fixturesDir, 'a.ts'),
          'utf8'
        );
        assert.deepStrictEqual(contents, GOOD_CODE);
      }
    );
  });

  it('format should format files listed in tsconfig.files', () => {
    return withFixtures(
      {
        'tsconfig.json': JSON.stringify({ files: ['a.ts'] }),
        'a.ts': GOOD_CODE,
        'b.ts': BAD_CODE,
      },
      async () => {
        const okay = await format.format(OPTIONS);
        assert.strictEqual(okay, true);
      }
    );
  });

  it('format should format *.ts files when no files or include has been specified', () => {
    return withFixtures(
      {
        'tsconfig.json': JSON.stringify({}),
        'a.ts': GOOD_CODE,
        'b.ts': BAD_CODE,
      },
      async () => {
        const okay = await format.format(OPTIONS);
        assert.strictEqual(okay, false);
      }
    );
  });

  it('format files listed in tsconfig.files when empty list is provided', () => {
    return withFixtures(
      {
        'tsconfig.json': JSON.stringify({ files: ['a.ts'] }),
        'a.ts': BAD_CODE,
        'b.ts': BAD_CODE,
      },
      async fixturesDir => {
        const okay = await format.format(OPTIONS, [], true);
        assert.strictEqual(okay, true);
        const contents = fs.readFileSync(
          path.join(fixturesDir, 'a.ts'),
          'utf8'
        );
        assert.deepStrictEqual(contents, GOOD_CODE);
      }
    );
  });

  it('skip files listed in exclude', () => {
    return withFixtures(
      {
        'tsconfig.json': JSON.stringify({ exclude: ['b.*'] }),
        'a.ts': GOOD_CODE,
        'b.ts': BAD_CODE,
      },
      async () => {
        const okay = await format.format(OPTIONS);
        assert.strictEqual(okay, true);
      }
    );
  });

  it('format globs listed in include', () => {
    return withFixtures(
      {
        'tsconfig.json': JSON.stringify({ include: ['dirb/*'] }),
        dira: { 'a.ts': GOOD_CODE },
        dirb: { 'b.ts': BAD_CODE },
      },
      async () => {
        const okay = await format.format(OPTIONS);
        assert.strictEqual(okay, false);
      }
    );
  });

  it('format should not auto fix on dry-run', () => {
    return withFixtures(
      {
        'tsconfig.json': JSON.stringify({ files: ['a.ts'] }),
        'a.ts': BAD_CODE,
      },
      async fixturesDir => {
        const optionsWithDryRun = Object.assign({}, OPTIONS, { dryRun: true });
        const okay = await format.format(optionsWithDryRun, [], true);
        assert.strictEqual(okay, false);
        const contents = fs.readFileSync(
          path.join(fixturesDir, 'a.ts'),
          'utf8'
        );
        assert.deepStrictEqual(contents, BAD_CODE);
      }
    );
  });

  it('format should return false on code with tabs', () => {
    return withFixtures(
      {
        'tsconfig.json': JSON.stringify({ files: ['tabs.ts'] }),
        'tabs.ts': CODE_WITH_TABS,
      },
      async () => {
        const result = await format.format(OPTIONS, [], false);
        assert.strictEqual(result, false);
      }
    );
  });

  it('format should use user provided prettier.config.js', () => {
    return withFixtures(
      {
        'tsconfig.json': JSON.stringify({ files: ['tabs.ts'] }),
        'prettier.config.js': `module.exports = { useTabs: true }`,
        'tabs.ts': CODE_WITH_TABS,
      },
      async () => {
        const result = await format.format(OPTIONS, [], false);
        assert.strictEqual(result, true);
      }
    );
  });

  it('format should use user provided .prettierrc', () => {
    return withFixtures(
      {
        'tsconfig.json': JSON.stringify({ files: ['tabs.ts'] }),
        '.prettierrc': `useTabs: true\n`,
        'tabs.ts': CODE_WITH_TABS,
      },
      async () => {
        const result = await format.format(OPTIONS, [], false);
        assert.strictEqual(result, true);
      }
    );
  });

  it('format should prefer the files parameter over options', () => {
    return withFixtures(
      {
        'tsconfig.json': JSON.stringify({ files: ['a.ts'] }),
        'a.ts': BAD_CODE,
        'good.ts': GOOD_CODE,
      },
      async () => {
        const result = await format.format(OPTIONS, ['good.ts'], false);
        assert.strictEqual(result, true);
      }
    );
  });

  it('format should print suggestions for fixes for ill-formatted file', () => {
    return withFixtures(
      {
        'tsconfig.json': JSON.stringify({ files: ['a.ts'] }),
        'a.ts': BAD_CODE,
      },
      async () => {
        let output = '';
        const newLogger = Object.assign({}, OPTIONS.logger, {
          log: (n: string) => {
            output += n;
          },
        });
        const options = Object.assign({}, OPTIONS, { logger: newLogger });

        await format.format(options, [], false);
        assert.notStrictEqual(output.search(PRETTIER_FORMAT_MESSAGE), -1);
        assert.notStrictEqual(output.indexOf("+export const foo = ['2'];"), -1);
        assert.notStrictEqual(
          output.indexOf('-export const foo = [ "2" ];'),
          -1
        );
      }
    );
  });

  it('formatting output should display unicode characters correctly', () => {
    return withFixtures(
      {
        'tsconfig.json': JSON.stringify({ files: ['a.ts'] }),
        'a.ts': "//🦄 This is a comment 🌷🏳️‍🌈	— /\nconst variable =    '5'",
      },
      async () => {
        let output = '';
        const newLogger = Object.assign({}, OPTIONS.logger, {
          log: (n: string) => {
            output += n;
          },
        });
        const options = Object.assign({}, OPTIONS, { logger: newLogger });

        await format.format(options, [], false);
        assert.notStrictEqual(output.search(PRETTIER_FORMAT_MESSAGE), -1);
        assert.notStrictEqual(
          output.indexOf('//🦄 This is a comment 🌷🏳️‍🌈	—'),
          -1
        );
        assert.notStrictEqual(output.indexOf("const variable = '5'"), -1);
      }
    );
  });

  // Files that cannot be formatted should be left untouched.
  it('format should leave the kitty unharmed', () => {
    const KITTY = `
    /\\**/\\
    ( o_o  )_)
    ,(u  u  ,),
  {}{}{}{}{}{}`;

    return withFixtures(
      {
        'tsconfig.json': JSON.stringify({ files: ['a.ts'] }),
        'a.ts': BAD_CODE,
        'kitty.kitty': KITTY,
      },
      async fixturesDir => {
        const result = await format.format(OPTIONS, ['kitty.kitty'], true);
        assert.strictEqual(result, false); // Well structured JS, the kitty is not.
        // Well structured or not, the kitty should be left alone.
        const contents = fs.readFileSync(
          path.join(fixturesDir, 'kitty.kitty'),
          'utf8'
        );
        assert.deepStrictEqual(contents, KITTY);
      }
    );
  });
});
