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
import chalk from 'chalk';
import * as cp from 'child_process';
import * as inquirer from 'inquirer';
import * as path from 'path';

import {Options} from './cli';
import {readFilep as read, readJsonp as readJson, writeFileAtomicp as write} from './util';

const pkg = require('../../package.json');

const DEFUALT_PACKAGE_JSON: PackageJson = {
  name: '',
  version: '0.0.0',
  description: '',
  main: 'build/src/index.js',
  types: 'build/src/index.d.ts',
  files: ['build/src'],
  license: 'Apache-2.0',
  keywords: [],
  scripts: {test: 'echo "Error: no test specified" && exit 1'}
};

export interface Bag<T> {
  [script: string]: T;
}

// TODO: is this type available from definitelytyped.org? Find it, and drop the
// local definition.
export interface PackageJson {
  version?: string;
  devDependencies?: Bag<string>;
  scripts?: Bag<string>;
  name: string;
  description: string;
  main: string;
  types: string;
  files: string[];
  license: string;
  keywords: string[];
}

async function query(
    message: string, question: string, defaultVal: boolean,
    options: Options): Promise<boolean> {
  if (options.yes) {
    return true;
  } else if (options.no) {
    return false;
  }

  if (message) {
    options.logger.log(message);
  }

  const answers: inquirer.Answers = await inquirer.prompt(
      {type: 'confirm', name: 'query', message: question, default: defaultVal});
  return answers.query;
}

async function addScripts(
    packageJson: PackageJson, options: Options): Promise<boolean> {
  let edits = false;
  const scripts: Bag<string> = {
    check: `gts check`,
    clean: 'gts clean',
    compile: `tsc -p .`,
    fix: `gts fix`,
    prepare: `npm run compile`,
    pretest: `npm run compile`,
    posttest: `npm run check`
  };

  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }

  for (const script of Object.keys(scripts)) {
    let install = true;
    const existing = packageJson.scripts[script];
    const target = scripts[script];

    if (existing !== target) {
      if (existing) {
        const message =
            `package.json already has a script for ${chalk.bold(script)}:\n` +
            `-${chalk.red(existing)}\n+${chalk.green(target)}`;
        install = await query(message, 'Replace', false, options);
      }

      if (install) {
        packageJson.scripts[script] = scripts[script];
        edits = true;
      }
    }
  }
  return edits;
}

async function addDependencies(
    packageJson: PackageJson, options: Options): Promise<boolean> {
  let edits = false;
  const deps: Bag<string> = {'gts': `^${pkg.version}`, 'typescript': '~2.8.0'};

  if (!packageJson.devDependencies) {
    packageJson.devDependencies = {};
  }

  for (const dep of Object.keys(deps)) {
    let install = true;
    const existing = packageJson.devDependencies[dep];
    const target = deps[dep];

    if (existing !== target) {
      if (existing) {
        const message = `Already have devDependency for ${chalk.bold(dep)}:\n` +
            `-${chalk.red(existing)}\n+${chalk.green(target)}`;
        install = await query(message, 'Overwrite', false, options);
      }

      if (install) {
        packageJson.devDependencies[dep] = deps[dep];
        edits = true;
      }
    }
  }

  return edits;
}

function formatJson(object: {}) {
  // TODO: preserve the indent from the input file.
  const json = JSON.stringify(object, null, '  ');
  return `${json}\n`;
}

async function writePackageJson(
    packageJson: PackageJson, options: Options): Promise<void> {
  options.logger.log('Writing package.json...');
  if (!options.dryRun) {
    await write('./package.json', formatJson(packageJson));
  }
  const preview = {
    scripts: packageJson.scripts,
    devDependencies: packageJson.devDependencies
  };
  options.logger.dir(preview);
}

async function generateTsLintConfig(options: Options): Promise<void> {
  const config = formatJson({extends: 'gts/tslint.json'});
  return generateConfigFile(options, './tslint.json', config);
}

async function generateTsConfig(options: Options): Promise<void> {
  const config = formatJson({
    extends: './node_modules/gts/tsconfig-google.json',
    compilerOptions: {rootDir: '.', outDir: 'build'},
    include: ['src/*.ts', 'src/**/*.ts', 'test/*.ts', 'test/**/*.ts']
  });
  return generateConfigFile(options, './tsconfig.json', config);
}

async function generateClangFormat(options: Options): Promise<void> {
  const style = await read(path.join(__dirname, '../../.clang-format'), 'utf8');
  return generateConfigFile(options, './.clang-format', style);
}

async function generateConfigFile(
    options: Options, filename: string, contents: string) {
  let existing;
  try {
    existing = await read(filename, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      /* not found, create it. */
    } else {
      throw new Error(`Unknown error reading ${filename}: ${err.message}`);
    }
  }

  let writeFile = true;
  if (existing && existing === contents) {
    options.logger.log(`No edits needed in ${filename}`);
    return;
  } else if (existing) {
    writeFile = await query(
        `${chalk.bold(filename)} already exists`, 'Overwrite', false, options);
  }

  if (writeFile) {
    options.logger.log(`Writing ${filename}...`);
    if (!options.dryRun) {
      await write(filename, contents);
    }
    options.logger.log(contents);
  }
}

export async function init(options: Options): Promise<boolean> {
  let generatedPackageJson = false;
  let packageJson;
  try {
    packageJson = await readJson('./package.json');
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw new Error(`Unable to open package.json file: ${err.message}`);
    }
    const generate = await query(
        `${chalk.bold('package.json')} does not exist.`, `Generate`, true,
        options);

    if (!generate) {
      options.logger.log('Please run from a directory with your package.json.');
      return false;
    }

    packageJson = DEFUALT_PACKAGE_JSON;
    generatedPackageJson = true;
  }

  const addedDeps = await addDependencies(packageJson, options);
  const addedScripts = await addScripts(packageJson, options);
  if (generatedPackageJson || addedDeps || addedScripts) {
    await writePackageJson(packageJson, options);
  } else {
    options.logger.log('No edits needed in package.json.');
  }
  await generateTsConfig(options);
  await generateTsLintConfig(options);
  await generateClangFormat(options);

  // Run `npm install` after initial setup so `npm run check` works right away.
  if (!options.dryRun) {
    // --ignore-scripts so that compilation doesn't happen because there's no
    // source files yet.
    cp.spawnSync('npm', ['install', '--ignore-scripts'], {stdio: 'inherit'});
  }

  return true;
}
