import ./book.bend as Book
import ./stroke.bend as Stroke
import ./area.bend as Area
import ./segments.bend as Segments
import ./ink.bend as Ink
import ./shelf.bend as Shelf
import ./digest.bend as Digest
import ./video_header.bend as VideoHeader
import ./video_update.bend as VideoUpdate
import ./video_source_crud.bend as VideoSource
import ./video_document.bend as VideoDocument
import ./video_block.bend as Video
import ./annotation_schema.bend as AnnotationSchema
import ./annotation_json.bend as AnnotationJson
import ./annotation_types.bend as Annotation
import ./annotation_contract.bend as AnnotationContract
import ./annotation_observe.bend as AnnotationObserve
import ./boundary.bend as Boundary
import ./recognizer.bend as Recognizer
import ./source-crud.bend as SourceCrud
import ./crud.bend as Crud
import ./text.bend as Text
import ./document.bend as Document
import ./storage.bend as Store
import ./block.bend as Block
import Base
import ./codec.bend as Codec

# Exact equality, not trimmed/canonicalized equality. No restrictions on text.
law line_roundtrip:
  for +text: String
  {Codec.unquote_line(Codec.quote_line(text)) == Some{text} : Maybe<&2, String>}

law lines_roundtrip:
  for +lines: List<&2, String>
  {Codec.unquote_lines(Codec.quote_lines(lines)) == Some{lines} : Maybe<&2, List<&2, String>>}


# Supporting list algebra, used by the executable suffix parser.
law append_nil:
  for +xs: List<&2, String>
  {Block.append(xs, Nil{}) == xs : List<&2, String>}

law append_assoc:
  for +xs: List<&2, String>
  for +ys: List<&2, String>
  for +zs: List<&2, String>
  {Block.append(Block.append(xs, ys), zs) == Block.append(xs, Block.append(ys, zs)) : List<&2, String>}

law reverse_append:
  for +xs: List<&2, String>
  for +ys: List<&2, String>
  {Block.reverse(Block.append(xs, ys)) == Block.append(Block.reverse(ys), Block.reverse(xs)) : List<&2, String>}

law reverse_reverse:
  for +xs: List<&2, String>
  {Block.reverse(Block.reverse(xs)) == xs : List<&2, String>}

law body_roundtrip:
  for +block: Block.Block
  {Block.decode_body(Block.encode_body(block)) == Some{block} : Maybe<&2, Block.Block>}

law block_roundtrip:
  for +block: Block.Block
  {Block.decode(Block.encode(block)) == Some{block} : Maybe<&2, Block.Block>}

law replace_preserves_outline:
  for +segment: Store.Segment
  for +lines: List<&2, String>
  {Store.outline_segment(Store.replace(segment, lines)) == Store.outline_segment(segment) : Store.Outline}

law replace_last_write:
  for +segment: Store.Segment
  for +first: List<&2, String>
  for +last: List<&2, String>
  {Store.replace(Store.replace(segment, first), last) == Store.replace(segment, last) : Store.Segment}

# Every prose byte and every annotation ID stays in the same order.
law edit_preserves_outline:
  for +segments: List<&2, Store.Segment>
  for +index: Nat
  for +lines: List<&2, String>
  {Store.outline(Store.edit_at(segments, index, lines)) == Store.outline(segments) : List<&2, Store.Outline>}

# Includes missing indexes and raw segments: editing them cannot insert data.
law edit_last_write:
  for +segments: List<&2, Store.Segment>
  for +index: Nat
  for +first: List<&2, String>
  for +last: List<&2, String>
  {Store.edit_at(Store.edit_at(segments, index, first), index, last) == Store.edit_at(segments, index, last) : List<&2, Store.Segment>}

# Masking only the selected payload makes the entire remaining document equal.
law edit_preserves_others:
  for +segments: List<&2, Store.Segment>
  for +index: Nat
  for +lines: List<&2, String>
  {Store.edit_at(Store.edit_at(segments, index, lines), index, Nil{}) == Store.edit_at(segments, index, Nil{}) : List<&2, Store.Segment>}

# A successful edit replaces exactly the selected annotation, keeping its ID,
# its entire prefix and suffix, and every other annotation's bytes.
law edit_focus:
  for +before: List<&2, Store.Segment>
  for +id: String
  for +old: List<&2, String>
  for +after: List<&2, Store.Segment>
  for +replacement: List<&2, String>
  {Store.edit_at(Store.append_segments(before, Con{Store.Annotation{id, old}, after}), Store.length(before), replacement) == Store.append_segments(before, Con{Store.Annotation{id, replacement}, after}) : List<&2, Store.Segment>}

# Supporting lifted round trip: explicit error preservation as well as success.
law decoded_result_roundtrip:
  for +result: Maybe<&2, Block.Block>
  {Block.decode_encoded(Block.reencode(result)) == result : Maybe<&2, Block.Block>}

# D -> E -> D is observationally identical to the initial D, for ANY input.
# None means a decode failure; Some holds exactly the initial decoded block.
law decode_encode_decode:
  for +lines: List<&2, String>
  {Block.decode_encoded(Block.reencode(Block.decode(lines))) == Block.decode(lines) : Maybe<&2, Block.Block>}

# E -> D -> E succeeds and returns exactly the first encoded line sequence.
law encode_decode_encode:
  for +block: Block.Block
  {Block.reencode(Block.decode(Block.encode(block))) == Some{Block.encode(block)} : Maybe<&2, List<&2, String>>}

# A lexer step preserves its consumed character and the entire remaining text.
law document_push_preserves_source:
  for +lines: List<&2, Document.Line>
  for +char: Char
  for +newline: Bool
  {Document.encode(Document.push(lines, char, newline)) == SCon{char, Document.encode(lines)} : String}

# Whole-document identity, for EVERY Markdown string, not just annotation data.
# No assumptions on content, markers, whitespace, line endings, or final newline.
law document_encode_decode:
  for +source: String
  {Document.encode(Document.decode(source)) == source : String}

# The entire original document is identical after the D -> E -> D cycle.
# Equality holds for the complete lossless syntax tree, not only a projection.
law document_decode_encode_decode:
  for +source: String
  {Document.decode(Document.encode(Document.decode(source))) == Document.decode(source) : List<&2, Document.Line>}

# E -> D -> E preserves ALL emitted text, for every physical-line syntax tree.
# Even noncanonical hand-built trees are covered; no source cache is involved.
law document_encode_decode_encode:
  for +lines: List<&2, Document.Line>
  {Document.encode(Document.decode(Document.encode(lines))) == Document.encode(lines) : String}

# String algebra connecting the stack-safe decoder to the source-level law.
law text_append_nil:
  for +xs: String
  {String.append(xs, SNil{}) == xs : String}

law text_append_assoc:
  for +xs: String
  for +ys: String
  for +zs: String
  {String.append(String.append(xs, ys), zs) == String.append(xs, String.append(ys, zs)) : String}

law text_reverse_append:
  for +xs: String
  for +ys: String
  {Text.reverse(String.append(xs, ys)) == String.append(Text.reverse(ys), Text.reverse(xs)) : String}

law text_reverse_reverse:
  for +xs: String
  {Text.reverse(Text.reverse(xs)) == xs : String}

