# Security notes

## Issue 384 (remote code execution in the original plugin)

The report: an EPUB named by a note's `annotation-target` is opened; the
original plugin lets the book's scripts run (`allowScriptedContent`), in an
iframe that is same-origin with Obsidian, so a book can reach
`window.top.require("child_process")`.

The native reader is not affected by that mechanism. Book and page markup is
parsed inert and rebuilt node by node through allowlists (`dom-source.ts`,
`passive-markup.ts`); publisher CSS is applied property by property with no
network addresses (`publisher-styles.ts`). No script from a book, a page or
a PDF runs in Obsidian's document, and the host code has no `innerHTML`,
`eval` or `document.write`. Tests: "book and page markup reaches the host
inert…", "foreign markup drops active constructs…", "standalone SVG book
assets…" (`readers.test.mjs`), "network CSS, dynamic selectors…"
(`publisher-styles.test.mjs`).

## What the review of the same class of problem found, and what was done

1. **A live web page could make the reader save text of its choosing.**
   The helper that reads a page's selection runs among the page's own
   scripts, which can make it report anything, and the host acted on a
   reported "highlight" at once. Fixed: nothing a page reports is an
   instruction. Its selection is only *offered*; the host shows the actions
   in its own bar with the words that would be saved, and saving needs the
   user's click there. No toolbar is drawn inside the page any more.
   Test: "a live page can only offer a selection…" (`readers.test.mjs`).
   The same holds for a picture of a live page kept with a note: the page
   reports which picture was clicked, where it is and what it shows, and each
   of those is checked (the place by a fixed pattern of child steps that is
   never run as a selector by the host, the address as a plain http(s) one).
   The picture kept is what the Web viewer showed in that rectangle, taken by
   Obsidian itself: the address the page gave is never fetched. It is shown
   in Obsidian's own window, and kept only on the user's click there.
   Tests: `web-figures.test.mjs`.
2. **Words from the source became raw Markdown in the note.** The visible
   line of an annotation carries the passage and its context; a passage
   containing a code fence, inline code, a tag or a template command would
   have been live Markdown in the user's note (with some community plugins,
   code). Fixed for everything the native reader writes: the line is a single
   line, backticks are escaped, tag and template openers and `%%` are broken
   with a zero-width space, and the context is read back as the same words
   (`proofs/display-text.mjs`). The stored JSON keeps the passage exactly.
   Test: "words from the source are written into the note as inert words…"
   (`codec.test.mjs`). Notes written earlier, or by the original plugin, keep
   their raw lines.
3. **A script address is never a link.** `javascript:`, `data:` and
   `vbscript:` addresses in book or page markup are dropped before the
   reader's link handling sees them.

## Known and not yet changed

