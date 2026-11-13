# The development record

These notes were written while the reader was built, as an experiment beside
the old plugin. They are kept as the record of why things are the way they
are and of what was checked, and are not kept up to date as documentation.

Paths in them are from that time:

| Written as | Is now |
| --- | --- |
| `experiments/native-pdf/<name>.ts` | `src/<name>.ts` |
| `experiments/native-pdf/<name>.test.mjs`, `test-support/`, `fixtures/` | `test/<name>.test.mjs`, `test/support/`, `test/fixtures/` |
| `experiments/native-pdf/compat/frozen`, `compat/published` | `test/compat/frozen`, `test/compat/published` |
| `experiments/bend-codec` | `proofs/` |
| `GUIDE.md` | `README.md` at the root |
| `README.md` (the investigation log) | [INVESTIGATION.md](INVESTIGATION.md) |
| `src/*.tsx`, `resources/`, `submodules/` | the old plugin; removed, see the history |
| plugin id `annotator-native-pdf-spike` | `obsidian-annotator` |

Where to start:

- [ISSUE_PLAN.md](ISSUE_PLAN.md): every open issue against this release.
- [UPGRADE_CONTRACT.md](UPGRADE_CONTRACT.md): what an update from 0.2 keeps.
- [INTEROPERABILITY_RESULTS.md](INTEROPERABILITY_RESULTS.md) and
  [HYPOTHESIS_COMPATIBILITY.md](HYPOTHESIS_COMPATIBILITY.md): the annotation
  format against the old plugin and the Hypothesis client.
- [PER_ANNOTATION_NOTES.md](PER_ANNOTATION_NOTES.md): one file per annotation
  (built as an export; as storage it was tried and not taken up).
- [PDF_APPEARANCE.md](PDF_APPEARANCE.md): page colours and dark pages.
- [RELEASE_EVIDENCE_MATRIX.md](RELEASE_EVIDENCE_MATRIX.md) and
  [PARITY.md](PARITY.md): what was checked, version by version.

The plans (`*_PLAN.md`) say what was intended at the time; the results notes
say what was found. `evidence/` holds the screenshots they cite.
