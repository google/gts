/**
 * Copyright 2018 Google LLC
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
import * as cp from 'child_process';
import * as execa from 'execa';
import * as path from 'path';
import * as ts from 'typescript';

import {Options} from './cli';

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: path => path,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => ts.sys.newLine
};

// Use the TypeScript compiler API to implement watch.
// See: https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
export function watch(options: Options) {
  const tsconfigPath = path.join(options.targetRootDir, 'tsconfig.json');

  // Incremental builder that emits.
  const createProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram;

  const host = ts.createWatchCompilerHost(
      tsconfigPath, {}, ts.sys, createProgram, reportDiagnostic,
      reportWatchStatusChanged);

  const origAfterProgramCreate = host.afterProgramCreate;
  host.afterProgramCreate = program => {
    const ret = origAfterProgramCreate!(program);
    const errors = program.getSemanticDiagnostics().length +
        program.getSyntacticDiagnostics().length;

    const command = (errors === 0 && options.thenCommand) ||
        (errors !== 0 && options.elseCommand) || null;

    if (command) {
      const child = execa.shell(command);
      child.stdout.pipe(process.stdout);
      child.stderr.pipe(process.stderr);
    }
    return ret;
  };

  ts.createWatchProgram(host);
  return true;
}

function reportDiagnostic(diagnostic: ts.Diagnostic) {
  console.error(
      `Error ${diagnostic.code}:`,
      ts.flattenDiagnosticMessageText(
          diagnostic.messageText, formatHost.getNewLine()));
}

function reportWatchStatusChanged(diagnostic: ts.Diagnostic) {
  console.info(ts.formatDiagnostic(diagnostic, formatHost));
}