law text_reverse_go:
  for +source: String
  for +acc: String
  {String.reverse.go(source, acc) == String.append(Text.reverse(source), acc) : String}

law text_base_reverse:
  for +source: String
  {String.reverse(source) == Text.reverse(source) : String}

law text_base_reverse_reverse:
  for +source: String
  {String.reverse(String.reverse(source)) == source : String}

law document_go_preserves_source:
  for +source: String
  for +lines: List<&2, Document.Line>
  {Document.encode(Document.decode_go(source, lines)) == String.reverse.go(source, Document.encode(lines)) : String}

# CRUD operates on resolved physical segment positions. Each write has a
# local receipt; failure and Read never authorize a destructive state change.
law crud_undo_shift:
  for +head: Store.Segment
  for +document: List<&2, Store.Segment>
  for +receipt: Crud.Receipt
  {Crud.undo(Con{head, document}, Crud.shift(receipt)) == Con{head, Crud.undo(document, receipt)} : List<&2, Store.Segment>}

law crud_rollback_lift:
  for +head: Store.Segment
  for +outcome: Crud.Outcome
  {Crud.rollback(Crud.lift(head, outcome)) == Con{head, Crud.rollback(outcome)} : List<&2, Store.Segment>}

law crud_rollback_head:
  for +head: Store.Segment
  for +tail: List<&2, Store.Segment>
  for +command: Crud.Command
  {Crud.rollback(Crud.at_head(head, tail, command)) == Con{head, tail} : List<&2, Store.Segment>}

law crud_rollback_end:
  for +command: Crud.Command
  {Crud.rollback(Crud.at_end(command)) == Nil{} : List<&2, Store.Segment>}

# EVERY command, index and document: undo restores the complete previous tree.
# Rejections are included, so this also establishes their unchanged document.
law crud_inverse:
  for +document: List<&2, Store.Segment>
  for +index: Nat
  for +command: Crud.Command
  {Crud.rollback(Crud.apply(document, index, command)) == document : List<&2, Store.Segment>}

# Non-vacuity and exact footprint: explicit success laws for all four commands.
# Prefix/suffix can contain arbitrary prose and arbitrary other annotations.
law crud_create_focus:
  for +before: List<&2, Store.Segment>
  for +after: List<&2, Store.Segment>
  for +id: String
  for +lines: List<&2, String>
  {Crud.apply(Store.append_segments(before, after), Store.length(before), Crud.Create{id, lines}) == Crud.Applied{Store.append_segments(before, Con{Store.Annotation{id, lines}, after}), Crud.Created{Store.length(before)}, None{}} : Crud.Outcome}

law crud_read_focus:
  for +before: List<&2, Store.Segment>
  for +after: List<&2, Store.Segment>
  for +id: String
  for +lines: List<&2, String>
  {Crud.apply(Store.append_segments(before, Con{Store.Annotation{id, lines}, after}), Store.length(before), Crud.Read{}) == Crud.Applied{Store.append_segments(before, Con{Store.Annotation{id, lines}, after}), Crud.Unchanged{}, Some{Store.Annotation{id, lines}}} : Crud.Outcome}

law crud_update_focus:
  for +before: List<&2, Store.Segment>
  for +after: List<&2, Store.Segment>
  for +id: String
  for +old: List<&2, String>
  for +replacement: List<&2, String>
  {Crud.apply(Store.append_segments(before, Con{Store.Annotation{id, old}, after}), Store.length(before), Crud.Update{replacement}) == Crud.Applied{Store.append_segments(before, Con{Store.Annotation{id, replacement}, after}), Crud.Updated{Store.length(before), Store.Annotation{id, old}}, Some{Store.Annotation{id, old}}} : Crud.Outcome}

law crud_delete_focus:
  for +before: List<&2, Store.Segment>
  for +after: List<&2, Store.Segment>
  for +id: String
  for +old: List<&2, String>
  {Crud.apply(Store.append_segments(before, Con{Store.Annotation{id, old}, after}), Store.length(before), Crud.Delete{}) == Crud.Applied{Store.append_segments(before, after), Crud.Deleted{Store.length(before), Store.Annotation{id, old}}, None{}} : Crud.Outcome}

law crud_receipt_rollback:
  for +outcome: Crud.Outcome
  {Crud.rollback_frame(Crud.get_receipt(outcome), Crud.document(outcome)) == Crud.rollback(outcome) : List<&2, Store.Segment>}

# Arbitrary finite interleavings of C/R/U/D, including failures and shifted
# indexes. Undo receipts are consumed LIFO, with no external intervening edit.
law crud_history_inverse:
  for +requests: List<&2, Crud.Request>
  for +initial: List<&2, Store.Segment>
  {Crud.rollback_history(Crud.run(requests, initial)) == initial : List<&2, Store.Segment>}

# Exact full Markdown text after any operation survives serialization. This
# composes actual CRUD output/rendering with the proved whole-source codec.
law crud_document_roundtrip:
  for +document: List<&2, Store.Segment>
  for +index: Nat
  for +command: Crud.Command
  {Document.encode(Document.decode(Crud.render(Crud.document(Crud.apply(document, index, command))))) == Crud.render(Crud.document(Crud.apply(document, index, command))) : String}

law crud_history_document_roundtrip:
  for +requests: List<&2, Crud.Request>
  for +initial: List<&2, Store.Segment>
  {Document.encode(Document.decode(Crud.render(Crud.final(Crud.run(requests, initial))))) == Crud.render(Crud.final(Crud.run(requests, initial))) : String}

law crud_history_original_text:
  for +requests: List<&2, Crud.Request>
  for +initial: List<&2, Store.Segment>
  {Crud.render(Crud.rollback_history(Crud.run(requests, initial))) == Crud.render(initial) : String}

law crud_document_lift:
  for +head: Store.Segment
  for +outcome: Crud.Outcome
  {Crud.document(Crud.lift(head, outcome)) == Con{head, Crud.document(outcome)} : List<&2, Store.Segment>}

law crud_read_unchanged:
  for +document: List<&2, Store.Segment>
  for +index: Nat
  {Crud.document(Crud.apply(document, index, Crud.Read{})) == document : List<&2, Store.Segment>}

law crud_read_value:
  for +before: List<&2, Store.Segment>
  for +after: List<&2, Store.Segment>
  for +id: String
  for +lines: List<&2, String>
  {Crud.read_at(Store.append_segments(before, Con{Store.Annotation{id, lines}, after}), Store.length(before)) == Some{Store.Annotation{id, lines}} : Maybe<&2, Store.Segment>}

law crud_read_created:
  for +before: List<&2, Store.Segment>
  for +after: List<&2, Store.Segment>
  for +id: String
  for +lines: List<&2, String>
  {Crud.read_at(Crud.document(Crud.apply(Store.append_segments(before, after), Store.length(before), Crud.Create{id, lines})), Store.length(before)) == Some{Store.Annotation{id, lines}} : Maybe<&2, Store.Segment>}

law crud_read_updated:
  for +before: List<&2, Store.Segment>
  for +after: List<&2, Store.Segment>
  for +id: String
  for +old: List<&2, String>
  for +replacement: List<&2, String>
  {Crud.read_at(Crud.document(Crud.apply(Store.append_segments(before, Con{Store.Annotation{id, old}, after}), Store.length(before), Crud.Update{replacement})), Store.length(before)) == Some{Store.Annotation{id, replacement}} : Maybe<&2, Store.Segment>}