- **A note's `annotation-target` outside the vault is asked about.**
  Before an http(s) target is fetched, or a file outside the vault is read
  (where it is, or to copy it in), the reader asks, naming the address or
  the path. For a web address the answer is remembered (it can be given for
  the whole site), so a later change at the same address is not asked about
  again. For a file on this computer read where it is, the yes is kept on
  this computer only (Obsidian's storage for this computer and vault, never
  the plugin's settings, so it does not sync), for that file, or, with
  **Always from this library**, for every file under a Zotero `storage`
  folder or a Calibre library the settings name. A note that names any other
  file is asked about again. What is allowed is compared only with paths
  that name exactly the file Obsidian will open: a path that still has `.`
  or `..` in it, or (on macOS and Linux, where it is a letter of a name, but
  Obsidian takes it for a separator) a backslash, is never read where it is
  (`externalKey`, `safeExternalKey` in `in-place.ts`); it can only be copied
  in, after its own question. A path that leads elsewhere through a link
  (inside a library, to a file outside it) is asked about as the file it
  leads to, unless that file is allowed itself; a library allowed is allowed
  as the folder it really is as well. Only paths this computer allowed are
  ever resolved on disk in the background (a note can name any path,
  including a network share whose lookup would reach out). A yes to read a
  web address where it is is kept apart from a yes to copy it into the vault
  (`place:…` and `copy:…` in the settings): a phone the settings sync to asks
  before it downloads a copy, and so does 0.3.2, which reads neither. A yes
  0.3.2 kept (the address alone) is still a yes to download into the vault. What a later file at an allowed path could do
  is limited to what any PDF or book can do in the reader (below), and if it
  is another version its annotations are marked as made on another version.
  For a file copied in, the answer is for the one copy then made, and is
  not kept. A Zotero or Calibre link
  is first followed to a path inside the folder the settings name, and a
  DEVONthink link to the path DEVONthink gives (see below); that path is then
  asked about in the same way. An archive.org item link
  (`https://archive.org/details/ID`) is asked about before anything is
  fetched, in the same dialog, naming archive.org; with the yes, the item's
  metadata (`https://archive.org/metadata/ID`, one request, through
  Obsidian's `requestUrl`) is read to choose a PDF or EPUB of the item, and
  that file's download address on archive.org is then downloaded without a
  second question and remembered for the link in the plugin's settings. The
  identifier must be archive.org's form (letters, digits, `.`, `-`, `_`),
  the host is fixed, and the address downloaded is built by the plugin from
  the identifier and a file name archive.org listed, not taken from the
  answer. Files marked private and the copies archive.org locks for lending
  are never chosen, and an item it lends is refused.
- **An address cannot make the reader read outside the vault without this
  computer's key.** `obsidian://annotator-open` can be opened by any web
  page or program. With `file=` it opens a PDF or a book that is already in
  the vault, named by its path there; anything else is refused (another
  type, a hidden or configuration folder, an absolute or climbing path).
  That writes nothing and asks nothing, as Obsidian's own `obsidian://open`
  does for any file. With `source=` it names a file outside the vault, and
  is followed only when it carries the key this computer made; without it no
  file is looked at, nothing is asked, and one notice a minute at most says
  so. The key is 144 random bits, compared whole, kept in Obsidian's storage
  for this computer and vault (not in the plugin's settings, so it does not
  sync), and written only into what the reader installs or pastes on this
  computer: "Open with Annotator" and the recipes.
  - **The key is the yes.** Where Obsidian reads files where they are
    (1.14.4 or later, on a computer), a file named by an address with the
    key is read where it is at once, with no question, and allowed to be
    read where it is on this computer, that file (and the file it leads to,
    if it is a link) and no other, as a press of **Annotate where it is**
    allows it. This is safe because only what the reader put on this
    computer carries the key: a web page, a link in a mail or a note, or a
    program on another computer cannot know it, so the address cannot have
    come from anyone but the reader's own file manager (or a script the
    reader made). What is done with the file is what the reader would do by
    hand: it is read in the reader, which runs nothing from it (above), and
    a note naming it is made where new notes go. Nothing is copied, nothing
    outside the vault is written, and no address names where anything is
    written or sends anything back. A program already running as the reader
    could read the key from the app; it can read the file itself, and gains
    nothing by having Obsidian show it. Earlier yeses are kept: a file
    copied in before shows its copy, and files and libraries allowed to be
    read where they are stay allowed.
  - **Where files are copied in** (an older Obsidian, or **Copy outside
    sources into the vault** on), the first file from a folder is asked
    about (the dialog starts on **Not now**, and its other answers work only
    after a moment); **Always from this folder** allows that folder from
    then on, on this computer only. There, a program on the same computer
    that read the key could, on macOS, have Obsidian copy a PDF from a
    folder already allowed into the vault, where that program may be able
    to read it. **New key** or **Remove** in the settings ends a key, and
    **Forget them** the folders.
  - At most twenty requests wait at once.
- On a Mac, whether the vault's disk takes names that differ only in case
  for one name is asked of the disk, so that a path into the vault written
  in another case is not taken for a file outside it.
- **A user name and password for a source's server are asked for, never
  stored.** An address with them in it is refused, so they cannot end up in a
  note that syncs. When a server answers a download with a Basic challenge,
  the reader asks in a dialog of its own (warning when the address is plain
  http), sends them only to that address's origin, and keeps them in memory
  until the plugin is unloaded. It asks three times at most per download.
- **Nothing outside the vault is written, changed or deleted, except the
  plugin's own download cache** (and "Open with Annotator", which Install
  writes and Uninstall deletes on the reader's press; below). Since 1.14.4 Obsidian can open a file that
  is not in the vault (a `TExternalFile`, whose path begins `file:`), and its
  file functions then write wherever that path says. Every write the reader
  makes to the vault goes through one check (`vaultWrite` in `main.ts`,
  `vaultWritable` in `in-place.ts`) that refuses a path beginning `file:`,
  an absolute path, a drive letter, a network path, a path that climbs out,
  and any file object that can say where it really is. A source read where
  it is is only read: its annotations go into the note that names it; an
  export of it, a searchable copy of it and a note for some of its pages
  either go beside that note or are refused with the offer of a copy in the
  vault. A file outside the vault that no note names (one Obsidian opened
  with "Open with") gets no note and no annotations until the reader presses
  one of the notice's buttons. Reading positions and the ties between
  sources and notes are not kept in the settings under this computer's paths.
  Tests: "read where it is, a file is bound to its note only once allowed
  here…" (`plugin-boundary.test.mjs`) and "nothing outside the vault passes
  the check…" (`in-place.test.mjs`).
- **The download cache.** A web source read where it is is downloaded to
  the system's cache folder (`~/Library/Caches/Annotator for Obsidian`,
  `%LOCALAPPDATA%\Annotator for Obsidian\Cache`, or
  `$XDG_CACHE_HOME`/`~/.cache/annotator-for-obsidian`), only after the
  question. The plugin writes there only into folders named by the SHA-256
  of the address and of the bytes, under a name made safe from the address,
  by writing a temporary file and renaming it; it never writes over a file
  there, and checks every path it writes is inside the cache. Which download
  an address means is kept in Obsidian's storage for this computer and
  vault. The cache is not synced; **Clear the download cache** removes the
  downloads no tab shows, and only folders named by digests.
