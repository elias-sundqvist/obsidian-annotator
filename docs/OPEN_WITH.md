# Open a file from outside Obsidian

How a PDF or a book in your Downloads, on the desktop or in a mail reaches
Annotator's reader. The README has the short version, under "Open a file
from outside Obsidian"; this page says what each way does, line by line, and
how to take it away again.

Every kind of file the reader opens can come this way: PDF, EPUB,
FictionBook (`.fb2`, `.fbz`, `.fb2.zip`, `.fb3`) and Kindle books (`.mobi`,
`.prc`, `.azw3`). Whichever way the file comes, a note named after it is
made where your new notes go, and the file opens in the reader. On a
computer with Obsidian 1.14.4 or later it is read where it is: nothing is
copied into the vault, and **Annotate a copy in the vault** in the tab's
header makes a copy when you want one. The file itself is never changed. The
same file opened again shows its note, in the tab it is already open in.

## Open with Annotator: the Install button

In Annotator's settings, under **Open from outside Obsidian**, press
**Install**. It adds "Open with Annotator" to Finder's, Explorer's or your
file manager's Open with, for PDFs and books, for this vault. The settings
then say whether it is installed on this computer, and for this vault; if a
new key was made since, or it was installed from another vault, they say so,
and **Install again** makes it open files here.

A file opened with it goes straight to the reader, with no question: the
app carries this computer's key (below), which a web page cannot know, and
choosing a file in your own file manager is the yes. The file is allowed to
be read where it is on this computer, as **Annotate where it is** allows it,
that file and no other. On an Obsidian before 1.14.4, which cannot read a
file outside the vault, or with **Copy outside sources into the vault** on,
it is copied into `Annotator sources` instead, after a question for each
folder (**Copy this file**, **Always from this folder** or **Not now**); the
folders allowed so are listed in the settings, with **Forget them**.