law crud_write_read_value_unchanged:
  for +before: List<&2, Store.Segment>
  for +after: List<&2, Store.Segment>
  for +id: String
  for +old: List<&2, String>
  {Crud.document(Crud.apply(Store.append_segments(before, Con{Store.Annotation{id, old}, after}), Store.length(before), Crud.Update{old})) == Store.append_segments(before, Con{Store.Annotation{id, old}, after}) : List<&2, Store.Segment>}

# A conditional statement makes rejection preservation explicit, independent
# of which command/index failed and which error it returned.
law crud_rejected_unchanged:
  for +document: List<&2, Store.Segment>
  for +index: Nat
  for +command: Crud.Command
  for +returned: List<&2, Store.Segment>
  for +error: Crud.Error
  for evidence: {Crud.apply(document, index, command) == Crud.Rejected{returned, error} : Crud.Outcome}
  {returned == document : List<&2, Store.Segment>}

# Direct C/D inverses at a resolved focus, in addition to receipt-based undo.
law crud_create_delete:
  for +before: List<&2, Store.Segment>
  for +after: List<&2, Store.Segment>
  for +id: String
  for +lines: List<&2, String>
  {Crud.document(Crud.apply(Crud.document(Crud.apply(Store.append_segments(before, after), Store.length(before), Crud.Create{id, lines})), Store.length(before), Crud.Delete{})) == Store.append_segments(before, after) : List<&2, Store.Segment>}

law crud_delete_recreate:
  for +before: List<&2, Store.Segment>
  for +after: List<&2, Store.Segment>
  for +id: String
  for +old: List<&2, String>
  {Crud.document(Crud.apply(Crud.document(Crud.apply(Store.append_segments(before, Con{Store.Annotation{id, old}, after}), Store.length(before), Crud.Delete{})), Store.length(before), Crud.Create{id, old})) == Store.append_segments(before, Con{Store.Annotation{id, old}, after}) : List<&2, Store.Segment>}

law crud_update_restore:
  for +before: List<&2, Store.Segment>
  for +after: List<&2, Store.Segment>
  for +id: String
  for +old: List<&2, String>
  for +replacement: List<&2, String>
  {Crud.document(Crud.apply(Crud.document(Crud.apply(Store.append_segments(before, Con{Store.Annotation{id, old}, after}), Store.length(before), Crud.Update{replacement})), Store.length(before), Crud.Update{old})) == Store.append_segments(before, Con{Store.Annotation{id, old}, after}) : List<&2, Store.Segment>}

# The real boundary implementation, without trimming or changing old source.
law boundary_run_append:
  for +prefix: String
  for +tail: String
  for +state: Boundary.State
  {Boundary.run(String.append(prefix, tail), state) == Boundary.run(tail, Boundary.run(prefix, state)) : Boundary.State}

law boundary_suffix_ready:
  for +state: Boundary.State
  {Boundary.suffix(Boundary.run(Boundary.suffix(state), state)) == "" : String}

law boundary_normalized_suffix_empty:
  for +source: String
  {Boundary.suffix(Boundary.run(Boundary.normalize(source), Boundary.EmptySource{})) == "" : String}

law boundary_idempotent:
  for +source: String
  {Boundary.normalize(Boundary.normalize(source)) == Boundary.normalize(source) : String}

# Creation's executable proof-producing preflight compares the freshly parsed
# deletion result to B(source). This is a checked invariant, not an assumption
# about an unproved Boolean equality or a receipt retained by deletion.
law source_cycle_result_cases:
  for +source: String
  for +id: String
  for +result: SourceCrud.Creation<source, id>
  Either<&2, &2, {SourceCrud.cycle_result(source, id, result) == source : String}, {SourceCrud.cycle_result(source, id, result) == Boundary.normalize(source) : String}>

law source_cycle_cases:
  for +source: String
  for +id: String
  for +body: String
  Either<&2, &2, {SourceCrud.cycle(source, id, body) == source : String}, {SourceCrud.cycle(source, id, body) == Boundary.normalize(source) : String}>

law source_cycle_fixed_helper:
  for +source: String
  for +id: String
  for +body: String
  for stable: {Boundary.normalize(source) == source : String}
  for cases: Either<&2, &2, {SourceCrud.cycle(source, id, body) == source : String}, {SourceCrud.cycle(source, id, body) == Boundary.normalize(source) : String}>
  {SourceCrud.cycle(source, id, body) == source : String}

law source_cycle_normalized_fixed:
  for +source: String
  for +id: String
  for +body: String
  {SourceCrud.cycle(Boundary.normalize(source), id, body) == Boundary.normalize(source) : String}

law source_cycle_idempotent_helper:
  for +source: String
  for +id: String
  for +body: String
  for cases: Either<&2, &2, {SourceCrud.cycle(source, id, body) == source : String}, {SourceCrud.cycle(source, id, body) == Boundary.normalize(source) : String}>
  {SourceCrud.cycle(SourceCrud.cycle(source, id, body), id, body) == SourceCrud.cycle(source, id, body) : String}

# F(F(document)) = F(document), for ALL full strings, IDs and raw body inputs.
# F calls create, then delete which reparses the complete created source. Each
# second F starts from that source again. Errors are unchanged-source results.
law source_cycle_idempotent:
  for +source: String
  for +id: String
  for +body: String
  {SourceCrud.cycle(SourceCrud.cycle(source, id, body), id, body) == SourceCrud.cycle(source, id, body) : String}

# Concrete acceptance witness: the theorem cannot be satisfied by a creator
# that rejects every request. Legacy optional fields are intentionally absent.
law source_creation_accepts_example:
  {SourceCrud.succeeded("hello", "demo", SourceCrud.create("hello", "demo", ">%%\n>```annotation-json\n>{}\n>```\n>%%\n>*hello*")) == True{} : Bool}

law boundary_suffix_bounded:
  for +state: Boundary.State
  {Nat.is_le(String.length(Boundary.suffix(state)), 2n) == True{} : Bool}

law boundary_preserves_prefix:
  for +source: String
  exs added: String
  {Boundary.normalize(source) == String.append(source, added) : String}

# Source-derived typed semantic contracts, separate from raw-text preservation.
law annotation_update_path_ignored:
  for +fields: Annotation.AnnotationFields
  for +pathA: String
  for +pathB: String
  for +fresh: String
  {AnnotationContract.plan(Annotation.UpdateRequest{pathA, fields}, fresh) == AnnotationContract.plan(Annotation.UpdateRequest{pathB, fields}, fresh) : Annotation.WritePlan}

law annotation_create_update_same_body:
  for +fields: Annotation.AnnotationFields
  for +path: String
  for +fresh: String
  {AnnotationContract.plan(Annotation.CreateRequest{fields}, fresh) == AnnotationContract.plan(Annotation.UpdateRequest{path, fields}, fresh) : Annotation.WritePlan}

law annotation_write_normalization_last_id:
  for +fields: Annotation.AnnotationFields
  for +first: String
  for +last: String
  {AnnotationContract.normalize_write(AnnotationContract.normalize_write(fields, first), last) == AnnotationContract.normalize_write(fields, last) : Annotation.AnnotationFields}

