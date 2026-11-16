# Open a file from outside Obsidian

How a PDF or a book in your Downloads, on the desktop or in a mail reaches
Annotator's reader. The README has the short version, under "Open a file
from outside Obsidian"; this page says what each way does, line by line, and
how to take it away again.

Whichever way the file comes, a note named after it is made where your new
notes go, and the file opens in the reader. The recipes and addresses below
copy it into `Annotator sources` in your vault first. Obsidian's own "Open
with" lets you choose: annotate the file where it is, or a copy. The file
itself is never changed. The same file opened again shows its note, and its
copy if it has one.

## Obsidian's own "Open with"

On a computer, Obsidian 1.14.4 and later can open a file that is not in the
vault. For a PDF or a book, Annotator then shows two buttons:

- **Annotate where it is** makes a note that names the file, and the file is
  read where it lies, like any source outside the vault.
- **Annotate a copy in the vault** copies it in, and the copy takes its place
  in the same tab. The command *Annotate a copy of this file in the vault*
  does the same.

Nothing needs setting up, but:

- Obsidian appears under "Open with" only when it was installed from a
  current installer, not merely updated inside the app.
- Obsidian opens the file in the vault you used last.
- Obsidian shows the file first, and annotating it needs one press.

The recipes below go straight to the reader, in the vault the recipe was
made in.

## The recipes

In Annotator's settings, under **Open from outside Obsidian**, press **Make
a key**. The settings then show the recipe for the computer you are on, with
the vault and the key written into it, and a **Copy** button. Each recipe
makes, for every file it is handed, one address:

```
obsidian://annotator-open?vault=<this vault>&key=<this computer's key>&source=<the file's full path>
```

and asks the system to open it. That is all a recipe does: nothing is
downloaded, nothing is installed for other users, nothing runs in the
background.

The first file from a folder is asked about in Obsidian: **Copy this file**,
**Always from this folder**, or **Not now**. The folders you allowed are
listed in the settings, with **Forget them**.

### macOS

Paste the recipe into Terminal. It:

1. writes a short AppleScript into an app, "Open with Annotator", in the
   Applications folder of your home folder (`osacompile`, part of macOS);
2. tells the system the app opens PDFs and EPUBs as a second choice, never
   by itself (`LSHandlerRank` Alternate, with the types `com.adobe.pdf` and
   `org.idpf.epub-container`);
3. signs it for this Mac only (`codesign --sign -`) and registers it.

Then select a PDF in Finder, choose File → Get Info, and under "Open with"
choose Other…, "Open with Annotator", and **Change All**. Do the same for a
book.

The first time Obsidian reads from Downloads, Documents or Desktop, macOS
asks whether Obsidian may; say yes. Recent macOS may warn before pasting a
command into Terminal; the recipe is the text shown in the settings, and
nothing else.

To take it away: delete "Open with Annotator" from the Applications folder
of your home folder, and choose another app under Get Info for PDFs and
books if you had made it the default.

### Windows

Paste the recipe into a PowerShell window. It:

1. writes a one-line script, `open.ps1`, into
   `%LOCALAPPDATA%\OpenWithAnnotator`;
2. adds, for your account only (`HKEY_CURRENT_USER\Software\Classes`), a
   program "Open with Annotator", `Annotator.OpenWith`, that runs that
   script, with Obsidian's icon if Windows knows where Obsidian is;
3. offers it under "Open with" for `.pdf` and `.epub`, beside the programs
   already there. It does not change the default (but if the app chosen for
   a type has since been uninstalled, Windows may put it first).

Then right-click a PDF, choose Open with → Choose another app, and pick
"Open with Annotator". Do the same for a book.

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
know, App Control blocks outright, which is one reason the recipe has no such
launcher. Obsidian's own "Open with" needs no script at all.

To take it away, in PowerShell:

```powershell
Remove-Item -Recurse "HKCU:\Software\Classes\Annotator.OpenWith"
foreach ($e in ".pdf", ".epub") { Remove-ItemProperty "HKCU:\Software\Classes\$e\OpenWithProgids" -Name "Annotator.OpenWith" }
Remove-Item -Recurse "$env:LOCALAPPDATA\OpenWithAnnotator"
```

The first line takes the program away with its name and icon; the second
takes its entry, and only its entry, out of the lists of programs for
`.pdf` and `.epub`; the third deletes the script. If a list was made by the
recipe, it stays, empty, which changes nothing.

### Linux

Paste the recipe into a terminal. It writes two files under your home
folder:

- `~/.local/bin/open-with-annotator`, a shell script that turns each path
  into an address with nothing but `od` and `printf` and opens it with
  `xdg-open`;
- `~/.local/share/applications/open-with-annotator.desktop`, which tells the
  desktop that it opens `application/pdf` and `application/epub+zip`. It is
  not shown in the application menu.

Then choose "Open with Annotator" in your file manager's Open With for a PDF
or a book. To make it the default for books:

```bash
xdg-mime default open-with-annotator.desktop application/epub+zip
```

`xdg-open` needs Obsidian registered for `obsidian://` addresses. The
Flatpak does that itself; for the AppImage, Obsidian's help says how to make
the desktop entry. The Flatpak sees your home folder and removable drives,
but not `/tmp`: a file there cannot be read.

To take it away:

```bash
rm ~/.local/bin/open-with-annotator ~/.local/share/applications/open-with-annotator.desktop
```

### A script of your own

Make the address above, with the full path URL-encoded (every `/` as `%2F`,
a space as `%20`, `&` as `%26`, `#` as `%23`), and open it. The key is in
the settings. **New key** ends the old one: every recipe made with it stops
being answered. **Remove** takes the key away, and then no address reads a
file outside the vault.

## Phones and tablets

A phone's Obsidian cannot read a file outside its vault, so the file is
first saved into the vault, and then opened.

### Android

- **A PDF:** share it to Obsidian, choose **Import**, then **Open in
  Annotator**. Obsidian saves it where your attachments go.
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
