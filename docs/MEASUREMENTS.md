# Annotator 0.2.11 and 0.3.0, measured

The same vault, the same machine, one build swapped for the other. 0.2.11 is
the published release file (checksum in `test/compat/published/lock.json`);
0.3.0 is `npm run build:release` of this repository.

| | 0.2.11 | 0.3.0 |
| --- | ---: | ---: |
| Plugin files on disk | 26.3 MB | 1.5 MB |
| Enabling the plugin, which happens at every start: desktop | 1.1 s | 0.014 s |
| The same on an Android emulator | 6.0–8.6 s | 0.05–0.13 s |
| Memory the plugin adds with nothing open | 19.5 MB | under 1 MB |
| First highlight after opening an annotated PDF: desktop | 0.32–0.48 s | 0.40–0.43 s |
| The same on an Android emulator | 2.0–2.7 s | 0.9–1.4 s |
| First page of a book: desktop | 0.09–0.11 s | 0.05–0.10 s |
| Kept after opening and closing a 7.6 MB PDF | 9.7 MB, 4 frames | 0.2 MB, nothing |
| JavaScript heap after opening and closing nine sources | 185 MB, 38 frames alive | 23 MB, 3 frames |
| Idle with a PDF open, main thread busy | under 0.7 % | under 0.4 % |

What the numbers say:

- **Size and start.** The old plugin carried the Hypothesis client and a
  second copy of pdf.js inside one 26 MB file that Obsidian read and ran at
  every start. That cost a second on a fast desktop and six to eight on the
  emulated phone. The new one is 1.35 MB of code and 0.15 MB of styles.
- **Opening a PDF** is about as fast as before on the desktop, where both
  wait mostly for the page to be drawn, and about twice as fast on the phone.
  Highlights of a note written by this version appear some 10 ms after the
  page's text. Notes written by 0.2 have offsets counted by another version
  of pdf.js, so the first time a PDF is opened on a device they wait until
  its whole text has been read (0.1 s after the page for a nine-page paper).
  The text is then remembered on the device, and from the second opening on
  their highlights too appear with the page.
- **Closing.** The old reader left its frames alive when a tab was closed, so
  memory grew with every source opened. The new one gives it back.
- **Idle** cost is small in both and the difference is within the noise of
  the measurement. A 20-second CPU profile of the new reader with a PDF open
  shows 6 ms of its own script.

## The interface's own thread

Everything the interface does shares one thread with Obsidian itself; while
the plugin computes there, nothing else moves. This is what opening an
annotation note costs on that thread, for a 15-page paper with 20, 200 and
2000 highlights, before and after the work described below. "Long tasks" are
stretches of more than 50 ms.

| Highlights | Script before | Long tasks before | Script after | Long tasks after |
| ---: | ---: | --- | ---: | --- |
| 20 | 0.25 s | one, 86 ms | 0.14 s | none |
| 200 | 0.67 s | seven, 0.46 s in all | 0.23 s | none |
| 2000 | 7–8 s | twelve, 6.1 s in all, the longest 0.93 s | 0.59 s | five, none over 0.1 s |

With 2000 highlights the first one is on the page after 0.87 s instead of
3.0 s. On the Android emulator, after the work: the plugin's own script is
0.06 s, 0.09 s and 0.11 s for 9, 200 and 2000 highlights, and the first
highlight is there after 1.1 s, 1.4 s and 3.0 s (the page itself takes most of
that); it was not measured there before.

What changed:

- **Notes are read and written in a worker.** The rules for what goes into a
  note (the Bend modules) run beside the interface, not in it. Reading a note
  of 2000 annotations for the first time takes 0.7 s of computing; that time
  is no longer the interface's. What is computed there is written only if
  the note is still the text it was computed from.
- **Highlights are painted with one layout**, not one for each, and a page
  keeps its marks while nothing about them changed (5.6 s of the 7–8 s).
- **The sidebar builds a long list in slices**: what is needed now at once,
  the rest while the thread is idle.
- **Finding an annotation's place reads only as far as its context**, and
  plain characters take a short way through normalizing: 2000 annotations are
  placed in about 14 ms.

What still runs on the interface's thread, and what it costs:

| What | Cost | Why it is there |
| --- | --- | --- |
| Painting highlights, building cards | as above | It is the interface. |
| Finding places in a PDF | about 14 ms for 2000 annotations | The painter uses the answer in the same frame. |
| Sidebar ordering (Bend) | 10–20 ms for 2000 annotations | Inside the list's rebuild, which is immediate. |
| Area geometry and moving a drawing (Bend) | microseconds | Answers each movement of the pointer at once. |
| Ink keys (Bend) | microseconds | Answers a key at once. |
| Reading a PDF's own annotations; writing the annotated copy | 11–22 ms for 189 pages, 13 MB | Small, and the bytes would have to be copied across. |
| A book's styles | about 25 ms for an ordinary book; two tasks of 0.15 s for a 445 kB stylesheet | The rules are matched against the book's pages, which only this thread can touch. |

## How

Desktop: Obsidian 1.13.7 on an Apple-silicon Mac, a test vault with notes
made by 0.2.11 (a nine-page paper with 21 annotations, a 27-page 7.6 MB
paper, a 190 kB book), driven through the app's debugging port. The app was
restarted before each series.

- *Enabling:* `enablePlugin` timed after `disablePlugin`, six times; the
  median.
- *First highlight:* from opening the annotation note to the first highlight
  element in the page (in the old reader, inside its frames). Three starts of
  the app, one opening each; the range.
- *First page of a book:* until the first page's picture or text is in the
  reading frame, four openings; the range.
- *Memory:* the JavaScript heap after a forced collection, and the number of
  live frames and documents, from the browser's own performance metrics.
  "Adds with nothing open" is against the same app with the plugin disabled
  (13.0 MB).
- *Idle:* main-thread task time over three 30-second windows, 20 seconds
  after opening; Obsidian's PDF view alone spends 0.02–0.14 % there.

Android: an Android 16 emulator (arm64) on the same machine, Obsidian's
mobile app, a note with five annotations on a 15-page paper. Enabling five
times, opening three times; the ranges. An emulator on a fast desktop is
quicker than most phones, so read the ratio, not the seconds. A real device
has not been measured.

The JavaScript heap does not count what pdf.js keeps in its worker or what
the renderer keeps for drawn pages; those are Obsidian's own and the same
for both where both use them.