Install does what the recipe for the system does (below, under "Do it
yourself"), on your press and at no other time. Nothing is downloaded and no
shell is started: each program is named by its full path and given its
arguments as a list, so no path or name can be read as a command. If there
is no key yet, Install makes one. If it fails, the settings say why and
unfold the recipe, to paste by hand.

**Uninstall** takes away what Install made, and only that. The key stays;
**Remove** next to it ends it.

Neither button writes over or deletes anything this app did not make, nor
follows a link: if what is where the app goes is a link, another program's
file, or an app of that name with another identifier, the button says so
and changes nothing. The app carries this computer's key, so what Install
writes is readable by your account alone (below for each system).

### macOS

Install:

1. compiles the app's AppleScript into "Open with Annotator"
   (`/usr/bin/osacompile`), in a hidden folder of its own beside the
   Applications folder of your home folder (made, if it is missing, for
   your account alone);
2. writes into its `Info.plist` (`/usr/bin/plutil`) its identifier,
   `sh.esh.annotator.open-with`; the types it opens, as a second choice and
   never by itself (`LSHandlerRank` Alternate): PDF and EPUB by the types
   macOS declares for them (`com.adobe.pdf`, `org.idpf.epub-container`),
   FictionBook and Kindle books by extension, since macOS declares no type
   for them; and a digest of the address it opens, by which the settings
   tell which vault and key it was made for;
3. signs it for this Mac only (`/usr/bin/codesign --sign -`), makes it
   readable by your account alone (`/bin/chmod -R go-rwx`: a Mac's home
   folder is open to the other accounts of the `staff` group, and the app's
   script holds the key), moves it into place whole, and registers it with
   Launch Services (`lsregister -f`). An Install that stops halfway leaves
   the app that was there, or none.

An app of that name that Annotator did not make is left alone: Install and
Uninstall say so and change nothing.

To open a kind of file with it by a double-click: select one in Finder,
choose File → Get Info, under "Open with" choose "Open with Annotator", and
press **Change All**. Do the same for each kind of book.

Uninstall unregisters the app (`lsregister -u`) and deletes it. If you had
made it the default for PDFs or books, choose another app for them the same
way: Get Info, Open with, Change All.

The first time Obsidian reads from Downloads, Documents or Desktop, macOS
asks whether Obsidian may; say yes.

### Windows

Install:

1. writes a one-line script, `open.ps1`, into
   `%LOCALAPPDATA%\OpenWithAnnotator`;
2. asks `%SystemRoot%\System32\reg.exe` to add, for your account only
   (`HKEY_CURRENT_USER\Software\Classes`), a program "Open with Annotator",
   `Annotator.OpenWith`, that runs that script, with Obsidian's icon if
   Windows knows where Obsidian is (`reg query` of the program Windows
   starts for `obsidian://` addresses);
3. asks it to add `Annotator.OpenWith` to the list of programs for `.pdf`,
   `.epub`, `.fb2`, `.fbz`, `.fb3`, `.mobi`, `.prc` and `.azw3`, beside the
   programs already there. `reg add` adds a value to a list that is there
   and leaves its other values; it does not change the default (but if the
   app chosen for a type has since been uninstalled, Windows may put it
   first).

Why `reg.exe` and not the PowerShell recipe: each value is one argument, so
nothing is read as a script, and Obsidian starting PowerShell to change the
registry is the pattern security software watches for. The program itself
runs PowerShell, as the recipe's does, when you open a file with it.

To open a kind of file with it by a double-click: right-click one in
Explorer, choose Open with → Choose another app, pick "Open with Annotator"
and press **Always**. Do the same for each kind of book.

Before it writes, Install asks `reg.exe` which of those extensions have a
key already, and keeps the names of those it makes in `made-keys.txt` beside
the script. Uninstall asks `reg.exe` to delete the program's key and its one
entry in each list; then, for each extension key Install made, it deletes
the key if nothing but its emptied list is in it (another app's entry keeps
it); and it deletes the two files it wrote, and the folder if nothing else
is in it. If you had made it the default
for a kind of file, Windows asks which app to use the next time you open
one.

The script runs in a console with no window (`conhost.exe --headless`, part
of Windows 10 since version 1809 and of Windows 11), so no window opens.
PowerShell's own `-WindowStyle Hidden` is not enough: where Windows Terminal
is the default terminal, as it is on Windows 11, a Terminal window would
stay open while PowerShell runs. PowerShell can take several seconds to
start, so Obsidian may take a moment to show the file.

Smart App Control, where it is on, is a policy of Windows' App Control. App
Control lets a PowerShell script it does not know run in PowerShell's
constrained language, and the script's one line works there; but this has
not been tried with Smart App Control on. A VBScript or JScript it does not
know, App Control blocks outright, which is one reason there is no such
launcher. Obsidian's own "Open with" needs no script at all.

### Linux

Install writes two files under your home folder:

- `~/.local/bin/open-with-annotator`, a shell script that turns each path
  into an address with nothing but `od` and `printf` and opens it with
  `xdg-open`;
- `~/.local/share/applications/open-with-annotator.desktop`, which tells the
  desktop that it opens `application/pdf`, `application/epub+zip`,
  `application/x-fictionbook+xml`, `application/x-zip-compressed-fb2`
  (`.fb2.zip`), `application/x-mobipocket-ebook` (`.mobi`, `.prc`) and
  `application/vnd.amazon.mobi8-ebook` (`.azw3`). It is not shown in the
  application menu. freedesktop.org's list of types has none for `.fbz` or
  `.fb3`, so those are not offered here; the address takes them.

and runs `/usr/bin/update-desktop-database` on that folder, if it is there.
Then choose "Open with Annotator" in your file manager's Open With for a PDF
or a book. To make it the default for a type:

```bash
xdg-mime default open-with-annotator.desktop application/epub+zip
```

The script is written readable by your account alone (`0700`); one an
older recipe wrote (`0755`) is closed before the key is written into it.
Uninstall deletes the two files. If you had made it the default with
`xdg-mime`, choose another default the same way.

`xdg-open` needs Obsidian registered for `obsidian://` addresses. The
Flatpak does that itself; for the AppImage, Obsidian's help says how to make
the desktop entry. The Flatpak sees your home folder and removable drives,
but not `/tmp`: a file there cannot be read. A home folder whose path holds
`"`, `` ` ``, `$`, `\` or `%` cannot be written into a desktop entry as it
is; there the settings offer the recipe only.

## Do it yourself: the recipes

Under **Do it yourself** in the settings is the recipe for the computer you
are on, with the vault and the key written into it, and a **Copy** button.
It does what Install does, pasted into Terminal (macOS), a terminal (Linux)
or a PowerShell window (Windows). Each makes, for every file it is handed,
one address:

```
obsidian://annotator-open?vault=<this vault>&key=<this computer's key>&source=<the file's full path>
```

and asks the system to open it. That is all: nothing is downloaded, nothing
is installed for other users, nothing runs in the background.

- **macOS:** the same `osacompile`, `plutil`, `codesign` and `lsregister`
  steps, in a shell. Recent macOS may warn before pasting a command into
  Terminal; the recipe is the text shown in the settings, and nothing else.
  To take it away: delete "Open with Annotator" from the Applications folder
  of your home folder (or press **Uninstall**).
- **Windows:** the same keys and values, written by PowerShell. An
  extension's list of programs is made only when it is missing (in Windows
  PowerShell, `New-Item -Force` on a key that exists empties it). To take it
  away, in PowerShell (or press **Uninstall**):

  ```powershell
  Remove-Item -Recurse "HKCU:\Software\Classes\Annotator.OpenWith"
  foreach ($e in ".pdf", ".epub", ".fb2", ".fbz", ".fb3", ".mobi", ".prc", ".azw3") { Remove-ItemProperty "HKCU:\Software\Classes\$e\OpenWithProgids" -Name "Annotator.OpenWith" -ErrorAction SilentlyContinue }
  Remove-Item -Recurse "$env:LOCALAPPDATA\OpenWithAnnotator"
  ```

  The first line takes the program away with its name and icon; the second
  takes its entry, and only its entry, out of the lists of programs; the
  third deletes the script. If a list was made by the recipe, it stays,
  empty, which changes nothing.
- **Linux:** the same two files. To take it away:

  ```bash
  rm ~/.local/bin/open-with-annotator ~/.local/share/applications/open-with-annotator.desktop
  ```

### A script of your own

Make the address above, with the full path URL-encoded (every `/` as `%2F`,
a space as `%20`, `&` as `%26`, `#` as `%23`), and open it. **The address
itself** under Do it yourself shows it with the vault and the key. **New
key** ends the old one: the app and every recipe made with it stop being
answered (press **Install again**). **Remove** takes the key away, and then
no address reads a file outside the vault.

## Obsidian's own "Open with"

On a computer, Obsidian 1.14.4 and later can open a file that is not in the
vault. For a PDF or a book, Annotator then shows two buttons:

- **Annotate where it is** makes a note that names the file, and the file is
  read where it lies, like any source outside the vault.
- **Annotate a copy in the vault** copies it in, and the copy takes its place
  in the same tab. The command *Annotate a copy of this file in the vault*
  does the same.

Nothing needs installing, but:

- Obsidian appears under "Open with" only when it was installed from a
  current installer, not merely updated inside the app.
- Obsidian opens the file in the vault you used last.
- Obsidian shows the file first, and annotating it needs one press.

"Open with Annotator" goes straight to the reader, in the vault it was
installed from.

## Phones and tablets

A phone's Obsidian cannot read a file outside its vault, so the file is
first saved into the vault, and then opened. It cannot be handed to
Annotator where it is, from the file manager or the share sheet.

### Android

- **A PDF:** share it to Obsidian, choose **Import into vault**, then **Open
  in Annotator**. Obsidian saves it where your attachments go.
- **A book:** Obsidian is not offered for books in the share sheet. With a
  vault kept in the phone's storage (not in Obsidian's own, which other apps
  cannot reach), copy the book into the vault's folder with your file
  manager, then open it from Obsidian's file list.