law annotation_write_clears_flag:
  for +fields: Annotation.AnnotationFields
  for +id: String
  {AnnotationObserve.flagged(AnnotationContract.normalize_write(fields, id)) == Annotation.PresentField{False{}} : Annotation.Field<Bool>}

law annotation_write_preserves_content:
  for +fields: Annotation.AnnotationFields
  for +id: String
  {AnnotationObserve.content(AnnotationContract.normalize_write(fields, id)) == AnnotationObserve.content(fields) : Annotation.Content}

law annotation_write_preserves_document:
  for +fields: Annotation.AnnotationFields
  for +id: String
  {AnnotationObserve.document(AnnotationContract.normalize_write(fields, id)) == AnnotationObserve.document(fields) : Annotation.Field<Annotation.DocumentMetadata>}

law annotation_write_preserves_extensions:
  for +fields: Annotation.AnnotationFields
  for +id: String
  {AnnotationObserve.extensions(AnnotationContract.normalize_write(fields, id)) == AnnotationObserve.extensions(fields) : List<&2, Annotation.Member>}

law annotation_stored_identity_omitted:
  for +fields: Annotation.AnnotationFields
  {AnnotationObserve.identity(AnnotationObserve.stored(AnnotationContract.store(fields))) == Annotation.Identity{Annotation.AbsentField{}, Annotation.AbsentField{}, Annotation.AbsentField{}, Annotation.AbsentField{}, Annotation.AbsentField{}} : Annotation.Identity}

law annotation_store_preserves_extensions:
  for +fields: Annotation.AnnotationFields
  {AnnotationObserve.extensions(AnnotationObserve.stored(AnnotationContract.store(fields))) == AnnotationObserve.extensions(fields) : List<&2, Annotation.Member>}

law annotation_strip_text_default:
  for +value: Annotation.Field<String>
  {AnnotationContract.get(String, AnnotationContract.strip_text(value), "") == AnnotationContract.get(String, value, "") : String}

law annotation_strip_list_default:
  for -A: Data
  for +value: Annotation.Field<List<&2, A>>
  {AnnotationContract.get(List<&2, A>, AnnotationContract.strip_list(A, value), Nil{}) == AnnotationContract.get(List<&2, A>, value, Nil{}) : List<&2, A>}

law annotation_strip_false_default:
  for +value: Annotation.Field<Bool>
  {AnnotationContract.get(Bool, AnnotationContract.strip_false(value), False{}) == AnnotationContract.get(Bool, value, False{}) : Bool}

law annotation_overlay_idempotent:
  for -A: Data
  for +visible: Annotation.Field<A>
  for +original: Annotation.Field<A>
  {AnnotationContract.prefer(A, visible, AnnotationContract.prefer(A, visible, original)) == AnnotationContract.prefer(A, visible, original) : Annotation.Field<A>}

law annotation_quote_exact_preserved:
  for +selector: Annotation.Selector
  for +visible: Annotation.VisibleQuote
  {AnnotationObserve.quote_exact(AnnotationContract.quote(selector, visible)) == AnnotationObserve.quote_exact(selector) : Annotation.Field<String>}

law annotation_quote_overlay_idempotent:
  for +selector: Annotation.Selector
  for +visible: Annotation.VisibleQuote
  {AnnotationContract.quote(AnnotationContract.quote(selector, visible), visible) == AnnotationContract.quote(selector, visible) : Annotation.Selector}

law annotation_only_first_target_context:
  for +head: Annotation.Target
  for +tail: List<&2, Annotation.Target>
  for +visible: Annotation.VisibleQuote
  {AnnotationContract.first_target(Con{head, tail}, visible) == Con{AnnotationContract.target_quote(head, visible), tail} : List<&2, Annotation.Target>}

law annotation_load_store_local_identity:
  for +anchor: String
  for +fields: Annotation.AnnotationFields
  for +visible: Annotation.VisibleFields
  {AnnotationObserve.loaded_identity(AnnotationContract.load(anchor, AnnotationContract.store(fields), visible)) == Annotation.Identity{Annotation.PresentField{anchor}, Annotation.PresentField{"__world__"}, Annotation.PresentField{"Obsidian User"}, Annotation.PresentField{AnnotationContract.local_permissions()}, Annotation.PresentField{AnnotationContract.local_user_info()}} : Annotation.Identity}

law annotation_load_preserves_extensions:
  for +anchor: String
  for +fields: Annotation.AnnotationFields
  for +visible: Annotation.VisibleFields
  {AnnotationObserve.loaded_extensions(AnnotationContract.load(anchor, Annotation.StoredAnnotation{fields}, visible)) == AnnotationObserve.extensions(fields) : List<&2, Annotation.Member>}

law annotation_plan_uses_body_identity:
  for +fields: Annotation.AnnotationFields
  for +fresh: String
  {AnnotationObserve.plan_id(AnnotationContract.plan(Annotation.CreateRequest{fields}, fresh)) == AnnotationContract.effective_id(fields, fresh) : String}

law annotation_nonempty_body_id_wins:
  for +head: Char
  for +tail: String
  for +fresh: String
  {AnnotationContract.id_field(Annotation.PresentField{SCon{head, tail}}, fresh) == SCon{head, tail} : String}

law annotation_empty_body_id_uses_fresh:
  for +fresh: String
  {AnnotationContract.id_field(Annotation.PresentField{""}, fresh) == fresh : String}

law annotation_quote_missing_exact_rejected:
  {AnnotationSchema.selector(Annotation.JObject{[Annotation.JsonPair{"type", Annotation.JString{"TextQuoteSelector"}}]}) == Fail{"exact: missing required field"} : Result<&2, &2, String, Annotation.Selector>}

# Exact value-level round trips of the supported selector constructors. These
# use empty extension sets; they do not assume arbitrary extras are disjoint.
law annotation_position_selector_roundtrip:
  for +start: Annotation.Utf16Offset
  for +end: Annotation.Utf16Offset
  {AnnotationSchema.selector(AnnotationJson.selector(Annotation.PositionSelector{start, end, Nil{}})) == Done{Annotation.PositionSelector{start, end, Nil{}}} : Result<&2, &2, String, Annotation.Selector>}

law annotation_quote_selector_roundtrip:
  for +exact: String
  for +prefix: Annotation.Field<String>
  for +suffix: Annotation.Field<String>
  {AnnotationSchema.selector(AnnotationJson.selector(Annotation.QuoteSelector{exact, prefix, suffix, Nil{}})) == Done{Annotation.QuoteSelector{exact, prefix, suffix, Nil{}}} : Result<&2, &2, String, Annotation.Selector>}

law annotation_range_selector_roundtrip:
  for +sc: String
  for +so: Annotation.Utf16Offset
  for +ec: String
  for +eo: Annotation.Utf16Offset
  {AnnotationSchema.selector(AnnotationJson.selector(Annotation.DomRangeSelector{sc, so, ec, eo, Nil{}})) == Done{Annotation.DomRangeSelector{sc, so, ec, eo, Nil{}}} : Result<&2, &2, String, Annotation.Selector>}

# Every accepted create already has a complete blank-line boundary. A later
# create therefore cannot borrow another raw newline from this annotation.
law source_creation_normalized:
  for +source: String
  for +id: String
  for +result: SourceCrud.Creation<source, id>
  Either<&2, &2, {SourceCrud.succeeded(source, id, result) == False{} : Bool}, {Boundary.normalize(SourceCrud.result_source(source, id, result)) == SourceCrud.result_source(source, id, result) : String}>

