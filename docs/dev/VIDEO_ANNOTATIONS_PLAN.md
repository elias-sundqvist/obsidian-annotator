# Native video annotation implementation plan

Current requirement (0.0.23): playback stays inside Obsidian. Annotation actions are provider-neutral: **Go to timestamp** and **Annotate current time**. External provider buttons are not an acceptable replacement workflow. The historical assessment below predates the embedded implementation.

Read-only assessment, 2026-11-01, native `0.0.15` / `8f5d952`, on
`experiment/obsidian-native-pdf`. This document is the only file written by this
assessment. No UI, vault, implementation, or Bend source was changed; the native
suite was not rerun. Findings include an in-memory execution of the unchanged
legacy video codec and current official YouTube documentation. Follow the larger
[replacement plan](NATIVE_REPLACEMENT_PLAN.md) and [release gates](PARITY.md).

## Recommendation and first milestone

Implement **one complete desktop YouTube timestamp slice**: open an existing
video note unchanged, play inside an isolated host surface, capture current time,
create/edit/delete title and Markdown comment, seek from a card, and reopen the
same records in the published reader. Reuse the native sidebar and transaction
discipline; add a separate timestamp codec, never Hypothesis JSON wrappers. Keep
the experimental branch and do not remove the old video runtime yet.

Start with two gates before substantial UI work: (1) freeze the published video
codec and its document fixtures; (2) prove that the actual Obsidian desktop host
can run supported YouTube playback, capture, and seek with legitimate provider
identity. A manual timestamp form plus external link is useful degraded behavior,
but cannot satisfy the embedded playback/capture replacement milestone.

Transcript acquisition is a separate provider dependency and a remaining full
parity gate. It must not prevent opening/editing notes when unavailable. Mobile
video and additional providers are optional new capabilities.

## Verified historical contract

The lock in [compat/published/lock.json](compat/published/lock.json) pins release
`0.2.11`, plugin commit `3647dd92d0d803bae9a3f34a1aac19eacb2fd52d`, and bundle
SHA-256 `aa08182b6fac314af098ef692702987ff11a02c490a140009d67fa86c815a938`.
`git diff` against that commit showed no changes in the four relevant sources:
[video codec](../../src/videoAnnotationUtils.tsx),
[file adapter](../../src/videoAnnotationFileUtils.tsx),
[video view](../../src/defineVideoAnnotation.tsx), and
[caption scraper](../../src/youtube-captions-scraper.tsx).
The existing frozen oracle covers Hypothesis storage/client behavior, **not video**.

| Area | Established by checked source | Unproven or absent |
| --- | --- | --- |
| Target/provider | `annotation-target-type: video` passes the resolved target to the video view. README documents YouTube only. Metadata code fetches the supplied URL, extracts a `shortlinkUrl`, then uses its YouTube ID. | Arbitrary providers/local files are not an inherited feature. Exact watch/short/shorts/embed/mobile-host URL acceptance needs fixtures; the old permissive regex is not a safe host validator. |
| Reader | Desktop loads a user-supplied Annotate.tv application through `OfflineIframe`; hardcoded page/video ID is replaced with YouTube metadata. | No Annotate.tv application or resource ZIP was found in this checkout. Exact UI controls, capture behavior and keyboard shortcuts cannot be audited from the bridge alone. |
| CRUD | Generic bridge handles annotation GET/POST/PUT/DELETE against the selected note; PUT uses the path ID. GET returns all matching video blocks, without provider filtering except the special `uri=app://obsidian.md/index.html` empty result. | File adapter does not await `vault.modify/create` and lacks stale-write checks. Preserve format/workflows, not these races. |
| Transcript | `/api/transcript` fetches metadata, then hardcodes English captions; scraper prefers manual `.en`, then automatic `a.en`, then a loose language match. Returns `{id, start, dur, text}`; times are strings and HTML/entities are stripped/decoded. | UI transcript display, cue clicks, transcript search, selection-to-note and exact shortcuts require the external app baseline. No persistent transcript store or language setting is implemented by this bridge. |
| Links | `^id` is a durable Obsidian block anchor. | Serializer adds no external timestamp URL. Legacy `scrollToAnnotation` loads the ordinary Hypothesis annotation codec, not video; automatic video seek from Obsidian block links is not established. Native seek links would improve this. |
| Other features | Plugin has the shared `toggle-annotation-mode` command and `annotateTvUrl` resource setting. | No video-specific import/export or hotkey commands exist in checked plugin code. The external app may have UI search/export/shortcuts; absence of its sources means **not proven**, not “absent.” Durable tags, replies and annotation dates are absent from the video format. |
| Mobile | `defineVideoAnnotation` explicitly returns an unsupported message. | Mobile playback/capture/transcript support is new work; do not claim inherited parity or assume desktop `webview` works there. |

