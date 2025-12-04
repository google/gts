'use strict';
const config = require('./src/index.js');
const ignores = require('./eslint.ignores.js');
const defineConfig = require('eslint/config').defineConfig;

module.exports = defineConfig([{ignores}, ...config]);