# Video body schema is separate from Hypothesis. Timestamp spelling survives
# edits to unrelated fields; these laws do not yet cover document recognition.

law video_comment_preserves_time:
  for +fields: Video.Fields
  for comment: List<&2, String>
  {Video.get_time(Video.with_comment(fields, comment)) == Video.get_time(fields) : String}

law video_title_preserves_comment:
  for +fields: Video.Fields
  for title: String
  {Video.get_comment(Video.with_title(fields, title)) == Video.get_comment(fields) : List<&2, String>}

law video_comment_last_write:
  for +fields: Video.Fields
  for first: List<&2, String>
  for +last: List<&2, String>
  {Video.with_comment(Video.with_comment(fields, first), last) == Video.with_comment(fields, last) : Video.Fields}

law video_body_quoting:
  for +fields: Video.Fields
  {Codec.unquote_lines(Video.encode(fields)) == Some{Con{Video.header(fields), Video.get_comment(fields)}} : Maybe<&2, List<&2, String>>}

# Positive executable witness: recognition and exact timestamp spelling.
law video_body_accepts:
  {Video.decode(["> **Title** %%TIMESTAMP: 0012.500%%", ">first", ">", ">last"]) == Some{Video.Fields{"Title", "0012.500", ["first", "", "last"]}} : Maybe<&2, Video.Fields>}

# Video F uses the actual mixed-document recognizer and reparses on deletion.
law video_cycle_result_cases:
  for +source: String
  for +id: String
  for +result: VideoSource.Creation<source, id>
  Either<&2, &2, {VideoSource.cycle_result(source, id, result) == source : String}, {VideoSource.cycle_result(source, id, result) == Boundary.normalize(source) : String}>

law video_cycle_cases:
  for +source: String
  for +id: String
  for +body: String
  Either<&2, &2, {VideoSource.cycle(source, id, body) == source : String}, {VideoSource.cycle(source, id, body) == Boundary.normalize(source) : String}>

law video_cycle_fixed_helper:
  for +source: String
  for +id: String
  for +body: String
  for stable: {Boundary.normalize(source) == source : String}
  for cases: Either<&2, &2, {VideoSource.cycle(source, id, body) == source : String}, {VideoSource.cycle(source, id, body) == Boundary.normalize(source) : String}>
  {VideoSource.cycle(source, id, body) == source : String}

law video_cycle_normalized_fixed:
  for +source: String
  for +id: String
  for +body: String
  {VideoSource.cycle(Boundary.normalize(source), id, body) == Boundary.normalize(source) : String}

law video_cycle_idempotent_helper:
  for +source: String
  for +id: String
  for +body: String
  for cases: Either<&2, &2, {VideoSource.cycle(source, id, body) == source : String}, {VideoSource.cycle(source, id, body) == Boundary.normalize(source) : String}>
  {VideoSource.cycle(VideoSource.cycle(source, id, body), id, body) == VideoSource.cycle(source, id, body) : String}

# F(F(document)) = F(document), for ALL full strings, IDs and raw body inputs.
# F calls create, then delete which reparses the complete created source. Each
# second F starts from that source again. Errors are unchanged-source results.
law video_cycle_idempotent:
  for +source: String
  for +id: String
  for +body: String
  {VideoSource.cycle(VideoSource.cycle(source, id, body), id, body) == VideoSource.cycle(source, id, body) : String}


law video_creation_accepts_example:
  {VideoSource.succeeded("hello", "demo", VideoSource.create("hello", "demo", "> **Example** %%TIMESTAMP: 0012.500%%\n>comment")) == True{} : Bool}

# Empty/newline source and adjacent records are part of the same executable
# acceptance domain, not an assumed raw-token model.
law video_creation_accepts_empty:
  {VideoSource.succeeded("", "demo", VideoSource.create("", "demo", "> **Example** %%TIMESTAMP: 0%%\n>")) == True{} : Bool}

# Success preserves every byte outside the selected video block, after a fresh
# parse. Failure is explicitly an unchanged-source result.
law video_update_preserves_others:
  for +source: String
  for +id: String
  for +result: VideoUpdate.Update<source, id>
  Either<&2, &2, {VideoUpdate.succeeded(source, id, result) == False{} : Bool}, {VideoDocument.masked(VideoUpdate.output(source, id, result), id) == VideoDocument.masked(source, id) : String}>

law video_update_accepts_example:
  {VideoUpdate.succeeded("\n> **Title** %%TIMESTAMP: 0012.500%%\n>old\n^demo\n", "demo", VideoUpdate.update("\n> **Title** %%TIMESTAMP: 0012.500%%\n>old\n^demo\n", "demo", "> **Title** %%TIMESTAMP: 0012.500%%\n>new", "\n> **Title** %%TIMESTAMP: 0012.500%%\n>old\n^demo\n")) == True{} : Bool}

# Header recognition is lossless on success; a rejected input is returned intact.
# These laws extend the accepted grammar without changing earlier body laws.
law video_header_recognition_lossless:
  for +source: String
  for result: VideoHeader.Recognition<source>
  {VideoHeader.reemitted(source, result) == source : String}

law video_header_title_preserves_layout:
  for +header: VideoHeader.Syntax
  for value: String
  {VideoHeader.layout(VideoHeader.with_title(header, value)) == VideoHeader.layout(header) : VideoHeader.Layout}

law video_header_time_preserves_layout:
  for +header: VideoHeader.Syntax
  for value: String
  {VideoHeader.layout(VideoHeader.with_time(header, value)) == VideoHeader.layout(header) : VideoHeader.Layout}

law video_header_title_preserves_time:
  for +header: VideoHeader.Syntax
  for value: String
  {VideoHeader.get_time(VideoHeader.with_title(header, value)) == VideoHeader.get_time(header) : String}

law video_header_time_preserves_title:
  for +header: VideoHeader.Syntax
  for value: String
  {VideoHeader.get_title(VideoHeader.with_time(header, value)) == VideoHeader.get_title(header) : String}

law video_header_accepts_noncanonical:
  {VideoHeader.parse(">**Title**\t%%TIMESTAMP:0012.500%%  ") == Some{VideoHeader.Syntax{">**", "Title", "**\t%%TIMESTAMP:", "0012.500", "%%  "}} : Maybe<&2, VideoHeader.Syntax>}


# ── Highlight inks ──────────────────────────────────────────────────────────
# Every ink survives being written to and read from its stored key.
law ink_key_roundtrip:
  for ink: Ink.Ink
  {Ink.parse(Ink.key(ink)) == ink : Ink.Ink}

# The swatch order and the 1-6 shortcuts name the same inks.
law ink_shortcut_roundtrip:
  for ink: Ink.Ink
  {Ink.at(Ink.index(ink)) == Some{ink} : Maybe<&2, Ink.Ink>}

# Reading an annotation after recolouring it yields the chosen ink, whatever
# members (including earlier or duplicate `color` members) it had before.
law ink_read_after_write:
  for +members: List<&2, Annotation.JsonPair<Annotation.Json>>
  for +ink: Ink.Ink
  {Ink.get(Ink.set(members, ink)) == ink : Ink.Ink}

