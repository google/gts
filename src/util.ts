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

import * as fs from 'fs';
import * as glob from 'glob';
import * as pify from 'pify';
import * as rimraf from 'rimraf';

export const globp = pify(glob);
export const readFilep = pify(fs.readFile);
export const readJsonp = pify(require('read-package-json'));
export const rimrafp = pify(rimraf);
export const writeFileAtomicp = pify(require('write-file-atomic'));