- **Remote video files** (`.mp4` and similar targets) are loaded by the
  built-in player from wherever the target points.
- **Imported comments** are rendered as Markdown like the user's own.
- The helper in a live page is still in the page's world: a page can hide
  or falsify highlights *on itself* and can change what it offers. It cannot
  write to the vault.
  While you are choosing a picture, the page's pictures can take the
  keyboard (`tabindex`), which the page's own scripts can see; it is removed
  when you leave.

## Recognising text in scans

The words of a scanned PDF are read by Tesseract, built to WebAssembly (the
npm package `tesseract-wasm` 0.11.0), with a language's data (the npm
packages `@tesseract.js-data/<language>` 1.0.0). Neither is carried in the
plugin.

- **What is fetched, and when.** The engine and one language, only when the
  reader presses **Download and recognise** in a dialog that names each with
  its size and host, from this repository's release assets on `github.com`,
  which hands the download to its file host (`githubusercontent.com`).
  Nothing is fetched at start, in the background, or to look for a newer one.

  | File | Bytes |
  | --- | ---: |
  | `tesseract-core-0.11.0.wasm` (the engine) | 1,839,004 |
  | `eng-1.0.0.traineddata.gz` (English) | 2,952,873 |
  | `fra-1.0.0.traineddata.gz` (French) | 707,406 |
  | `deu-1.0.0.traineddata.gz` (German) | 1,333,102 |
  | `spa-1.0.0.traineddata.gz` (Spanish) | 2,100,190 |
  | `swe-1.0.0.traineddata.gz` (Swedish) | 2,503,095 |
- **No script is fetched.** The JavaScript that drives the engine is part of
  `main.js` and is reviewed with it. What is fetched is the engine's
  WebAssembly and data.
- **Every file is checked before every use.** The size and SHA-256 of each
  file are written in the plugin's code (`src/scan-manifest.ts`). A file is
  checked after it is fetched, before it is written, and again each time it
  is read; one that differs is deleted and refused, in words. A different
  engine can therefore arrive only with a new version of the plugin. The
  checksums are those of the files in the published npm packages; a test
  compares them with the packages `package-lock.json` names, so anyone can
  confirm what they stand for.
- **What the host learns.** That a download of that file happened, from which
  address and when. No page, picture, word or file name leaves the device:
  recognition runs on it.
