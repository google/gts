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
import * as chalk from 'chalk';
import * as cp from 'child_process';
import * as inquirer from 'inquirer';
import * as path from 'path';

import {Options} from './cli';
import {readFilep as read, readJsonp as readJson, writeFileAtomicp as write} from './util';

interface Bag<T> {
  [script: string]: T;
}

async function query(
    message: string, question: string, defaultVal: boolean,
    options: Options): Promise<boolean> {
  if (options.yes) {
    return true;
  }

  if (message) {
    options.logger.log(message);
  }

  const answers = await inquirer.prompt(
      {type: 'confirm', name: 'query', message: question, default: defaultVal});
  return answers.query;
}

async function addScripts(
    packageJson: any, options: Options): Promise<boolean> {
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
    packageJson: any, options: Options): Promise<boolean> {
  let edits = false;
  const deps: Bag<string> = {'gts': 'latest', 'typescript': '^2.4.1'};

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

async function writePackageJson(
    packageJson: any, options: Options): Promise<void> {
  options.logger.log('Writing package.json...');
  if (!options.dryRun) {
    try {
      await write('./package.json', JSON.stringify(packageJson, null, '  '));
    } catch (err) {
      throw err;
    }
  }
  const preview = {
    scripts: packageJson.scripts,
    devDependencies: packageJson.devDependencies
  };
  options.logger.dir(preview);
}

async function generateTsConfig(options: Options): Promise<void> {
  let existing;
  try {
    existing = await read('./tsconfig.json', 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      /* not found, create it. */
    } else {
      throw new Error(`Unknown error reading tsconfig.json: ${err.message}`);
    }
  }

  // typescript expects relative paths to start with './'.
  const baseConfig = './' +
      path.relative(
          options.targetRootDir,
          path.resolve(options.gtsRootDir, 'tsconfig-google.json'));
  const tsconfig = JSON.stringify(
      {
        extends: baseConfig,
        compilerOptions: {rootDir: '.', outDir: 'build'},
        include: ['src/*.ts', 'src/**/*.ts', 'test/*.ts', 'test/**/*.ts'],
        exclude: ['node_modules']
      },
      null, '  ');  // TODO: preserve the indent from the input file.

  let writeTsConfig = true;
  if (existing && existing === tsconfig) {
    options.logger.log('No edits needed in tsconfig.json.');
    return;
  } else if (existing) {
    writeTsConfig = await query(
        `${chalk.bold('tsconfig.json')} already exists`, 'Overwrite', false,
        options);
  }

  if (writeTsConfig) {
    options.logger.log('Writing tsconfig.json...');
    if (!options.dryRun) {
      try {
        await write('./tsconfig.json', tsconfig);
      } catch (err) {
        throw err;
      }
    }
    options.logger.dir(JSON.parse(tsconfig));
  }
}

export async function init(options: Options): Promise<boolean> {
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

    try {
      // TODO(ofrobots): add proper error handling.
      cp.spawnSync('npm', ['init', '-y']);
      packageJson = await readJson('./package.json');
    } catch (err2) {
      throw err2;
    }
  }

  const addedDeps = await addDependencies(packageJson, options);
  const addedScripts = await addScripts(packageJson, options);
  if (addedDeps || addedScripts) {
    await writePackageJson(packageJson, options);
  } else {
    options.logger.log('No edits needed in package.json.');
  }
  await generateTsConfig(options);
  return true;
}