# Recolouring changes nothing else: every other member keeps its key, value
# and order. No restriction on the members.
law ink_write_preserves_others:
  for +members: List<&2, Annotation.JsonPair<Annotation.Json>>
  for +ink: Ink.Ink
  {Ink.others(Ink.set(members, ink)) == Ink.others(members) : List<&2, Annotation.JsonPair<Annotation.Json>>}

# The last colour wins, and repeated recolouring never grows the annotation.
law ink_last_write_wins:
  for +members: List<&2, Annotation.JsonPair<Annotation.Json>>
  for +first: Ink.Ink
  for +second: Ink.Ink
  {Ink.set(Ink.set(members, first), second) == Ink.set(members, second) : List<&2, Annotation.JsonPair<Annotation.Json>>}


# ── The annotation list ─────────────────────────────────────────────────────
# Every entry appears under exactly one tab.
law shelf_tabs_partition:
  for +entries: List<&2, Shelf.Entry>
  {Nat.add(Shelf.length(Shelf.annotations(entries)), Shelf.length(Shelf.notes(entries))) == Shelf.length(entries) : Nat}

# With no colour chosen, nothing is hidden.
law shelf_empty_filter_shows_all:
  for entries: List<&2, Shelf.Entry>
  {Shelf.visible(Nil{}, entries) == entries : List<&2, Shelf.Entry>}

# A colour filter only ever shows entries of the chosen colours.
law shelf_filter_sound:
  for +filter: List<&2, Ink.Ink>
  for +entries: List<&2, Shelf.Entry>
  {Shelf.all_have(filter, Shelf.only(filter, entries)) == True{} : Bool}

# Section headings are purely additive: the cards between them are exactly
# the entries, in their order, none dropped, duplicated or moved.
law shelf_headings_keep_cards:
  for +entries: List<&2, Shelf.Entry>
  {Shelf.cards(Shelf.rows(entries)) == Shelf.ids(entries) : List<&2, String>}

# A non-empty grouped list always opens with a heading, so no card is ever
# shown without its section.
law shelf_headings_lead:
  for entry: Shelf.Entry
  for rest: List<&2, Shelf.Entry>
  {Shelf.opens_with_header(Shelf.rows(Con{entry, rest})) == True{} : Bool}

# ── Markdown export ─────────────────────────────────────────────────────────
# Quoting is exactly reversible for any text, so exported passages and notes
# cannot terminate their block or alter a neighbouring entry.
law digest_line_roundtrip:
  for line: String
  {Digest.unquote_line(Digest.quote_line(line)) == Some{line} : Maybe<&2, String>}

law digest_lines_roundtrip:
  for +lines: List<&2, String>
  {Digest.unquote_lines(Digest.quote_lines(lines)) == Some{lines} : Maybe<&2, List<&2, String>>}

# A title never contains a line break, whatever the source title was.
law digest_title_is_one_line:
  for +text: String
  {Digest.has_break(Digest.single_line(text)) == False{} : Bool}

# Unquoting the body of an exported block returns the passage and note
# exactly, for callouts and plain block quotes alike.
law digest_block_roundtrip:
  for kind: String
  for +note: Digest.Note
  {Digest.unquote_lines(Digest.block_body(kind, Digest.block(kind, note))) == Some{Digest.body(note)} : Maybe<&2, List<&2, String>>}

# What an exported block contains: the passage, then (after one blank line)
# the note. A lone passage or a lone note is exported exactly as it is.
law digest_body_passage_then_note:
  for q: String
  for qs: List<&2, String>
  for c: String
  for cs: List<&2, String>
  {Digest.join(Con{q, qs}, Con{c, cs}) == List.append(&2, String, Con{q, qs}, Con{"", Con{c, cs}}) : List<&2, String>}

law digest_body_passage_only:
  for quote: List<&2, String>
  {Digest.join(quote, Nil{}) == quote : List<&2, String>}

law digest_body_note_only:
  for comment: List<&2, String>
  {Digest.join(Nil{}, comment) == comment : List<&2, String>}

# ── Duplicate annotation IDs ────────────────────────────────────────────────
# The recognizer finds repeated IDs in one pass, carrying the IDs of the later
# parts in a character trie (`Recognizer.Seen`). The pairwise definitions it
# replaced (`errors_pairwise`, `diagnostics_pairwise`: every ID compared with
# every later one by `String.eq`) stay in recognizer.bend as the specification.
#
# The trie is a set of strings under `String.eq`: nothing is in the empty one,
# and after adding a key exactly that key has joined. For EVERY trie, key and
# probe, including the empty string and keys that are prefixes of each other.
law recognizer_seen_empty:
  for +probe: String
  {Recognizer.seen_has(Recognizer.SeenNone{}, probe) == False{} : Bool}

law recognizer_seen_add_has:
  for +seen: Recognizer.Seen
  for +key: String
  for +probe: String
  {Recognizer.seen_has(Recognizer.seen_add(seen, key), probe) == Bool.or(String.eq(key, probe), Recognizer.seen_has(seen, probe)) : Bool}

# The one-pass check accepts and rejects exactly what the pairwise one does,
# for EVERY list of parts (not only lists a scan can produce).
law recognizer_errors_pairwise:
  for +parts: List<&2, Recognizer.Part>
  {Recognizer.errors(parts) == Recognizer.errors_pairwise(parts) : Bool}

law recognizer_safe_pairwise:
  for +parts: List<&2, Recognizer.Part>
  for closed: Bool
  {Recognizer.safe(Recognizer.Scan{parts, closed}) == Bool.and(closed, Bool.not(Recognizer.errors_pairwise(parts))) : Bool}

# The same diagnostics: same lines, same messages, same order. In particular
# every block whose ID occurs again later is reported, at its own line; the
# last block carrying a repeated ID is not.
law recognizer_diagnostics_pairwise:
  for +parts: List<&2, Recognizer.Part>
  {Recognizer.diagnostics(parts) == Recognizer.diagnostics_pairwise(parts) : List<&2, Recognizer.Diagnostic>}

# ── Fast paths of the scan ──────────────────────────────────────────────────
# Reading a note used to walk every line many times: each marker test trimmed
# the whole line (two reversals), each line was reversed twice to strip a CR,
# and the line decoder reversed the whole source first. The definitions that
# did so stay in the modules as the specification (`*_exact`); what the scan
# runs is proved equal to them, for EVERY input. (The two display helpers in
# annotation_visible.bend were shortened the same way and are only tested.)
#
# The forward line decoder yields exactly the lines of the backward one: same
# bodies, same line-break characters, same last line.
law document_decode_exact:
  for +source: String
  {Document.decode(source) == Document.decode_exact(source) : List<&2, Document.Line>}

# A marker or prefix test that first looks at the untrimmed start of the line
# answers what the trimming test answers, for every line and every marker
# (blank, empty and whitespace-ending markers included).
law recognizer_is_marker_exact:
  for +text: String
  for +marker: String
  {Recognizer.is_marker(text, marker) == Recognizer.is_marker_exact(text, marker) : Bool}

law recognizer_starts_trimmed_exact:
  for +text: String
  for +prefix: String
  {Recognizer.starts_trimmed(text, prefix) == Recognizer.starts_trimmed_exact(text, prefix) : Bool}