Key sources: [bridge](../../src/defineGenericAnnotation.tsx), especially transcript
at line 85, CRUD at 95, fake session at 138, and page metadata at 153;
[metadata scraper](../../src/youtube-metadata-scraper.tsx);
[target/view routing](../../src/annotatorView.tsx);
[settings](../../src/settings.tsx); [release history](../../README.md).

### Durable fields and exact Markdown behavior

Canonical bytes for a simple record are:

```text
\n> **Title** %%TIMESTAMP: 12.5%%\n>first\n>\n>last\n^a1\n
```

Here `\n` denotes a literal LF. Every content line is quoted with `>` without an
extra space. Only `_id`, `title`, `content`, and `start` are stored. The note's
target property supplies association; the block has no provider or video ID.
`readwiseId: ''`, `tags: []`, `video: '620d5a42b9ab630009bf3e31'`,
`user: 'obsidianuser'`, fresh `createdAt/updatedAt`, and `__v: 0` are fabricated
on each read. Do not expose fabricated dates as historical timestamps, persist
them as recovered data, or offer tags/replies that silently disappear.

The unchanged codec's regex requires a leading blank LF, quoted title/body, an
alphanumeric ID for enumeration, and a trailing LF after the ID. The loader
trims the captured quoted content, drops the first character of each line, and
uses `Number(time.trim())`; malformed time may become `NaN`. IDs supplied to
single-record operations are interpolated unescaped into a regex. New native
IDs must be collision-checked alphanumerics, for example a hyphen-free UUID.

Observed with an in-memory esbuild transpilation of the unchanged codec:

- Canonical `12.5`/multiline/empty-line content loads as expected. Removing the
  leading LF, removing the final LF, or converting all LFs to CRLF produces no
  records and deletion leaves the text untouched. A title containing `**` can
  load; do not reject Markdown punctuation without a precise round-trip reason.
- Appending to `"prose\n"` produces three LFs before the new `>` header: legacy
  appends one LF and the block itself starts with another. A missing ID on update
  appends; matching updates replace the whole matched block. Delete removes the
  complete match including its leading/trailing LF, leaving surrounding prose.
- Duplicate IDs enumerate twice and global replacement/deletion affects all
  matches. Native must refuse ambiguous mutation, not reproduce this data-loss
  behavior. `oops` timestamp loads as `NaN`; preserve its raw text but do not seek.

Add golden cases for mixed endings, EOF and whitespace before generalizing these
observations. Ordinary Hypothesis blocks and unknown Markdown can coexist in the
same document and must remain untouched. No automatic repair or format migration.

## Architecture and integration boundaries

1. **Document/store adapter.** Add a `video-codec.ts` boundary over a new proved
   timestamp grammar, exposing read/create/update/remove with raw spans and
   diagnostics. Use a discriminated record (`kind: 'video'`, ID, title, comment,
   raw timestamp and validated seconds), not fake `TextQuoteSelector`s or
   fabricated Hypothesis metadata. Retain lexical timestamp spelling unless the
   timestamp is explicitly edited. A no-op edit must return identical bytes.
   New writes must be readable by the frozen published parser; preserve all
   pre-existing bytes even in a mixed-ending document. Do not silently normalize
   an entire CRLF note merely to satisfy the published parser.
2. **Shared native UI.** Refactor the present Hypothesis-shaped
   [SourceHost/SourceCapture](source.ts), [codec](codec.ts), and
   [sidebar](sidebar.ts) around explicit record/capture capabilities. Reuse card
   rendering, Markdown preview, editor/draft retention, error handling, search,
   copy/drag links and transaction handling. Video cards expose title, formatted
   timestamp and comment; timestamp is the navigation action. Hide unsupported
   tags/replies/highlights/page-note/date-sort controls rather than fabricate
   persistence. Search title/comment and sort by numeric start with stable source
   order for ties. Keep existing PDF/EPUB/web behavior covered during refactoring.