- **Where the engine runs.** In a worker of its own, which has no access to
  the vault, the page or Obsidian. Before anything else it removes `fetch`,
  `XMLHttpRequest`, `WebSocket`, `EventSource`, `importScripts`, `indexedDB`
  and `caches` from itself. It is handed the engine and the language as bytes
  and pictures of pages, and hands back words with their boxes. It never runs
  on the interface thread.
- **Recognised words are words from a source,** and are not trusted: which
  are kept is decided by checked logic (`proofs/scan_text.bend`), and they
  are written into the copy as text and nothing else. A highlight made on
  them goes into a note by the same inert-words rule as any passage.
- **The searchable copy** is a file in the vault that holds the scan's text.
  It is as private as the PDF, and syncs with whatever syncs the vault.
- **Files put there by hand** (where GitHub cannot be reached) are taken only
  if their checksums match; the plugin has no way to accept another file.
- **What a run has read so far** is kept in the same folder
  (`pending-<the PDF's fingerprint>-<language>.json`) until the copy is
  written, so that an app closed in the middle loses little. It holds the
  words of the pages read and where they are, and is as private as the PDF.
  It is let go when the copy is written. Read back, it is checked piece by
  piece and taken for nothing if it is not what the plugin writes.
- **The words of a marked area** are read from the area's part of the page,
  drawn on the device, and kept in the annotation note with the area; only
  that one value of the annotation changes, and everything else is read back
  as it was before anything is written.
- **The settings** list each of the recogniser's files with its size and
  whether it is on the device, with Remove.

Known and not yet changed: the files are kept in the plugin's folder, so a
tool that syncs that folder carries them to other devices, where they are
checked again.

## Asking DEVONthink for a file

A DEVONthink item link names an item, not a file; where DEVONthink keeps
the file is in its own database. To follow such a link the plugin runs a
program. Besides this, programs are run only by Install and Uninstall for
"Open with Annotator" (below), on the reader's press.

- **What is run.** `/usr/bin/osascript -l JavaScript -e <script> <question>
  <UUID>`, through Node's `execFile`: no shell, and the arguments are a list.
  The script is a constant in the plugin (`DEVONTHINK_SCRIPT` in
  `src/app-links.ts`); nothing from the note is written into its text. The
  item's UUID is passed as an argument, and only after it has matched
  DEVONthink's form exactly (five groups of hexadecimal digits, 8-4-4-4-12);
  any other link is not a DEVONthink link and nothing is run for it.
- **What it asks.** First whether DEVONthink 4 or 3 is installed and running
  (asked of macOS; this starts nothing). Then, after the reader's yes, the
  path of the record with that UUID, and whether its file is still to be
  downloaded from a sync location. Nothing in DEVONthink is changed.
- **When.** Only on a Mac's desktop app, only when a note whose
  `annotation-target` is such a link is opened and the link has not been
  followed yet (or the file it was followed to is gone), and only after a
  dialog that says so. The dialog says when DEVONthink is not running and
  asking will start it. A yes holds until Obsidian is closed and is not
  stored. For DEVONthink the module that runs programs is loaded only then
  (the only other time is a press of Install or Uninstall, below); on a
  phone or a tablet it is never loaded, and on Windows or Linux such a link
  says it is followed on a Mac only.
- **What macOS asks.** The first time, macOS asks whether Obsidian may
  control DEVONthink. Refused (error -1743), the reader says where to allow
  it (System Settings, Privacy & Security, Automation). The plugin does not
  change that setting.
- **What is done with the answer.** The path must be a whole path to a PDF
  or EPUB that exists. It is remembered for the link in the plugin's
  settings, and is then asked about and copied in like any file outside the
  vault. osascript is stopped after three minutes.

## Installing "Open with Annotator"

The **Install** and **Uninstall** buttons under **Open from outside
Obsidian** run programs on the reader's computer. This is the second place
the plugin runs a program (the first is DEVONthink, above).

- **What Obsidian's rules say.** Obsidian's developer policies for the
  community plugin directory forbid obfuscated code, ads loaded from the
  network and client-side telemetry, and ask a plugin to say in its README
  when it uses the network or reaches files outside the vault. They do not
  forbid running a program. Obsidian's plugin review now also checks each
  release for malware, and security software watches Obsidian for starting
  PowerShell or osascript, which is how malicious plugins have worked. So
  the buttons run only fixed programs, by their full paths, with fixed
  arguments, on the reader's press, and the README and this page say what
  each does.