# Testing for a header only on the line after a marker is the conjunction it
# replaced.
law recognizer_header_after_exact:
  for previous: Bool
  for text: String
  {Recognizer.header_after(previous, text) == Bool.and(previous, Recognizer.header_text(String.trim(text))) : Bool}

# Stripping the CR of a CRLF line. `clean` returns either the line unchanged
# or what `clean_exact` returns (first law); it detects every line that ends in
# CR and strips exactly that CR, as `clean_exact` does (the next two); and it
# is `clean_exact` for EVERY line (the last). That one needs `clean_exact` to
# return a line without a trailing CR unchanged: its definition matches the
# character literal '\r', which the proof decides bit by bit (33 cases).
law recognizer_clean_choice:
  for +text: String
  {Recognizer.clean(text) == Bool.pick(String, Recognizer.ends_cr(text, False{}), Recognizer.clean_exact(text), text) : String}

law recognizer_clean_exact_strips_cr:
  for +body: String
  {Recognizer.clean_exact(String.append(body, "\r")) == body : String}

law recognizer_clean_strips_cr:
  for +body: String
  {Recognizer.clean(String.append(body, "\r")) == body : String}

law recognizer_clean_exact:
  for +text: String
  {Recognizer.clean(text) == Recognizer.clean_exact(text) : String}

# The same for the end of a trimmed text (the display's closing `*`).
law recognizer_ends_trimmed_exact:
  for +text: String
  for +suffix: String
  {Recognizer.ends_trimmed(text, suffix) == Recognizer.ends_trimmed_exact(text, suffix) : Bool}


# ── Schema lookups that stop at the match ───────────────────────────────────
# Reading an annotation looks each known field up among its members and each
# member up among the known names. The definitions (`member_exact`,
# `known_exact`) compare with every entry; what runs stops at the first match
# and gives the same answer, for every member list, name list and key.
law schema_member_exact:
  for +fields: List<&2, Annotation.Member>
  for +key: String
  {AnnotationSchema.member(fields, key) == AnnotationSchema.member_exact(fields, key) : Annotation.Field<Annotation.Json>}

law schema_known_exact:
  for +names: List<&2, String>
  for +key: String
  {AnnotationSchema.known(names, key) == AnnotationSchema.known_exact(names, key) : Bool}

# ── A note scanned in stretches ─────────────────────────────────────────────
# Decoding splits at a line feed: a text that ends in one decodes to whole
# lines, and what is appended to it decodes on its own.
law document_decode_append:
  for +a: String
  for +b: String
  for ended: {Document.ends_nl(a, False{}) == True{} : Bool}
  {Document.decode(String.append(a, b)) == List.append(&2, Document.Line, Document.decode(a), Document.decode(b)) : List<&2, Document.Line>}

# The scan of a note put together from stretches is the scan of the note.
# A `Segment` is a stretch of text with its scan; only `Segments.opening` and
# `Segments.following` make one, and each holds the proof of what its state
# is. `Segments.assemble` refuses a list whose stretches do not fit (one that
# is not the first where a first is needed, a stretch that does not end in a
# line feed or leaves the scanner outside its Neutral mode before another,
# a first stretch without a line). For EVERY list of segments it does accept,
# in whatever order and from whatever earlier notes they were kept, the scan
# it returns is `Recognizer.scan` of the text it returns: the same parts with
# the same line numbers, and the same closed flag. A host that reuses the
# stretches of an earlier note around a change therefore needs no argument of
# its own: it compares the returned text with the note it has.
law segments_assemble:
  for +segments: List<&2, Segments.Segment>
  for +result: Segments.Assembled
  for found: {Segments.assemble(segments) == Some{result} : Maybe<&2, Segments.Assembled>}
  {Segments.assembled_scan(result) == Recognizer.scan(Segments.assembled_text(result)) : Recognizer.Scan}

# ── Regions of a page ───────────────────────────────────────────────────────
# A region is marked by dragging between two corners, moved and resized from
# the keyboard, and stored as page percentages. For EVERY page size, corner,
# step and least size:
#   - the corners may be given in either order, in either direction;
#   - a drag between points on the page is kept exactly as dragged;
#   - what a drag, a move or a resize gives never passes the page's edge;
#   - a move never changes the size, a resize never changes the start, and
#     shrinking never enlarges;
#   - whatever `fit` returns satisfies `valid`, the test a stored region must
#     pass to be drawn.
law area_span_symmetric:
  for +full: Nat
  for +a: Nat
  for +b: Nat
  {Area.span(full, a, b) == Area.span(full, b, a) : Area.Span}

law area_fit_symmetric_across:
  for +full: Nat
  for +least: Nat
  for +page: Nat
  for +ax: Nat
  for +ay: Nat
  for +bx: Nat
  for +by: Nat
  {Area.fit(full, least, page, ax, ay, bx, by) == Area.fit(full, least, page, bx, ay, ax, by) : Maybe<&2, Area.Area>}

law area_fit_symmetric_down:
  for +full: Nat
  for +least: Nat
  for +page: Nat
  for +ax: Nat
  for +ay: Nat
  for +bx: Nat
  for +by: Nat
  {Area.fit(full, least, page, ax, ay, bx, by) == Area.fit(full, least, page, ax, by, bx, ay) : Maybe<&2, Area.Area>}

law area_span_within:
  for +full: Nat
  for +a: Nat
  for +b: Nat
  {Area.within(full, Area.span(full, a, b)) == True{} : Bool}

law area_span_exact:
  for +a: Nat
  for +d: Nat
  for +rest: Nat
  {Area.span(Nat.add(a, Nat.add(d, rest)), a, Nat.add(a, d)) == Area.Span{a, d} : Area.Span}

law area_later_within:
  for +full: Nat
  for +span: Area.Span
  for +by: Nat
  for kept: {Area.within(full, span) == True{} : Bool}
  {Area.within(full, Area.later(full, span, by)) == True{} : Bool}

law area_earlier_within:
  for +full: Nat
  for +span: Area.Span
  for +by: Nat
  for kept: {Area.within(full, span) == True{} : Bool}
  {Area.within(full, Area.earlier(span, by)) == True{} : Bool}

law area_grow_within:
  for +full: Nat
  for +span: Area.Span
  for +by: Nat
  for kept: {Area.within(full, span) == True{} : Bool}
  {Area.within(full, Area.grow(full, span, by)) == True{} : Bool}

law area_shrink_within:
  for +full: Nat
  for +least: Nat
  for +span: Area.Span
  for +by: Nat
  for kept: {Area.within(full, span) == True{} : Bool}
  {Area.within(full, Area.shrink(least, span, by)) == True{} : Bool}

law area_shrink_no_larger:
  for +least: Nat
  for +span: Area.Span
  for +by: Nat
  {Nat.is_ge(Area.size(span), Area.size(Area.shrink(least, span, by))) == True{} : Bool}

law area_later_keeps_size:
  for +full: Nat
  for +span: Area.Span
  for +by: Nat
  {Area.size(Area.later(full, span, by)) == Area.size(span) : Nat}

law area_earlier_keeps_size:
  for +span: Area.Span
  for +by: Nat
  {Area.size(Area.earlier(span, by)) == Area.size(span) : Nat}

law area_grow_keeps_start:
  for +full: Nat
  for +span: Area.Span
  for +by: Nat
  {Area.start(Area.grow(full, span, by)) == Area.start(span) : Nat}