An automation app that can save a shared file into a folder can then open
this address, with the path of the file in the vault, URL-encoded:

```
obsidian://annotator-open?vault=<vault name>&file=<path in the vault>
```

The settings show it for the vault, on the phone.

### iPhone and iPad

Share the file, choose **Save to Files**, then On My iPhone (or iCloud
Drive), Obsidian, your vault, and a folder in it. Open Obsidian and the file.

A Shortcut can do both in one step. It has not been tried on a device yet:

1. A new shortcut, **Show in Share Sheet** on, receiving Files and PDFs.
2. **Save File**: the Shortcut Input, to a folder of your vault (for example
   Obsidian → your vault → Inbox), **Ask Where to Save** off.
3. **Text**: `Inbox/` followed by the Shortcut Input's name and file
   extension, as it is saved.
4. **URL Encode** that text.
5. **Open URLs**: `obsidian://annotator-open?vault=<vault name>&file=`
   followed by the encoded text.

## What was tried, and where

- **The Install button, macOS 26, Obsidian 1.15.1** (a test profile and
  vault; the owner's Obsidian was not touched). An "Open with Annotator"
  made earlier by the recipe, for another vault, was there: the settings
  said so ("made for another vault or an older key"), and **Install again**
  replaced it. The app it made has the identifier, the two document types
  (PDF and EPUB by type, FictionBook and Kindle books by extension, both
  Alternate) and the digest of its address; it is signed for this Mac, and
  its compiled script opens the test vault's address. macOS then listed it
  under Open With for a PDF, an EPUB, an FB2 and a MOBI (and for nothing
  before Install). The defaults stayed Preview, Books and Calibre in three
  installs, one of them over the recipe's app again. Once, the first time,
  macOS answered right after Install that it was the default for the FB2
  and the MOBI, over Calibre; that did not come back, and Launch Services'
  saved choices (`com.apple.launchservices.secure.plist`) were byte for byte
  the same before and after. **Uninstall** took the app away, and macOS
  listed only what it had before. The recipe's app was put back as it was.
- **A double-click, as the address it makes**, called through the plugin's
  own handler in that Obsidian (an address sent through macOS goes to the
  Obsidian started first): a PDF named `A paper #1 & more.pdf`, an FB2, a
  MOBI and an EPUB in a folder `Downloads & more` outside the vault each
  opened at once in the reader, read where they are, with no question, no
  copy, a note named after each at the vault's root (where new notes go
  there), and **Annotate a copy in the vault** in the tab's header. The PDF
  asked for three times (once as a `file://` address) and the FB2 twice
  kept one tab each. A file of the vault asked for three times by `file=`
  kept one tab. Another type, and an outside file without the key, were
  refused with their notices. The files outside were not changed.