- **When.** Only on a press of Install or Uninstall, on a computer. Nothing
  is run at start, when the settings are shown, or when a file is opened.
  To say whether the app is installed, the settings read its files through
  the file system alone (`openWithFiles`); the module that runs programs
  (`child_process`) is loaded only by the press (`openWithTools`). On a
  phone or tablet it never is.
- **What is run.** Through Node's `execFile`: no shell, and the arguments
  are a list, so no path, name or value is read as a command, and nothing
  from a note, a file or an address is in them. Only the vault's ID, the key
  (letters, digits, `-` and `_`, encoded for an address) and the home
  folder's paths are.
  - macOS: `/usr/bin/osacompile` (the app's AppleScript, a constant with the
    address in a string, each line one `-e` argument), `/usr/bin/plutil`
    three times (its identifier, its document types as JSON made by the
    plugin, the digest of its address), `/usr/bin/codesign --force --sign -`,
    `/bin/chmod -R go-rwx` on the app, and `lsregister -f` by its full path;
    on Uninstall `lsregister -u`.
  - Windows: `%SystemRoot%\System32\reg.exe` with `add` (and on Uninstall
    `delete`) for the program's own key and its one entry in each
    extension's list under `HKEY_CURRENT_USER\Software\Classes`, and `query`
    to find Obsidian's icon and which extensions have a key already; an
    extension key Install made is deleted by Uninstall only when nothing but
    its emptied list is in it. The PowerShell recipe was not used here: it
    would be a script, and Obsidian starting PowerShell to change the
    registry is what security software looks for.
  - Linux: `/usr/bin/update-desktop-database` on the folder of desktop
    entries, if it is there.
- **What is written.** Only what the recipe writes: on macOS the app in the
  Applications folder of the home folder; on Windows the script's folder in
  `%LOCALAPPDATA%` (the script, and the list of extension keys it made) and
  those registry values, for this user only; on Linux
  the script and the desktop entry under `~/.local`. Nothing is downloaded;
  nothing is written for other users or outside those places. An app of the
  same name on a Mac that Annotator did not make (its identifier says) is
  neither replaced nor deleted. Paths that cannot be written safely (a
  Windows folder that is not on a drive or holds `"` or `%`; on Linux a home
  folder with characters a desktop entry would read as its own) are refused,
  and only the recipe is offered.
- **Nothing is written over or deleted that this app did not make.** Before
  either button writes or deletes, it looks at what is there without
  following a link: on a Mac the app must be a folder (not a link) with this
  app's identifier; on Linux the script must hold the line that says what it
  does and the desktop entry its `Exec=` line for that script; on Windows
  the folder must not be a link, `open.ps1` must be this app's one line and
  `made-keys.txt` a list of its extensions. Anything else (a link, a folder,
  another program's file) stops the button with a message, and nothing is
  changed. Uninstall on Windows deletes only those two files, then the
  folder if nothing else is in it.
- **Built whole, then moved into place (macOS).** The app is made in a
  hidden folder of its own beside where it goes, and renamed into place
  only once it is signed; the app it replaces is put back if that fails. An
  Install that stops halfway leaves the app that was there, or none, never
  one without its identifier, which later presses would refuse.
- **Other accounts on the computer cannot read the key.** The app and the
  script carry the key. On a Mac the app is made readable by this account
  alone (`chmod -R go-rwx`, after signing; the signature does not cover who
  may read the files, and still verifies), and the Applications folder of
  the home folder, when Install makes it, is made `0700`: a Mac's home
  folder is open to the `staff` group, so other accounts could otherwise
  read the app's script. On Linux the script is written `0700` (a script an
  older recipe wrote `0755` is closed before the key is written into it).
  The recipes do the same. On Windows the script is in `%LOCALAPPDATA%`,
  which only the account can read.
- **What it makes.** A program that, for each file it is given, opens one
  `obsidian://annotator-open` address with the file's path encoded, and
  does nothing else; it is registered as a second choice for PDFs and books,
  never as the default by itself. It carries the key (above).

## Addresses handed over from a browser (the bookmarklet)