law area_shrink_keeps_start:
  for +least: Nat
  for +span: Area.Span
  for +by: Nat
  {Area.start(Area.shrink(least, span, by)) == Area.start(span) : Nat}

law area_fit_valid:
  for +full: Nat
  for +least: Nat
  for +page: Nat
  for +ax: Nat
  for +ay: Nat
  for +bx: Nat
  for +by: Nat
  {Area.sound(full, Area.fit(full, 1n+least, page, ax, ay, bx, by)) == True{} : Bool}

# Deleting from a note put together from stretches is deleting from its text.
law segments_delete:
  for +segments: List<&2, Segments.Segment>
  for +result: Segments.Assembled
  for +id: String
  for found: {Segments.assemble(segments) == Some{result} : Maybe<&2, Segments.Assembled>}
  {Segments.delete(result, id) == Recognizer.delete(Segments.assembled_text(result), id) : Recognizer.Edit}

# Two texts that each contain the other are the same text.
law segments_same_text:
  for +a: String
  for +b: String
  for +same: {Segments.same_text(a, b) == True{} : Bool}
  {a == b : String}

# Creating in a note put together from stretches returns the note's text and
# the source that the whole-note `SourceCrud.create` returns for that text.
law segments_create:
  for +init: List<&2, Segments.Segment>
  for +last: Segments.Segment
  for +id: String
  for +body: String
  for +result: Segments.Created
  for made: {Segments.create(init, last, id, body) == Some{result} : Maybe<&2, Segments.Created>}
  {SourceCrud.created(Segments.created_original(result), id, SourceCrud.create(Segments.created_original(result), id, body)) == Some{Segments.created_source(result)} : Maybe<&2, String>}

# A stored region is moved and resized from the keyboard through `move` and
# `resize`, which take the change only if what it gives may be stored. For a
# region that may be stored, the result may be stored; a move keeps the
# extent, a resize keeps the corner; and neither is ever refused (a resize,
# for a least size of at least one unit): the region goes as far as the page
# or the least size allows.
law area_move_valid:
  for +full: Nat
  for +area: Area.Area
  for +way: Area.Way
  for +by: Nat
  for kept: {Area.valid(full, area) == True{} : Bool}
  {Area.valid(full, Area.move(full, area, way, by)) == True{} : Bool}

law area_resize_valid:
  for +full: Nat
  for +least: Nat
  for +area: Area.Area
  for +way: Area.Way
  for +by: Nat
  for kept: {Area.valid(full, area) == True{} : Bool}
  {Area.valid(full, Area.resize(full, least, area, way, by)) == True{} : Bool}

# Moving a region never changes how large it is.
law area_move_keeps_extent:
  for +full: Nat
  for +area: Area.Area
  for +way: Area.Way
  for +by: Nat
  {Area.extent(Area.move(full, area, way, by)) == Area.extent(area) : Area.Point}

# Resizing a region never changes where it starts.
law area_resize_keeps_corner:
  for +full: Nat
  for +least: Nat
  for +area: Area.Area
  for +way: Area.Way
  for +by: Nat
  {Area.corner(Area.resize(full, least, area, way, by)) == Area.corner(area) : Area.Point}

# A move of a storable region is never refused: it goes as far as the page
# allows, and that is what `move` returns.
law area_move_goes:
  for +full: Nat
  for +area: Area.Area
  for +way: Area.Way
  for +by: Nat
  for kept: {Area.valid(full, area) == True{} : Bool}
  {Area.move(full, area, way, by) == Area.moved(full, area, way, by) : Area.Area}

# A resize of a storable region is never refused either, for a least size of
# at least one unit: it stops at the page's edge or at the least size.
law area_resize_goes:
  for +full: Nat
  for +least: Nat
  for +area: Area.Area
  for +way: Area.Way
  for +by: Nat
  for kept: {Area.valid(full, area) == True{} : Bool}
  {Area.resize(full, 1n+least, area, way, by) == Area.resized(full, 1n+least, area, way, by) : Area.Area}

# ── Lines drawn by hand ─────────────────────────────────────────────────────
# No point of a line is ever off the page, and holding a point on the page
# moves nothing that was on it already.
law stroke_held_on_page:
  for +wide: Nat
  for +tall: Nat
  for +point: Stroke.Point
  {Stroke.on_page(wide, tall, Stroke.held(wide, tall, point)) == True{} : Bool}

law stroke_held_keeps:
  for +wide: Nat
  for +tall: Nat
  for +point: Stroke.Point
  for +on: {Stroke.on_page(wide, tall, point) == True{} : Bool}
  {Stroke.held(wide, tall, point) == point : Stroke.Point}

# Thinning a line only leaves points out: what is kept are the hand's own
# points, in the hand's order, none moved and none added.
law stroke_thin_leaves_out:
  for +least: Nat
  for +points: List<&2, Stroke.Point>
  {Stroke.left_out(points, Stroke.thin(least, points)) == True{} : Bool}

# A thinned line still starts at the very point the hand started at,
law stroke_thin_starts:
  for +least: Nat
  for +first: Stroke.Point
  for +rest: List<&2, Stroke.Point>
  for +other: Stroke.Point
  {Stroke.start(Stroke.thin(least, Con{first, rest}), other) == first : Stroke.Point}

# and ends where the hand ended.
law stroke_thin_ends:
  for +least: Nat
  for +first: Stroke.Point
  for +rest: List<&2, Stroke.Point>
  for +other: Stroke.Point
  {Stroke.same(Stroke.end(Stroke.thin(least, Con{first, rest}), other), Stroke.end(Con{first, rest}, other)) == True{} : Bool}

# What the reader runs on a line of any length gives exactly this thinning.
law stroke_thin_fast_same:
  for +least: Nat
  for +points: List<&2, Stroke.Point>
  {Stroke.thin_fast(least, points) == Stroke.thin(least, points) : List<&2, Stroke.Point>}

# The box around a line holds every one of its points.
law stroke_box_holds:
  for +first: Stroke.Point
  for +rest: List<&2, Stroke.Point>
  {Stroke.holds_all(Stroke.box(first, rest), Con{first, rest}) == True{} : Bool}

# ── How far through a book ──────────────────────────────────────────────────
# The place found for a character is the place of exactly that character: as
# many characters come before it as were asked for, or the whole book when
# more were asked for than it has. So a share of the book turned into a place
# shows as that share again.
law book_place_exact:
  for +lengths: List<&2, Nat>
  for +at: Nat
  {Book.before(lengths, Book.place(lengths, at)) == Nat.min(at, Book.total(lengths)) : Nat}

# And it is a place the book has: one of its chapters, no further in than
# that chapter is long.
law book_place_real:
  for +length: Nat
  for +rest: List<&2, Nat>
  for +at: Nat
  {Book.real(Con{length, rest}, Book.place(Con{length, rest}, at)) == True{} : Bool}

# ── The video note's duplicate check ────────────────────────────────────────
# A video note is checked in one pass, with a set of the IDs seen. That gives
# what comparing every ID with every later one gives, for every list of parts.
law video_errors_pairwise:
  for +parts: List<&2, VideoDocument.Part>
  {VideoDocument.errors(parts) == VideoDocument.errors_pairwise(parts) : Bool}
