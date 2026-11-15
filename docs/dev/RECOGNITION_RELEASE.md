# Putting the recogniser's files up: what the owner does

Text recognition fetches its engine and each language's data from this
repository's release assets. **Nothing is there yet.** Until the files are put
up, **Download and recognise** fails with a clear message ("… could not be
fetched …"), and recognition works only where the files have been put into
the plugin's folder by hand. Putting them up is publishing, so it is left to
the owner. It has to happen before, or together with, the first release of
the plugin that has text recognition.

## What is put up

One GitHub release, tagged **`recognition-1`**, with these six files as
assets, under exactly these names (the plugin asks for them by name, at
`https://github.com/elias-sundqvist/obsidian-annotator/releases/download/recognition-1/<name>`):

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `tesseract-core-0.11.0.wasm` | 1,839,004 | `3822dc6ee83d507f2bd2f83b97a3dd5dabf3ea71a9836d951602c9054615137e` |
| `eng-1.0.0.traineddata.gz` | 2,952,873 | `45b4cb346724ac1774f1c36f42f182b887bcdb28ebe63e6fff90ac41f3fcff91` |
| `fra-1.0.0.traineddata.gz` | 707,406 | `d611139672b3752c7097e671e4a1d9209dfd37f2aeb081ef6487fba3351e9255` |
| `deu-1.0.0.traineddata.gz` | 1,333,102 | `306c4280d0cbed46fbff727486bd43b92730181bae80f56941a091f363bdf28b` |
| `spa-1.0.0.traineddata.gz` | 2,100,190 | `40be52f97b5d4eb7460073dc1f94cd546b27150333c0bf854ed7e7132db6bceb` |
| `swe-1.0.0.traineddata.gz` | 2,503,095 | `b60d9fea7e570d11d6fdf26c8d0ef1d63b49222313773ce66777ed08fa20dc5a` |

and, beside them, `NOTICE.txt` (where each file comes from), `SHA256SUMS`,
`TESSERACT_WASM_LICENSE.txt` and `APACHE_LICENSE_2.0.txt`.

The same sizes and checksums are written in `src/scan-manifest.ts`. The
plugin refuses a file that differs by one byte, so a wrong upload cannot be
used; it can only fail to work.

The files are the published ones, unchanged: the engine is
`dist/tesseract-core.wasm` of the npm package `tesseract-wasm` 0.11.0; each
language is `4.0.0_best_int/<language>.traineddata.gz` of the npm package
`@tesseract.js-data/<language>` 1.0.0. `test/scan-read.test.mjs` compares
the checksums above with the packages `package-lock.json` names.

## The steps

On a checkout of the commit to be released:

```bash
npm ci
```

```bash
npm run build
```

```bash
node tools/recognition-assets.mjs
```

The last command gathers the files into `dist/recognition`, refusing any
whose checksum is not the one in the plugin's code, and prints what it
gathered. Then the release itself (this is the step that publishes):

```bash
gh release create recognition-1 dist/recognition/* --repo elias-sundqvist/obsidian-annotator --title "Files for text recognition (1)" --notes-file dist/recognition/NOTICE.txt
```

The release is not a version of the plugin: mark it as a pre-release or
leave it as it is, but do not mark it "latest", or Obsidian's "latest
release" of the plugin would point at it. With `gh`, add
`--latest=false` to the command above.

To check afterwards, without the plugin:

```bash
curl -sL https://github.com/elias-sundqvist/obsidian-annotator/releases/download/recognition-1/tesseract-core-0.11.0.wasm | shasum -a 256
```

It must print `3822dc6e…137e`. In Obsidian: open a scanned PDF on a device
that has never recognised text, run **Recognise text…**, and the dialog must
say what it needs and from `github.com`; after **Download and recognise**
the settings list the recogniser and the language as "On this device".

## When something changes later

- **Another language:** add it to `SCAN_LANGUAGES` in `src/scan-manifest.ts`
  with the size and SHA-256 of its published file, add its package to the
  development dependencies (the test then checks the pin), run the tool
  again, and upload the one new file to the same release
  (`gh release upload recognition-1 dist/recognition/<file>`).
- **A newer engine or newer data:** the file gets a new name (its version is
  in its name) and a new entry; old plugin versions keep asking for the old
  name, so old files are never replaced or removed.
- **Another host:** `SCAN_FILES_FROM` in `src/scan-manifest.ts` is the one
  place that says where the files are fetched from.

## The question for the Obsidian team

Obsidian's developer policies say a plugin must not "install or update
themselves or their dependencies", and allow network use that the README
explains. Whether fetching a WebAssembly engine on demand falls under the
first is theirs to say. Whether to ask is the owner's decision. If he asks,
this is what would be sent (to the plugin review channel, or as a question
in the developer forum):

> **Fetching a pinned WebAssembly engine on demand: is this within the developer policies?**
>
> Annotator (`obsidian-annotator`) is adding text recognition for scanned
> PDFs. The recogniser is Tesseract built to WebAssembly (1.8 MB) with a
> language's data (0.7 to 3 MB). Carrying them in `main.js` would make the
> plugin four times its size for every user, most of whom never open a scan,
> so we would like to fetch them on first use instead. Before releasing it we
> want to be sure this is in keeping with "Plugins must not install or
> update themselves or their dependencies".
>
> What the plugin does:
>
> - Nothing is fetched until the user presses a button in a dialog that names
>   each file, its size and the host. Never at start-up or in the background.
> - Only two kinds of file are fetched: the engine's `.wasm` and a language's
>   data. **No JavaScript is fetched.** The script that drives the engine is
>   part of `main.js` and is reviewed with it.
> - Each file's size and SHA-256 are written in the plugin's source. A file
>   is checked after download and again each time it is loaded; one that
>   differs is deleted and refused. So the engine cannot change without a new
>   release of the plugin: there is no update channel.
> - The files come from the plugin's own GitHub release assets, the same
>   host the plugin itself is installed from, and are the unchanged files of
>   the published npm packages (`tesseract-wasm`, `@tesseract.js-data/*`).
> - The engine runs in a Web Worker with `fetch`, `XMLHttpRequest`,
>   `WebSocket` and `importScripts` removed; it is handed pixels and returns
>   words. Recognition runs on the device; no document content leaves it.
> - The README has a "Network use" paragraph that says all of this, and the
>   settings list the fetched files with a Remove button.
>
> Is this acceptable as it is? If not, would either of these be: carrying
> the engine inside `main.js` and fetching only the language data, or
> shipping the engine as a separate companion plugin through the directory?

If the answer is no, the change is small and in one place: where the
engine's bytes come from (`startRecogniser` in `src/main.ts` and
`src/scan-manifest.ts`). Carrying the engine in `main.js` would add about
2.5 MB to it (the 1.8 MB engine as text).