`obsidian://annotator-open?url=…` takes a web address, so that a bookmarklet
(or a phone's share sheet, or a script) can hand over the page a browser
shows. Where it goes is decided in `src/open-address.ts`.

**What is taken** (`checkAddress`): `https` only; no user name or password;
at most 4,000 characters; an address that names a file too (`source`,
`file`) is refused. Any port is taken. The fragment is dropped. The
address is checked again at the press (`openAddress`), since a waiting tab's
state may come from a synced workspace.

**An address on this computer or the reader's own network** (a home server
such as `https://nas.home.arpa:8443/`, `https://192.168.1.20/`) is taken
like any other. 0.3.7 refused such addresses, so that a web page could not
use a link to make Annotator ask the reader's network for something. 0.3.8
dropped that rule, because the protection it added was small and it broke
the reader's own servers: nothing from a link is fetched before the reader
presses for it in a tab that names the host, and what is fetched only
opens in the reader's own Obsidian: nothing of it goes back to the page that
made the link.

**Where it leads** (`src/address-hops.ts`). Obsidian's request function
follows a redirect without saying where to. So before anything is read,
every step is asked here instead:

- **On a computer**, each step is a HEAD request made with Node's own
  client, which follows no redirect. Every `Location` must pass the same
  rules as the address handed over (so no `http`, no password), and after
  five steps it is given up. The address it ends at is the one written
  into the note and read.
- **What is not guaranteed.** The file itself is then downloaded with
  Obsidian's request function, which looks the name up again and would
  follow a redirect it is given: a server that answers HEAD with the file
  and the download with a redirect, or a name that changes its answer
  between the check and the download, is not caught on that last request.
  A page opened in the Web viewer is browsed as any page is.
- **On a phone** there is no such client: only the address handed over (or
  shared) is checked, by its name; where it leads, and what its name leads
  to, cannot be seen. A phone reads an address only after a press or a
  share, which the reader makes.

**Without this device's key, nothing is fetched and no note is made.** The
address opens a tab of its own (`src/handed-view.ts`) that says what it
seems to be (from the address alone), which host would be asked, and that
nothing has been fetched. It waits for a press, and keeps waiting through a
restart: the tab's state holds only the address and the route. **A link
cannot flood**: the same address again shows the tab already there; at most
three addresses wait at once (the oldest gives way, also after a restart); a
tab takes the focus at most once in ten seconds; and refusals, and the word
that another address waits, are said at most once a minute, as for keyless
`file=` and `source=` addresses. The words say what the press does: for a PDF, a book or a video, that
a note is made (or the one that names it opened). A note is made only after
that press, never from the link. The request that tells an address's kind
when the address does not (a HEAD) is made only after the press too.
Pressed, the address counts as the reader's yes to read that one source
(kept as `place:` or `copy:` for the address, as the first question's yes
is), so no second question follows.