3. **Note/source identity.** Replace the explicit video exclusion in
   [main.ts](main.ts) with a video resolver using the same frontmatter/Dataview
   target path. Use `(annotation note path, provider, canonical video ID)` plus
   view/session identity, not just URL or fake legacy video ID. Multiple notes for
   one video must never merge accidentally. Preserve original target text;
   canonicalize only runtime identity. Block links continue to address the note's
   existing ID; opening one binds that note and queues seek until player ready.
4. **Playback adapter.** A small `VideoProvider` resolves an allowlisted URL and
   reports capabilities; `VideoHost` manages readiness, capture, seek, status and
   disposal. `VideoCapture` contains note/source identity, provider/video ID,
   finite seconds and view/navigation generation. Capture on explicit action;
   playback advancing while a comment is typed must not invalidate that captured
   time. Navigation to another video, note retargeting, or host replacement must.
   The current [live-web host](live-web.ts) supplies lifecycle/isolation patterns,
   but its text-selection payload and same-URL assumptions are not a video API.
5. **Transactions.** Route timestamp changes through awaited `vault.process`.
   Compare the selected raw record revision and current target identity inside
   the transaction; preserve unrelated concurrent prose edits. Stale, deleted,
   duplicate or malformed target blocks fail without returning a changed document.
   Keep the title/time/comment draft after failure. Use one document recognizer
   or conservative mixed-format dispatcher so one codec cannot claim another's
   markers. Unsupported/malformed annotation candidates remain visible with raw
   recovery access; conservatively block document mutation when boundaries or ID
   uniqueness cannot be established.

### Provider and transcript choices

Use a sanctioned YouTube embed inside an isolated, unprivileged playback host,
with all annotation UI in Obsidian. The first spike must establish whether the
core desktop Web viewer can host the minimal player controller and provide the
required identity; if it cannot, document the concrete host limitation before
choosing another isolation surface. Do not load remote player scripts into the
privileged Obsidian document, copy the old origin-spoofing message proxy, or ship
scraped Annotate.tv code. A minimal isolated player controller is not an external
annotation application.

Only bounded playback commands/status cross the boundary: provider/video ID,
session nonce, current time/duration/readiness/errors. Validate sender, origin,
generation and values; expose no filesystem, arbitrary JS evaluation or comments
to the provider. Disable capture until ready, handle closed/background/pop-out
views, and remove listeners/timers on unload. Reject wrong-video/stale replies.

