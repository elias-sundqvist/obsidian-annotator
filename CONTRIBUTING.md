# Contributing to Annotator

Thanks for helping make Annotator better. Bug reports and suggestions are
welcome as [issues](https://github.com/elias-sundqvist/obsidian-annotator/issues);
so are pull requests.

## What is where

| Folder | Holds |
| --- | --- |
| `src/` | The plugin, in TypeScript. `main.ts` is the entry. |
| `proofs/` | The rules for what is written into notes, in [Bend](https://bend-lang.com), with their laws and proofs. See [proofs/README.md](proofs/README.md). |
| `test/` | The reader's tests, their support code (`test/support/`), fixtures, and frozen copies of what the reader is compared against (`test/compat/`). |
| `docs/` | [STYLING.md](docs/STYLING.md) and [SECURITY.md](docs/SECURITY.md), the screenshots, and the development record in `docs/dev/`. |
| `styles.css`, `manifest.json`, `versions.json` | What Obsidian reads. |

## Set up

You need:

- [Node.js](https://nodejs.org) 26 or later (the tests use its test runner
  and its TypeScript support).
- Bend 2.0.40, on your `PATH` or named by `BEND_BIN`. The build compiles the
  Bend modules, so it is needed even if you never touch a proof. CI checks the
  proofs with exactly this version.

```bash
git clone https://github.com/elias-sundqvist/obsidian-annotator.git
```

```bash
npm ci
```

## Build and test

| Command | Does |
| --- | --- |
| `npm run build` | Type-checks, then builds the plugin into `dist/` and the test bundles into `test/.generated/`. |
| `npm run build:release` | The plugin only, as a release has it. |
| `npm run test:reader` | Builds, then runs the reader's tests. |
| `npm run proofs` | Checks every law, that each deliberately broken program is refused, and the tests of the bridge between Bend and JavaScript. Takes a minute or two. |
| `npm run lint` | ESLint over `src/`: the recommended rules, typescript-eslint's, and the browser-compatibility rules for the oldest browsers the plugin runs on (`browserslist` in `package.json`). No warnings allowed. |
| `npm run format` / `npm run format:check` | Prettier over `src/` (`.prettierrc.json`: 120 columns, four spaces, single quotes), to write or to check. |
| `npm test` | Proofs, then the reader's tests. |

CI runs the lint, the format check, the proofs (with the kernel check) and the reader's tests on every push and pull request.

To try a build in Obsidian, copy `dist/main.js`, `dist/manifest.json` and
`dist/styles.css` into `<vault>/.obsidian/plugins/obsidian-annotator/` and
reload the plugin. Use a vault you can afford to break.

Some checks are made by hand and are not part of `npm test`:

- `test/support/browser-*-check.mjs` and `check-automatic-captions.mjs` drive
  a real browser over one fixture each (layout of books, reading copies, the
  editor's shortcuts, transcripts). They need Playwright, which is not a
  dependency of this repository; each is named by the note in `docs/dev/`
  whose result it produced.
- `test/support/codec-bench.mjs` times the note codec.
- `test/support/ios/` runs the built plugin in iOS WebKit in the Simulator
  (its README says how).
- `npm run proofs` also has the proofs checked a second time by Bend's kernel
  where Lean 4.34.0 is installed; CI requires it.

## Rules that keep the plugin trustworthy

- **Notes are the user's.** The annotation format is the one Annotator has
  always written, and other tools read it. A change to what is written into a
  note is a change to the specification: it starts in `proofs/`, with a law.
- **Logic that decides what is stored goes in Bend**, with laws in
  `proofs/LAWS.bend` and proofs in `proofs/PROOF.bend`. Never weaken a law to
  make an implementation pass. No unsafe definitions or proof holes.
- **A shortcut around checked logic stays off until it is proved.** Tests are
  not enough for that.
- **The frozen references are not source.** `test/compat/frozen`,
  `test/compat/published` and `proofs/fixtures` say what the old plugin and
  the Hypothesis client did; the build refuses a changed copy.
- **The user's original files are not modified.** PDFs, books and saved pages
  are read; an export writes a copy.
- **The interface follows the theme.** Use Obsidian's classes and variables,
  expose what can be tuned as `--annotator-*` variables, and keep
  [STYLING.md](docs/STYLING.md) true.
- Add a test with a change, and keep `npm test` passing.

## Releasing

The version is written in `manifest.json`, `package.json`, `versions.json`
and `manifest-beta.json`; the build refuses them out of step. Pushing a tag
equal to that version runs the proofs and tests, builds, and publishes a
release with `main.js`, `manifest.json`, `styles.css` and the licences of the
bundled code.