**With the key** (a script of the reader's own), it opens where it goes at
once, as a file handed over with the key does.

| Route | Decided by | What happens after the press (or with the key) |
| --- | --- | --- |
| PDF, EPUB | The path's ending, else the server's `Content-Type` (HEAD) | The note that names the address, or a new one (`annotation-target-type` is written when the address does not end in `.pdf` or `.epub`); then read as any web source is: downloaded to this computer's cache (a phone: into the folder for copies) |
| Video | A YouTube address (`resolveVideoTarget`) | A note whose target is YouTube's own address for the video (`watch?v=…`), never the page's query (`si=` and the like); the video reader |
| Web page | Anything else, and a server that does not answer HEAD | Obsidian's Web viewer, as **Open website in core Web viewer** does; on a phone, an offline reading copy, as **Save website as an offline Markdown reading copy** does. No annotation note before the first highlight |

- **Keys in addresses.** An address whose query carries a key (`keyedQuery`:
  `token`, `sig`, `auth`, `key` and the like), handed over or reached by a
  redirect, is not opened on any route that writes an address into a note
  (a PDF, a book, a web page's note or a phone's reading copy, shared or
  pressed for), and the reader is told to download it instead. A YouTube
  note holds YouTube's own address only.
- **The title** (`title=`) is taken only with this device's key; without it a
  new note is named after the file or the host. A title shared from a phone's
  browser names the note too. Either way it is cleaned of control
  characters and of what a file name cannot hold, and cut at 200
  characters. The waiting tab shows only the host and the address.
- **Words in a new note.** A title and an address filled into the reader's
  template (`{{title}}`, `{{target}}`) are plain text in the note's body:
  backticks, `$`, `=`, brackets, `<`, `>`, `|`, `%`, `#`, `!` and a leading
  list mark are escaped (`markdownWords`), so a title cannot become
  Dataview or Templater code, a link, an embed or a tag; in the note's
  properties they stay on one line. This holds for every new note, not only
  those made from a link.
- **Text shared to Obsidian on a phone** (Obsidian's `receive-text-menu`,
  which then offers **Annotate in Annotator: \<host\>** when the text holds
  an `https` address) takes the same route at once: the reader shared the
  page and picked the item, which names the host it will ask. The same
  rules apply.

### Why the bookmarklet carries no key

The device key is the one **Open with Annotator** uses. It is what lets an
address read a **file on this computer** outside the vault without a
question. A bookmarklet that carried it would put that key where a page and
the rest of the browser can reach it:

- a bookmark is not private to Obsidian: browsers sync bookmarks to their
  vendor's servers and to other devices, export them to HTML files, show
  them to extensions with the bookmarks permission, and people share
  bookmark folders;
- a bookmarklet runs as a script inside the page it is pressed on. Its text,
  with the key in it, is evaluated in that page's world, where the page's
  own scripts can have replaced the functions it calls (`encodeURIComponent`,
  `String.prototype` methods) before it runs;
- with the key, any page that got it could have Annotator copy or read any
  file the computer can see (`source=`), and make notes and fetch addresses
  without a press.

A key of its own for web addresses alone would still let anyone holding it
make notes and fetch addresses in the reader's name without asking. The cost
of no key is one press in Obsidian for each page handed over, on a tab that
says what it will do. That is the choice: the bookmarklet sends only
`location.href`, `document.title` and the vault's name, and Annotator waits
for the press. The settings show the bookmarklet as a link to drag and as
text to select; nothing is put on the clipboard.

On Android the share sheet is the better way: a share is the reader's own
act in the system, and Obsidian then shows its menu, where the reader picks
**Annotate in Annotator**. A page cannot start a share by itself
(`navigator.share` needs a tap, and the reader still chooses Obsidian and
then the item).

## The folder for copies

**Annotate a copy in the vault** and every other copy of an outside source
go into the folder chosen under **Folder for copies** (default `Annotator
sources`). The setting is kept as a folder of the vault (`copyFolder`):
written with `/`, no `.` or `..` parts, no hidden folder (so never
`.obsidian` or `.trash`), no character a disk refuses; anything else is the
default. Copies already made are never moved or rewritten. Copies are still
found by their digest name in the folder chosen, in every folder copies were
made in before (kept in the settings), and in `Annotator sources`; before a
copy would be downloaded again, the whole vault is searched once for it by
name, so a copy made on a device whose settings did not sync is found. The
writes go through the one check every vault write passes (`vaultWritable`).

## What is kept on the device outside the vault

- **The text of PDFs you have opened**, so that their highlights can be placed
  as soon as a page is drawn next time. It is kept in the app's own storage
  on that device (IndexedDB, `obsidian-annotator-pdf-text`): not in the vault,
  not synced, never sent anywhere. At most 40 documents are kept, the oldest
  let go; a text longer than six million characters is not kept. It is only a
  head start for painting: the text is read from the file again at every
  opening, and nothing is written into a note from remembered text.
- **This computer's key and the folders files may be copied from** without
  a question (Open from outside Obsidian), in Obsidian's own storage for
  this computer and vault. They are not in the vault and do not sync. The
  key is also in "Open with Annotator", where Install put it (below).
- **The files and libraries allowed to be read where they are, and which
  download each web address means**, in the same storage
  (`annotator-in-place`). Not in the vault, not synced. The downloads
  themselves are in the system's cache folder (above).
- **Settings, reading positions and unfinished drafts** are in the plugin's
  `data.json` inside the vault's configuration folder, as with any plugin.
