# Contributing to obsidian-annotator

Thinks for contributing to `obsidian-annotator` and helping make it better!

## Issues

Feel free to pick up any existing issue that looks interesting to you, or fix a bug you encountered while using `obsidian-annotator`. No matter the size, we welcome all improvements.

## Building

### Setting up dev environment

You'll want to install the following on your machine:
- [NodeJS](https://nodejs.org/en/download/)
- [Yarn](https://yarnpkg.com/) *required by submodule*
- It also possible to use [pnpm](https://pnpm.js.org) instead of `npm`

### Clone with SUBMODULE

```bash
git clone git@github.com:elias-sundqvist/obsidian-annotator.git
git submodule init
git submodule update
```

### Download dependencies

Run `npm install` to download all necessary dependencies.

### Building on Windows requires additional changes

1. Go to `.\submodules\hypothesis-client-annotator-fork\node_modules\@hypothesis\frontend-build\lib\rollup.js`
2. Add `import { pathToFileURL } from 'url'` to the top of the file
3. Replace `import(resolve(path))` with `import(pathToFileURL(resolve(path)))`
4. Go to `.\submodules\hypothesis-client-annotator-fork\node_modules\@hypothesis\frontend-build\lib\manifest.js`
5. modify line 46 to say. `const relativePath = path.relative(manifestDir, file).replace("\\","/");`

### Building

1. `npm run build` – builds `hypothesis` submodule and `obsidian-annotator`
2. `npm run quick-build` – builds only `obsidian-annotator`
3. `npm run build-hypothesis` - build only `hypothesis` submodule

`npm run dev` recommended for active development. It builds `obsidian-annotator` on every change of code.

## Developing

### Liters and types

Project use `betterer` to improve code step by step. Please run `npm run betterer` from time to time to see if your changes made code better or worse.

When you made an improvement, run `npm run betterer -- --update` to update betterer results.

**Known problem**: Sometime betterer makes warnings about code you didn't change. In this case, run `npm run betterer -- --update` to ignore this warnings.

### Hot Reload

There are two ways to hot reload the plugin during development: automatically and semi-automatically.

#### Automatically

How to build, install and reload plugin in your test vault on every change:
1. Install [Hot reload plugin](https://github.com/pjeby/hot-reload) manually and *enable it*
2. Link repository as plugin into your test vault. `<test vault path>/.obsidian/plugins/obsidian-annotator` should refer to directory with repository
3. Run `npm run dev`

#### Semi-automatically

How to build and install plugin on every change with manual reload:
1. Create plugin's directory in your test vault. Exmaple: `<test vault path>/.obsidian/plugins/obsidian-annotator`
2. Write absolute path to plugin's directory `.vault_plugin_dir` file
3. Run `npm run dev` to build and copy plugin into you test vault on every change
4. Reopen your test vault or disable/enable plugin to see changes

## Submiting a Pull Request

Fork this repository, create a topic branch, and when ready, open a pull request from your fork.
