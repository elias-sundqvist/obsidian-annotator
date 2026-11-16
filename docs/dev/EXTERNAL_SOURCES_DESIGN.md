# Reading sources where they are

Status: stage 1 built on `feature/read-in-place`. Written 2026-11-16; the
review of the first draft is folded in (last section).

## What the owner asked for

- A Zotero library, a Calibre library, a folder of PDFs or a web address
  is the reference: "they should not even need to copy the file into the
  vault"; Calibre "should be possible to use as a direct reference without
  having to copy the file".
- Reading a source without copying it was a fundamental feature before 0.3
  and is kept, for every kind of outside source, web addresses (and
  archive.org items) included.
- Copying into the vault stays, as an easy and visible choice on an open
  outside source, with what the copy makes possible said where it matters.
- Notes whose source was already copied into `Annotator sources` keep
  working as they do.

## What 0.3.2 does

Every outside target (`https://…`, an archive.org item, an absolute path, a
`file:` address, a Zotero, Calibre or DEVONthink link) is resolved, asked
about once (`approveSource`) and then downloaded or copied into
`Annotator sources/` under a digest of its address (`downloadSource`,
`remoteFilename`). The note keeps its target; the plugin's settings remember
the copy (`remoteSources`, address → vault path). A later change of the
original is taken in only by **Refresh cached PDF or EPUB**, which re-reads
it, re-anchors every note against the new bytes (`reviewRemote`) and keeps
the old copy as a revision (`remoteHistory`).

Before 0.3 the reader was pdf.js and epub.js inside a frame, given the
target's address: a web PDF was read from the web and nothing was kept in
the vault. 0.3 moved PDFs into Obsidian's own PDF view, which then read
vault files only; that is why it started copying.

## Findings

Read in Obsidian 1.15.1's own code (`app.js` in `obsidian-1.15.1.asar`)
unless marked otherwise.

1. **A desktop vault hands out files outside it.** `Vault` holds an
   `externalFileManager`. `getAbstractFileByPath(p)` and `getFileByPath(p)`
   return, for a `p` that begins `file:` and names an existing regular file,
   a `TExternalFile` (`extends TFile`; `getRealPath()` gives the absolute
   path). The path after `file:` is taken literally (no percent-decoding),
   resolved, and its separators made `/`: the file's `path` is
   `file:/Users/me/a b.pdf` or `file:C:/Users/me/a.pdf`. The check is
   `lstatSync(…).isFile()`, so a path whose last part is a symbolic link is
   refused. Only when `Platform.canOpenExternalFiles`
   (`isDesktopApp && isDesktop`), never on a phone or tablet. Public since
   1.14.4 (`TExternalFile` is exported from `obsidian`).
2. **Obsidian's views open it.** `FileView.setState({file})` looks the path
   up with `getAbstractFileByPath`, so `leaf.openFile(external)` and a
   restored workspace work. The PDF view loads
   `pdfViewer.open({url: vault.getResourcePath(file)})`; the desktop
   adapter strips `file:` and serves the absolute path. The book reader
   reads `vault.readBinary(file)`, through the same adapter. Seen live
   during the Open with work (1.15.0): a PDF in the PDF view, a book in the
   book reader.
3. **It is watched while used.** While a view uses it, Obsidian watches the
   file and fires the vault's `modify` and `delete` for it; when no view
   uses it the watch stops. A `TExternalFile` kept by a plugin past that has
   a stale `stat`: the plugin keeps paths, not file objects.
4. **It is not a fence.** "Can be used with the vault API just like any
   other file": `vault.create('file:/x/y.md')` or `modifyBinary(external)`
   write outside the vault. 0.3.2 is kept from that by never binding an
   outside file (`outsideVault` in `baseSourceKey`, `ensureNote`,
   `bindEmbeddedPdf`).
5. **Phones cannot.** The mobile adapter has no `file:` handling;
   `getResourcePath` turns a vault path into a WebView address under the
   vault folder. Obsidian's PDF view takes no bytes from a plugin through
   any public API, so on a phone a PDF must be a vault file.
6. **Annotations already say what they were made on.** A PDF annotation's
   `target[0].source` is `urn:x-pdf:<fingerprint>`; the reader already
   compares it with the open document (`otherCopy`) and marks such an
   annotation "made on another copy of this PDF", placing its passage by its
   words. Anchoring never uses the path, so a note anchors on any copy of
   the same bytes, wherever it lies.
