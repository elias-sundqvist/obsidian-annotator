# Live recovery, refresh and filesystem checks — 2026-11-01

Native 0.0.18 on `experiment/obsidian-native-pdf`. The unlocked desktop session
verified real workflows and exposed two problems that automated tests had missed.
Both were fixed, regression-tested, built and rechecked in the application.

## Results

| Workflow | Live evidence |
| --- | --- |
| Remote EPUB refresh | Opened a synthetic two-chapter book with three existing annotations. Refresh reviewed a version replacing `Vector label` with `Diagram caption`. After the context fix: two located, one unresolved. All three records retained. |
| Offline EPUB rollback | Stopped the loopback fixture server. Selected the original retained revision through the actual history/review UI: three located, zero unresolved; original highlights restored. |
| Nearby EPUB context change | Frozen published Hypothesis anchors the unchanged `−b` range after adjacent SVG text changes; native initially refused it because the stored suffix ended in `Ve`. Native now restores it only when range and position agree, the exact quote is unique across eligible chapters and one nonempty context side survives. Missing/disagreeing selectors, duplicate passages, both contexts changed and removed text remain refused. |
| Desktop draft recovery | Entered an unsaved page note and `recovery, pending,` tag input; reloaded Obsidian, resumed it from recovery, observed intact comment and trailing comma, then cancelled. |
| Android draft recovery | Entered `Draft17`, confirmed its debounce checkpoint, force-stopped Obsidian, cold-opened it, resumed through the recovery modal, then cancelled. |
| Android installed build | 0.0.17 and corrected 0.0.18 cold-opened normally; existing MathML/SVG highlights and tap-to-open sidebar worked. The staged 0.0.18 filesystem loader is not invoked at mobile startup. |
| External file PDF | The initial `import('node:fs/promises')` failed as a renderer module fetch. Corrected to a lazy desktop CommonJS filesystem boundary. Real external file read, real Obsidian PDF.js preflight, built-in 14-page reader, existing `Time` highlight and native card all passed. |
| Local PDF revision | Changed only the disposable external fixture to a different-byte PDF revision with the same fingerprint/text. Real PDF.js review reported one located/zero unresolved; selecting it retained the old copy and highlight. |

No personal vault was written. These checks used the isolated desktop/emulator
vaults, a synthetic EPUB, a pre-existing public PDF fixture, and disposable files
under `/tmp/annotator-remote-refresh`. No Mac security setting was changed. The
physical Android tablet was not touched.

## Storage audit and screenshots

Artifacts are outside the repository:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-01-source-revisions/`.
`storage-audit.json` records whole-note hashes and verifies both retained source
revision hashes. The loopback server was confirmed stopped for history selection.

- Remote EPUB annotation note stayed byte-identical:
  `ae5d0568db53d94719493227eb7de1c307c00514c733cbeaf28cbb65e2330cb2`.
- Local-file PDF annotation note matched its prepared baseline exactly:
  `6685e6c9a343b58415ab16dad2cec32a21555c44afe100d2dd664f1b4801fe48`.
- Android annotation note matched the earlier fidelity checkpoint exactly:
  `4333b17f23193ce928c7e7a2fdab33727a7ceabc1b77c6179473cb7d100b1e07`.
- Both synthetic recovery drafts were cancelled; no saved draft remains.

Screenshots 01–05 show original EPUB, initial conservative review, changed source
and offline rollback; 06 shows desktop restored draft; 07–11 show Android cold
start/highlights/sidebar and draft recovery; 12–13 show real file PDF/highlight and
PDF.js review; 14–15 show corrected two-located/one-unresolved EPUB review and
surviving equation highlight; 16 shows corrected 0.0.18 Android cold start.

## Verification scope

144 native tests and the release build pass. New tests compare the actual frozen
published HTML anchorer and check conservative refusal controls, plus execution
of a compiled CommonJS plugin module with zero filesystem loads at startup.
No Bend source or law changed; these are host/anchoring checks, not new formal
proofs. The installed 0.0.18 bundle SHA-256 is
`f2c73d9894eae86f9f8aac045b40d2f955ce4b212db18ffe1b6217908101664d`.

Remaining gates include live external EPUB/in-vault alias refresh/sync on devices,
HTTP PDF download/refresh as a separate network workflow, full Android PDF/web
CRUD, mobile IME/accessibility, iOS/Windows, exact published application upgrade
and rollback, publisher CSS/fonts/RTL/fixed layout, website lifecycle, native
video playback/UI/transcripts and the broader performance/sync corpus. A nearby
edit with only partial selector evidence is still conservatively unresolved.
This checkpoint does not establish complete replacement parity.