The official API offers `getCurrentTime`, `seekTo` and readiness/error events;
seek may land at a keyframe. It also identifies embedding-denied errors 101/150
and missing client identification error 153. Test actual capture/seek accuracy
with a declared tolerance, not exact wall-clock equality. [YouTube player API](https://developers.google.com/youtube/iframe_api_reference).

YouTube requires client identification through Referer/equivalent documented
integration mechanisms. Its desktop/mobile WebView guidance matters for a local
Obsidian origin; merely adding `origin` is not a demonstrated fix for every host.
Preserve provider controls/branding and handle denied/autoplay/login/network
states explicitly. Do not bypass provider restrictions. [Embedded-player requirements](https://developers.google.com/youtube/terms/required-minimum-functionality).

Transcript capability needs its own result type: available cues with language,
provenance and provider identity; no captions; authorization required; unavailable;
or fetch/parse failure. Keep cache separate from annotation Markdown and never
overwrite user notes on refresh. The checked scraper depends on YouTube page
internals and cannot be assumed current. The official caption-download API
requires authorization **and permission to edit the video**, so it does not
transparently replace arbitrary public-video transcripts. [Caption download API](https://developers.google.com/youtube/data/reference/rest/v3/captions/download).

Before full parity, establish a sustainable transcript acquisition route against
the frozen legacy workflow. Native cue display/seek/search and optional local
VTT/SRT import can share a pure cue model, but local import alone is not parity
with automatic retrieval. Caption display inside the provider player is also
different from an editable/searchable transcript. Implement new transcript
import/export only with an explicit scope, preserving original files and cue
precision. Annotation JSON exchange currently targets Hypothesis records; video
must not silently enter that format. Plain Markdown remains the authoritative
video interchange until a separate explicit format is justified.

YouTube watch and short URLs are the first required fixtures. Test start offsets,
query order, fragments, redirects and playlist parameters without losing video
identity. Shorts/embed/mobile-host variants need evidence before claiming legacy
support; supporting them natively may be useful. Vimeo, arbitrary sites, local
MP4/audio and live-stream DVR timestamps require separate adapters/contracts.
Unsupported targets should still expose their stored notes and a clear in-app player availability message.
Mobile may initially provide read/edit/manual-time/link support, labelled as such;
embedded capture requires independent Android/iOS host evidence.

## Bend specification and proof scope

Follow [Bend instructions](../bend-codec/AGENTS.md): run `bend guide` before later
Bend edits, keep specifications in `LAWS.bend`, proofs in `PROOF.bend`, and retain
negative controls. Do not weaken existing Hypothesis laws. The current proofs do
not cover the video regex or this proposed adapter. Specify a lossless raw
document/token representation separately from legacy value projection, including
the exact representable authoring domain and rejected malformed/unsupported
cases. JS `Number`, whitespace and regex behavior need frozen-oracle tests even
when the new parser is proved.

Add laws for raw parse/emit identity; accepted field round-trip; unchanged ID and
nonedited field lexemes; exact prefix/suffix/other-record preservation; no-op
identity; edit-last-write; unique-ID create; duplicate/missing/invalid refusal;
delete focus; and bounded separator ownership under create/delete repetition.
Prove whole-document cycle stabilization, not just block encode/decode, with
positive acceptance witnesses so a reject-everything implementation cannot pass.
If matching legacy append separators prevents exact create/delete inverse,
specify the normalization and fixed point explicitly. Do not claim both an exact
inverse and legacy newline behavior without proof. No global newline cleanup.

Time parsing should retain raw numeric lexemes and validate a bounded nonnegative
finite runtime time separately; unsupported legacy values remain losslessly
retained. Define rounding only for newly captured/edited times. Native authoring
must verify compatibility with the legacy projection, including its content trim
behavior; reject unrepresentable edits with the draft retained rather than
quietly changing user text. Keep file I/O, CAS/stale checks, provider playback,
browser messaging, React-free native UI and the TS/compiled-Bend bridge clearly
labelled as tested assumptions, not formally verified claims.

## Fixtures, evidence, and completion gates

Extend the development-only published oracle using the exact video source at the
locked plugin commit, add its checksum, and keep it outside release inputs. Do
not use current experimental source as the sole oracle even though it matches
today. Preserve original licensing. Repository README/settings explicitly avoid
bundling Annotate.tv due to potential copyright concerns; do not treat a user's
resource ZIP as permission to redistribute its application. A lawfully available
frozen resource artifact, with hash/version, is needed to audit its UI later.

| Layer | Required fixtures/acceptance |
| --- | --- |
| Codec | Empty/nonempty notes; frontmatter/prose before/between/after; title punctuation/Unicode; empty/multiline/nested quote/fenced-code comments; whitespace; `0`, fractions, exponent/raw large time, negative/nonfinite/invalid time; LF/CRLF/mixed/EOF; duplicate/regex-like/missing IDs; adjacent blocks; marker-looking prose; malformed/truncated records; mixed Hypothesis/video blocks. Assert entire output strings and errors. |
| Alternating readers | Published create → native read/edit → published read/update → native read/delete; native create → published read/edit/delete; preserve ID/title/start/comment semantics and exact untouched documents. Explicitly characterize published destructive duplicate handling and its inability to parse noncanonical endings. |
| Store/UI | External comment/title/time change; unrelated prose edit; note/source rename; retarget during draft; two panes/notes sharing video; failed write; unload during save; delayed response; stale/malformed input. No lost draft, silent overwrite, fabricated metadata or accidental collection merge. |
| Provider | Ready/capture/seek; fractional/zero time; paused/playing/end states; denied embed/private/deleted/offline video; missing identity; autoplay blocked; redirect/SPA video change; pop-out/close/reload; spoofed/stale messages. A test double verifies contracts; a real host run establishes playback capability. |
| Transcript | Manual/automatic English fixtures; missing English; no captions; entity/HTML decoding; fractional cues; malformed/network/authorization failures; cue seek/search if confirmed baseline; provider/language identity and cache invalidation. Missing transcript never disables CRUD. |
| Native release | No Hypothesis/OfflineIframe/scraped app inputs or resource URL fetch; original toggle/settings retained; obsolete `annotateTvUrl` preserved only as legacy settings data; isolated-vault desktop cold reopen and rollback to exact published bundle. |

First milestone passes only with a real desktop embedded playback/capture/seek
run and alternating published/native Markdown CRUD evidence, including restart
and unchanged-note hashes on open. Manual-only mode remains useful but is not
that pass. Full video replacement additionally requires the external-app feature
inventory (search, capture controls, transcript actions, shortcuts, export/import,
settings), each established workflow matched or a separately accepted scope
decision, and transcript availability limitations recorded. Keep source-derived
tests, Bend proofs, simulated provider tests and live published/native evidence
as separate columns. Use isolated test vaults only; never the personal vault.

## Implementation checkpoint — frozen video oracle (2026-11-01)

The development oracle now builds the exact video parser from the locked release
source, guarded by both SHA-256 and a byte comparison to the pinned Git object.
Six tests characterize complete document mutations and legacy projection limits;
see [reference notes](compat/published/README.md). This includes the observed
extra newline per legacy create/delete cycle and trailing-space loss in comments.
These are compatibility facts, not behavior to reproduce silently. No native
video runtime, Bend video proof or real playback milestone is claimed here.

### Typed Bend body grammar

`../bend-codec/video_block.bend` now defines title/raw timestamp/comment fields
and canonical body parsing/printing. Its additive laws cover unrelated-field
preservation, last comment write, quoting and a positive acceptance witness.
[Scope and remaining proof obligations](../bend-codec/VIDEO.md) distinguish this
from the still-unimplemented whole-document video recognizer/CRUD and playback.
Cross-reader tests execute the checksum-pinned published video source.

### Whole-document timestamp storage checkpoint

The experimental Bend video recognizer/creator/deleter/updater and precise native
codec boundary now exist. A new whole-document F fixed-point law includes fresh
parsing between operations; accepted updates preserve all bytes outside the
addressed record. Tests alternate native/published timestamp CRUD and exercise
mixed Markdown, contexts, malformed candidates, duplicates, stale edits and
separator cycles. [Exact proof/test scope and remaining gaps](../bend-codec/VIDEO.md)
include full legacy header recognition and additional semantic CRUD laws.
No video reader/UI, playback or transcript gate is complete. The codec is not yet
imported by the production main module.

### Provider/session checkpoint

The pure YouTube URL resolver and playback-session controller now implement
collection/target/video identity, capture/seek protocol validation, navigation
expiry, cancellation and distinct provider errors. Nine transport-double tests
exercise these behaviors. [Playback scope and host gate](VIDEO_PLAYBACK.md)
explicitly distinguish this from a concrete core-Web-viewer adapter and live
playback evidence. The Mac was still locked when the host gate was rechecked.


### Historical header formatting checkpoint

Bend now recognizes noncanonical physical-line video headers (including Unicode
whitespace and greedy title/time delimiters) and retains their literal layout.
Comment edits keep the exact header; title/time edits preserve untouched header
and body lexemes, including absent body lines and existing comment whitespace.
Six additive header laws and two negative controls supplement the existing cycle
and update guarantees. Tests compare 320 header spellings with the frozen
published codec and mutate 108 layouts through the compiled native adapter.
The [storage scope](../bend-codec/VIDEO.md) still lists unusual newline-spanning
regex cases, additional CRUD algebra and real host/UI verification as incomplete.

### Native video collection workspace (0.0.20)

Native routing, shared-sidebar timestamp cards/editor, title/time/comment CRUD,
block links, draft recovery and awaited stale-protected vault transactions now
exist. New tests execute the native controls/store and the frozen published
parser. [Implementation and limits](VIDEO_PLAYBACK.md#native-timestamp-workspace--0020)
separate this manual/external-playback workflow from the still-unverified real
player/capture/seek and transcript gates. The desktop was locked, so this is not
a live UI/screenshot or video replacement-parity claim.