- **Windows 11 Home, the owner's laptop, over SSH** (Obsidian not started,
  no vault opened; no Node there): `reg.exe` was run with exactly the
  command lines Node's `execFile` gives it for Install's and Uninstall's
  argument lists. The command it stored is the one written (quotes, `%1`
  and the folder with spaces all as meant); the name is "Open with
  Annotator"; `.pdf`'s list kept another app's entry beside the new one;
  `.fb2`, `.fbz`, `.fb3`, `.mobi`, `.prc` and `.azw3` got keys of their own.
  After Uninstall, the exported keys of `.pdf` and `.epub` were identical
  to before, the program's key and the book types' keys were gone again,
  and the script's folder was gone. A first run, before Uninstall took back
  the keys Install made, left those six keys empty; they were deleted, and
  the check run again from a clean state. Explorer's dialog itself was not
  seen (it cannot be from a remote shell).
- macOS, Obsidian 1.15.0: a PDF and a book of the vault opened by address,
  with Obsidian running and when the address started it; the address
  without the key; the question and its answers; a file copied in through
  its note, with the original unchanged; a second file from an allowed
  folder; a PDF and a book that Obsidian opened from outside the vault,
  copied in by the button and by the command. The macOS recipe was made in a
  scratch folder: macOS then offered it under Open With for PDFs and books
  and for nothing else, and it handed both files over as addresses.
- Linux: the recipe and its script were run on macOS under `sh`, `dash` and
  `bash`, with names holding quotes, `&`, `#`, `%` and accented letters. Not
  yet on a Linux desktop.
- Windows: the recipe was run in Windows PowerShell 5.1 on a Windows 11
  Home laptop, with the file list of `.pdf` already holding another app's
  entry. It adds "Open with Annotator" beside that entry and leaves it as it
  was, and the removal steps above give the lists back exactly. (An earlier
  recipe made the list with `New-Item -Force`, which in Windows PowerShell
  empties a key that exists: it would have taken the other app's entry
  away.)
  - With Annotator 0.3.4 and Obsidian 1.13.6, someone at the screen chose
    the recipe of 0.3.4 in Explorer's Open with: Explorer offered it for PDFs
    and books, as recommended and not as the default; the address arrived
    whole with `&` in the file's name, and the reader opened the copy, with
    Obsidian running and with Obsidian closed. But Explorer listed it as
    "Windows PowerShell", with PowerShell's icon, and a Windows Terminal
    window stayed open 15 to over 60 seconds each time: `-WindowStyle
    Hidden` hides nothing where Windows Terminal is the default terminal.
  - The recipe now names the program (`FriendlyAppName`), gives it
    Obsidian's icon (`ApplicationIcon`; `DefaultIcon` alone does not reach
    the list), and runs the script in a console with no window. Run again on
    the same laptop (Windows 11 25H2, Windows Terminal 1.25 as the default
    terminal), Windows' own list of programs for `.pdf` and `.epub`, the one
    Explorer's Open with shows, names it "Open with Annotator" with
    Obsidian's icon, as recommended, and the defaults are unchanged. The
    command it registers was started as Explorer starts it, for three files
    with spaces, `&`, `#`, `%`, `'`, `$`, brackets, accents and Chinese in
    their names and folder: no window appeared in the 23 seconds until the
    last of them ended, where the old command, started the same way, opened
    a Terminal window. Its script, made to write its address to a file
    instead of opening it, wrote for each file the address the reader
    decodes to that file. Obsidian was not started.
  - Not yet tried: choosing the new recipe in Explorer's dialog itself
    (Explorer's own dialog cannot be read from a remote shell), Smart App
    Control (it was off; the script's line was run in PowerShell's
    constrained language, where it works), Windows 10, and Obsidian's own
    Open with on Windows, which needs an installer from 1.14.4.
- Android: tried on the Android 16 emulator with Obsidian 1.14.4. A PDF
  shared from the Files app to Obsidian, then **Import into vault**, shows
  **Open in Annotator** in Obsidian's menu after the import, and it opens
  the PDF in the reader. The address
  `obsidian://annotator-open?vault=…&file=…`, sent by Android itself (as an
  automation app or a link would), opens a PDF of the vault in the reader.
  Not yet tried on a phone, nor the book route through a vault in the
  phone's storage.
- iOS: the address is the same code; the Shortcut has not been tried on a
  device.
