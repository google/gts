# Changelog

### [2.0.2](https://www.github.com/google/gts/compare/v2.0.1...v2.0.2) (2020-05-11)


### Bug Fixes

* Revert 'update dependency eslint to v7'" ([#507](https://www.github.com/google/gts/issues/507)) ([0f9950b](https://www.github.com/google/gts/commit/0f9950b273329dbcce5f3cc20864c3dcd076f08c))
* **deps:** pin release of eslint-typescript ([#508](https://www.github.com/google/gts/issues/508)) ([bd86b42](https://www.github.com/google/gts/commit/bd86b42e2bb904d3765dee82262e4691a11b9958))
* **deps:** update dependency eslint to v7 ([#504](https://www.github.com/google/gts/issues/504)) ([6aee159](https://www.github.com/google/gts/commit/6aee1595d0486ae2c7fd68d16b1b59c4c4015753))

### [2.0.1](https://www.github.com/google/gts/compare/v2.0.0...v2.0.1) (2020-05-07)


### Bug Fixes

* throw an error if running with an unsupported version of nodejs ([#493](https://www.github.com/google/gts/issues/493)) ([94fdf1e](https://www.github.com/google/gts/commit/94fdf1eaed634aa73c3e44c7a3d9f1325f773b07))
* **deps:** update dependency meow to v7 ([#502](https://www.github.com/google/gts/issues/502)) ([cf91cda](https://www.github.com/google/gts/commit/cf91cda1afab25759427511d3c97d0037d61c649))

## [2.0.0](https://www.github.com/google/gts/compare/v1.1.2...v2.0.0) (2020-04-02)

### ⚠ BREAKING CHANGES ⚠
This is a major rewrite of the tool.  Based on community guidance, we've switched from using [tslint](https://palantir.github.io/tslint/) to [eslint](https://eslint.org/).  *Please read all of the steps below to upgrade*.

#### Configuring `eslint`
With the shift to `eslint`, `gts` now will format and lint JavaScript *as well* as TypeScript. Upgrading will require a number of manual steps.  To format JavaScript and TypeScript, you can run:

```
$ npx gts fix
```

To specify only TypeScript:

```
$ npx gts fix '**/*.ts'
```

#### Delete `tslint.json`
This file is no longer used, and can lead to confusion.

#### Create a `.eslintrc.json`
Now that we're using eslint, you need to extend the eslint configuration baked into the module.  Create a new file named `.eslintrc.json`, and paste the following:
```js
{
  "extends": "./node_modules/gts"
}
```

#### Create a `.eslintignore`
The `.eslintignore` file lets you ignore specific directories.  This tool now lints and formats JavaScript, so it's _really_ important to ignore your build directory!  Here is an example of a `.eslintignore` file:

```
**/node_modules
build/
```

#### Rule changes
The underlying linter was changed, so naturally there are going to be a variety of rule changes along the way.  To see the full list, check out [.eslintrc.json](https://github.com/google/gts/blob/master/.eslintrc.json).

#### Require Node.js 10.x and up
Node.js 8.x is now end of life - this module now requires Ndoe.js 10.x and up.

### Features

* add the eol-last rule ([#425](https://www.github.com/google/gts/issues/425)) ([50ebd4d](https://www.github.com/google/gts/commit/50ebd4dbaf063615f4c025f567ca28076a734223))
* allow eslintrc to run over tsx files ([#469](https://www.github.com/google/gts/issues/469)) ([a21db94](https://www.github.com/google/gts/commit/a21db94601def563952d677cb0980a12b6730f4c))
* disable global rule for checking TODO comments ([#459](https://www.github.com/google/gts/issues/459)) ([96aa84a](https://www.github.com/google/gts/commit/96aa84a0a42181046daa248750cc8fef0c320619))
* override require-atomic-updates ([#468](https://www.github.com/google/gts/issues/468)) ([8105c93](https://www.github.com/google/gts/commit/8105c9334ee5104b05f6b1b2f150e51419637262))
* prefer single quotes if possible ([#475](https://www.github.com/google/gts/issues/475)) ([39a2705](https://www.github.com/google/gts/commit/39a2705e51b4b6329a70f91f8293a2d7a363bf5d))
* use eslint instead of tslint ([#400](https://www.github.com/google/gts/issues/400)) ([b3096fb](https://www.github.com/google/gts/commit/b3096fbd5076d302d93c2307bf627e12c423e726))


### Bug Fixes

* use .prettierrc.js ([#437](https://www.github.com/google/gts/issues/437)) ([06efa84](https://www.github.com/google/gts/commit/06efa8444cdf1064b64f3e8d61ebd04f45d90b4c))
* **deps:** update dependency chalk to v4 ([#477](https://www.github.com/google/gts/issues/477)) ([061d64e](https://www.github.com/google/gts/commit/061d64e29d37b93ce55228937cc100e05ddef352))
* **deps:** update dependency eslint-plugin-node to v11 ([#426](https://www.github.com/google/gts/issues/426)) ([a394b7c](https://www.github.com/google/gts/commit/a394b7c1f80437f25017ca5c500b968ebb789ece))
* **deps:** update dependency execa to v4 ([#427](https://www.github.com/google/gts/issues/427)) ([f42ef36](https://www.github.com/google/gts/commit/f42ef36709251553342e655e287e889df72ee3e3))
* **deps:** update dependency prettier to v2 ([#464](https://www.github.com/google/gts/issues/464)) ([20ef43d](https://www.github.com/google/gts/commit/20ef43d566df17d3c93949ef7db3b72ee9123ca3))
* disable no-use-before-define ([#431](https://www.github.com/google/gts/issues/431)) ([dea2c22](https://www.github.com/google/gts/commit/dea2c223d1d3a60a1786aa820eebb93be27016a7))
* **deps:** update dependency update-notifier to v4 ([#403](https://www.github.com/google/gts/issues/403)) ([57393b7](https://www.github.com/google/gts/commit/57393b74c6cf299e8ae09311f0382226b8baa3e3))
* **deps:** upgrade to meow 6.x ([#423](https://www.github.com/google/gts/issues/423)) ([8f93d00](https://www.github.com/google/gts/commit/8f93d0049337a832d9a22b6ae4e86fd41140ec56))
* align back to the google style guide ([#440](https://www.github.com/google/gts/issues/440)) ([8bd78c4](https://www.github.com/google/gts/commit/8bd78c4c78526a72400f618a95a987d2a7c1a8db))
* disable empty-function check ([#467](https://www.github.com/google/gts/issues/467)) ([6455d7a](https://www.github.com/google/gts/commit/6455d7a9d227320d3ffe1b00c9c739b846f339a8))
* drop support for node 8 ([#422](https://www.github.com/google/gts/issues/422)) ([888c686](https://www.github.com/google/gts/commit/888c68692079065f38ce66ec84472f1f3311a050))
* emit .prettierrc.js with init ([#462](https://www.github.com/google/gts/issues/462)) ([b114614](https://www.github.com/google/gts/commit/b114614d22ab5560d2d1dd5cb6695968cc80027b))
* enable trailing comma ([#470](https://www.github.com/google/gts/issues/470)) ([6518f58](https://www.github.com/google/gts/commit/6518f5843d3093e3beb7d3371b56d9aecedf3924))
* include *.tsx and *.jsx in default fix command ([#473](https://www.github.com/google/gts/issues/473)) ([0509780](https://www.github.com/google/gts/commit/050978005ad089d9b3b5d8895b25ea1175d75db2))

### [1.1.2](https://www.github.com/google/gts/compare/v1.1.1...v1.1.2) (2019-11-20)


### Bug Fixes

* **deps:** update to newest prettier (with support for optional chain) ([#396](https://www.github.com/google/gts/issues/396)) ([ce8ad06](https://www.github.com/google/gts/commit/ce8ad06c8489c44a9e2ed5292382637b3ebb7601))

### [1.1.1](https://www.github.com/google/gts/compare/v1.1.0...v1.1.1) (2019-11-11)


### Bug Fixes

* **deps:** update dependency chalk to v3 ([#389](https://www.github.com/google/gts/issues/389)) ([1ce0f45](https://www.github.com/google/gts/commit/1ce0f450677e143a27efc39def617d13c66503e8))
* **deps:** update dependency inquirer to v7 ([#377](https://www.github.com/google/gts/issues/377)) ([bf2c349](https://www.github.com/google/gts/commit/bf2c349b2208ac63e551542599ac9cd27b461338))
* **deps:** update dependency rimraf to v3 ([#374](https://www.github.com/google/gts/issues/374)) ([2058eaa](https://www.github.com/google/gts/commit/2058eaa682f4baae978b469fd708d1f866e7da74))
* **deps:** update dependency write-file-atomic to v3 ([#353](https://www.github.com/google/gts/issues/353)) ([59e6aa8](https://www.github.com/google/gts/commit/59e6aa8580a2f8e9457d2d2b6fa9e18e86347592))