7. **Writers that take their place from the source.** Notes go where the
   note is, area pictures to the note's attachment folder, a Hypothesis
   import's archive beside the note. Four writers take a path from the
   source: **Export PDF with annotations** (`source.parent` +
   "(annotated)"), the **searchable copy** (`source.parent`, and
   `modifyBinary(source)` when the PDF already has recognised text), **New
   annotation note for pages…** (`source.path`'s folder), and `ensureNote`
   (`<source>.annotations.md`) when a source has no note. For a
   `TExternalFile` `parent` is null, and the others would write outside.
8. **Matching costs a disk call.** `noteMatchesSource` ends with
   `vault.getAbstractFileByPath(key)`; for a `file:` key that is an
   `lstatSync` and a new `TExternalFile`, in loops over every note and from
   the one-second binding tick.

## The design

### Two ways to read an outside source

- **Read where it is** (default for outside sources on a computer with
  Obsidian 1.14.4 or later). The file is opened where it is, as a
  `TExternalFile`; nothing is put into the vault; the note is the only thing
  written.
  - An absolute path or `file:` address: that file.
  - A Zotero, Calibre or DEVONthink link: followed as today
    (`followAppLink`) to a path, then that file.
  - A web address, including the file an archive.org item link is looked up
    to: downloaded to a cache on this computer, outside the vault, and that
    file is read. The cache is the system's cache folder
    (`~/Library/Caches/Annotator for Obsidian` on macOS,
    `%LOCALAPPDATA%\Annotator for Obsidian\Cache` on Windows,
    `$XDG_CACHE_HOME/annotator-for-obsidian`, else
    `~/.cache/annotator-for-obsidian`, on Linux). Each download is a folder
    named by the SHA-256 of the address and of the bytes, holding the file
    under the name the address gives it (`…/<url hash>/<bytes hash>/Attention
    is all you need.pdf`), so the tab shows the paper's name, a refresh never
    replaces a file that is open, and earlier downloads stay. Which download
    an address means on this computer is kept in Obsidian's local storage
    for the vault, not in `data.json`. **Clear the download cache** (command)
    removes what no open tab uses.
- **A copy in the vault** (0.3's way), when the user chooses it:
  **Annotate a copy in the vault** in the first question, in the view's
  header, and as a command; or for every outside source when the setting
  **Copy outside sources into the vault** is on (off by default). On a phone,
  the only way (see Phones).

### Keys

A source is known inside the plugin by a key (`targetKey`, `sourceKey`).
For a source read where it is, the key is exactly what Obsidian's
`TExternalFile.path` is for the file: `file:` + the absolute path with `/`
separators, not percent-encoded (`file:/Users/me/a b.pdf`,
`file:C:/Users/me/a.pdf`). It is written so by `externalKey`, from the
decoded path `localTarget` gives; 0.3's percent-encoded `file:///…` form
stays the key of `remoteSources`, `localVaultTargets` and copies, and the
two never share a map. `targetKey` stays synchronous and touches no disk.

On opening (asynchronously, once per target per session) the path is
resolved with `realpath`, so that a symbolic link, or letters written in
another case on a Mac or Windows disk, become the file's own path; the
result is remembered in memory (target → key) and used by `targetKey` from
then on. A view Obsidian opened on an outside file (Open with, a drag, a
restored tab) is matched to a note's key without regard to case on macOS
and Windows.

An outside key is never looked up with `getAbstractFileByPath` while
matching notes: `noteMatchesSource` and the other loops return before that
for an outside key.

The plugin keeps, in memory, which outside keys a note names and how
(`inPlace`: key → the target as written, its kind, the address for a web
source). A view on an outside file is bound to annotations only when a note
names its key and this device allowed it (below). Anything else Obsidian
opened from outside is as in 0.3.2: shown without annotations, with
**Annotate a copy in the vault**. While the workspace is still being
restored and Obsidian has not read every note's properties, an outside view
is left alone rather than told it has no annotations; it is looked at again
when the properties are read.

What is kept in `data.json` for an outside source is kept under the target
as written (a link, an address, the path as the note writes it), never under
this computer's path: reading positions move with the vault to another
computer, and `data.json` does not collect one computer's paths. The
association of a source with its note is not kept for an outside key (the
note names it; that is enough).

### The copy keeps the note's link

When a copy is made the note is not rewritten: its `annotation-target`
stays the Zotero link, the path or the address. Reasons: the reference
stays the library; the note's text is the user's and its format is
specified; 0.3.x already works this way.

The copy is named by the SHA-256 of the target **as the note writes it**
(`Annotator sources/<hash>.pdf`), and remembered in `data.json` under the
same target. So a phone or a second computer finds the copy by its name
even when plugin settings do not sync: the name follows from the note. 0.3's
copies, named by the address they were read from, are found through
`remoteSources` as before.

A copy wins. Where one exists for the target, it is read on every device, so
annotations are anchored on one set of bytes.

### Moving 0.3.x users over

- Nothing is converted, moved or deleted. A target with a copy in
  `Annotator sources` keeps reading that copy, with its revision history.
- A target without a copy, opened for the first time after the update, is
  read where it is on a computer with Obsidian 1.14.4 or later, after the
  first question. Who wants 0.3's way turns on **Copy outside sources into
  the vault**.
- On an older Obsidian on a computer: the question offers the copy, as
  0.3 did, and says that Obsidian 1.14.4 reads the file where it is.

### The first question

Before an outside file is first read on this device:

- **Read this file where it is?** "This note's source is outside the vault.
  It is read where it is and never changed; your annotations go into this
  note." The path. "Only allow this for notes you trust: a note from someone
  else can point anywhere." Answers: **Not now**, **Annotate a copy in the
  vault**, **Always from this library** (for a file reached through a
  Zotero or Calibre library folder, which then allows every file in that
  library on this device), **Read where it is**.
- For a web address: **Read this file from the web?** It is downloaded to
  this computer's cache, not into the vault. Answers: **Not now**,
  **Annotate a copy in the vault**, **Always from example.org**, **Read
  where it is**.
- Copy (setting on, older Obsidian, phone): 0.3.2's question.

A yes to read a file where it is is remembered on this device, in
Obsidian's local storage for the vault (not `data.json`), by the file's
key, or by the library folder. Why remembered, when 0.3 forgot a yes for a
file after copying it: in place, every opening reads the file again, and a
question each time would be noise. A note synced from someone else that
names another file is still asked about. A yes for a web address is kept as
before, in `approvedSources` (in `data.json`: the address means the same
file everywhere), by the address or as `origin:https://host` for a site.
Every version reads that one list, so an entry keeps the meaning of the
version that wrote it:

| Entry | Written by | Means | Read by |
| --- | --- | --- | --- |
| the address alone | 0.3.2 (and 0.3.0, 0.3.1) | yes to download it into the vault | every version; 0.3.3 took it for a yes to read where it is only |
| `copy:` and the address | 0.3.3 on | yes to copy it into the vault | 0.3.3 on |
| `place:` and the address | after 0.3.3 | yes to read it where it is (this computer's cache), no more | after 0.3.3; 0.3.2 and 0.3.3 keep it unread |

A yes to copy (either form) also allows reading where it is. 0.3.3 wrote a
yes to read where it is as the address alone, which 0.3.2 reads as a yes to
download into the vault, on a second device or after a downgrade; since
0.3.3 that yes is `place:…`, which 0.3.2 and 0.3.3 do not read. An entry
0.3.3 wrote cannot be told from 0.3.2's and is read as 0.3.2 reads it.
`file:` entries (kept by 0.3.0 and 0.3.1) are dropped since 0.3.2, in every
form (`fileYes`), so settings holding only those are saved as an empty list.

### A source that changes

In place, Zotero, Calibre or the user may change the file. The annotations
already carry the fingerprint of the PDF they were made on (finding 6).
When a PDF read where it is has annotations made on another version, the
reader says so once when it opens: how many, that their passages are found
by their words and marked in the list, that areas and drawings from the
other version are not placed, and that **Annotate a copy in the vault**
keeps one version fixed. Nothing in the notes is changed.

For a web address read where it is, **Refresh cached PDF or EPUB** downloads
it again; if the bytes differ, the existing review (`reviewRemote`,
`RemoteRevisionModal`) shows what is located and what is not, and **Use
reviewed revision** switches this computer to the new download (the old
one stays in the cache).

### What works where

| | Read where it is | Copy in the vault |
| --- | --- | --- |
| Read, highlight, note, area, drawing, text box | yes | yes |
| Links to passages, the annotation list and its search | yes | yes |
| Reading position | yes (kept under the target as written) | yes |
| Export notes, citations, PDF details, take in a PDF's annotations | yes | yes |
| Export PDF with annotations (either kind) | no: says so, offers a copy | yes, beside the copy |
| New annotation note for pages… | yes, beside the note, same target | yes |
| Searchable copy (text recognition) | no: says so, offers a copy | yes |
| On a phone or tablet | no: says why, offers a copy (web) | yes, once synced |
| Offline | files on this computer yes; web once downloaded here | yes |
| Highlights in an embedded PDF (`![[…pdf]]`) | no: an embed names a vault file | yes |
| Earlier versions after a change | web: kept in the cache; files: no | yes, reviewed revisions |
| Network paths (`\\server\…`) | no (refused, as in 0.3.2) | no |

The view of an in-place source has a header action **Annotate a copy in
the vault**; the command of that name does the same; and where an action
needs a copy, the notice that says so has the button.

The export first wrote beside the note; when the export with annotations
drawn in arrived on `next`, the owner's coordinator asked that both kinds of
export, which write a file beside the PDF, offer the copy instead, as the
searchable copy does. One rule: what writes a file beside the PDF needs the
copy.

A file Obsidian opened from outside the vault (Open with) and that no note
names gets two buttons: **Annotate where it is** (a note naming it is made,
and it is read in place) and **Annotate a copy in the vault** (0.3.2's
behaviour). The `annotator-open` address and the share menu still copy, as
their recipes promise.

### Phones and tablets

- A copy exists (synced, or found by its name): it is read.
- A web address without a copy: the question is **Annotate a copy in the
  vault?** and says that phones read web PDFs and books from the vault.
  Nothing is downloaded without that answer.
- A path, a `file:` address, or a Zotero, Calibre or DEVONthink link
  without a copy: "This note's source is a file on a computer. A phone
  cannot read it there. On that computer, open the note and choose
  Annotate a copy in the vault; the copy then syncs here." Nothing else
  happens.

### Security

- Nothing outside the vault is read on a note's say-so alone: the first
  question, per file (or library) and device. Zotero and Calibre links are
  followed only into the folders the settings name (or Zotero's usual
  place), DEVONthink only after its own question.
- The reader writes nothing outside the vault except into its download
  cache. Every write to the vault goes through one check (`vaultWrite`): a
  path that begins `file:`, is absolute, has a drive letter or climbs out,
  or a file that has `getRealPath`, is refused. The four writers of finding
  7 write beside the note for a source read where it is, or refuse.
- The cache is written only under its own folder, only into folders named
  by 64 hexadecimal digits, by writing a temporary file and renaming it;
  nothing there is ever opened for writing again.
- Obsidian lets the user rename an outside file from its tab header. The
  note still names the old path; the reader says so when it happens.

### Obsidian versions

- Reading where it is: desktop, Obsidian 1.14.4 or later, detected at run
  time (the `TExternalFile` export). `minAppVersion` stays 1.11.4.
- Earlier versions, phones and tablets: copies, as 0.3.

## What was tried in Obsidian

Obsidian 1.15.1 (the shared test instance, macOS), with this branch's
release build, against the test data the real programs made:

- A Zotero 10.0.9 link (`zotero://open-pdf/library/items/IKUUN4F6`) to the
  PDF in Zotero's data folder: the question showed its four answers (they
  overflowed the dialog at first: the row now wraps); **Read where it is**
  opened the file in Obsidian's PDF view as a `TExternalFile`; the path,
  written through `/tmp`, was resolved to `/private/tmp`; the note's
  annotation was painted on the page and listed in the sidebar; the header
  had **Annotate a copy in the vault**; nothing was added to the vault.
- A Calibre 9.18 link (`calibre://show-book/My_Test_Library/1`): **Always
  from this library** kept the library folder on this device; the EPUB opened
  in the book reader in place, titled by the book; a highlight made by
  selecting and pressing H was written into the note; the Calibre folder was
  unchanged. **Annotate a copy in the vault** in the header made
  `Annotator sources/<hash>.epub`, showed it in the same tab with the same
  annotation, kept the note's `calibre://` link, and the header action went
  away.
- A web address served from this computer: **Read this file from the web?**
  with **Always from 127.0.0.1:8765**; the PDF was downloaded to
  `~/Library/Caches/Annotator for Obsidian/<hash>/<hash>/Trace based
  JIT.pdf`, read there, its tab named by the file; an annotation marked as
  made on another fingerprint brought the notice about another version.
  **Export PDF with annotations drawn in** on it said it needs a copy, with
  the button.
- With both outside tabs open, the plugin was disabled and enabled again:
  both were bound to their notes again (the Zotero one only after the fix
  that resolves the paths notes write when a restored tab shows the file's
  own path).
- At the end, the Obsidian window stopped answering while the released
  0.3.1 build was being enabled again; it was reloaded through the debugging
  port and came back with 0.3.1, its settings byte for byte as before, and
  the same tabs. What stopped it was not found.

Zotero and Calibre themselves were not started: their links and folders
were followed as 0.3.2 does (tried against both programs before), and
reading in place changes nothing on their side.

## Stages

1. **Stage 1 (built).** Everything above.
2. **Stage 2: phones read web sources without a copy.** Needs Obsidian's PDF
   view to take bytes or a blob address from a plugin (not public today),
   or the plugin's own PDF reader on phones. The book half is feasible (the
   book reader parses bytes itself) but the reader's keys are vault files.
   To decide with the owner.
3. **Stage 3: going back to an earlier download** of a web source (the
   files are kept already; a list to choose from is missing), and a size
   limit for the cache.

## Criticism and what changed

The first draft was reviewed by a separate agent against the code and
Obsidian's. What it found, and what was done:

- Two `file:` key forms were mixed: one canonical form now (`externalKey`,
  Obsidian's), the 0.3 URI form only for 0.3's maps.
- Spelling-sensitive matching (case, symlinks): `realpath` on opening,
  case-insensitive matching of Obsidian-opened views on macOS and Windows.
- `noteMatchesSource` would stat the disk per note per second: outside keys
  return before any lookup.
- A fourth writer (`modifyBinary(source)` in the searchable copy) and
  `ensureNote`'s own creation: in the write check and refused.
- "Copy found by name" could not work for app links without synced
  settings: new copies are named by the target as written.
- The planned hash record and review duplicated the fingerprint check the
  reader already has, and its "Accept" changed nothing: replaced by a notice
  that counts annotations from another version.
- Device paths in `data.json` (positions, associations): kept under the
  target as written, or not kept.
- Hex names as titles: the cache keeps the file's own name.
- Restored tabs told "no annotations" before notes were read: held until
  the metadata cache has resolved.
- Rename from the tab header: said.
- Finding 3 corrected; paths kept, not file objects.
- "Read the original in place" (dropping a synced copy): dropped from
  stage 1.
- Replacing a cache file under an open tab, and two vaults sharing it:
  downloads are named by their bytes and never replaced; which one an
  address means is kept per vault and device.
- A question per Zotero file: **Always from this library**.
- `instanceof TExternalFile` on old Obsidian: never used; detected by the
  export.
- One name per action: **Annotate a copy in the vault** everywhere
  (including Open with's button), **Read where it is**.
- Kept against the advice to split: web addresses stay in stage 1, as the
  owner asked for them now.

## Second review, of the built branch

An independent review of the branch found four defects; each was fixed with
a test that failed before:

1. **Approval bypass.** `externalKey` turned `\` into `/` after `..` had been
   taken away, so on macOS or Linux a file name with backslashes
   (`storage/..\..\secret.pdf`) became a key that passed the library's
   allowance and that Obsidian resolves to a file outside it. Now a path
   with a backslash (outside Windows) or with `.`/`..` left is never a key
   (`safeExternalKey`): it can only be copied in, after its own question.
   Allowances and libraries are compared only with such keys; a library is
   allowed as its real folder too; the file a link leads to is allowed only
   if it is allowed itself, or after a question that shows it.
2. **A copy not found by its name** on a computer that reads in place: the
   name is now worked out at once (`copyNameNow`, SHA-256 in the module) in
   `targetKey` itself, so opening, restored tabs and note matching agree.
3. **A phone copying without asking**, on a desktop's yes to read in place:
   a yes to copy is now kept apart (`copy:…`).
4. **Paths never allowed resolved on disk** (a synced note naming a network
   share): only paths allowed on this computer are resolved, in the
   background.

Also confirmed and fixed: a book read where it is, its tab restored before
any note was read, opened at its start; this computer now remembers which
note target each file it read answers to (`names`), so its position is
found at once.
