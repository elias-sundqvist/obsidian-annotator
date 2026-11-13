# CRUD round-trip contracts

These are laws of the pure Bend `crud.bend` core.
They quantify over arbitrary segment documents, arbitrary indexes, arbitrary
payload strings, every command constructor, and every finite request list.
See `LAWS.bend` for the statements and `PROOF.bend` for checked proofs.

A document is a sequence of exact raw prose segments and annotation segments.
An annotation contains its ID and raw source chunks, including line endings.
A position is a physical segment index, not an annotation ordinal or a byte
index. The Bend recognizer now extracts IDs, detects duplicates and performs literal
source lookup/deletion. The JS adapter projects those tokens to positional core
segments; source-level create/delete additionally use the certified source path.

## Operation contracts

| Command | Target | Result |
| --- | --- | --- |
| Create | Gap at any index from 0 through document length | Insert annotation, preserving the complete prefix/suffix |
| Create | Index beyond EOF | Reject; document unchanged |
| Read | Annotation slot | Return exact annotation; document unchanged |
| Update | Annotation slot | Replace only its raw payload; preserve ID, prefix and suffix |
| Delete | Annotation slot | Remove exactly that segment; preserve the complete prefix/suffix |
| Read/Update/Delete | Raw prose slot or missing slot | Reject; document unchanged |

Create inserts before the selected slot; it never overwrites that slot. Read is
a successful operation with an `Unchanged` receipt. Rejection returns its error
and unchanged input. The adapter maps missing reads to `null` and missing
deletes to no-ops; missing updates reject. Duplicate-ID detection and fresh-ID checks now run in Bend. Their independent
grammar/lookup soundness and completeness are not yet proved; the source-cycle
contract is enforced by checked executable certification. See RECOGNIZER.md.
The positional core itself remains well-defined even on documents with duplicate
IDs; its laws do not assume an unproved uniqueness invariant.

## Proved laws

| Property | Law |
| --- | --- |
| Explicit successful C/R/U/D behavior and exact footprint | `crud_create_focus`, `crud_read_focus`, `crud_update_focus`, `crud_delete_focus` |
| Read never changes any document, including failures | `crud_read_unchanged` |
| Read returns the exact selected value | `crud_read_value` |
| Read after create/update returns new value | `crud_read_created`, `crud_read_updated` |
| Writing the read payload leaves the complete document unchanged | `crud_write_read_value_unchanged` |
| Create then delete restores complete original document | `crud_create_delete` |
| Delete then recreate original segment at the same position restores document | `crud_delete_recreate` |
| Update then restore original raw payload restores document | `crud_update_restore` |
| Any rejected operation preserves complete original document | `crud_rejected_unchanged` |
| Every command has an exact local-receipt inverse | `crud_inverse` |
| Every finite CRUD history rolls back to original document | `crud_history_inverse` |
| Every operation's complete rendered Markdown survives decode/encode | `crud_document_roundtrip` |
| The final complete Markdown of every finite history survives decode/encode | `crud_history_document_roundtrip` |
| Rolling back any finite history restores original rendered Markdown exactly | `crud_history_original_text` |

The direct create/delete and delete/recreate laws use the same resolved position,
and delete/recreate uses the original ID and raw payload. They do not promise
that regenerating annotations from semantic fields recovers original formatting.
The explicit success laws are essential: an implementation rejecting every
operation could satisfy an undo law vacuously. A negative control that ignores
creation must fail proof checking.

## Local receipts and arbitrary histories

- Creation records only the inserted position.
- Update records the position and original segment.
- Deletion records the position and deleted segment.
- Read records `Unchanged`; failures have no undo receipt.

History frames store only these receipts, followed by a final document. They do
not retain full prior document snapshots. Rollback threads the current document
back through each receipt in reverse order; it does not return a cached original.
The inverse proof includes failed requests and shifted indexes. Receipts must
be consumed LIFO on their session lineage, with no external intervening edit.
Concurrent modifications and persistence/reopening of undo logs are out of scope.

## Executable adapter

The existing update helper now calls the same proved CRUD core. Helpers also
exist for create/read/delete. For exact multi-operation undo, retain a session:

```js
import { openCrudSession, applyCrud, sessionText, undoCrud } from './bridge.mjs';
let session = openCrudSession(originalMarkdown);
session = applyCrud(session, {
    kind: 'create', id: 'newid', fields: { comment: ['A note'] },
}).session;
session = applyCrud(session, {
    kind: 'update', id: 'newid', patch: { comment: ['Edited note'] },
}).session;
const updatedMarkdown = sessionText(session);
session = undoCrud(session); // undo update
session = undoCrud(session); // undo create, including any added separator
// sessionText(session) === originalMarkdown
```

Creation now completes a blank-line boundary and places that whitespace in a
separate Raw segment. **Ordinary deletion preserves that boundary**, identically
in a session and after reopening. Session undo records the separately added
boundary segment and can remove it as an additional local restoration step.
This adapter bookkeeping is tested; the positional receipt theorem itself still
applies to the original pure core operations.

The source-level no-receipt law is now `F(F(d)) = F(d)` through the actual Bend
recognizer, with `F(d) = B(d)` on accepted creation and unchanged source on refusal.
See [RECOGNIZER.md](RECOGNIZER.md) for the executable guard and exact proof scope.

## Limits of the guarantee

The complete-text preservation proofs are for Bend Strings and the lossless
whole-source decoder. CRUD proofs operate on the typed segment representation;
they do not prove that arbitrary raw payloads constitute valid annotation blocks,
or that reparsing rendered text reconstructs annotation metadata. The adapter
validates its supported grammar before exposing a new session.

ID resolution and duplicate detection are implemented in Bend; their independent
soundness/completeness remains outside the current proof. Semantic JSON/Markdown
reconciliation, adapter, compiler/runtime, character/byte conversion and filesystem
operations also remain outside the formal boundary. Tests exercise those adapter paths
and compare complete fixture text/UTF-8 bytes. This is not an end-to-end
proof of the Obsidian plugin or of concurrent/durable vault writes.
