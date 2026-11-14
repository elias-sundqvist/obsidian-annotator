# "Open with Annotator": a plan

November 2026, against Annotator 0.3.1 and Obsidian 1.15. A plan to decide
from; nothing here is built. It was reviewed by a sceptical reader and
revised; the objections and what became of them are at the end.

The wish: a PDF or EPUB opened from outside Obsidian ("Open with…" in the file
manager, a double-click once a handler is the default, a share sheet on a
phone) ends up in the user's vault and opens in Annotator's reader, on macOS,
Windows, Linux, Android and iOS/iPadOS.

## The short version

1. **Obsidian moved first, how far is not yet known.** Since 1.14 (public,
   October 2026) desktop Obsidian lists itself under "Open with" and opens a
   file from outside the vault in a tab, in place. The public notes say this
   of Markdown files; the code of 1.15.0 applies it to any type a view is
   registered for, which would include PDF and, with Annotator, EPUB. Nobody
   has seen it open a PDF: **unconfirmed**. On Android, Obsidian's own share
   target takes a PDF and saves it into the vault.
2. **Stage 0, before anything is decided:** one live test (does "Open with →
   Obsidian" show a PDF and an EPUB, and what does Annotator 0.3.1 then do),
   and a guard so that the plugin never writes beside a file outside the
   vault. The guard is worth releasing by itself.
3. **Stage 1** is in the plugin, with no app, no accounts and no
   certificates: an address, `obsidian://annotator-open`, that scripts and
   Shortcuts can fire; an offer to copy in a file that Obsidian opened from
   outside (if stage 0 shows that it does); an item in the menu Obsidian shows
   after a file is shared to it on a phone; and recipes, printed by the
   settings with this device's values filled in.
4. **A web page gets nothing.** The address reads a file outside the vault
   only when it carries a key that this device's settings made; without the
   key no file is touched and no question is shown.
5. **What stage 1 gives, honestly:** a double-click that lands in the reader
   on macOS and Linux (after a one-time recipe); on Windows "Open with →
   Obsidian" and one button, if stage 0 passes, else a script recipe that
   flashes a window; on Android "Share → Obsidian → Import → Open in
   Annotator" for PDFs and nothing new for EPUBs; on iOS "Save to Files into
   the vault", or a Shortcut if a device test shows it works. Strictly, most
   of this is "Open with Obsidian", with Annotator taking over inside.
6. **Later, only on demand:** annotating in place without copying; a Windows
   helper through the Microsoft Store; an Android helper for EPUB. **Left
   out:** an iOS app; a notarised macOS app unless the owner wants an Apple
   developer membership anyway; anything the plugin would install by running
   commands.

## How to read the claims

| Mark | Means |
| --- | --- |
| **ran** | Executed on the development Mac or the Android emulator during this work. |
| **read (Obsidian 1.15.0)** | Read in the code Obsidian 1.15.0 runs on the desktop (`main.js` and `app.js` in its updatable archive). Read, never run. It says how that version behaves, not what Obsidian promises, and it says nothing about the installer's own shell, about the native half of the phone apps, or about any other version. |
| **read (plugin)** | Read in this repository at 0.3.1. |
| **doc** | Stated by the vendor's documentation, linked. Most pages were read by research subagents through a tool that extracts text; check a quotation against the page before printing it elsewhere. |
| **unconfirmed** | A community report, an inference, or not found. Not to be built on before the test named beside it. |

Every step-by-step under "As the user would see it" is the intended flow.
None was run end to end; each carries the mark of its weakest link.

## Experiments run

All throwaway; nothing of them is in the repository.

1. **Obsidian's declared types on macOS.** `Info.plist` of the installed
   Obsidian (an installer from 1.13.7): one URL scheme, `obsidian`; one
   document type, "All Files", with rank `None`, which by Apple's definition
   means "never selected to open files of this type, but it accepts drops".
   So with this installer Obsidian is not listed under "Open With". **ran**.
   The changelog says listing "requires the latest installer"; a newer
   installer's `Info.plist` was not seen. **unconfirmed**
2. **Obsidian 1.15.0's code**, unpacked and searched: how an address is
   parsed and routed to a vault, how a pending address is delivered after a
   cold start, what happens to a file path on the command line or in a macOS
   open-file event, how a file outside the vault is represented, and what the
   web half of the share receiver does. Findings below, each marked **read
   (Obsidian 1.15.0)**.
3. **Obsidian for Android's intent filters**, read with `dumpsys package` on
   a running emulator (Android 16, Obsidian 1.14.4). Nothing was shared to
   the app. **ran**
4. **A macOS droplet with nothing compiled.** `osacompile` made an app from a
   short AppleScript with an `on open` handler; `open -a` handed it a PDF
   whose name holds `&`, a hash sign, `%` and spaces, and an EPUB; both paths
   arrived intact. The generated `Info.plist` declares every file type, role
   Viewer, no handler rank and no bundle identifier; the bundle is ad-hoc
   signed. **ran**. This is the first link of a recipe, not the recipe.
5. **Percent-encoding a path without Python or Perl.** A POSIX `sh` function
   built on `od` and `printf` (under `dash` and `bash` on macOS, not on a
   Linux system) and JavaScript for Automation
   (`osascript -l JavaScript -e 'function run(a){return encodeURIComponent(a[0])}'`)
   gave the bytes `encodeURIComponent` gives for a path with `&`, a hash
   sign, `%`, a space and `é`; the shell function also escapes a quote, which
   decodes the same. **ran**
6. **A live check with a scratch Obsidian, abandoned.** The aim was a probe
   plugin logging what an address handler receives, warm and cold, and what a
   plugin sees when Obsidian opens an outside PDF. Finding on the way: every
   Obsidian process on macOS and Linux deletes and re-creates one per-user
   socket (`.obsidian-cli.sock` in the home folder, or in `XDG_RUNTIME_DIR`
   on Linux) when it starts, whatever its profile, so a second instance takes
   the socket from one already running. **read (Obsidian 1.15.0)**. An
   Obsidian was running, so the scratch instance was given a substitute home
   folder to keep its socket apart; it then never finished loading its vault
   and its debugging port did not answer. It was stopped and removed. Nothing
   was learned about handlers. This check is stage 0.

## What is already there

### In the plugin

- No `registerObsidianProtocolHandler` anywhere in `src/`. **read (plugin)**
- A source is opened from an annotation note: `openNoteTarget` reads the
  note's `annotation-target`; a target outside the vault goes through
  `downloadSource`, which asks (`approveSource`: "Copy this file into the
  vault?"), reads the file through one descriptor with a size limit and
  change detection (`readLocalSource`), checks its first bytes
  (`validateRemote`), has it parsed (`reviewRemote`), and writes
  `Annotator sources/<digest>.<kind>`, never over different bytes. The copy
  is tied to the outside address in `remoteSources`; a changed original is
  taken in through the revision review, which keeps the annotations with the
  version they were made on. On phones a `file:` target that was never
  copied is refused. **read (plugin)**
- A yes in `approveSource` is kept for good, in the plugin's saved data:
  after it, that address is read again without a question, also when the
  file behind it has changed. **read (plugin)**. Fine for a note the user
  wrote; not what an address from outside should inherit.
- A path is normalised lexically (`localTarget`): network paths, NUL, a
  `file:` address with a host, and encoded separators are refused. Case is
  folded on Windows only, so on a Mac with the usual case-insensitive disk a
  vault file named in other case is taken for a file outside the vault.
  **read (plugin)**
- A source view is keyed by `view.file.path` (`baseSourceKey`), with no
  check that the file is in the vault. For a file Obsidian opened from
  outside, that path begins with `file:`, and these writers derive their
  paths from it: `ensureNote` (`<path>.annotations.md`, about eight call
  sites), the PDF export (`<folder>/<name> (annotated).pdf`, beside the
  source), the archive kept when Hypothesis JSON is imported, and reading
  positions in the saved data. **read (plugin)**. Obsidian's adapter maps a
  path beginning `file:` to the path after the prefix **read (Obsidian
  1.15.0)**, so some of these may write beside the outside file. What
  really happens was not seen: **unconfirmed**, stage 0.
- The plugin registers the `epub` extension for its view. Minimum Obsidian
  is 1.11.4; the plugin is not desktop-only. **read (plugin)**

### In Obsidian

Addresses:

- Documented actions are `open`, `new`, `daily`, `unique`, `search`,
  `choose-vault` and `hook-get-address`; `vault` "can be either the vault name
  or the vault ID"; `path` is "an absolute file system path". **doc**
  ([Obsidian URI](https://obsidian.md/help/Extending+Obsidian/Obsidian+URI))
- A plugin registers its own action with `registerObsidianProtocolHandler`
  (since 0.11.0); the handler gets the decoded query as an object; a
  parameter without a value arrives as `'true'`. **doc**
  ([typings](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts))
- On desktop the routing happens before any plugin sees the address, for
  every action: a `path` parameter picks the vault that contains it, and if
  no vault contains it Obsidian shows "Vault not found" and delivers
  nothing; otherwise `vault` is matched against a vault's ID or its folder
  name (case-insensitive, first match) and removed from what the handler
  receives; otherwise the most recently focused vault window is used.
  **read (Obsidian 1.15.0)**. So a plugin's action must not call its
  outside-file parameter `path`.
- Registering an action twice throws. An address whose action nothing in
  that vault registered shows a notice that the action is invalid. When an
  address arrives the window is brought to the front. **read (Obsidian
  1.15.0)**
- Cold start: the address waits on the window and is dispatched when the
  workspace has finished loading. **read (Obsidian 1.15.0)**. That
  community plugins have loaded by then was not seen: **unconfirmed**; a
  report against Advanced URI says the handler does run, and can run before
  the vault's index knows the file. Addresses dropped on a cold start are
  reported for iOS with iCloud vaults (2025, no confirmed fix):
  **unconfirmed**.
  ([forum](https://forum.obsidian.md/t/opening-a-note-via-uri-on-ios-does-not-work-when-obsidian-hasnt-been-opened-before/104093))
- On phones `vault` is compared with the open vault's name only; when it
  differs the app reloads, keeping the address. **read (Obsidian 1.15.0)**;
  that it lands in the named vault: **unconfirmed**.
- Browsers ask before handing an address to another program, unless the user
  once chose "always allow". Common knowledge, not checked: **unconfirmed**.

Files from outside the vault:

- 1.14.2 (early access): "You can now open files from outside your vault"
  and "Obsidian now appears in your operating system's Open with menu".
  1.14.4 (public, 5 October 2026) says it of Markdown: "open individual
  Markdown files", "set it as the default app for Markdown files", "Files
  open in your current window", "requires the latest installer". Desktop
  only. **doc**
  ([1.14.2](https://obsidian.md/changelog/2026-09-15-desktop-v1.14.2/),
  [1.14.4](https://obsidian.md/changelog/2026-10-05-desktop-v1.14.4/))
- The public API has `TExternalFile extends TFile` with `getRealPath()`,
  since 1.14.4: "Represents a file that is outside the Vault. Can be used
  with the vault API just like any other file." **doc**. Note what that
  means: the vault API will write outside the vault if handed such a file or
  such a path. It is not a fence.
- A file path on the command line, or a macOS open-file event: inside a
  known vault, that vault opens it; otherwise the most recently focused
  vault opens it as an outside file whose path is `file:` followed by the
  absolute path, in a new tab, if a view is registered for its extension,
  else a notice says the type is unsupported. A second `Obsidian <path>` or
  `Obsidian obsidian://…` process hands its arguments to the running one.
  **read (Obsidian 1.15.0)**
- Whether "Open with → Obsidian" on a PDF or EPUB therefore shows it, on any
  system, with a current installer: **unconfirmed**. Against: the public
  wording, a report that on macOS 1.14.4 a file does not open when Obsidian
  was closed, and a 1.15 fix for "reopening in a loop … when it's the
  default app for a file type it can't open". For: the code, and the
  Flatpak's desktop entry, which lists `application/pdf` with
  `Exec=obsidian.sh %U`. **ran** (fetched)
  ([Flathub](https://github.com/flathub/md.obsidian.Obsidian/blob/master/md.obsidian.Obsidian.desktop),
  [forum](https://forum.obsidian.md/t/open-with-does-not-open-the-file-if-obsidian-is-not-running/119080))
- A command-line interface exists since 1.12 (off until switched on,
  desktop only) and plugins can add commands (`registerCliHandler`).
  **doc** ([CLI](https://obsidian.md/help/cli)). Not used here: an address
  needs no setting and exists on phones.

Sharing to Obsidian on a phone:

- Obsidian for Android 1.14.4 is a share target (`SEND`, `SEND_MULTIPLE`)
  for images, audio, video, `application/pdf` and plain text. It is not one
  for `application/epub+zip`, and it has no "open with" (`VIEW`) filter for
  any file type, only for the `obsidian:` scheme. **ran**. So an EPUB cannot
  be shared to it, and tapping a downloaded file never offers Obsidian.
- The web half of the receiver: files shared to the app bring up a menu with
  their names and **Import**; importing saves each where attachments go,
  then shows a second menu and fires the workspace event
  `receive-files-menu` with that menu and the saved files. **read (Obsidian
  1.15.0)**. The event is not in the published typings: **read** (typings
  for 1.11.4 and 1.14.4). The native half, the Android build that carries
  1.15, a share that starts the app, and the whole flow on a device:
  **unconfirmed**.
- iOS: a Share Sheet since 1.12.4/1.13 saves content from other apps to
  configured Locations (iOS 18 or later). **doc**
  ([iOS](https://obsidian.md/help/ios)). Whether it takes a PDF, and whether
  the app is opened at all when it does: **unconfirmed** (reports disagree).
- Vaults live, on iOS, under "On My iPhone → Obsidian" or "iCloud Drive →
  Obsidian", both in the Files app; on Android in device storage (other apps
  can reach it; needs "All files" access) or app storage (private; since
  1.8.10). **doc** ([sync](https://obsidian.md/help/sync/switch),
  [Android](https://obsidian.md/help/android))

## The two halves

**(a) Something the operating system can hand a file to**: a registered
handler for PDF and EPUB on desktop, a share target or "open in" target on a
phone.

**(b) Something in the plugin that takes the hand-over** and ends with the
file in the vault and the reader open on it.

For (a) there may be nothing to build on desktop, because Obsidian may now
be that something (**unconfirmed** for PDF and EPUB; stage 0), and on Android
it already is for PDFs. A separate helper earns its place only where that
falls short: to choose the vault, to skip Obsidian's own viewer, for EPUB on
Android, on iOS, and on desktop altogether if stage 0 fails. Half (b) is
needed in every case, and is where the work is.

## Half (b): one import, three doors

### The import

`importSource(path)` takes the absolute path of a PDF or EPUB outside the
vault, on desktop, **after** whichever door called it has established that
the user asked (each door says how). It reuses what exists rather than
adding a second way of keeping copies:

1. If the path, resolved, lies inside this vault (compared by the real path,
   so that case and symlinks do not fool it), open that vault file. Done.
2. If `remoteSources` already ties this address to a copy (the file was
   opened before, by a note or by this routine), open the note that owns it.
   If the original has changed since, say so and offer the existing
   **Refresh**, which reviews the annotations against the new version. No
   second copy, no second note.
3. Otherwise make an annotation note for it, named after the file
   (`Paper.md`), whose `annotation-target` is the outside path, and open the
   note with `openNoteTarget`. Everything after that is today's code: the
   bounded read, the byte check, the parse, the digest-named copy in
   `Annotator sources`, the revision history, reuse on a phone once the vault
   has synced.

The note is made at once, because it is what holds the target. Where it goes
and what it is called (decision 2): the folder Obsidian puts new notes in;
the file's base name with `\ / : * ? " < > |` and control characters
replaced, leading dots and trailing dots and spaces removed, in Unicode NFC,
at most 120 characters, "Source" if nothing is left; a name already taken
(compared without case, since the vault may sync to a disk that ignores it)
by a note with another target gets a number.

The alternative, a copy under its own name (`Annotator sources/Paper.pdf`)
and no note until the first annotation, reads better in the file list but
needs a second record of imports, its own answer to "the file changed"
(without one, a re-downloaded paper becomes `Paper 1.pdf` with no
highlights), cross-platform rules for the copy's name, and it makes a bare
link `Paper.pdf` ambiguous with the user's own files. It is decision 2's
other option, not the recommendation.

What the import never does: write, change or delete anything outside the
vault; overwrite anything inside it.

### Door 1: a file Obsidian opened from outside the vault (desktop)

If stage 0 shows that Obsidian opens outside PDFs and EPUBs:

- The reader recognises the file (`'getRealPath' in file`, so the minimum
  Obsidian version need not rise) and treats it as not annotatable where it
  lies: no note, no export, no position, nothing derived from its path
  (stage 0's guard).
- A notice in the view itself, not only in the sidebar (the sidebar may be
  set not to come forward), says: "This file is outside your vault." with
  **Copy into the vault and annotate**. Pressing it is the user's yes; it
  runs `importSource` and shows the copy in the same tab.
- Opening the same outside file again shows it outside again, with the same
  notice; the button then goes straight to the existing copy and its note.
  (Switching by itself would be kinder, and is a later refinement: it means
  acting without a press.)

Its limits: the vault is whichever was focused last; Obsidian's viewer shows
first and one press is needed per opening; users must have reinstalled
Obsidian with a current installer; the feature is a month old.

### Door 2: the address `obsidian://annotator-open`

For recipes, Shortcuts and any later helper, on every platform.

```
obsidian://annotator-open?vault=<vault>&file=<path in the vault>             everywhere
obsidian://annotator-open?vault=<vault>&key=<key>&source=<absolute path>     desktop
```

| Parameter | Meaning |
| --- | --- |
| `vault` | Optional. Read by Obsidian, not by the plugin: a vault's name, or on desktop its ID. Recipes give the ID on desktop (no encoding needed, survives a rename, tells apart two vaults whose folders share a name) and the name on phones. |
| `file` | A path from the vault's root to a PDF or EPUB that is already in the vault. The form for phones, where something else has first put the file there. |
| `source` | An absolute path, or a `file:` address, of a PDF or EPUB on this computer. Desktop only. Named `source` because Obsidian consumes `path` itself. |
| `key` | Required with `source`. A random value this device's settings made and wrote into the recipe. |

Exactly one of `file` and `source`. Other parameters are ignored. None names
where anything is written; there is no web address, no callback, no way to
open a note.

Stability: a recipe is frozen on the user's machine, so the action's name
and these four parameters keep their meaning for good. If the meaning must
change, a new action name is added and this one keeps working.

`file`:

- The path is refused unless, after normalising, it is relative, has no
  `..`, no backslash, no leading slash, no part beginning with a dot
  (which covers the configuration folder), ends in `.pdf` or `.epub`
  (any case), and names a file, not a folder.
- If the vault knows the file, it is opened in the reader. Nothing is asked
  and nothing is written: this is what the built-in `obsidian://open` does
  for any vault file.
- If not, the plugin waits, showing "Waiting for the file to appear in the
  vault…" with **Stop**, never the name it was given (a name that does not
  exist is the caller's text, not a fact). How long is set by the device
  tests; a slow iCloud vault may need the user to open the file by hand
  later, and the message says so when the wait ends.

`source`:

- **Without the right key nothing happens to the file system at all**: no
  stat, no read, no dialog. At most one notice a minute says "Something
  asked Annotator to open a file from outside the vault, without this
  device's key. Nothing was read." A web page therefore gets neither a read
  nor a question to trick the user with.
- With the key, the path is parsed by `localTarget` and must end in `.pdf`
  or `.epub`. On a phone it is refused with a pointer to the recipe.
- The first time a keyed request names a file in a folder not yet allowed,
  a dialog asks: "Copy files you open from this folder into the vault?",
  with the folder, the file, the vault, and **Not now**, **This file**,
  **Always from this folder**. Later files from an allowed folder import
  without a question, with a notice ("Copied Paper.pdf into the vault").
  This approval is its own list, kept on this device, and is not the
  permanent per-address yes of `approveSource`.
- Then `importSource`.

For both:

- The handler is registered in `onload` before the first `await`; its work
  waits for `workspace.onLayoutReady`. If another plugin holds the action's
  name, a notice says so and the plugin loads without it.
- Requests are queued, at most twenty; more are dropped with one notice. A
  helper that hands over three files gets three imports, one after another;
  a page that fires a hundred `file` addresses gets twenty tabs of the
  user's own documents and a notice, not a hundred.
- Obsidian comes to the front for every address; the plugin cannot prevent
  that.

The dialog (also for door 1's and today's `approveSource`, which would gain
from the same care): focus starts on **Not now**; Enter does not confirm;
the confirming buttons work only after the dialog has been up for a moment;
the path is shown with control and direction-changing characters made
visible and, if long, cut in the middle with the whole of it one press away.

### Door 3: the menu after a share (phones)

`workspace.on('receive-files-menu', (menu, files) => …)`: when the saved
files include a PDF or EPUB, add **Open in Annotator**, which opens the saved
file as door 2's `file` would. Obsidian has already saved it where
attachments go; the plugin copies nothing. The event is undocumented: a
listener for an event that never fires costs nothing, the menu is used
through its public methods only, and if the event goes away the file is
still in the vault to be opened from the file list. Whether to lean on it is
decision 5.

### Which vault

- Door 1: the most recently focused vault. The user cannot choose.
- Door 2: the `vault` in the address; without it, the most recently focused
  vault on desktop, the open one on a phone. If Annotator is not enabled in
  the vault the address reaches, Obsidian itself says the action is invalid;
  the README names that message.
- Door 3: the vault open when the share arrived.
- The settings section prints each recipe with this vault's ID or name, so
  "which vault" is answered when the recipe is made: the vault whose
  settings the user copied it from.

### Where the device's own facts are kept

The key and the list of allowed folders are per device and per vault, in
Obsidian's local storage (`saveLocalStorage`, since 1.8.7), not in the
plugin's `data.json`: synced or committed, a key would be a secret in every
copy of the vault, and an allowed folder would mean another folder on
another machine. (Today's `remoteSources` and `approvedSources` do hold
outside addresses in `data.json`. That is existing behaviour and is left
alone here; worth its own look.)

### Security rules, in one place

| Rule | How it is kept |
| --- | --- |
| Nothing outside the vault is written, changed or deleted. | No write is made to a path that begins `file:`, is absolute, or climbs out; one check that every writer passes through, with a test per writer (stage 0). The vault API is not relied on as a fence. |
| Nothing in the vault is overwritten. | Copies are created under a digest; notes under a free name; `create`, never `modify`. |
| An address cannot say where anything goes. | No such parameter. |
| An address without this device's key cannot cause any file-system call outside the vault. | The key is checked first. |
| With the key, the user is asked once per folder. | The allowed-folder list, on this device. |
| Only a PDF or EPUB is kept. | Extension, first bytes, size limits, a regular file, one descriptor, refused if it changes while read (existing code). |
| Nothing goes back to the caller. | No callback, no clipboard, no network; errors are shown in Obsidian only, and never repeat a name that was not found. |
| The caller cannot flood. | The queue of twenty; one notice a minute. |
| What is opened is inert. | The reader's existing rules (`docs/SECURITY.md`). |

What remains, and should be accepted knowingly (decision 3):

- **A page** can bring Obsidian to the front and open the user's own PDFs
  and EPUBs that are already in the vault, by guessing their paths. Obsidian's
  own `open` action already allows as much for any file.
- **A program on the same computer** can read the key out of the recipe and
  ask for imports. On Windows and Linux such a program can already read the
  user's files itself. On macOS it may not be able to: a program without
  consent for, say, Documents could have Obsidian, which has it, copy a PDF
  from there into a vault the program can read. The fence is the per-folder
  question, and it holds only until the user has allowed that folder. The
  notice on every import makes it visible; it does not stop it.
- **The user** who allows a folder has allowed every later file in it,
  including one a browser was made to download there.

## Half (a), platform by platform

Each option: what the user sets up, what it costs the owner, whether
Obsidian can read the file afterwards, what happens when Obsidian is not
running, and the steps.

### macOS

| Option | User sets up | Signing, accounts | Can Obsidian read the file? | Obsidian not running |
| --- | --- | --- | --- | --- |
| **A. Obsidian itself** (door 1) | Reinstall Obsidian from a current installer, once | None | Yes: not sandboxed **ran** (entitlements); opened by the user, so no consent prompt **doc** | Launch Services starts it and sends the open-document event **doc**; a report says the file is then sometimes not shown **unconfirmed** |
| **B. An app the user makes** from a script, which fires door 2 | One pasted command, once; then Get Info → Open with → Change All | None, if an app made on the Mac is exempt from Gatekeeper as Apple's wording about "downloaded software" implies **unconfirmed**; the droplet made here ran | Through Obsidian's own consent for Desktop, Documents, Downloads, iCloud Drive, removable and network volumes: one system prompt per place, the first time **doc** for the rule; that the helper's access does not pass on is inferred **unconfirmed** | The address starts Obsidian **doc**; then the cold start above |
| **C. A Shortcut** as a Finder Quick Action that fires door 2 | Build it from written steps, or import a shared one | An Apple ID (free) if the owner shares a link | As B | As B |
| **D. A small signed app** registered for PDF and EPUB, rank Alternate | Download, drag to Applications | Apple Developer Program, 99 USD a year; Developer ID certificate; notarisation with `notarytool`; stapling **doc** | As B | As B |

Notes:

- What was run of B is its first link: an app made by `osacompile` receives
  the files. Not run: the address line, "Change All" (the droplet has no
  bundle identifier, which a default binding may need), Obsidian's consent
  prompt, the handler. **unconfirmed** as a whole.
- The pasted command has to do four things: compile the script, give the
  bundle an identifier and narrow its types to `com.adobe.pdf` and
  `org.idpf.epub-container` with rank `Alternate` (keys **doc**), and sign
  it again ad hoc, because "if you modify a signed bundle, you must re-sign
  it" **doc**. That is one line to paste and nothing to understand, but it
  is a Terminal, and recent macOS is reported to warn about pasted commands:
  **unconfirmed** whether it does here.
- C is never a double-click. Apple documents the Dock, the share sheet,
  Quick Actions and the Services menu for a shortcut, and the system's
  shortcut droplet declares rank `None`. **doc**
- A ready-made download of B's app would be "downloaded software": since
  macOS 15 an app that is not notarised cannot be opened with a
  Control-click; it takes System Settings → Privacy & Security → "Open
  Anyway" and a password. **doc**. Worse than pasting; so a ready-made app
  means D.
- The script, as the settings would print it (`ID` and `KEY` filled in):

  ```applescript
  on open theFiles
      repeat with f in theFiles
          set p to POSIX path of f
          set e to do shell script "/usr/bin/osascript -l JavaScript -e 'function run(a){return encodeURIComponent(a[0])}' " & quoted form of p
          do shell script "/usr/bin/open " & quoted form of ("obsidian://annotator-open?vault=ID&key=KEY&source=" & e)
      end repeat
  end open
  on run
      display dialog "Choose this app under Open With for a PDF or a book, and it opens in Annotator." buttons {"OK"}
  end run
  ```

As the user would see it:

- **A** (**unconfirmed**): right-click the PDF → Open With → Obsidian.
  Obsidian comes forward with the PDF in a tab and a notice that it is
  outside the vault; press **Copy into the vault and annotate**; the tab
  shows the copy, and highlights can be made.
- **B** (**unconfirmed**): once, in Annotator's settings, **Copy the
  command**; paste it into Terminal; an app "Open with Annotator" appears in
  the home folder's Applications; select a PDF, Get Info, Open with →
  Other… → that app → Change All. From then on: double-click a PDF;
  Obsidian comes forward; the first time for that folder it asks, and macOS
  may ask whether Obsidian may read that folder; the reader opens on the
  copy. Later files from that folder open without a question.
- **C** (**unconfirmed**): right-click → Quick Actions → Open in Annotator;
  then as B.
- **D** (not planned): download, drag to Applications, open once; then as B
  from Get Info on.

### Windows

| Option | User sets up | Signing, accounts | Can Obsidian read the file? | Obsidian not running |
| --- | --- | --- | --- | --- |
| **A. Obsidian itself** (door 1) | Reinstall Obsidian from a current installer; then Open with → Choose another app → Obsidian, each time or "Always" | None | Yes | Windows starts it with the path **unconfirmed** on Windows |
| **B. A registry entry that runs a script** firing door 2 | Save a `.ps1`, import a `.reg`; per user, no administrator | None | Yes | The address starts the handler program, which is Obsidian **doc** for how a scheme is launched |
| **C. A small program** registered per user | Run an installer or unzip | Unsigned: SmartScreen's "Windows protected your PC", and Smart App Control blocks unknown unsigned code. Signed: a certificate on hardware, or Microsoft's Artifact Signing (9.99 USD a month; an individual must be in the United States or Canada, an organisation may be in the EU) **doc** | Yes | As B |
| **D. The same program as a Store package** (MSIX declaring `.pdf` and `.epub`) | Install from the Microsoft Store | A Store developer account: free for individuals since September 2025, with an identity check; the Store signs the package **doc** | Yes | As B |

Notes:

- A is less than the wish. "Always" makes Obsidian the default PDF program
  for the whole account, which most people will not want, so in practice it
  is right-click → Open with → Obsidian, then one press in Obsidian, per
  file. Whether Obsidian is offered for `.pdf` at all is **unconfirmed**.
- Per-user registration needs no administrator: keys under
  `HKEY_CURRENT_USER\Software\Classes`; a ProgID under
  `.pdf\OpenWithProgids` puts the entry in "Open with". A program cannot
  make itself the default; only the user can. **doc**
  ([file types](https://learn.microsoft.com/en-us/windows/win32/shell/fa-file-types))
- B is awkward: Windows PowerShell on a client refuses scripts by default,
  so the command line must carry `-ExecutionPolicy Bypass` **doc**;
  `-WindowStyle Hidden` still flashes a window; a downloaded script carries
  the Mark of the Web and Smart App Control is reported to block such
  scripts; the entry would probably show as "Windows PowerShell". The last
  three: **unconfirmed**. VBScript, the old way round the flash, is being
  retired **doc**. B is the fallback if stage 0 fails, with these warts
  named in the recipe.
- A command with no script,
  `Obsidian.exe "obsidian://annotator-open?…&source=%1"`, cannot encode the
  path; a name with `&`, a hash sign or `%` breaks in Obsidian's parser.
  **read (Obsidian 1.15.0)**. Not offered.

As the user would see it:

- **A** (**unconfirmed**): right-click the PDF → Open with → Obsidian; the
  PDF shows in Obsidian with the notice; press **Copy into the vault and
  annotate**.
- **B** (**unconfirmed**): once: save the script the settings print, import
  the registry file, choose "Open with Annotator" under Open with → Choose
  another app. Then: double-click; a window flashes; Obsidian comes forward
  and, the first time for the folder, asks.
- **C, D** (later): install; choose it under Open with; then as B without
  the flash.

### Linux

| Option | User sets up | Signing, accounts | Can Obsidian read the file? | Obsidian not running |
| --- | --- | --- | --- | --- |
| **A. Obsidian itself** (door 1) | Open With → Obsidian. The Flatpak's entry lists PDF **ran** (fetched); other packages **unconfirmed** | None | Yes for the `.deb`, the AppImage and the snap (classic confinement **doc**). The Flatpak sees the home folder, `/mnt`, `/media` and `/run/media`, not `/tmp` **ran** (fetched manifest) | The entry's `Exec` starts it |
| **B. A desktop entry and a shell script** firing door 2 | Two small files under the home folder and one command, all printed by the settings | None | As A. The script passes the path as text, so a Flatpak's document portal does not come into it; a path the Flatpak cannot see fails with the reader's message **unconfirmed** | `xdg-open` runs the scheme's handler, which starts Obsidian, where the scheme is registered: the Flatpak registers it; for the AppImage the user makes a desktop entry, as Obsidian's help says **doc** |
| **C. The file manager's own actions** (a Nautilus script, a Dolphin service menu) | A file in the file manager's folder | None | As B | As B |
| A compiled helper | Not planned at any stage: B is ordinary on Linux | | | |

Notes:

- B: `~/.local/share/applications/open-with-annotator.desktop` with
  `MimeType=application/pdf;application/epub+zip;`, an `Exec=` line giving
  the script's absolute path and `%f` (a field code may not be quoted, and
  there is no home-folder shorthand, so the settings fill the path in),
  `NoDisplay=true`, `Terminal=false`; then `xdg-mime default …` or the file
  manager's "Open With". **doc**
  ([Desktop Entry](https://specifications.freedesktop.org/desktop-entry/latest/),
  [xdg-mime](https://portland.freedesktop.org/doc/xdg-mime.html))
- The script encodes with `od` and `printf` (experiment 5) and calls
  `xdg-open`. That `xdg-open` passes on a custom scheme is usual but its
  manual does not say so: **unconfirmed**.
- C is a right-click entry, not a default handler; it is a variation of B's
  script for those who prefer it, described in a sentence, not maintained.

As the user would see it:

- **A** (**unconfirmed**): right-click → Open With → Obsidian; the notice;
  one press.
- **B** (**unconfirmed**): once: paste three commands from the settings.
  Then: double-click an EPUB; Obsidian comes forward, asks the first time
  for that folder, and the book opens.

### Android

| Option | User sets up | Accounts | Can Obsidian get the file? | Obsidian not running |
| --- | --- | --- | --- | --- |
| **A. Share → Obsidian** (door 3) | Nothing | None | A PDF: yes, Obsidian receives it and saves it itself (filter **ran**; saving **read (Obsidian 1.15.0)**, web half only). An EPUB: no | The share starts it; whether the share then arrives is **unconfirmed** |
| **B. The Files app**, then Obsidian | Nothing | None | Only a vault in device storage: copy the file into the vault's folder, then find it in Obsidian's file list. A vault in app storage cannot be reached by other apps on Android 11 and later **doc** | Not involved: the user opens Obsidian by hand |
| **C. An automation app** (Tasker's "Received Share" and the like) that copies into the vault and fires door 2 with `file` | A paid third-party app and a profile | None for the owner | As B | The address starts it **unconfirmed** cold |
| **D. A small helper app**: "open with" and share target for PDF and EPUB; copies into a vault folder picked once; fires door 2 with `file` | Install; pick the vault's folder once | Google Play: 25 USD once, identity check, for a new personal account a closed test with 12 testers for 14 days, a yearly target-API rise. Outside Play: Play Protect's prompt today; Android's developer verification reaches installs from outside stores worldwide in 2027, which then means a verified identity and a 25 USD account, a free limited account capped at a few dozen devices, or users taking the "advanced flow" with its one-day wait. F-Droid builds free software from source. **doc** | Only a device-storage vault; the folder picker cannot pick the storage root or `Download`; a folder under `Documents` is not on the forbidden list **doc**, so allowed by inference | As C |

Notes:

- A helper cannot hand the file itself to Obsidian. An address is text.
  Android can lend read access to a `content:` address through an intent,
  but Obsidian reads shared files only from a share, where it lists no
  EPUB, and a plugin has no way to read a `content:` address. Re-sharing an
  EPUB to Obsidian under a false type would be a trick played on someone
  else's app. So a helper must copy the bytes into the vault's folder.
  (Filters **ran**; the rest reasoned from Android's documentation.)
- Whether a file another app wrote into the vault's folder is known to
  Obsidian at once, or only when the app next comes forward, is
  **unconfirmed** and decides how good B, C and D can be.
- Asking Obsidian to add EPUB to its share target costs nothing and would
  make A cover both types (decision 6).

As the user would see it:

- **A** (**unconfirmed**): in a browser or mail app, Share → Obsidian;
  Obsidian shows a menu naming the file; **Import**; a second menu; **Open
  in Annotator**; the PDF opens in the reader.
- **B**: in the Files app, copy the EPUB into the vault's folder; open
  Obsidian; find the file; tap it.
- **C, D** (not planned for stage 1): Share or Open with → the helper;
  Obsidian opens on the file.

### iOS and iPadOS

Nothing here was tried on a device; the Simulator cannot run Obsidian. Every
flow is **unconfirmed**.

| Option | User sets up | Accounts | Can Obsidian get the file? | Obsidian not running |
| --- | --- | --- | --- | --- |
| **A. Share → Obsidian** | Nothing | None | **unconfirmed** whether it takes a PDF. If it saves without opening Obsidian there is no menu for door 3 | Not opened, if the Share Sheet works as described |
| **B. Share → Save to Files → the vault's folder**, then open it in Obsidian | Nothing | None | Yes: the vault is an ordinary Files location (**doc** for "Save to Files" and for where vaults are) | Not involved |
| **C. A Shortcut in the share sheet**: Save File into the vault, then Open URL with door 2's `file` | Build it from written steps or import a shared one; answer "which vault?"; pick the folder once | An Apple ID (free) if the owner shares a link | As B. Shortcuts takes Files and PDFs from the share sheet, has URL Encode and Open URLs, and a shared shortcut can ask questions on import **doc**. Not known: a silent save into another app's folder; the folder surviving an import; and whether a shortcut run from the share sheet may open another app at all | The address starts it; cold delivery with iCloud vaults has reports against it |
| **D. A helper app** registered for PDF and EPUB that copies into a vault folder picked once (a folder picker grants lasting access **doc**) and fires door 2 | Install; pick the folder once | Apple Developer Program, 99 USD a year; App Review, whose rule 4.2.3 says an app "should work on its own without requiring installation of another app"; no supported install from a release page; TestFlight builds expire after 90 days **doc** | Yes | As C |

Notes:

- An app extension may not open another app; Apple's engineers call it "a
  deliberate design choice". **doc**. So D could not be a share extension;
  it would be a document-opening app, which is what App Review would judge.
  A Shortcut started from the share sheet also runs as an extension, and
  whether its Open URL step is exempt is exactly what must be tested before
  C is offered.
- A file a Shortcut wrote into an iCloud vault is reported to reach Obsidian
  late, a local vault promptly: **unconfirmed**.

As the user would see it:

- **B**: Share → Save to Files → On My iPhone → Obsidian → the vault → a
  folder → Save; open Obsidian; find the file; tap it.
- **C**: Share → Open in Annotator; Obsidian opens on the book.
- **A, D**: not known, not planned.

### What stage 1 delivers, one line each

| Platform | If stage 0 passes | If stage 0 fails |
| --- | --- | --- |
| macOS | "Open With → Obsidian", one press; or the recipe for a double-click | The recipe is the way |
| Windows | "Open with → Obsidian", one press | The script recipe, with its flashing window; the Store helper moves up |
| Linux | "Open With → Obsidian", one press; or the recipe for a double-click | The recipe is the way |
| Android | PDF: Share → Obsidian → Import → Open in Annotator. EPUB: nothing new; the Files app | The same (stage 0 is about desktop) |
| iOS | Save to Files into the vault; the Shortcut if its test passes | The same |

## Phones in particular

- **Can a third-party helper pass a file to Obsidian?** Not by an address,
  on either system. On Android a helper can copy the file into a
  device-storage vault's folder and then fire `file`; it cannot reach an
  app-storage vault. On iOS a helper app could do the same with a folder
  picked once; a share extension cannot even open Obsidian. Either way the
  file must be in the vault's folder first.
- **What does Obsidian's own share do with a PDF?** Android: it is offered
  (**ran**), and by the code it then shows "Import", saves the file where
  attachments go and shows a menu plugins can add to (**read**, not
  exercised). An EPUB is not offered. iOS: **unconfirmed**.
- **The smallest thing that works without a separate app.** Android, PDF:
  door 3 and nothing else. Android, EPUB: the Files app, into a
  device-storage vault. iOS: Save to Files into the vault; one tap less with
  the Shortcut, if it passes its test.

## Distribution and upkeep

| What | Lives | Built and checked | Kept safe by |
| --- | --- | --- | --- |
| The guard and the three doors | The plugin (`src/`) | Existing CI; a test for each refusal and each writer | The rules above; a section in `docs/SECURITY.md` |
| Recipes (the AppleScript command, the `.desktop` file and script, the PowerShell fallback, the Shortcut steps) | `docs/OPEN_WITH.md`, linked from the README; printed in **Settings → Annotator → Open from outside Obsidian** with this vault's ID, this device's key and, on Linux, the script's path filled in, each with a Copy button | The shell encoder has a test run under `dash` in CI; the rest by hand on each platform before a release that touches them | Being short enough to read; they produce one address and nothing else |
| Shared Shortcuts, if the owner wants links | iCloud links from the owner's Apple ID, beside the written steps, so a dead link costs nothing | By hand on a device when Shortcuts changes | Import questions, not baked-in names |
| A compiled helper, if ever | A separate repository: other toolchains, signing secrets, its own releases; the plugin's release stays three files | Hosted runners; release assets with checksums and build provenance | No network code; accepts only an open-document event or its arguments; checks the extension; builds one address per file with the platform's URL type, never through a shell; a cap on files; the scheme and action are constants; reads the key from a file only the user can read |

The plugin never runs a command, never writes outside the vault, never
changes the system's handler settings. The settings show text to copy.

Users learn of it from a short README section, "Open a file from outside
Obsidian", under "Sources outside the vault"; from the settings section; and
from the notice the first time door 1 is met.

Upkeep to expect: Obsidian's outside-file feature is new and moving (three
changelog entries in six weeks); the share event is undocumented; Shortcuts
changes with each iOS; Windows is tightening on unsigned code and scripts. A
line in the release checklist: try each recipe against the current Obsidian.

## Stages

### Stage 0: find out, and stop the plugin writing outside the vault

| Part | Work | Needs | Risk |
| --- | --- | --- | --- |
| 0a. The live test: "Open with → Obsidian" on a PDF and an EPUB with a current installer, Obsidian running and not; what 0.3.1 then does; a probe handler warm and cold | Small (an hour or two, on the Mac) | No other Obsidian running, or the owner's go-ahead to take the socket | None |
| 0b. The guard: a source whose path is not in the vault is not annotated where it lies; one check before every write (`ensureNote` and its call sites, the PDF export, the import archive, reading positions); a test per writer | Small to medium | Nothing | Missing a writer; hence the single check rather than one per site |

0b is a fix in its own right if 0a shows anything written beside an outside
file, and harmless if not. Release it without waiting for the rest.

### Stage 1: the doors and the recipes

| Part | Work | Needs | Risk |
| --- | --- | --- | --- |
| 1a. `importSource` (find-or-make the note, then today's path) | Small to medium | Nothing | Finding an earlier copy by real path; note naming |
| 1b. Door 2: `file` everywhere, `source` with the key on desktop; the queue; the dialog's care | Medium | Nothing | An address is an open door: a test per rule. Cold start on iOS. A file not yet known to the vault on phones |
| 1c. Door 1: the notice and its button | Small | Stage 0 passed | A young feature |
| 1d. Door 3: the item after a share | Small | Nothing | Undocumented; untested on a device |
| 1e. Settings section, `docs/OPEN_WITH.md`, README, `docs/SECURITY.md` | Medium | Each recipe tried on its platform first | Recipes rot |

If stage 0 passes: door 1 is the first thing the README offers on desktop,
recipes second, for those who want a double-click or a chosen vault. If it
fails: 1c is dropped, the recipes are the desktop path, Windows gets the
script recipe with its warts named, and 2c moves up. Either way the whole
stage is medium, with no accounts and no certificates.

If the owner would rather not have outside reads by address at all in a
first release (decision 3), stage 1 is door 1, door 3 and `file` only, and
the desktop recipes wait.

### Stage 2: only what people ask for

| Part | Work | Needs | Risk |
| --- | --- | --- | --- |
| 2a. **Annotate here without copying**: the note in the vault, its target the outside path, the file read in place | Medium | Nothing | Desktop only; the note finds no file on another device; the outside file being moved. Also answers the community's question about not copying files in |
| 2b. Door 1 switching to the existing copy by itself | Small | Nothing | Acting without a press |
| 2c. **Windows helper through the Microsoft Store** | Medium, plus Store upkeep | A free individual Store account, identity check | Whether the Store accepts a thin forwarder is **unconfirmed** |
| 2d. **Android helper** for EPUB and "open with" | Medium to large, plus yearly upkeep | Play (25 USD, testers) or F-Droid; developer verification from 2027 | Device-storage vaults only; ask Obsidian for EPUB first |
| 2e. **Notarised macOS app** | Small to build, yearly to keep | Apple Developer Program, 99 USD a year | Buys a tidier "Open With" entry and no Terminal |

### Left out

- An iOS helper app: a yearly fee, App Review's rule against apps that need
  another app, and no gain over Files or a Shortcut.
- A Mac App Store helper; a compiled Linux helper.
- Web addresses in `annotator-open`; callbacks; opening a note by address;
  choosing a folder by address.
- The command-line interface as the hand-over.
- Anything the plugin would install by itself.
- A second way of keeping copies (unless decision 2 says otherwise).

## What must be tested, and where

| Test | Where | On this machine? |
| --- | --- | --- |
| Stage 0a: "Open with → Obsidian" on a PDF and an EPUB, Obsidian running and not; what Annotator does; whether anything is written beside the file | macOS, a current installer | Yes, with a scratch vault, when no other Obsidian is running |
| A probe handler: what arrives, warm and cold; `vault` by name and by ID; two vaults; the plugin missing in the target vault; a `path` parameter outside every vault; an odd vault name | macOS | Yes, same condition |
| Every refusal of door 2; the queue; a keyless `source`; the import finding an earlier copy; names that differ only in case | Unit tests | Yes |
| The address fired from a web page in two browsers: the browser's prompt; a keyless `source` (expect nothing); a flood of `file` | macOS | Yes |
| The dialog: focus, Enter, the arming delay, a long path, direction-changing characters | macOS | Yes |
| The macOS recipe: the pasted command and Terminal's reaction to it; Change All; three files at once; a name with `&`, a hash sign, `%`, spaces and non-ASCII; the consent prompt for Downloads | macOS | Yes; it changes a default handler, so in a test account or undone afterwards |
| "Open with → Obsidian" for a PDF; the script recipe with door 2; Smart App Control on | Windows 11 | Ask the owner for the Windows machine |
| The Linux recipe under `dash`; GNOME Files; Obsidian as `.deb`, Flatpak (a file under `/tmp`), AppImage | Ubuntu | Ask the owner for the virtual machine |
| The same in Dolphin | A KDE system | Not available |
| Share a PDF to Obsidian, running and not; Import; the plugin's item; an EPUB (expect: not offered) | Android | Yes, the emulator, when free |
| A file pushed into a device-storage vault, then `file`: how long until Obsidian knows it; the address on a cold start | Android | Yes, the emulator |
| Save to Files into the vault; the Shortcut (does Open URL work from the share sheet; a silent save; the folder after an import; local against iCloud; cold start); Share → Obsidian with a PDF | An iPhone and an iPad with Obsidian | No. Needs the owner's devices |

## Decisions for the owner

1. **Copy, or leave in place?** A file opened this way is copied into the
   vault and syncs like everything else [recommended, the only behaviour in
   stage 1]; or annotated where it lies, desktop only (2a); or both, with
   copying the default. And with it: if stage 0 passes, is Obsidian's own
   "Open with" the main desktop path, with its viewer first and no choice of
   vault [recommended], or only a safety net beside the recipes?
2. **How the copy is kept, and where its note goes.** As today: a
   digest-named copy in `Annotator sources` and a note made at once, named
   after the file, in the folder for new notes [recommended: one scheme, the
   revision review for changed files, works on the phone]; or a copy under
   its own name and no note until the first annotation (needs the extra
   machinery listed under "The import").
3. **Outside reads by address.** In stage 1 with the key and the per-folder
   question, accepting what remains (a program on the same Mac can borrow
   Obsidian's reach into a folder the user has already allowed)
   [recommended]; or with a question for every file; or not in stage 1 at
   all (then desktop recipes wait and stage 1 is door 1, door 3 and `file`).
4. **Accounts.** Is the owner willing to keep any of: an Apple Developer
   membership (99 USD a year; the only way to a ready-made macOS app or any
   iOS app), a Microsoft Store account (free; identity check), a Google Play
   or Android developer account (25 USD; testers; identity check)?
   [Recommended: none now; the Microsoft Store first, if stage 0 fails or
   Windows users find the one-press path too rough.] Sharing Shortcut links
   needs only the owner's Apple ID, and is optional.
5. **The undocumented share menu.** Use `receive-files-menu` on phones,
   guarded [recommended]; or only describe "share to Obsidian, then open the
   file" until there is a documented way.
6. **Asking Obsidian.** Three requests would each remove work here: PDF and
   EPUB accepted by "Open with" and said so in the notes; EPUB in the
   Android share target; a documented event after a share. They would be
   posted in the owner's name, so they are the owner's to send or not.
   [Recommended: send them once stage 0 has said what is true today.]

## The review: objections, and what was done

A subagent read the first draft as a sceptic. Its objections, each with the
change or the reason.

1. *Stage 1 rests on the one thing nobody saw work, with no branch for
   failure.* Accepted. Stage 0 is now the test and the guard; stage 1 says
   what happens either way; the "finding" is marked unconfirmed; the need
   for a current installer is said for every desktop system.
2. *The only defence for `source` was a dialog users are trained to accept;
   the key was deferred as a convenience; "a local program can do more
   anyway" is wrong on macOS.* Accepted. `source` needs the key from the
   start; without it nothing is touched and nothing is asked. The macOS
   case is written down as what remains, for decision 3.
3. *The rules did not match the code they leaned on.* Accepted. The
   address's approvals are their own list and not `approveSource`'s
   permanent yes; no file-system call before the key; a queue instead of a
   drop, so three files are three imports; a waiting message that never
   repeats a name it was given; the dialog's focus, Enter, delay and path
   display are specified.
4. *A changed file would fork the annotations, and two import schemes would
   coexist.* Accepted, by removing the second scheme: the import now finds
   or makes a note and uses today's copies and revision review. The
   named-copy idea is kept as decision 2's other option with its costs.
5. *The door 1 guard is larger than "Small", and "every write goes through
   the vault API" is no argument when the vault API writes outside the
   vault.* Accepted. The writers are listed, the guard is one check with a
   test per writer, sized small to medium, and the notice is in the view.
6. *The marks were stretched: "ran" for things only read; the phone share
   flow read in a desktop bundle of another version; flows stated as fact.*
   Accepted. Reading is now its own mark, with the version; the share flow
   is marked as the web half only; every flow carries a mark; the
   quotation from the iOS help page that a second fetch did not find is
   paraphrased.
7. *File-name and path handling was one phrase.* Accepted for what remains
   in the design: the `file` refusals are listed, the note's name has rules,
   existence is compared without case, and an outside path is compared with
   the vault by real path. Rules for a named copy are needed only if
   decision 2 goes that way.
8. *The flows were optimistic.* Accepted. The macOS command's four jobs and
   the Terminal warning are named; Windows A is described as what it is;
   the Linux recipe's absolute path is filled in by the settings; the iOS
   Shortcut is no longer called the smallest thing that works until its
   test; Android's two gaps are stated; a table says what stage 1 delivers.
9. *Device-specific facts in synced plugin data.* Accepted for what is new:
   the key and the allowed folders live in local storage. The existing
   maps in `data.json` are noted, not changed here.
10. *Gaps against the brief.* Accepted: steps for the remaining options, a
    Linux row for the file manager's actions and for no compiled helper,
    "not running" filled in, a stability promise for the address, more
    tests, and decisions on `source` and on asking Obsidian. The ten-second
    wait is now "set by the device tests".
11. *Misreadings.* Accepted: the placeholder home path is gone; the
    experiment notes lost their asides; "no accounts" no longer sits beside
    an Apple ID without saying which is which; the short version says that
    much of stage 1 is "Open with Obsidian"; Android's free limited account
    and the dates of the advanced flow are in.

Not taken: nothing was rejected outright. Two things were answered with a
reason rather than a mechanism: a page can still open the user's own vault
documents through `file` (Obsidian's own `open` allows the same, and a
question there would train the reflex objection 2 warns of), and Obsidian
coming to the front on every address is Obsidian's doing.

## Noticed in passing

- `docs/SECURITY.md` lists "A note's `annotation-target` is followed without
  asking" under "Known and not yet changed"; the code now asks. The
  paragraph is out of date.
- A yes in `approveSource` lasts for good and covers a changed file at the
  same address; and `remoteSources` and `approvedSources` put outside paths
  into synced data.
- `localTarget` folds case on Windows only, so on a Mac a vault file named
  in other case is copied as if it were outside.
- Starting a second Obsidian takes the command-line socket from a running
  one, on macOS and Linux: worth knowing for any test with two instances.

## Sources

Obsidian: [Obsidian URI](https://obsidian.md/help/Extending+Obsidian/Obsidian+URI),
[changelog](https://obsidian.md/changelog/),
[API typings](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts),
[CLI](https://obsidian.md/help/cli), [iOS](https://obsidian.md/help/ios),
[Android](https://obsidian.md/help/android),
[Flathub manifest](https://github.com/flathub/md.obsidian.Obsidian).

Apple: [Core Foundation keys](https://developer.apple.com/library/archive/documentation/General/Reference/InfoPlistKeyReference/Articles/CoreFoundationKeys.html)
(document types, handler rank),
[Launch Services concepts](https://developer.apple.com/library/archive/documentation/Carbon/Conceptual/LaunchServicesConcepts/LSCConcepts/LSCConcepts.html),
[droplets](https://developer.apple.com/library/archive/documentation/LanguagesUtilities/Conceptual/MacAutomationScriptingGuide/ProcessDroppedFilesandFolders.html),
[opening an app from an unknown developer](https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unknown-developer-mh40616/mac),
[the macOS 15 change](https://developer.apple.com/news/?id=saqachfa),
[TN2206 on signing](https://developer.apple.com/library/archive/technotes/tn2206/_index.html),
[file access consent](https://support.apple.com/guide/security/controlling-app-access-to-files-secddd1d86a6/web),
[user intent and file access (WWDC 2019)](https://developer.apple.com/videos/play/wwdc2019/701/),
[choosing an app for a file](https://support.apple.com/guide/mac-help/choose-an-app-to-open-a-file-on-mac-mh35597/mac),
[shortcuts from other apps](https://support.apple.com/guide/shortcuts/launch-a-shortcut-from-another-app-apd163eb9f95/ios),
[import questions](https://support.apple.com/guide/shortcuts/add-import-questions-to-shared-shortcuts-apdf330fd3a0/ios),
[access to directories](https://developer.apple.com/documentation/uikit/providing-access-to-directories),
[app extensions and URLs](https://developer.apple.com/forums/thread/764570),
[review guidelines](https://developer.apple.com/app-store/review/guidelines/),
[programme price](https://developer.apple.com/programs/whats-included/),
[TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/).

Microsoft: [file types](https://learn.microsoft.com/en-us/windows/win32/shell/fa-file-types),
[application registration](https://learn.microsoft.com/en-us/windows/win32/shell/app-registration),
[execution policies](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies),
[SmartScreen reputation](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation),
[Smart App Control](https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/overview),
[Artifact Signing](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart),
[free Store registration](https://blogs.windows.com/windowsdeveloper/2025/09/10/free-developer-registration-for-individual-developers-on-microsoft-store/),
[VBScript timeline](https://techcommunity.microsoft.com/blog/windows-itpro-blog/vbscript-deprecation-timelines-and-next-steps/4148301),
[registering a URL scheme](https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/platform-apis/aa767914(v=vs.85)).

Linux: [Desktop Entry](https://specifications.freedesktop.org/desktop-entry/latest/),
[MIME applications](https://specifications.freedesktop.org/mime-apps/latest/),
[xdg-mime](https://portland.freedesktop.org/doc/xdg-mime.html),
[Flatpak permissions](https://docs.flatpak.org/en/latest/sandbox-permissions.html).

Android: [receiving shared data](https://developer.android.com/training/sharing/receive),
[FileProvider](https://developer.android.com/reference/androidx/core/content/FileProvider),
[document trees](https://developer.android.com/training/data-storage/shared/documents-files),
[storage in Android 11](https://developer.android.com/about/versions/11/privacy/storage),
[testing requirement](https://support.google.com/googleplay/android-developer/answer/14151465),
[developer verification](https://developer.android.com/developer-verification/guides/faq).
