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
import ./evidence.bend as Evidence
import ./crud.bend as Crud
import ./text.bend as Text
import ./document.bend as Document
import ./storage.bend as Store
import ./block.bend as Block
import Base
import ./codec.bend as Codec
import ./LAWS.bend as Laws

def Laws.line_roundtrip(text):
  {==}

def Laws.lines_roundtrip(lines):
  match lines:
    case Nil{}:
      {==}
    case Con{line, rest}:
      %Laws.lines_roundtrip(rest) : {Codec.prepend_result(Some{line}, Codec.unquote_lines(Codec.quote_lines(rest))) == Codec.prepend_result(Some{line}, _) : Maybe<&2, List<&2, String>>}
      {==}


def Laws.append_nil(xs):
  match xs:
    case Nil{}:
      {==}
    case Con{h, t}:
      %Laws.append_nil(t) : {Con{h, Block.append(t, Nil{})} == Con{h, _} : List<&2, String>}
      {==}

def Laws.append_assoc(xs, ys, zs):
  match xs:
    case Nil{}:
      {==}
    case Con{h, t}:
      %Laws.append_assoc(t, ys, zs) : {Con{h, Block.append(Block.append(t, ys), zs)} == Con{h, _} : List<&2, String>}
      {==}

def Laws.reverse_append(xs, ys):
  match xs:
    case Nil{}:
      Equal.sym(List<&2, String>, Block.append(Block.reverse(ys), Nil{}), Block.reverse(ys), Laws.append_nil(Block.reverse(ys)))
    case Con{h, t}:
      Equal.trans(List<&2, String>, Block.append(Block.reverse(Block.append(t, ys)), [h]), Block.append(Block.append(Block.reverse(ys), Block.reverse(t)), [h]), Block.append(Block.reverse(ys), Block.append(Block.reverse(t), [h])), Equal.cong(List<&2, String>, List<&2, String>, x => Block.append(x, [h]), Block.reverse(Block.append(t, ys)), Block.append(Block.reverse(ys), Block.reverse(t)), Laws.reverse_append(t, ys)), Laws.append_assoc(Block.reverse(ys), Block.reverse(t), [h]))

def Laws.reverse_reverse(xs):
  match xs:
    case Nil{}:
      {==}
    case Con{h, t}:
      Equal.trans(List<&2, String>, Block.reverse(Block.append(Block.reverse(t), [h])), Con{h, Block.reverse(Block.reverse(t))}, Con{h, t}, Laws.reverse_append(Block.reverse(t), [h]), Equal.cong(List<&2, String>, List<&2, String>, x => Con{h, x}, Block.reverse(Block.reverse(t)), t, Laws.reverse_reverse(t)))

def Laws.body_roundtrip(block):
  match block:
    case Block.Block{json, display, link, comment, tags}:
      Equal.trans(Maybe<&2, Block.Block>, Block.decode_body(Block.encode_body(Block.Block{json, display, link, comment, tags})), Some{Block.Block{json, display, link, Block.reverse(Block.reverse(comment)), tags}}, Some{Block.Block{json, display, link, comment, tags}}, Equal.cong(List<&2, String>, Maybe<&2, Block.Block>, x => Block.read_suffix(json, display, link, x), Block.reverse(Block.reverse(Con{tags, Con{"%%TAGS%%", Block.reverse(comment)}})), Con{tags, Con{"%%TAGS%%", Block.reverse(comment)}}, Laws.reverse_reverse(Con{tags, Con{"%%TAGS%%", Block.reverse(comment)}})), Equal.cong(List<&2, String>, Maybe<&2, Block.Block>, x => Some{Block.Block{json, display, link, x, tags}}, Block.reverse(Block.reverse(comment)), comment, Laws.reverse_reverse(comment)))

def Laws.block_roundtrip(block):
  Equal.trans(Maybe<&2, Block.Block>, Block.decode(Block.encode(block)), Block.decode_body(Block.encode_body(block)), Some{block}, Equal.cong(Maybe<&2, List<&2, String>>, Maybe<&2, Block.Block>, x => Block.decode_unquoted(x), Codec.unquote_lines(Codec.quote_lines(Block.encode_body(block))), Some{Block.encode_body(block)}, Laws.lines_roundtrip(Block.encode_body(block))), Laws.body_roundtrip(block))

def Laws.replace_preserves_outline(segment, lines):
  match segment:
    case Store.Raw{text}:
      {==}
    case Store.Annotation{id, old}:
      {==}

def Laws.replace_last_write(segment, first, last):
  match segment:
    case Store.Raw{text}:
      {==}
    case Store.Annotation{id, old}:
      {==}

def Laws.edit_preserves_outline(segments, index, lines):
  match segments index:
    case Nil{} _:
      {==}
    case Con{h, t} 0n:
      Equal.cong(Store.Outline, List<&2, Store.Outline>, x => Con{x, Store.outline(t)}, Store.outline_segment(Store.replace(h, lines)), Store.outline_segment(h), Laws.replace_preserves_outline(h, lines))
    case Con{h, t} 1n+p:
      Equal.cong(List<&2, Store.Outline>, List<&2, Store.Outline>, x => Con{Store.outline_segment(h), x}, Store.outline(Store.edit_at(t, p, lines)), Store.outline(t), Laws.edit_preserves_outline(t, p, lines))

def Laws.edit_last_write(segments, index, first, last):
  match segments index:
    case Nil{} _:
      {==}
    case Con{h, t} 0n:
      Equal.cong(Store.Segment, List<&2, Store.Segment>, x => Con{x, t}, Store.replace(Store.replace(h, first), last), Store.replace(h, last), Laws.replace_last_write(h, first, last))
    case Con{h, t} 1n+p:
      Equal.cong(List<&2, Store.Segment>, List<&2, Store.Segment>, x => Con{h, x}, Store.edit_at(Store.edit_at(t, p, first), p, last), Store.edit_at(t, p, last), Laws.edit_last_write(t, p, first, last))

def Laws.edit_preserves_others(segments, index, lines):
  Laws.edit_last_write(segments, index, lines, Nil{})

def Laws.edit_focus(before, id, old, after, replacement):
  match before:
    case Nil{}:
      {==}
    case Con{h, t}:
      Equal.cong(List<&2, Store.Segment>, List<&2, Store.Segment>, x => Con{h, x}, Store.edit_at(Store.append_segments(t, Con{Store.Annotation{id, old}, after}), Store.length(t), replacement), Store.append_segments(t, Con{Store.Annotation{id, replacement}, after}), Laws.edit_focus(t, id, old, after, replacement))

def Laws.decoded_result_roundtrip(result):
  match result:
    case None{}:
      {==}
    case Some{block}:
      Laws.block_roundtrip(block)

def Laws.decode_encode_decode(lines):
  Laws.decoded_result_roundtrip(Block.decode(lines))

def Laws.encode_decode_encode(block):
  Equal.cong(Maybe<&2, Block.Block>, Maybe<&2, List<&2, String>>, x => Block.reencode(x), Block.decode(Block.encode(block)), Some{block}, Laws.block_roundtrip(block))

def Laws.document_push_preserves_source(lines, char, newline):
  match lines newline:
    case Nil{} False{}:
      {==}
    case Nil{} True{}:
      {==}
    case Con{Document.Line{body, ending}, rest} False{}:
      {==}
    case Con{Document.Line{body, ending}, rest} True{}:
      {==}


def Laws.text_append_nil(xs):
  match xs:
    case SNil{}:
      {==}
    case SCon{h, t}:
      Equal.cong(String, String, x => SCon{h, x}, String.append(t, SNil{}), t, Laws.text_append_nil(t))

def Laws.text_append_assoc(xs, ys, zs):
  match xs:
    case SNil{}:
      {==}
    case SCon{h, t}:
      Equal.cong(String, String, x => SCon{h, x}, String.append(String.append(t, ys), zs), String.append(t, String.append(ys, zs)), Laws.text_append_assoc(t, ys, zs))

def Laws.text_reverse_append(xs, ys):
  match xs:
    case SNil{}:
      Equal.sym(String, String.append(Text.reverse(ys), SNil{}), Text.reverse(ys), Laws.text_append_nil(Text.reverse(ys)))
    case SCon{h, t}:
      Equal.trans(String, String.append(Text.reverse(String.append(t, ys)), SCon{h, SNil{}}), String.append(String.append(Text.reverse(ys), Text.reverse(t)), SCon{h, SNil{}}), String.append(Text.reverse(ys), String.append(Text.reverse(t), SCon{h, SNil{}})), Equal.cong(String, String, x => String.append(x, SCon{h, SNil{}}), Text.reverse(String.append(t, ys)), String.append(Text.reverse(ys), Text.reverse(t)), Laws.text_reverse_append(t, ys)), Laws.text_append_assoc(Text.reverse(ys), Text.reverse(t), SCon{h, SNil{}}))

def Laws.text_reverse_reverse(xs):
  match xs:
    case SNil{}:
      {==}
    case SCon{h, t}:
      Equal.trans(String, Text.reverse(String.append(Text.reverse(t), SCon{h, SNil{}})), SCon{h, Text.reverse(Text.reverse(t))}, SCon{h, t}, Laws.text_reverse_append(Text.reverse(t), SCon{h, SNil{}}), Equal.cong(String, String, x => SCon{h, x}, Text.reverse(Text.reverse(t)), t, Laws.text_reverse_reverse(t)))

def Laws.text_reverse_go(source, acc):
  match source:
    case SNil{}:
      {==}
    case SCon{h, t}:
      Equal.trans(String, String.reverse.go(t, SCon{h, acc}), String.append(Text.reverse(t), SCon{h, acc}), String.append(String.append(Text.reverse(t), SCon{h, SNil{}}), acc), Laws.text_reverse_go(t, SCon{h, acc}), Equal.sym(String, String.append(String.append(Text.reverse(t), SCon{h, SNil{}}), acc), String.append(Text.reverse(t), SCon{h, acc}), Laws.text_append_assoc(Text.reverse(t), SCon{h, SNil{}}, acc)))

def Laws.text_base_reverse(source):
  Equal.trans(String, String.reverse(source), String.append(Text.reverse(source), SNil{}), Text.reverse(source), Laws.text_reverse_go(source, SNil{}), Laws.text_append_nil(Text.reverse(source)))

def Laws.text_base_reverse_reverse(source):
  Equal.trans(String, String.reverse(String.reverse(source)), Text.reverse(String.reverse(source)), source, Laws.text_base_reverse(String.reverse(source)), Equal.trans(String, Text.reverse(String.reverse(source)), Text.reverse(Text.reverse(source)), source, Equal.cong(String, String, x => Text.reverse(x), String.reverse(source), Text.reverse(source), Laws.text_base_reverse(source)), Laws.text_reverse_reverse(source)))

def Laws.document_go_preserves_source(source, lines):
  match source:
    case SNil{}:
      {==}
    case SCon{char, rest}:
      Equal.trans(String, Document.encode(Document.decode_go(rest, Document.push(lines, char, Char.is_eq(char, '\n')))), String.reverse.go(rest, Document.encode(Document.push(lines, char, Char.is_eq(char, '\n')))), String.reverse.go(rest, SCon{char, Document.encode(lines)}), Laws.document_go_preserves_source(rest, Document.push(lines, char, Char.is_eq(char, '\n'))), Equal.cong(String, String, x => String.reverse.go(rest, x), Document.encode(Document.push(lines, char, Char.is_eq(char, '\n'))), SCon{char, Document.encode(lines)}, Laws.document_push_preserves_source(lines, char, Char.is_eq(char, '\n'))))

# ── The forward line decoder ────────────────────────────────────────────────
# What `decode_exact` computes, as a plain fold from the right: each character
# pushed onto the lines of the text after it.
def decode_onto(source: String, lines: List<&2, Document.Line>) -> List<&2, Document.Line>:
  match source:
    case SNil{}:
      lines
    case SCon{+char, rest}:
      Document.push(decode_onto(rest, lines), char, Char.is_eq(char, '\n'))

def decode_go_onto(+source: String, +acc: String, +lines: List<&2, Document.Line>) -> {Document.decode_go(String.reverse.go(source, acc), lines) == Document.decode_go(acc, decode_onto(source, lines)) : List<&2, Document.Line>}:
  match source:
    case SNil{}:
      {==}
    case SCon{char, rest}:
      decode_go_onto(rest, SCon{char, acc}, lines)

# The characters of an unfinished line, pushed onto the first of `lines`.
def decode_attach(body: String, lines: List<&2, Document.Line>) -> List<&2, Document.Line>:
  match body:
    case SNil{}:
      lines
    case SCon{char, rest}:
      Document.push(decode_attach(rest, lines), char, False{})

def decode_attach_last(+tail: String, +head: Char) -> {decode_attach(SCon{head, tail}, Nil{}) == [Document.Line{SCon{head, tail}, None{}}] : List<&2, Document.Line>}:
  match tail:
    case SNil{}:
      {==}
    case SCon{next, rest}:
      %decode_attach_last(rest, next) : {Document.push(decode_attach(SCon{next, rest}, Nil{}), head, False{}) == Document.push(_, head, False{}) : List<&2, Document.Line>}
      {==}

def decode_push_break(lines: List<&2, Document.Line>, -char: Char) -> {Document.push(lines, char, True{}) == Con{Document.Line{SNil{}, Some{char}}, lines} : List<&2, Document.Line>}:
  match lines:
    case Nil{}:
      {==}
    case Con{Document.Line{body, ending}, rest}:
      {==}

def decode_attach_line(+body: String, -ending: Maybe<&2, Char>, -lines: List<&2, Document.Line>) -> {decode_attach(body, Con{Document.Line{SNil{}, ending}, lines}) == Con{Document.Line{body, ending}, lines} : List<&2, Document.Line>}:
  match body:
    case SNil{}:
      {==}
    case SCon{char, rest}:
      %decode_attach_line(rest, ending, lines) : {Document.push(decode_attach(rest, Con{Document.Line{SNil{}, ending}, lines}), char, False{}) == Document.push(_, char, False{}) : List<&2, Document.Line>}
      {==}

def decode_attach_snoc(+body: String, -char: Char, -lines: List<&2, Document.Line>) -> {decode_attach(String.append(body, SCon{char, SNil{}}), lines) == decode_attach(body, Document.push(lines, char, False{})) : List<&2, Document.Line>}:
  match body:
    case SNil{}:
      {==}
    case SCon{head, rest}:
      %decode_attach_snoc(rest, char, lines) : {Document.push(decode_attach(String.append(rest, SCon{char, SNil{}}), lines), head, False{}) == Document.push(_, head, False{}) : List<&2, Document.Line>}
      {==}

def decode_lines_step(newline: Bool, +char: Char, +rest: String, +body: String, -reversed: List<&2, Document.Line>, broken: {Document.lines_go(rest, SNil{}, Con{Document.Line{body, Some{char}}, reversed}, Document.head_newline(rest)) == List.reverse.go(&2, Document.Line, reversed, Con{Document.Line{body, Some{char}}, decode_onto(rest, Nil{})}) : List<&2, Document.Line>}, joined: {Document.lines_go(rest, String.append(body, SCon{char, SNil{}}), reversed, Document.head_newline(rest)) == List.reverse.go(&2, Document.Line, reversed, decode_attach(String.append(body, SCon{char, SNil{}}), decode_onto(rest, Nil{}))) : List<&2, Document.Line>}) -> {Document.lines_go(SCon{char, rest}, body, reversed, newline) == List.reverse.go(&2, Document.Line, reversed, decode_attach(body, Document.push(decode_onto(rest, Nil{}), char, newline))) : List<&2, Document.Line>}:
  match newline:
    case True{}:
      %Equal.sym(List<&2, Document.Line>, Document.push(decode_onto(rest, Nil{}), char, True{}), Con{Document.Line{SNil{}, Some{char}}, decode_onto(rest, Nil{})}, decode_push_break(decode_onto(rest, Nil{}), char)) : {Document.lines_go(rest, SNil{}, Con{Document.Line{body, Some{char}}, reversed}, Document.head_newline(rest)) == List.reverse.go(&2, Document.Line, reversed, decode_attach(body, _)) : List<&2, Document.Line>}
      %Equal.sym(List<&2, Document.Line>, decode_attach(body, Con{Document.Line{SNil{}, Some{char}}, decode_onto(rest, Nil{})}), Con{Document.Line{body, Some{char}}, decode_onto(rest, Nil{})}, decode_attach_line(body, Some{char}, decode_onto(rest, Nil{}))) : {Document.lines_go(rest, SNil{}, Con{Document.Line{body, Some{char}}, reversed}, Document.head_newline(rest)) == List.reverse.go(&2, Document.Line, reversed, _) : List<&2, Document.Line>}
      broken
    case False{}:
      %decode_attach_snoc(body, char, decode_onto(rest, Nil{})) : {Document.lines_go(rest, String.append(body, SCon{char, SNil{}}), reversed, Document.head_newline(rest)) == List.reverse.go(&2, Document.Line, reversed, _) : List<&2, Document.Line>}
      joined

def decode_lines_onto(+source: String, +body: String, +reversed: List<&2, Document.Line>) -> {Document.lines_go(source, body, reversed, Document.head_newline(source)) == List.reverse.go(&2, Document.Line, reversed, decode_attach(body, decode_onto(source, Nil{}))) : List<&2, Document.Line>}:
  match source body:
    case SNil{} SNil{}:
      {==}
    case SNil{} SCon{head, tail}:
      %decode_attach_last(tail, head) : {List.reverse.go(&2, Document.Line, reversed, _) == List.reverse.go(&2, Document.Line, reversed, decode_attach(SCon{head, tail}, Nil{})) : List<&2, Document.Line>}
      {==}
    case SCon{char, rest} text:
      decode_lines_step(Char.is_eq(char, '\n'), char, rest, text, reversed, decode_lines_onto(rest, SNil{}, Con{Document.Line{text, Some{char}}, reversed}), decode_lines_onto(rest, String.append(text, SCon{char, SNil{}}), reversed))

def decode_agrees(+source: String) -> {Document.decode(source) == Document.decode_exact(source) : List<&2, Document.Line>}:
  Equal.trans(List<&2, Document.Line>, Document.decode(source), decode_onto(source, Nil{}), Document.decode_exact(source), decode_lines_onto(source, SNil{}, Nil{}), Equal.sym(List<&2, Document.Line>, Document.decode_exact(source), decode_onto(source, Nil{}), decode_go_onto(source, SNil{}, Nil{})))

def Laws.document_decode_exact(source):
  decode_agrees(source)

def Laws.document_encode_decode(source):
  %Equal.sym(List<&2, Document.Line>, Document.decode(source), Document.decode_exact(source), decode_agrees(source)) : {Document.encode(_) == source : String}
  Equal.trans(String, Document.encode(Document.decode_exact(source)), String.reverse(String.reverse(source)), source, Laws.document_go_preserves_source(String.reverse(source), Nil{}), Laws.text_base_reverse_reverse(source))

def Laws.document_decode_encode_decode(source):
  Equal.cong(String, List<&2, Document.Line>, x => Document.decode(x), Document.encode(Document.decode(source)), source, Laws.document_encode_decode(source))

def Laws.document_encode_decode_encode(lines):
  Laws.document_encode_decode(Document.encode(lines))

def Laws.crud_undo_shift(head, document, receipt):
  match receipt:
    case Crud.Created{index}:
      {==}
    case Crud.Updated{index, original}:
      {==}
    case Crud.Deleted{index, original}:
      {==}
    case Crud.Unchanged{}:
      {==}

def Laws.crud_rollback_lift(head, outcome):
  match outcome:
    case Crud.Rejected{document, error}:
      {==}
    case Crud.Applied{document, receipt, observed}:
      Laws.crud_undo_shift(head, document, receipt)

def Laws.crud_rollback_head(head, tail, command):
  match head command:
    case Store.Raw{text} Crud.Create{id, lines}:
      {==}
    case Store.Raw{text} Crud.Read{}:
      {==}
    case Store.Raw{text} Crud.Update{lines}:
      {==}
    case Store.Raw{text} Crud.Delete{}:
      {==}
    case Store.Annotation{id, old} Crud.Create{newid, lines}:
      {==}
    case Store.Annotation{id, old} Crud.Read{}:
      {==}
    case Store.Annotation{id, old} Crud.Update{lines}:
      {==}
    case Store.Annotation{id, old} Crud.Delete{}:
      {==}

def Laws.crud_rollback_end(command):
  match command:
    case Crud.Create{id, lines}:
      {==}
    case Crud.Read{}:
      {==}
    case Crud.Update{lines}:
      {==}
    case Crud.Delete{}:
      {==}

def Laws.crud_inverse(document, index, command):
  match document index:
    case Nil{} 0n:
      Laws.crud_rollback_end(command)
    case Nil{} 1n+p:
      {==}
    case Con{h, t} 0n:
      Laws.crud_rollback_head(h, t, command)
    case Con{h, t} 1n+p:
      Equal.trans(List<&2, Store.Segment>, Crud.rollback(Crud.lift(h, Crud.apply(t, p, command))), Con{h, Crud.rollback(Crud.apply(t, p, command))}, Con{h, t}, Laws.crud_rollback_lift(h, Crud.apply(t, p, command)), Equal.cong(List<&2, Store.Segment>, List<&2, Store.Segment>, x => Con{h, x}, Crud.rollback(Crud.apply(t, p, command)), t, Laws.crud_inverse(t, p, command)))

def Laws.crud_create_focus(before, after, id, lines):
  match before:
    case Nil{}:
      match after:
        case Nil{}:
          {==}
        case Con{Store.Raw{text}, rest}:
          {==}
        case Con{Store.Annotation{oldid, old}, rest}:
          {==}
    case Con{h, t}:
      Equal.cong(Crud.Outcome, Crud.Outcome, x => Crud.lift(h, x), Crud.apply(Store.append_segments(t, after), Store.length(t), Crud.Create{id, lines}), Crud.Applied{Store.append_segments(t, Con{Store.Annotation{id, lines}, after}), Crud.Created{Store.length(t)}, None{}}, Laws.crud_create_focus(t, after, id, lines))

def Laws.crud_read_focus(before, after, id, lines):
  match before:
    case Nil{}:
      {==}
    case Con{h, t}:
      Equal.cong(Crud.Outcome, Crud.Outcome, x => Crud.lift(h, x), Crud.apply(Store.append_segments(t, Con{Store.Annotation{id, lines}, after}), Store.length(t), Crud.Read{}), Crud.Applied{Store.append_segments(t, Con{Store.Annotation{id, lines}, after}), Crud.Unchanged{}, Some{Store.Annotation{id, lines}}}, Laws.crud_read_focus(t, after, id, lines))

def Laws.crud_update_focus(before, after, id, old, replacement):
  match before:
    case Nil{}:
      {==}
    case Con{h, t}:
      Equal.cong(Crud.Outcome, Crud.Outcome, x => Crud.lift(h, x), Crud.apply(Store.append_segments(t, Con{Store.Annotation{id, old}, after}), Store.length(t), Crud.Update{replacement}), Crud.Applied{Store.append_segments(t, Con{Store.Annotation{id, replacement}, after}), Crud.Updated{Store.length(t), Store.Annotation{id, old}}, Some{Store.Annotation{id, old}}}, Laws.crud_update_focus(t, after, id, old, replacement))

def Laws.crud_delete_focus(before, after, id, old):
  match before:
    case Nil{}:
      {==}
    case Con{h, t}:
      Equal.cong(Crud.Outcome, Crud.Outcome, x => Crud.lift(h, x), Crud.apply(Store.append_segments(t, Con{Store.Annotation{id, old}, after}), Store.length(t), Crud.Delete{}), Crud.Applied{Store.append_segments(t, after), Crud.Deleted{Store.length(t), Store.Annotation{id, old}}, None{}}, Laws.crud_delete_focus(t, after, id, old))

def Laws.crud_receipt_rollback(outcome):
  match outcome:
    case Crud.Rejected{document, error}:
      {==}
    case Crud.Applied{document, receipt, observed}:
      {==}

def Laws.crud_history_inverse(requests, initial):
  match requests:
    case Nil{}:
      {==}
    case Con{Crud.Request{index, command}, rest}:
      Equal.trans(List<&2, Store.Segment>, Crud.rollback_frame(Crud.get_receipt(Crud.apply(initial, index, command)), Crud.rollback_history(Crud.run(rest, Crud.document(Crud.apply(initial, index, command))))), Crud.rollback_frame(Crud.get_receipt(Crud.apply(initial, index, command)), Crud.document(Crud.apply(initial, index, command))), initial, Equal.cong(List<&2, Store.Segment>, List<&2, Store.Segment>, x => Crud.rollback_frame(Crud.get_receipt(Crud.apply(initial, index, command)), x), Crud.rollback_history(Crud.run(rest, Crud.document(Crud.apply(initial, index, command)))), Crud.document(Crud.apply(initial, index, command)), Laws.crud_history_inverse(rest, Crud.document(Crud.apply(initial, index, command)))), Equal.trans(List<&2, Store.Segment>, Crud.rollback_frame(Crud.get_receipt(Crud.apply(initial, index, command)), Crud.document(Crud.apply(initial, index, command))), Crud.rollback(Crud.apply(initial, index, command)), initial, Laws.crud_receipt_rollback(Crud.apply(initial, index, command)), Laws.crud_inverse(initial, index, command)))

def Laws.crud_document_roundtrip(document, index, command):
  Laws.document_encode_decode(Crud.render(Crud.document(Crud.apply(document, index, command))))

def Laws.crud_history_document_roundtrip(requests, initial):
  Laws.document_encode_decode(Crud.render(Crud.final(Crud.run(requests, initial))))

def Laws.crud_history_original_text(requests, initial):
  Equal.cong(List<&2, Store.Segment>, String, x => Crud.render(x), Crud.rollback_history(Crud.run(requests, initial)), initial, Laws.crud_history_inverse(requests, initial))

def Laws.crud_document_lift(head, outcome):
  match outcome:
    case Crud.Rejected{xs, error}:
      {==}
    case Crud.Applied{xs, receipt, observed}:
      {==}

def Laws.crud_read_unchanged(document, index):
  match document index:
    case Nil{} 0n:
      {==}
    case Nil{} 1n+p:
      {==}
    case Con{Store.Raw{text}, t} 0n:
      {==}
    case Con{Store.Annotation{id, lines}, t} 0n:
      {==}
    case Con{h, t} 1n+p:
      Equal.trans(List<&2, Store.Segment>, Crud.document(Crud.lift(h, Crud.apply(t, p, Crud.Read{}))), Con{h, Crud.document(Crud.apply(t, p, Crud.Read{}))}, Con{h, t}, Laws.crud_document_lift(h, Crud.apply(t, p, Crud.Read{})), Equal.cong(List<&2, Store.Segment>, List<&2, Store.Segment>, x => Con{h, x}, Crud.document(Crud.apply(t, p, Crud.Read{})), t, Laws.crud_read_unchanged(t, p)))

def Laws.crud_read_value(before, after, id, lines):
  Equal.cong(Crud.Outcome, Maybe<&2, Store.Segment>, x => Crud.observed(x), Crud.apply(Store.append_segments(before, Con{Store.Annotation{id, lines}, after}), Store.length(before), Crud.Read{}), Crud.Applied{Store.append_segments(before, Con{Store.Annotation{id, lines}, after}), Crud.Unchanged{}, Some{Store.Annotation{id, lines}}}, Laws.crud_read_focus(before, after, id, lines))

def Laws.crud_read_created(before, after, id, lines):
  Equal.trans(Maybe<&2, Store.Segment>, Crud.read_at(Crud.document(Crud.apply(Store.append_segments(before, after), Store.length(before), Crud.Create{id, lines})), Store.length(before)), Crud.read_at(Store.append_segments(before, Con{Store.Annotation{id, lines}, after}), Store.length(before)), Some{Store.Annotation{id, lines}}, Equal.cong(Crud.Outcome, Maybe<&2, Store.Segment>, x => Crud.read_at(Crud.document(x), Store.length(before)), Crud.apply(Store.append_segments(before, after), Store.length(before), Crud.Create{id, lines}), Crud.Applied{Store.append_segments(before, Con{Store.Annotation{id, lines}, after}), Crud.Created{Store.length(before)}, None{}}, Laws.crud_create_focus(before, after, id, lines)), Laws.crud_read_value(before, after, id, lines))

def Laws.crud_read_updated(before, after, id, old, replacement):
  Equal.trans(Maybe<&2, Store.Segment>, Crud.read_at(Crud.document(Crud.apply(Store.append_segments(before, Con{Store.Annotation{id, old}, after}), Store.length(before), Crud.Update{replacement})), Store.length(before)), Crud.read_at(Store.append_segments(before, Con{Store.Annotation{id, replacement}, after}), Store.length(before)), Some{Store.Annotation{id, replacement}}, Equal.cong(Crud.Outcome, Maybe<&2, Store.Segment>, x => Crud.read_at(Crud.document(x), Store.length(before)), Crud.apply(Store.append_segments(before, Con{Store.Annotation{id, old}, after}), Store.length(before), Crud.Update{replacement}), Crud.Applied{Store.append_segments(before, Con{Store.Annotation{id, replacement}, after}), Crud.Updated{Store.length(before), Store.Annotation{id, old}}, Some{Store.Annotation{id, old}}}, Laws.crud_update_focus(before, after, id, old, replacement)), Laws.crud_read_value(before, after, id, replacement))

def Laws.crud_write_read_value_unchanged(before, after, id, old):
  Equal.cong(Crud.Outcome, List<&2, Store.Segment>, x => Crud.document(x), Crud.apply(Store.append_segments(before, Con{Store.Annotation{id, old}, after}), Store.length(before), Crud.Update{old}), Crud.Applied{Store.append_segments(before, Con{Store.Annotation{id, old}, after}), Crud.Updated{Store.length(before), Store.Annotation{id, old}}, Some{Store.Annotation{id, old}}}, Laws.crud_update_focus(before, after, id, old, old))

def Laws.crud_rejected_unchanged(document, index, command, returned, error, evidence):
  Equal.trans(List<&2, Store.Segment>, returned, Crud.rollback(Crud.apply(document, index, command)), document, Equal.sym(List<&2, Store.Segment>, Crud.rollback(Crud.apply(document, index, command)), returned, Equal.cong(Crud.Outcome, List<&2, Store.Segment>, x => Crud.rollback(x), Crud.apply(document, index, command), Crud.Rejected{returned, error}, evidence)), Laws.crud_inverse(document, index, command))

def Laws.crud_create_delete(before, after, id, lines):
  Equal.trans(List<&2, Store.Segment>, Crud.document(Crud.apply(Crud.document(Crud.apply(Store.append_segments(before, after), Store.length(before), Crud.Create{id, lines})), Store.length(before), Crud.Delete{})), Crud.document(Crud.apply(Store.append_segments(before, Con{Store.Annotation{id, lines}, after}), Store.length(before), Crud.Delete{})), Store.append_segments(before, after), Equal.cong(Crud.Outcome, List<&2, Store.Segment>, x => Crud.document(Crud.apply(Crud.document(x), Store.length(before), Crud.Delete{})), Crud.apply(Store.append_segments(before, after), Store.length(before), Crud.Create{id, lines}), Crud.Applied{Store.append_segments(before, Con{Store.Annotation{id, lines}, after}), Crud.Created{Store.length(before)}, None{}}, Laws.crud_create_focus(before, after, id, lines)), Equal.cong(Crud.Outcome, List<&2, Store.Segment>, x => Crud.document(x), Crud.apply(Store.append_segments(before, Con{Store.Annotation{id, lines}, after}), Store.length(before), Crud.Delete{}), Crud.Applied{Store.append_segments(before, after), Crud.Deleted{Store.length(before), Store.Annotation{id, lines}}, None{}}, Laws.crud_delete_focus(before, after, id, lines)))

def Laws.crud_delete_recreate(before, after, id, old):
  Equal.trans(List<&2, Store.Segment>, Crud.document(Crud.apply(Crud.document(Crud.apply(Store.append_segments(before, Con{Store.Annotation{id, old}, after}), Store.length(before), Crud.Delete{})), Store.length(before), Crud.Create{id, old})), Crud.document(Crud.apply(Store.append_segments(before, after), Store.length(before), Crud.Create{id, old})), Store.append_segments(before, Con{Store.Annotation{id, old}, after}), Equal.cong(Crud.Outcome, List<&2, Store.Segment>, x => Crud.document(Crud.apply(Crud.document(x), Store.length(before), Crud.Create{id, old})), Crud.apply(Store.append_segments(before, Con{Store.Annotation{id, old}, after}), Store.length(before), Crud.Delete{}), Crud.Applied{Store.append_segments(before, after), Crud.Deleted{Store.length(before), Store.Annotation{id, old}}, None{}}, Laws.crud_delete_focus(before, after, id, old)), Equal.cong(Crud.Outcome, List<&2, Store.Segment>, x => Crud.document(x), Crud.apply(Store.append_segments(before, after), Store.length(before), Crud.Create{id, old}), Crud.Applied{Store.append_segments(before, Con{Store.Annotation{id, old}, after}), Crud.Created{Store.length(before)}, None{}}, Laws.crud_create_focus(before, after, id, old)))

def Laws.crud_update_restore(before, after, id, old, replacement):
  Equal.trans(List<&2, Store.Segment>, Crud.document(Crud.apply(Crud.document(Crud.apply(Store.append_segments(before, Con{Store.Annotation{id, old}, after}), Store.length(before), Crud.Update{replacement})), Store.length(before), Crud.Update{old})), Crud.document(Crud.apply(Store.append_segments(before, Con{Store.Annotation{id, replacement}, after}), Store.length(before), Crud.Update{old})), Store.append_segments(before, Con{Store.Annotation{id, old}, after}), Equal.cong(Crud.Outcome, List<&2, Store.Segment>, x => Crud.document(Crud.apply(Crud.document(x), Store.length(before), Crud.Update{old})), Crud.apply(Store.append_segments(before, Con{Store.Annotation{id, old}, after}), Store.length(before), Crud.Update{replacement}), Crud.Applied{Store.append_segments(before, Con{Store.Annotation{id, replacement}, after}), Crud.Updated{Store.length(before), Store.Annotation{id, old}}, Some{Store.Annotation{id, old}}}, Laws.crud_update_focus(before, after, id, old, replacement)), Equal.cong(Crud.Outcome, List<&2, Store.Segment>, x => Crud.document(x), Crud.apply(Store.append_segments(before, Con{Store.Annotation{id, replacement}, after}), Store.length(before), Crud.Update{old}), Crud.Applied{Store.append_segments(before, Con{Store.Annotation{id, old}, after}), Crud.Updated{Store.length(before), Store.Annotation{id, replacement}}, Some{Store.Annotation{id, replacement}}}, Laws.crud_update_focus(before, after, id, replacement, old)))

def Laws.boundary_run_append(prefix, tail, state):
  match prefix:
    case SNil{}:
      {==}
    case SCon{char, rest}:
      Laws.boundary_run_append(rest, tail, Boundary.step(state, char))

def Laws.boundary_suffix_ready(state):
  match state:
    case Boundary.EmptySource{}:
      {==}
    case Boundary.TextLine{}:
      {==}
    case Boundary.SpaceLine{}:
      {==}
    case Boundary.AfterText{}:
      {==}
    case Boundary.AfterBlank{}:
      {==}

def Laws.boundary_normalized_suffix_empty(source):
  Equal.trans(String, Boundary.suffix(Boundary.run(Boundary.normalize(source), Boundary.EmptySource{})), Boundary.suffix(Boundary.run(Boundary.suffix(Boundary.run(source, Boundary.EmptySource{})), Boundary.run(source, Boundary.EmptySource{}))), "", Equal.cong(Boundary.State, String, x => Boundary.suffix(x), Boundary.run(Boundary.normalize(source), Boundary.EmptySource{}), Boundary.run(Boundary.suffix(Boundary.run(source, Boundary.EmptySource{})), Boundary.run(source, Boundary.EmptySource{})), Laws.boundary_run_append(source, Boundary.suffix(Boundary.run(source, Boundary.EmptySource{})), Boundary.EmptySource{})), Laws.boundary_suffix_ready(Boundary.run(source, Boundary.EmptySource{})))

def Laws.boundary_idempotent(source):
  Equal.trans(String, Boundary.normalize(Boundary.normalize(source)), String.append(Boundary.normalize(source), ""), Boundary.normalize(source), Equal.cong(String, String, x => String.append(Boundary.normalize(source), x), Boundary.suffix(Boundary.run(Boundary.normalize(source), Boundary.EmptySource{})), "", Laws.boundary_normalized_suffix_empty(source)), Laws.text_append_nil(Boundary.normalize(source)))

# ── Equality of characters and strings ──────────────────────────────────────
# Base builds `U32` from bits, so equality of characters is provable: a
# comparison that answers EQ was given the same word twice. The clashes
# (LT == EQ, False == True) are refuted through a motive, as the guide says.
# `string_same` is what lets run-time code decide equality with `String.eq`
# and still hand the laws an equality: the bits are walked here, once.
def cmp_differs(c: Cmp) -> Type:
  match c:
    case LT{}:
      Unit
    case EQ{}:
      Empty
    case GT{}:
      Unit

def bool_differs(b: Bool) -> Type:
  match b:
    case False{}:
      Unit
    case True{}:
      Empty

def impossible(-A: Type, x: Empty) -> A:
  match x:

def lt_is_not_eq(e: {LT{} == EQ{} : Cmp}) -> Empty:
  %e : cmp_differs(_)
  Unit{}

def gt_is_not_eq(e: {GT{} == EQ{} : Cmp}) -> Empty:
  %e : cmp_differs(_)
  Unit{}

def false_is_not_true(e: {False{} == True{} : Bool}) -> Empty:
  %e : bool_differs(_)
  Unit{}

# Two words that compare EQ are the same word, bit by bit.
def word_same_fin(-p: Nat, ab: Bool, bb: Bool, -at: Word(p), -bt: Word(p), t: Cmp, same: {t == Word.cmp(p, at, bt) : Cmp}, e: {Word.cmp.fin(ab, bb, t) == EQ{} : Cmp}, ih: {Word.cmp(p, at, bt) == EQ{} : Cmp} -> {at == bt : Word(p)}) -> {WCon{ab, at} == WCon{bb, bt} : Word(1n+p)}:
  match ab bb t:
    case False{} False{} EQ{}:
      %ih(Equal.sym(Cmp, EQ{}, Word.cmp(p, at, bt), same)) : {WCon{False{}, at} == WCon{False{}, _} : Word(1n+p)}
      {==}
    case True{} True{} EQ{}:
      %ih(Equal.sym(Cmp, EQ{}, Word.cmp(p, at, bt), same)) : {WCon{True{}, at} == WCon{True{}, _} : Word(1n+p)}
      {==}
    case False{} True{} EQ{}:
      impossible({WCon{False{}, at} == WCon{True{}, bt} : Word(1n+p)}, lt_is_not_eq(e))
    case True{} False{} EQ{}:
      impossible({WCon{True{}, at} == WCon{False{}, bt} : Word(1n+p)}, gt_is_not_eq(e))
    case x y LT{}:
      impossible({WCon{x, at} == WCon{y, bt} : Word(1n+p)}, lt_is_not_eq(e))
    case x y GT{}:
      impossible({WCon{x, at} == WCon{y, bt} : Word(1n+p)}, gt_is_not_eq(e))

def word_same(+n: Nat, +a: Word(n), +b: Word(n), e: {Word.cmp(n, a, b) == EQ{} : Cmp}) -> {a == b : Word(n)}:
  match n:
    case 0n:
      match a b:
        case WNil{} WNil{}:
          {==}
    case 1n+p:
      match a b:
        case WCon{ab, at} WCon{bb, bt}:
          word_same_fin(p, ab, bb, at, bt, Word.cmp(p, at, bt), {==}, e, x => word_same(p, at, bt, x))

def cmp_is_eq(c: Cmp, e: {Cmp.is_eq(c) == True{} : Bool}) -> {c == EQ{} : Cmp}:
  match c:
    case LT{}:
      impossible({LT{} == EQ{} : Cmp}, false_is_not_true(e))
    case EQ{}:
      {==}
    case GT{}:
      impossible({GT{} == EQ{} : Cmp}, false_is_not_true(e))

def char_same(+a: Char, +b: Char, e: {Char.is_eq(a, b) == True{} : Bool}) -> {a == b : Char}:
  match a b:
    case Chr{U32{w}} Chr{U32{v}}:
      %word_same(32n, w, v, cmp_is_eq(Word.cmp(32n, w, v), e)) : {Chr{U32{w}} == Chr{U32{_}} : Char}
      {==}

# What is known about `a` against `b` once one of them equals the trie's `c`.
def char_left(+a: Char, +c: Char, +b: Char, -r: Bool, e1: {Char.is_eq(a, c) == True{} : Bool}, e2: {Char.is_eq(c, b) == r : Bool}) -> {Char.is_eq(a, b) == r : Bool}:
  %Equal.sym(Char, a, c, char_same(a, c, e1)) : {Char.is_eq(_, b) == r : Bool}
  e2

def char_right(+a: Char, +c: Char, +b: Char, -r: Bool, e1: {Char.is_eq(a, c) == r : Bool}, e2: {Char.is_eq(c, b) == True{} : Bool}) -> {Char.is_eq(a, b) == r : Bool}:
  %char_same(c, b, e2) : {Char.is_eq(a, _) == r : Bool}
  e1

# `String.eq` of two non-empty strings is equality of the heads and of the tails.
def string_eq_from(t: String, u: String, c: Cmp) -> {Cmp.is_eq(String.order.go(t, u, c)) == Bool.and(Cmp.is_eq(c), String.eq(t, u)) : Bool}:
  match t u c:
    case SNil{} SNil{} LT{}:
      {==}
    case SNil{} SNil{} EQ{}:
      {==}
    case SNil{} SNil{} GT{}:
      {==}
    case SNil{} SCon{Chr{y}, t2} LT{}:
      {==}
    case SNil{} SCon{Chr{y}, t2} EQ{}:
      {==}
    case SNil{} SCon{Chr{y}, t2} GT{}:
      {==}
    case SCon{Chr{x}, t1} SNil{} LT{}:
      {==}
    case SCon{Chr{x}, t1} SNil{} EQ{}:
      {==}
    case SCon{Chr{x}, t1} SNil{} GT{}:
      {==}
    case SCon{Chr{x}, t1} SCon{Chr{y}, t2} LT{}:
      {==}
    case SCon{Chr{x}, t1} SCon{Chr{y}, t2} EQ{}:
      {==}
    case SCon{Chr{x}, t1} SCon{Chr{y}, t2} GT{}:
      {==}

def string_eq_cons(a: Char, b: Char, +t: String, +u: String) -> {String.eq(SCon{a, t}, SCon{b, u}) == Bool.and(Char.is_eq(a, b), String.eq(t, u)) : Bool}:
  match a b:
    case Chr{+x} Chr{+y}:
      string_eq_from(t, u, U32.cmp(x, y))

def string_eq_heads(+a: Char, +b: Char, +t: String, +u: String, -r: Bool, e: {Char.is_eq(a, b) == r : Bool}) -> {String.eq(SCon{a, t}, SCon{b, u}) == Bool.and(r, String.eq(t, u)) : Bool}:
  %e : {String.eq(SCon{a, t}, SCon{b, u}) == Bool.and(_, String.eq(t, u)) : Bool}
  string_eq_cons(a, b, t, u)

# Two strings that `String.eq` calls equal are the same string.
def string_same_step(p: Bool, q: Bool, +a: Char, +b: Char, -s: String, -r: String, ep: {p == Char.is_eq(a, b) : Bool}, eq: {q == String.eq(s, r) : Bool}, e: {Bool.and(p, q) == True{} : Bool}, ih: {String.eq(s, r) == True{} : Bool} -> {s == r : String}) -> {SCon{a, s} == SCon{b, r} : String}:
  match p q:
    case True{} True{}:
      %char_same(a, b, Equal.sym(Bool, True{}, Char.is_eq(a, b), ep)) : {SCon{a, s} == SCon{_, r} : String}
      %ih(Equal.sym(Bool, True{}, String.eq(s, r), eq)) : {SCon{a, s} == SCon{a, _} : String}
      {==}
    case True{} False{}:
      impossible({SCon{a, s} == SCon{b, r} : String}, false_is_not_true(e))
    case False{} y:
      impossible({SCon{a, s} == SCon{b, r} : String}, false_is_not_true(e))

def string_same(+a: String, +b: String, e: {String.eq(a, b) == True{} : Bool}) -> {a == b : String}:
  match a b:
    case SNil{} SNil{}:
      {==}
    case SNil{} SCon{Chr{y}, r}:
      impossible({SNil{} == SCon{Chr{y}, r} : String}, false_is_not_true(e))
    case SCon{Chr{x}, s} SNil{}:
      impossible({SCon{Chr{x}, s} == SNil{} : String}, false_is_not_true(e))
    case SCon{h, s} SCon{k, r}:
      string_same_step(Char.is_eq(h, k), String.eq(s, r), h, k, s, r, {==}, {==}, Equal.trans(Bool, Bool.and(Char.is_eq(h, k), String.eq(s, r)), String.eq(SCon{h, s}, SCon{k, r}), True{}, Equal.sym(Bool, String.eq(SCon{h, s}, SCon{k, r}), Bool.and(Char.is_eq(h, k), String.eq(s, r)), string_eq_cons(h, k, s, r)), e), x => string_same(s, r, x))

def Laws.source_cycle_result_cases(source, id, result):
  match result:
    case SourceCrud.CreationRefused{message}:
      Inl{{==}}
    case SourceCrud.CreationReady{candidate, proof, stable}:
      Inr{string_same(Recognizer.output(Recognizer.delete(candidate, id)), Boundary.normalize(source), proof)}

def Laws.source_cycle_cases(source, id, body):
  Laws.source_cycle_result_cases(source, id, SourceCrud.create(source, id, body))

def Laws.source_cycle_fixed_helper(source, id, body, stable, cases):
  match cases:
    case Inl{e}:
      e
    case Inr{e}:
      Equal.trans(String, SourceCrud.cycle(source, id, body), Boundary.normalize(source), source, e, stable)

def Laws.source_cycle_normalized_fixed(source, id, body):
  Laws.source_cycle_fixed_helper(Boundary.normalize(source), id, body, Laws.boundary_idempotent(source), Laws.source_cycle_cases(Boundary.normalize(source), id, body))

def Laws.source_cycle_idempotent_helper(source, id, body, cases):
  match cases:
    case Inl{e}:
      Equal.cong(String, String, x => SourceCrud.cycle(x, id, body), SourceCrud.cycle(source, id, body), source, e)
    case Inr{+e}:
      Equal.trans(String, SourceCrud.cycle(SourceCrud.cycle(source, id, body), id, body), SourceCrud.cycle(Boundary.normalize(source), id, body), SourceCrud.cycle(source, id, body), Equal.cong(String, String, x => SourceCrud.cycle(x, id, body), SourceCrud.cycle(source, id, body), Boundary.normalize(source), e), Equal.trans(String, SourceCrud.cycle(Boundary.normalize(source), id, body), Boundary.normalize(source), SourceCrud.cycle(source, id, body), Laws.source_cycle_normalized_fixed(source, id, body), Equal.sym(String, SourceCrud.cycle(source, id, body), Boundary.normalize(source), e)))

def Laws.source_cycle_idempotent(source, id, body):
  Laws.source_cycle_idempotent_helper(source, id, body, Laws.source_cycle_cases(source, id, body))

def Laws.source_creation_accepts_example():
  {==}

def Laws.boundary_suffix_bounded(state):
  match state:
    case Boundary.EmptySource{}:
      {==}
    case Boundary.TextLine{}:
      {==}
    case Boundary.SpaceLine{}:
      {==}
    case Boundary.AfterText{}:
      {==}
    case Boundary.AfterBlank{}:
      {==}

def Laws.boundary_preserves_prefix(source):
  (Boundary.suffix(Boundary.run(source, Boundary.EmptySource{})), {==})

def Laws.annotation_update_path_ignored(fields, pathA, pathB, fresh):
  {==}

def Laws.annotation_create_update_same_body(fields, path, fresh):
  {==}

def Laws.annotation_write_normalization_last_id(fields, first, last):
  match fields:
    case Annotation.AnnotationFields{Annotation.Identity{oldid, group, user, perms, info}, data, doc, audit, Annotation.Visibility{hidden, flagged, mod}, links, extra}:
      {==}

def Laws.annotation_write_clears_flag(fields, id):
  match fields:
    case Annotation.AnnotationFields{Annotation.Identity{oldid, group, user, perms, info}, data, doc, audit, Annotation.Visibility{hidden, flagged, mod}, links, extra}:
      {==}

def Laws.annotation_write_preserves_content(fields, id):
  match fields:
    case Annotation.AnnotationFields{Annotation.Identity{oldid, group, user, perms, info}, data, doc, audit, Annotation.Visibility{hidden, flagged, mod}, links, extra}:
      {==}

def Laws.annotation_write_preserves_document(fields, id):
  match fields:
    case Annotation.AnnotationFields{Annotation.Identity{oldid, group, user, perms, info}, data, doc, audit, Annotation.Visibility{hidden, flagged, mod}, links, extra}:
      {==}

def Laws.annotation_write_preserves_extensions(fields, id):
  match fields:
    case Annotation.AnnotationFields{Annotation.Identity{oldid, group, user, perms, info}, data, doc, audit, Annotation.Visibility{hidden, flagged, mod}, links, extra}:
      {==}

def Laws.annotation_stored_identity_omitted(fields):
  match fields:
    case Annotation.AnnotationFields{ident, Annotation.Content{text, tags, targets, refs}, doc, audit, Annotation.Visibility{hidden, flagged, mod}, links, extra}:
      {==}

def Laws.annotation_store_preserves_extensions(fields):
  match fields:
    case Annotation.AnnotationFields{ident, Annotation.Content{text, tags, targets, refs}, doc, audit, Annotation.Visibility{hidden, flagged, mod}, links, extra}:
      {==}

def Laws.annotation_strip_text_default(value):
  match value:
    case Annotation.AbsentField{}:
      {==}
    case Annotation.PresentField{SNil{}}:
      {==}
    case Annotation.PresentField{SCon{h, t}}:
      {==}

def Laws.annotation_strip_list_default(A, value):
  match value:
    case Annotation.AbsentField{}:
      {==}
    case Annotation.PresentField{Nil{}}:
      {==}
    case Annotation.PresentField{Con{h, t}}:
      {==}

def Laws.annotation_strip_false_default(value):
  match value:
    case Annotation.AbsentField{}:
      {==}
    case Annotation.PresentField{False{}}:
      {==}
    case Annotation.PresentField{True{}}:
      {==}

def Laws.annotation_overlay_idempotent(A, visible, original):
  match visible:
    case Annotation.AbsentField{}:
      {==}
    case Annotation.PresentField{value}:
      {==}

def Laws.annotation_quote_exact_preserved(selector, visible):
  match selector:
    case Annotation.QuoteSelector{exact, prefix, suffix, extra}:
      match visible:
        case Annotation.VisibleQuote{pre, post}:
          {==}
    case Annotation.PositionSelector{start, end, extra}:
      {==}
    case Annotation.DomRangeSelector{sc, so, ec, eo, extra}:
      {==}
    case Annotation.ExtensionSelector{kind, members}:
      {==}

def Laws.annotation_quote_overlay_idempotent(selector, visible):
  match selector:
    case Annotation.QuoteSelector{exact, prefix, suffix, extra}:
      match visible:
        case Annotation.VisibleQuote{pre, post}:
          Equal.trans(Annotation.Selector, Annotation.QuoteSelector{exact, AnnotationContract.prefer(String, pre, AnnotationContract.prefer(String, pre, prefix)), AnnotationContract.prefer(String, post, AnnotationContract.prefer(String, post, suffix)), extra}, Annotation.QuoteSelector{exact, AnnotationContract.prefer(String, pre, prefix), AnnotationContract.prefer(String, post, AnnotationContract.prefer(String, post, suffix)), extra}, Annotation.QuoteSelector{exact, AnnotationContract.prefer(String, pre, prefix), AnnotationContract.prefer(String, post, suffix), extra}, Equal.cong(Annotation.Field<String>, Annotation.Selector, x => Annotation.QuoteSelector{exact, x, AnnotationContract.prefer(String, post, AnnotationContract.prefer(String, post, suffix)), extra}, AnnotationContract.prefer(String, pre, AnnotationContract.prefer(String, pre, prefix)), AnnotationContract.prefer(String, pre, prefix), Laws.annotation_overlay_idempotent(String, pre, prefix)), Equal.cong(Annotation.Field<String>, Annotation.Selector, x => Annotation.QuoteSelector{exact, AnnotationContract.prefer(String, pre, prefix), x, extra}, AnnotationContract.prefer(String, post, AnnotationContract.prefer(String, post, suffix)), AnnotationContract.prefer(String, post, suffix), Laws.annotation_overlay_idempotent(String, post, suffix)))
    case Annotation.PositionSelector{start, end, extra}:
      {==}
    case Annotation.DomRangeSelector{sc, so, ec, eo, extra}:
      {==}
    case Annotation.ExtensionSelector{kind, members}:
      {==}

def Laws.annotation_only_first_target_context(head, tail, visible):
  {==}

def Laws.annotation_load_store_local_identity(anchor, fields, visible):
  match fields:
    case Annotation.AnnotationFields{ident, Annotation.Content{text, tags, targets, refs}, doc, audit, Annotation.Visibility{hidden, flagged, mod}, links, extra}:
      match visible:
        case Annotation.VisibleFields{comment, visible_tags, context}:
          {==}

def Laws.annotation_load_preserves_extensions(anchor, fields, visible):
  match fields:
    case Annotation.AnnotationFields{Annotation.Identity{id, group, user, perms, info}, Annotation.Content{text, tags, targets, refs}, doc, audit, Annotation.Visibility{hidden, flagged, mod}, links, extra}:
      match visible:
        case Annotation.VisibleFields{comment, visible_tags, context}:
          {==}

def Laws.annotation_plan_uses_body_identity(fields, fresh):
  {==}

def Laws.annotation_nonempty_body_id_wins(head, tail, fresh):
  {==}

def Laws.annotation_empty_body_id_uses_fresh(fresh):
  {==}

def Laws.annotation_quote_missing_exact_rejected():
  {==}

def Laws.annotation_position_selector_roundtrip(start, end):
  match start end:
    case Annotation.Utf16Offset{s} Annotation.Utf16Offset{e}:
      {==}

def Laws.annotation_quote_selector_roundtrip(exact, prefix, suffix):
  match prefix suffix:
    case Annotation.AbsentField{} Annotation.AbsentField{}:
      {==}
    case Annotation.AbsentField{} Annotation.PresentField{s}:
      {==}
    case Annotation.PresentField{p} Annotation.AbsentField{}:
      {==}
    case Annotation.PresentField{p} Annotation.PresentField{s}:
      {==}

def Laws.annotation_range_selector_roundtrip(sc, so, ec, eo):
  match so eo:
    case Annotation.Utf16Offset{s} Annotation.Utf16Offset{e}:
      {==}

def Laws.source_creation_normalized(source, id, result):
  match result:
    case SourceCrud.CreationRefused{message}:
      Inl{{==}}
    case SourceCrud.CreationReady{candidate, proof, stable}:
      Inr{string_same(Boundary.normalize(candidate), candidate, stable)}


def Laws.video_comment_preserves_time(fields, comment):
  match fields:
    case Video.Fields{title, timestamp, old}:
      {==}

def Laws.video_title_preserves_comment(fields, title):
  match fields:
    case Video.Fields{old, timestamp, comment}:
      {==}

def Laws.video_comment_last_write(fields, first, last):
  match fields:
    case Video.Fields{title, timestamp, old}:
      {==}

def Laws.video_body_quoting(fields):
  match fields:
    case Video.Fields{+title, +timestamp, +comment}:
      Laws.lines_roundtrip(Con{Video.header(Video.Fields{title, timestamp, Nil{}}), comment})

def Laws.video_body_accepts():
  {==}

def Laws.video_cycle_result_cases(source, id, result):
  match result:
    case VideoSource.CreationRefused{message}:
      Inl{{==}}
    case VideoSource.CreationReady{candidate, proof, stable}:
      Inr{string_same(VideoDocument.output(VideoDocument.delete(candidate, id)), Boundary.normalize(source), proof)}

def Laws.video_cycle_cases(source, id, body):
  Laws.video_cycle_result_cases(source, id, VideoSource.create(source, id, body))

def Laws.video_cycle_fixed_helper(source, id, body, stable, cases):
  match cases:
    case Inl{e}:
      e
    case Inr{e}:
      Equal.trans(String, VideoSource.cycle(source, id, body), Boundary.normalize(source), source, e, stable)

def Laws.video_cycle_normalized_fixed(source, id, body):
  Laws.video_cycle_fixed_helper(Boundary.normalize(source), id, body, Laws.boundary_idempotent(source), Laws.video_cycle_cases(Boundary.normalize(source), id, body))

def Laws.video_cycle_idempotent_helper(source, id, body, cases):
  match cases:
    case Inl{e}:
      Equal.cong(String, String, x => VideoSource.cycle(x, id, body), VideoSource.cycle(source, id, body), source, e)
    case Inr{+e}:
      Equal.trans(String, VideoSource.cycle(VideoSource.cycle(source, id, body), id, body), VideoSource.cycle(Boundary.normalize(source), id, body), VideoSource.cycle(source, id, body), Equal.cong(String, String, x => VideoSource.cycle(x, id, body), VideoSource.cycle(source, id, body), Boundary.normalize(source), e), Equal.trans(String, VideoSource.cycle(Boundary.normalize(source), id, body), Boundary.normalize(source), VideoSource.cycle(source, id, body), Laws.video_cycle_normalized_fixed(source, id, body), Equal.sym(String, VideoSource.cycle(source, id, body), Boundary.normalize(source), e)))

def Laws.video_cycle_idempotent(source, id, body):
  Laws.video_cycle_idempotent_helper(source, id, body, Laws.video_cycle_cases(source, id, body))


def Laws.video_creation_accepts_example():
  {==}

def Laws.video_creation_accepts_empty():
  {==}

def Laws.video_update_preserves_others(source, id, result):
  match result:
    case VideoUpdate.Refused{message}:
      Inl{{==}}
    case VideoUpdate.Updated{candidate, proof}:
      Inr{string_same(VideoDocument.masked(candidate, id), VideoDocument.masked(source, id), proof)}

def Laws.video_update_accepts_example():
  {==}

def Laws.video_header_recognition_lossless(source, result):
  match result:
    case VideoHeader.Rejected{}:
      {==}
    case VideoHeader.Recognized{syntax, proof}:
      proof

def Laws.video_header_title_preserves_layout(header, value):
  match header:
    case VideoHeader.Syntax{prefix, title, between, timestamp, suffix}:
      {==}

def Laws.video_header_time_preserves_layout(header, value):
  match header:
    case VideoHeader.Syntax{prefix, title, between, timestamp, suffix}:
      {==}

def Laws.video_header_title_preserves_time(header, value):
  match header:
    case VideoHeader.Syntax{prefix, title, between, timestamp, suffix}:
      {==}

def Laws.video_header_time_preserves_title(header, value):
  match header:
    case VideoHeader.Syntax{prefix, title, between, timestamp, suffix}:
      {==}

def Laws.video_header_accepts_noncanonical():
  {==}


# ── Highlight inks ──────────────────────────────────────────────────────────
def Laws.ink_key_roundtrip(ink):
  match ink:
    case Ink.Yellow{}:
      {==}
    case Ink.Orange{}:
      {==}
    case Ink.Pink{}:
      {==}
    case Ink.Purple{}:
      {==}
    case Ink.Blue{}:
      {==}
    case Ink.Green{}:
      {==}

def Laws.ink_shortcut_roundtrip(ink):
  match ink:
    case Ink.Yellow{}:
      {==}
    case Ink.Orange{}:
      {==}
    case Ink.Pink{}:
      {==}
    case Ink.Purple{}:
      {==}
    case Ink.Blue{}:
      {==}
    case Ink.Green{}:
      {==}

# Case analysis on whether the head member is the colour. `same` ties the
# matched Boolean to the real test so neither branch assumes anything.
def ink_read_place(hit: Bool, -pair: Annotation.JsonPair<Annotation.Json>, +ink: Ink.Ink, -rest: List<&2, Annotation.JsonPair<Annotation.Json>>, -updated: List<&2, Annotation.JsonPair<Annotation.Json>>, same: {hit == Ink.is_color(pair) : Bool}, ih: {Ink.get(updated) == ink : Ink.Ink}) -> {Ink.get(Ink.place(hit, pair, ink, rest, updated)) == ink : Ink.Ink}:
  match hit:
    case True{}:
      Laws.ink_key_roundtrip(ink)
    case False{}:
      %same : {Ink.choose(_, pair, Ink.get(updated)) == ink : Ink.Ink}
      ih

def Laws.ink_read_after_write(members, ink):
  match members:
    case Nil{}:
      Laws.ink_key_roundtrip(ink)
    case Con{pair, rest}:
      ink_read_place(Ink.is_color(pair), pair, ink, rest, Ink.set(rest, ink), {==}, Laws.ink_read_after_write(rest, ink))

def ink_others_place(hit: Bool, -pair: Annotation.JsonPair<Annotation.Json>, -ink: Ink.Ink, -rest: List<&2, Annotation.JsonPair<Annotation.Json>>, -updated: List<&2, Annotation.JsonPair<Annotation.Json>>, same: {hit == Ink.is_color(pair) : Bool}, ih: {Ink.others(updated) == Ink.others(rest) : List<&2, Annotation.JsonPair<Annotation.Json>>}) -> {Ink.others(Ink.place(hit, pair, ink, rest, updated)) == Ink.keep(Ink.is_color(pair), pair, Ink.others(rest)) : List<&2, Annotation.JsonPair<Annotation.Json>>}:
  match hit:
    case True{}:
      %same : {Ink.others(rest) == Ink.keep(_, pair, Ink.others(rest)) : List<&2, Annotation.JsonPair<Annotation.Json>>}
      {==}
    case False{}:
      %same : {Ink.keep(_, pair, Ink.others(updated)) == Ink.keep(_, pair, Ink.others(rest)) : List<&2, Annotation.JsonPair<Annotation.Json>>}
      %ih : {Con{pair, Ink.others(updated)} == Con{pair, _} : List<&2, Annotation.JsonPair<Annotation.Json>>}
      {==}

def Laws.ink_write_preserves_others(members, ink):
  match members:
    case Nil{}:
      {==}
    case Con{pair, rest}:
      ink_others_place(Ink.is_color(pair), pair, ink, rest, Ink.set(rest, ink), {==}, Laws.ink_write_preserves_others(rest, ink))

def ink_last_place(hit: Bool, -pair: Annotation.JsonPair<Annotation.Json>, -first: Ink.Ink, -second: Ink.Ink, -rest: List<&2, Annotation.JsonPair<Annotation.Json>>, same: {hit == Ink.is_color(pair) : Bool}, ih: {Ink.set(Ink.set(rest, first), second) == Ink.set(rest, second) : List<&2, Annotation.JsonPair<Annotation.Json>>}) -> {Ink.set(Ink.place(hit, pair, first, rest, Ink.set(rest, first)), second) == Ink.place(hit, pair, second, rest, Ink.set(rest, second)) : List<&2, Annotation.JsonPair<Annotation.Json>>}:
  match hit:
    case True{}:
      {==}
    case False{}:
      %same : {Ink.place(_, pair, second, Ink.set(rest, first), Ink.set(Ink.set(rest, first), second)) == Con{pair, Ink.set(rest, second)} : List<&2, Annotation.JsonPair<Annotation.Json>>}
      %ih : {Con{pair, Ink.set(Ink.set(rest, first), second)} == Con{pair, _} : List<&2, Annotation.JsonPair<Annotation.Json>>}
      {==}

def Laws.ink_last_write_wins(members, first, second):
  match members:
    case Nil{}:
      {==}
    case Con{pair, rest}:
      ink_last_place(Ink.is_color(pair), pair, first, second, rest, {==}, Laws.ink_last_write_wins(rest, first, second))


# ── The annotation list ─────────────────────────────────────────────────────
def nat_add_succ(a: Nat, -b: Nat) -> {Nat.add(a, 1n+b) == 1n+Nat.add(a, b) : Nat}:
  match a:
    case 0n:
      {==}
    case 1n+p:
      %nat_add_succ(p, b) : {1n+Nat.add(p, 1n+b) == 1n+_ : Nat}
      {==}

def Laws.shelf_tabs_partition(entries):
  match entries:
    case Nil{}:
      {==}
    case Con{Shelf.Entry{id, section, ink, True{}}, rest}:
      %Laws.shelf_tabs_partition(rest) : {1n+Nat.add(Shelf.length(Shelf.annotations(rest)), Shelf.length(Shelf.notes(rest))) == 1n+_ : Nat}
      {==}
    case Con{Shelf.Entry{id, section, ink, False{}}, rest}:
      %Laws.shelf_tabs_partition(rest) : {Nat.add(Shelf.length(Shelf.annotations(rest)), 1n+Shelf.length(Shelf.notes(rest))) == 1n+_ : Nat}
      nat_add_succ(Shelf.length(Shelf.annotations(rest)), Shelf.length(Shelf.notes(rest)))

def Laws.shelf_empty_filter_shows_all(entries):
  {==}

def shelf_sound_keep(hit: Bool, -filter: List<&2, Ink.Ink>, -entry: Shelf.Entry, -tail: List<&2, Shelf.Entry>, same: {hit == Shelf.has(filter, Shelf.ink_of(entry)) : Bool}, ih: {Shelf.all_have(filter, tail) == True{} : Bool}) -> {Shelf.all_have(filter, Shelf.keep(hit, entry, tail)) == True{} : Bool}:
  match hit:
    case True{}:
      %same : {Bool.and(_, Shelf.all_have(filter, tail)) == True{} : Bool}
      ih
    case False{}:
      ih

def Laws.shelf_filter_sound(filter, entries):
  match entries:
    case Nil{}:
      {==}
    case Con{entry, rest}:
      shelf_sound_keep(Shelf.has(filter, Shelf.ink_of(entry)), filter, entry, Shelf.only(filter, rest), {==}, Laws.shelf_filter_sound(filter, rest))

def shelf_lead_cards(changed: Bool, -section: String, -id: String, -tail: List<&2, Shelf.Row>) -> {Shelf.cards(Shelf.lead(changed, section, Shelf.Card{id}, tail)) == Con{id, Shelf.cards(tail)} : List<&2, String>}:
  match changed:
    case True{}:
      {==}
    case False{}:
      {==}

def shelf_rows_cards(+entries: List<&2, Shelf.Entry>, +previous: String, +first: Bool) -> {Shelf.cards(Shelf.rows_from(entries, previous, first)) == Shelf.ids(entries) : List<&2, String>}:
  match entries:
    case Nil{}:
      {==}
    case Con{Shelf.Entry{id, section, ink, quoted}, rest}:
      %shelf_rows_cards(rest, section, False{}) : {Shelf.cards(Shelf.lead(Bool.or(first, Bool.not(String.eq(section, previous))), section, Shelf.Card{id}, Shelf.rows_from(rest, section, False{}))) == Con{id, _} : List<&2, String>}
      shelf_lead_cards(Bool.or(first, Bool.not(String.eq(section, previous))), section, id, Shelf.rows_from(rest, section, False{}))

def Laws.shelf_headings_keep_cards(entries):
  shelf_rows_cards(entries, "", True{})

def Laws.shelf_headings_lead(entry, rest):
  match entry:
    case Shelf.Entry{id, section, ink, quoted}:
      {==}

# ── Markdown export ─────────────────────────────────────────────────────────
def Laws.digest_line_roundtrip(line):
  match line:
    case SNil{}:
      {==}
    case SCon{head, tail}:
      {==}

def Laws.digest_lines_roundtrip(lines):
  match lines:
    case Nil{}:
      {==}
    case Con{line, rest}:
      %Laws.digest_line_roundtrip(line) : {Digest.prepend(Digest.unquote_line(Digest.quote_line(line)), Digest.unquote_lines(Digest.quote_lines(rest))) == Digest.prepend(_, Some{rest}) : Maybe<&2, List<&2, String>>}
      %Laws.digest_lines_roundtrip(rest) : {Digest.prepend(Digest.unquote_line(Digest.quote_line(line)), Digest.unquote_lines(Digest.quote_lines(rest))) == Digest.prepend(Digest.unquote_line(Digest.quote_line(line)), _) : Maybe<&2, List<&2, String>>}
      {==}

def digest_flat_break(hit: Bool, -c: Char, -rest: String, same: {hit == Digest.is_break(c) : Bool}, ih: {Digest.has_break(rest) == False{} : Bool}) -> {Bool.or(Digest.is_break(Digest.flat(hit, c)), Digest.has_break(rest)) == False{} : Bool}:
  match hit:
    case True{}:
      ih
    case False{}:
      %same : {Bool.or(_, Digest.has_break(rest)) == False{} : Bool}
      ih

def Laws.digest_title_is_one_line(text):
  match text:
    case SNil{}:
      {==}
    case SCon{c, rest}:
      digest_flat_break(Digest.is_break(c), c, Digest.single_line(rest), {==}, Laws.digest_title_is_one_line(rest))

def Laws.digest_block_roundtrip(kind, note):
  match kind:
    case SNil{}:
      Laws.digest_lines_roundtrip(Digest.body(note))
    case SCon{head, tail}:
      Laws.digest_lines_roundtrip(Digest.body(note))

def Laws.digest_body_passage_then_note(q, qs, c, cs):
  {==}

def Laws.digest_body_passage_only(quote):
  match quote:
    case Nil{}:
      {==}
    case Con{q, qs}:
      {==}

def Laws.digest_body_note_only(comment):
  {==}

# ── Duplicate annotation IDs ────────────────────────────────────────────────
# (Equality of characters and strings is proved above, before its first use.)
def bool_or_false(b: Bool) -> {Bool.or(b, False{}) == b : Bool}:
  match b:
    case False{}:
      {==}
    case True{}:
      {==}

# A trie holding one key answers `String.eq` with that key.
def seen_chain_step(hit: Bool, -a: Char, -b: Char, -t: String, -u: String, ih: {Recognizer.seen_has(Recognizer.seen_chain(t), u) == String.eq(t, u) : Bool}) -> {Recognizer.seen_has_go(Recognizer.SeenChar{a, Recognizer.seen_chain(t), Recognizer.SeenNone{}}, SCon{b, u}, hit) == Bool.and(hit, String.eq(t, u)) : Bool}:
  match hit:
    case True{}:
      ih
    case False{}:
      {==}

def seen_chain_has(+t: String, +u: String) -> {Recognizer.seen_has(Recognizer.seen_chain(t), u) == String.eq(t, u) : Bool}:
  match t u:
    case SNil{} SNil{}:
      {==}
    case SNil{} SCon{b, r}:
      {==}
    case SCon{Chr{x}, s} SNil{}:
      {==}
    case SCon{a, s} SCon{b, r}:
      Equal.trans(Bool, Recognizer.seen_has(Recognizer.seen_chain(SCon{a, s}), SCon{b, r}), Bool.and(Char.is_eq(a, b), String.eq(s, r)), String.eq(SCon{a, s}, SCon{b, r}), seen_chain_step(Char.is_eq(a, b), a, b, s, r, seen_chain_has(s, r)), Equal.sym(Bool, String.eq(SCon{a, s}, SCon{b, r}), Bool.and(Char.is_eq(a, b), String.eq(s, r)), string_eq_cons(a, b, s, r)))

# Adding a key, then looking a probe up. `j` and `m` are the two character
# tests the trie makes at a node; `ej` and `em` tie them to the real tests.
def seen_add_end(j: Bool, -c: Char, -down: Recognizer.Seen, -next: Recognizer.Seen, -a: Char, -t: String, ih: {Recognizer.seen_has(Recognizer.seen_add(next, SCon{a, t}), SNil{}) == Recognizer.seen_has(next, SNil{}) : Bool}) -> {Recognizer.seen_has(Recognizer.seen_add_go(Recognizer.SeenChar{c, down, next}, SCon{a, t}, j), SNil{}) == Recognizer.seen_has(next, SNil{}) : Bool}:
  match j:
    case True{}:
      {==}
    case False{}:
      ih

def seen_add_step(j: Bool, m: Bool, +c: Char, -down: Recognizer.Seen, -next: Recognizer.Seen, +a: Char, +t: String, +b: Char, +u: String, +ej: {j == Char.is_eq(a, c) : Bool}, +em: {m == Char.is_eq(c, b) : Bool}, ihd: {Recognizer.seen_has(Recognizer.seen_add(down, t), u) == Bool.or(String.eq(t, u), Recognizer.seen_has(down, u)) : Bool}, ihn: {Recognizer.seen_has(Recognizer.seen_add(next, SCon{a, t}), SCon{b, u}) == Bool.or(String.eq(SCon{a, t}, SCon{b, u}), Recognizer.seen_has(next, SCon{b, u})) : Bool}) -> {Recognizer.seen_has(Recognizer.seen_add_go(Recognizer.SeenChar{c, down, next}, SCon{a, t}, j), SCon{b, u}) == Bool.or(String.eq(SCon{a, t}, SCon{b, u}), Recognizer.seen_has_go(Recognizer.SeenChar{c, down, next}, SCon{b, u}, m)) : Bool}:
  match j m:
    case True{} True{}:
      %em : {Recognizer.seen_has_go(Recognizer.SeenChar{c, Recognizer.seen_add(down, t), next}, SCon{b, u}, _) == Bool.or(String.eq(SCon{a, t}, SCon{b, u}), Recognizer.seen_has(down, u)) : Bool}
      %Equal.sym(Bool, String.eq(SCon{a, t}, SCon{b, u}), String.eq(t, u), string_eq_heads(a, b, t, u, True{}, char_left(a, c, b, True{}, Equal.sym(Bool, True{}, Char.is_eq(a, c), ej), Equal.sym(Bool, True{}, Char.is_eq(c, b), em)))) : {Recognizer.seen_has(Recognizer.seen_add(down, t), u) == Bool.or(_, Recognizer.seen_has(down, u)) : Bool}
      ihd
    case True{} False{}:
      %em : {Recognizer.seen_has_go(Recognizer.SeenChar{c, Recognizer.seen_add(down, t), next}, SCon{b, u}, _) == Bool.or(String.eq(SCon{a, t}, SCon{b, u}), Recognizer.seen_has(next, SCon{b, u})) : Bool}
      %Equal.sym(Bool, String.eq(SCon{a, t}, SCon{b, u}), False{}, string_eq_heads(a, b, t, u, False{}, char_left(a, c, b, False{}, Equal.sym(Bool, True{}, Char.is_eq(a, c), ej), Equal.sym(Bool, False{}, Char.is_eq(c, b), em)))) : {Recognizer.seen_has(next, SCon{b, u}) == Bool.or(_, Recognizer.seen_has(next, SCon{b, u})) : Bool}
      {==}
    case False{} True{}:
      %em : {Recognizer.seen_has_go(Recognizer.SeenChar{c, down, Recognizer.seen_add(next, SCon{a, t})}, SCon{b, u}, _) == Bool.or(String.eq(SCon{a, t}, SCon{b, u}), Recognizer.seen_has(down, u)) : Bool}
      %Equal.sym(Bool, String.eq(SCon{a, t}, SCon{b, u}), False{}, string_eq_heads(a, b, t, u, False{}, char_right(a, c, b, False{}, Equal.sym(Bool, False{}, Char.is_eq(a, c), ej), Equal.sym(Bool, True{}, Char.is_eq(c, b), em)))) : {Recognizer.seen_has(down, u) == Bool.or(_, Recognizer.seen_has(down, u)) : Bool}
      {==}
    case False{} False{}:
      %em : {Recognizer.seen_has_go(Recognizer.SeenChar{c, down, Recognizer.seen_add(next, SCon{a, t})}, SCon{b, u}, _) == Bool.or(String.eq(SCon{a, t}, SCon{b, u}), Recognizer.seen_has(next, SCon{b, u})) : Bool}
      ihn

def seen_add_has(+seen: Recognizer.Seen, +key: String, +probe: String) -> {Recognizer.seen_has(Recognizer.seen_add(seen, key), probe) == Bool.or(String.eq(key, probe), Recognizer.seen_has(seen, probe)) : Bool}:
  match seen key probe:
    case Recognizer.SeenNone{} SNil{} SNil{}:
      {==}
    case Recognizer.SeenNone{} SNil{} SCon{b, u}:
      {==}
    case Recognizer.SeenNone{} SCon{a, t} p:
      Equal.trans(Bool, Recognizer.seen_has(Recognizer.seen_chain(SCon{a, t}), p), String.eq(SCon{a, t}, p), Bool.or(String.eq(SCon{a, t}, p), False{}), seen_chain_has(SCon{a, t}, p), Equal.sym(Bool, Bool.or(String.eq(SCon{a, t}, p), False{}), String.eq(SCon{a, t}, p), bool_or_false(String.eq(SCon{a, t}, p))))
    case Recognizer.SeenEnd{next} SNil{} SNil{}:
      {==}
    case Recognizer.SeenEnd{next} SNil{} SCon{b, u}:
      {==}
    case Recognizer.SeenEnd{next} SCon{Chr{x}, t} SNil{}:
      {==}
    case Recognizer.SeenEnd{next} SCon{a, t} SCon{b, u}:
      seen_add_has(next, SCon{a, t}, SCon{b, u})
    case Recognizer.SeenChar{c, down, next} SNil{} SNil{}:
      {==}
    case Recognizer.SeenChar{c, down, next} SNil{} SCon{b, u}:
      {==}
    case Recognizer.SeenChar{c, down, next} SCon{Chr{x}, t} SNil{}:
      seen_add_end(Char.is_eq(Chr{x}, c), c, down, next, Chr{x}, t, seen_add_has(next, SCon{Chr{x}, t}, SNil{}))
    case Recognizer.SeenChar{c, down, next} SCon{a, t} SCon{b, u}:
      seen_add_step(Char.is_eq(a, c), Char.is_eq(c, b), c, down, next, a, t, b, u, {==}, {==}, seen_add_has(down, t, u), seen_add_has(next, SCon{a, t}, SCon{b, u}))

def bool_or_true(b: Bool) -> {Bool.or(b, True{}) == True{} : Bool}:
  match b:
    case False{}:
      {==}
    case True{}:
      {==}

def bool_or_assoc(a: Bool, -b: Bool, -c: Bool) -> {Bool.or(Bool.or(a, b), c) == Bool.or(a, Bool.or(b, c)) : Bool}:
  match a:
    case False{}:
      {==}
    case True{}:
      {==}

# The IDs of a part list, added from the last part to the first: the set the
# one-pass check holds when it has walked those parts.
def seen_of(parts: List<&2, Recognizer.Part>) -> Recognizer.Seen:
  match parts:
    case Nil{}:
      Recognizer.SeenNone{}
    case Con{Recognizer.RawPart{raw}, rest}:
      seen_of(rest)
    case Con{Recognizer.AnnotationPart{id, raw, fields, line}, rest}:
      Recognizer.seen_add(seen_of(rest), id)
    case Con{Recognizer.CandidateError{raw, message, line}, rest}:
      seen_of(rest)

# `has_id` of the specification, freed from its accumulator.
def has_id_or(+parts: List<&2, Recognizer.Part>, +id: String, +found: Bool) -> {Recognizer.has_id_go(parts, id, found) == Bool.or(found, Recognizer.has_id(parts, id)) : Bool}:
  match parts:
    case Nil{}:
      Equal.sym(Bool, Bool.or(found, False{}), found, bool_or_false(found))
    case Con{Recognizer.RawPart{raw}, rest}:
      has_id_or(rest, id, found)
    case Con{Recognizer.AnnotationPart{key, raw, fields, line}, rest}:
      %Equal.sym(Bool, Recognizer.has_id_go(rest, id, String.eq(key, id)), Bool.or(String.eq(key, id), Recognizer.has_id(rest, id)), has_id_or(rest, id, String.eq(key, id))) : {Recognizer.has_id_go(rest, id, Bool.or(found, String.eq(key, id))) == Bool.or(found, _) : Bool}
      %bool_or_assoc(found, String.eq(key, id), Recognizer.has_id(rest, id)) : {Recognizer.has_id_go(rest, id, Bool.or(found, String.eq(key, id))) == _ : Bool}
      has_id_or(rest, id, Bool.or(found, String.eq(key, id)))
    case Con{Recognizer.CandidateError{raw, message, line}, rest}:
      has_id_or(rest, id, found)

def seen_of_has(+parts: List<&2, Recognizer.Part>, +id: String) -> {Recognizer.seen_has(seen_of(parts), id) == Recognizer.has_id(parts, id) : Bool}:
  match parts:
    case Nil{}:
      {==}
    case Con{Recognizer.RawPart{raw}, rest}:
      seen_of_has(rest, id)
    case Con{Recognizer.AnnotationPart{key, raw, fields, line}, rest}:
      %Equal.sym(Bool, Recognizer.has_id_go(rest, id, String.eq(key, id)), Bool.or(String.eq(key, id), Recognizer.has_id(rest, id)), has_id_or(rest, id, String.eq(key, id))) : {Recognizer.seen_has(Recognizer.seen_add(seen_of(rest), key), id) == _ : Bool}
      %seen_of_has(rest, id) : {Recognizer.seen_has(Recognizer.seen_add(seen_of(rest), key), id) == Bool.or(String.eq(key, id), _) : Bool}
      seen_add_has(seen_of(rest), key, id)
    case Con{Recognizer.CandidateError{raw, message, line}, rest}:
      seen_of_has(rest, id)

def reverse_twice(+parts: List<&2, Recognizer.Part>, +acc: List<&2, Recognizer.Part>) -> {List.reverse.go(&2, Recognizer.Part, List.reverse.go(&2, Recognizer.Part, parts, acc), Nil{}) == List.reverse.go(&2, Recognizer.Part, acc, parts) : List<&2, Recognizer.Part>}:
  match parts:
    case Nil{}:
      {==}
    case Con{head, rest}:
      reverse_twice(rest, Con{head, acc})

# The pairwise check as a plain fold from the right: what `errors_go` computes
# (`errors_go_fold`) and what the one-pass check computes (`errors_seen_fold`).
def errors_fold(parts: List<&2, Recognizer.Part>) -> Bool:
  match parts:
    case Nil{}:
      False{}
    case Con{Recognizer.RawPart{raw}, rest}:
      errors_fold(rest)
    case Con{Recognizer.AnnotationPart{+id, raw, fields, line}, +rest}:
      Bool.or(Recognizer.has_id(rest, id), errors_fold(rest))
    case Con{Recognizer.CandidateError{raw, message, line}, rest}:
      True{}

def errors_go_fold(+parts: List<&2, Recognizer.Part>, +found: Bool) -> {Recognizer.errors_go(parts, found) == Bool.or(found, errors_fold(parts)) : Bool}:
  match parts:
    case Nil{}:
      Equal.sym(Bool, Bool.or(found, False{}), found, bool_or_false(found))
    case Con{Recognizer.RawPart{raw}, rest}:
      errors_go_fold(rest, found)
    case Con{Recognizer.AnnotationPart{id, raw, fields, line}, rest}:
      %bool_or_assoc(found, Recognizer.has_id(rest, id), errors_fold(rest)) : {Recognizer.errors_go(rest, Bool.or(found, Recognizer.has_id(rest, id))) == _ : Bool}
      errors_go_fold(rest, Bool.or(found, Recognizer.has_id(rest, id)))
    case Con{Recognizer.CandidateError{raw, message, line}, rest}:
      %Equal.sym(Bool, Bool.or(found, True{}), True{}, bool_or_true(found)) : {Recognizer.errors_go(rest, True{}) == _ : Bool}
      errors_go_fold(rest, True{})

def errors_seen_fold(+reversed: List<&2, Recognizer.Part>, +later: List<&2, Recognizer.Part>) -> {Recognizer.errors_seen(reversed, seen_of(later), errors_fold(later)) == errors_fold(List.reverse.go(&2, Recognizer.Part, reversed, later)) : Bool}:
  match reversed:
    case Nil{}:
      {==}
    case Con{Recognizer.RawPart{raw}, rest}:
      errors_seen_fold(rest, Con{Recognizer.RawPart{raw}, later})
    case Con{Recognizer.AnnotationPart{id, raw, fields, line}, rest}:
      %Equal.sym(Bool, Recognizer.seen_has(seen_of(later), id), Recognizer.has_id(later, id), seen_of_has(later, id)) : {Recognizer.errors_seen(rest, Recognizer.seen_add(seen_of(later), id), Bool.or(_, errors_fold(later))) == errors_fold(List.reverse.go(&2, Recognizer.Part, rest, Con{Recognizer.AnnotationPart{id, raw, fields, line}, later})) : Bool}
      errors_seen_fold(rest, Con{Recognizer.AnnotationPart{id, raw, fields, line}, later})
    case Con{Recognizer.CandidateError{raw, message, line}, rest}:
      errors_seen_fold(rest, Con{Recognizer.CandidateError{raw, message, line}, later})

def errors_agree(+parts: List<&2, Recognizer.Part>) -> {Recognizer.errors(parts) == Recognizer.errors_pairwise(parts) : Bool}:
  Equal.trans(Bool, Recognizer.errors(parts), errors_fold(List.reverse.go(&2, Recognizer.Part, List.reverse.go(&2, Recognizer.Part, parts, Nil{}), Nil{})), Recognizer.errors_pairwise(parts), errors_seen_fold(List.reverse.go(&2, Recognizer.Part, parts, Nil{}), Nil{}), Equal.trans(Bool, errors_fold(List.reverse.go(&2, Recognizer.Part, List.reverse.go(&2, Recognizer.Part, parts, Nil{}), Nil{})), errors_fold(parts), Recognizer.errors_pairwise(parts), Equal.cong(List<&2, Recognizer.Part>, Bool, x => errors_fold(x), List.reverse.go(&2, Recognizer.Part, List.reverse.go(&2, Recognizer.Part, parts, Nil{}), Nil{}), parts, reverse_twice(parts, Nil{})), Equal.sym(Bool, Recognizer.errors_pairwise(parts), errors_fold(parts), errors_go_fold(parts, False{}))))

# The same two steps for the diagnostics.
def diagnostics_fold(parts: List<&2, Recognizer.Part>) -> List<&2, Recognizer.Diagnostic>:
  match parts:
    case Nil{}:
      Nil{}
    case Con{Recognizer.RawPart{raw}, rest}:
      diagnostics_fold(rest)
    case Con{Recognizer.AnnotationPart{+id, raw, fields, line}, +rest}:
      Recognizer.duplicate_diagnostic(id, line, diagnostics_fold(rest), Recognizer.has_id(rest, id))
    case Con{Recognizer.CandidateError{raw, message, line}, rest}:
      Con{Recognizer.Diagnostic{line, message}, diagnostics_fold(rest)}

def diagnostics_place(duplicate: Bool, -id: String, -line: Nat, -acc: List<&2, Recognizer.Diagnostic>, -tail: List<&2, Recognizer.Diagnostic>) -> {List.reverse.go(&2, Recognizer.Diagnostic, Recognizer.duplicate_diagnostic(id, line, acc, duplicate), tail) == List.reverse.go(&2, Recognizer.Diagnostic, acc, Recognizer.duplicate_diagnostic(id, line, tail, duplicate)) : List<&2, Recognizer.Diagnostic>}:
  match duplicate:
    case True{}:
      {==}
    case False{}:
      {==}

def diagnostics_go_fold(+parts: List<&2, Recognizer.Part>, +acc: List<&2, Recognizer.Diagnostic>) -> {Recognizer.diagnostics_go(parts, acc) == List.reverse.go(&2, Recognizer.Diagnostic, acc, diagnostics_fold(parts)) : List<&2, Recognizer.Diagnostic>}:
  match parts:
    case Nil{}:
      {==}
    case Con{Recognizer.RawPart{raw}, rest}:
      diagnostics_go_fold(rest, acc)
    case Con{Recognizer.AnnotationPart{id, raw, fields, line}, rest}:
      Equal.trans(List<&2, Recognizer.Diagnostic>, Recognizer.diagnostics_go(rest, Recognizer.duplicate_diagnostic(id, line, acc, Recognizer.has_id(rest, id))), List.reverse.go(&2, Recognizer.Diagnostic, Recognizer.duplicate_diagnostic(id, line, acc, Recognizer.has_id(rest, id)), diagnostics_fold(rest)), List.reverse.go(&2, Recognizer.Diagnostic, acc, Recognizer.duplicate_diagnostic(id, line, diagnostics_fold(rest), Recognizer.has_id(rest, id))), diagnostics_go_fold(rest, Recognizer.duplicate_diagnostic(id, line, acc, Recognizer.has_id(rest, id))), diagnostics_place(Recognizer.has_id(rest, id), id, line, acc, diagnostics_fold(rest)))
    case Con{Recognizer.CandidateError{raw, message, line}, rest}:
      diagnostics_go_fold(rest, Con{Recognizer.Diagnostic{line, message}, acc})

def diagnostics_seen_fold(+reversed: List<&2, Recognizer.Part>, +later: List<&2, Recognizer.Part>) -> {Recognizer.diagnostics_seen(reversed, seen_of(later), diagnostics_fold(later)) == diagnostics_fold(List.reverse.go(&2, Recognizer.Part, reversed, later)) : List<&2, Recognizer.Diagnostic>}:
  match reversed:
    case Nil{}:
      {==}
    case Con{Recognizer.RawPart{raw}, rest}:
      diagnostics_seen_fold(rest, Con{Recognizer.RawPart{raw}, later})
    case Con{Recognizer.AnnotationPart{id, raw, fields, line}, rest}:
      %Equal.sym(Bool, Recognizer.seen_has(seen_of(later), id), Recognizer.has_id(later, id), seen_of_has(later, id)) : {Recognizer.diagnostics_seen(rest, Recognizer.seen_add(seen_of(later), id), Recognizer.duplicate_diagnostic(id, line, diagnostics_fold(later), _)) == diagnostics_fold(List.reverse.go(&2, Recognizer.Part, rest, Con{Recognizer.AnnotationPart{id, raw, fields, line}, later})) : List<&2, Recognizer.Diagnostic>}
      diagnostics_seen_fold(rest, Con{Recognizer.AnnotationPart{id, raw, fields, line}, later})
    case Con{Recognizer.CandidateError{raw, message, line}, rest}:
      diagnostics_seen_fold(rest, Con{Recognizer.CandidateError{raw, message, line}, later})

def diagnostics_agree(+parts: List<&2, Recognizer.Part>) -> {Recognizer.diagnostics(parts) == Recognizer.diagnostics_pairwise(parts) : List<&2, Recognizer.Diagnostic>}:
  Equal.trans(List<&2, Recognizer.Diagnostic>, Recognizer.diagnostics(parts), diagnostics_fold(List.reverse.go(&2, Recognizer.Part, List.reverse.go(&2, Recognizer.Part, parts, Nil{}), Nil{})), Recognizer.diagnostics_pairwise(parts), diagnostics_seen_fold(List.reverse.go(&2, Recognizer.Part, parts, Nil{}), Nil{}), Equal.trans(List<&2, Recognizer.Diagnostic>, diagnostics_fold(List.reverse.go(&2, Recognizer.Part, List.reverse.go(&2, Recognizer.Part, parts, Nil{}), Nil{})), diagnostics_fold(parts), Recognizer.diagnostics_pairwise(parts), Equal.cong(List<&2, Recognizer.Part>, List<&2, Recognizer.Diagnostic>, x => diagnostics_fold(x), List.reverse.go(&2, Recognizer.Part, List.reverse.go(&2, Recognizer.Part, parts, Nil{}), Nil{}), parts, reverse_twice(parts, Nil{})), Equal.sym(List<&2, Recognizer.Diagnostic>, Recognizer.diagnostics_pairwise(parts), diagnostics_fold(parts), diagnostics_go_fold(parts, Nil{}))))

def safe_agree(+parts: List<&2, Recognizer.Part>, closed: Bool) -> {Recognizer.safe(Recognizer.Scan{parts, closed}) == Bool.and(closed, Bool.not(Recognizer.errors_pairwise(parts))) : Bool}:
  %errors_agree(parts) : {Bool.and(closed, Bool.not(Recognizer.errors(parts))) == Bool.and(closed, Bool.not(_)) : Bool}
  {==}

def Laws.recognizer_seen_empty(probe):
  {==}

def Laws.recognizer_seen_add_has(seen, key, probe):
  seen_add_has(seen, key, probe)

def Laws.recognizer_errors_pairwise(parts):
  errors_agree(parts)

def Laws.recognizer_safe_pairwise(parts, closed):
  safe_agree(parts, closed)

def Laws.recognizer_diagnostics_pairwise(parts):
  diagnostics_agree(parts)

# ── Fast paths of the scan ──────────────────────────────────────────────────
def word_refl(+n: Nat, +a: Word(n)) -> {Word.cmp(n, a, a) == EQ{} : Cmp}:
  match n:
    case 0n:
      match a:
        case WNil{}:
          {==}
    case 1n+p:
      match a:
        case WCon{False{}, at}:
          %Equal.sym(Cmp, Word.cmp(p, at, at), EQ{}, word_refl(p, at)) : {Word.cmp.fin(False{}, False{}, _) == EQ{} : Cmp}
          {==}
        case WCon{True{}, at}:
          %Equal.sym(Cmp, Word.cmp(p, at, at), EQ{}, word_refl(p, at)) : {Word.cmp.fin(True{}, True{}, _) == EQ{} : Cmp}
          {==}

def char_refl(c: Char) -> {Char.is_eq(c, c) == True{} : Bool}:
  match c:
    case Chr{U32{w}}:
      %Equal.sym(Cmp, Word.cmp(32n, w, w), EQ{}, word_refl(32n, w)) : {Cmp.is_eq(_) == True{} : Bool}
      {==}

# Every string starts with itself, whatever follows it.
def prefix_self(+a: String, -w: String) -> {String.starts_with(String.append(a, w), a) == True{} : Bool}:
  match a:
    case SNil{}:
      {==}
    case SCon{y, yt}:
      %Equal.sym(Bool, Char.is_eq(y, y), True{}, char_refl(y)) : {String.starts_with.go.if(yt, String.append(yt, w), _) == True{} : Bool}
      prefix_self(yt, w)

# A prefix of a string is a prefix of that string with more appended.
def prefix_grows_step(same: Bool, -yt: String, -xt: String, -w: String, e: {String.starts_with.go.if(yt, xt, same) == True{} : Bool}, ih: {String.starts_with.go(yt, xt) == True{} : Bool} -> {String.starts_with.go(yt, String.append(xt, w)) == True{} : Bool}) -> {String.starts_with.go.if(yt, String.append(xt, w), same) == True{} : Bool}:
  match same:
    case True{}:
      ih(e)
    case False{}:
      e

def prefix_grows(+p: String, +a: String, -w: String, e: {String.starts_with.go(p, a) == True{} : Bool}) -> {String.starts_with.go(p, String.append(a, w)) == True{} : Bool}:
  match p a:
    case SNil{} text:
      {==}
    case SCon{y, yt} SNil{}:
      impossible({String.starts_with.go(SCon{y, yt}, String.append(SNil{}, w)) == True{} : Bool}, false_is_not_true(e))
    case SCon{y, yt} SCon{x, xt}:
      prefix_grows_step(Char.is_eq(x, y), yt, xt, w, e, z => prefix_grows(yt, xt, w, z))

# The blanks `String.trim_start` drops, so that a string is those blanks
# followed by what is kept.
def trim_lead_pick(head: Char, rest: String, space: Bool) -> String:
  match space:
    case False{}:
      SNil{}
    case True{}:
      SCon{head, rest}

def trim_lead(text: String) -> String:
  match text:
    case SNil{}:
      SNil{}
    case SCon{+head, tail}:
      trim_lead_pick(head, trim_lead(tail), Char.is_space(head))

def trim_lead_step(space: Bool, -head: Char, -tail: String, ih: {String.append(trim_lead(tail), String.trim_start(tail)) == tail : String}) -> {String.append(trim_lead_pick(head, trim_lead(tail), space), String.trim_start.if(tail, head, space)) == SCon{head, tail} : String}:
  match space:
    case False{}:
      {==}
    case True{}:
      %ih : {SCon{head, String.append(trim_lead(tail), String.trim_start(tail))} == SCon{head, _} : String}
      {==}

def trim_lead_start(+text: String) -> {String.append(trim_lead(text), String.trim_start(text)) == text : String}:
  match text:
    case SNil{}:
      {==}
    case SCon{head, tail}:
      trim_lead_step(Char.is_space(head), head, tail, trim_lead_start(tail))

def text_to_base(+x: String) -> {Text.reverse(x) == String.reverse(x) : String}:
  Equal.sym(String, String.reverse(x), Text.reverse(x), Laws.text_base_reverse(x))

def string_reverse_append(+xs: String, +ys: String) -> {String.reverse(String.append(xs, ys)) == String.append(String.reverse(ys), String.reverse(xs)) : String}:
  %text_to_base(String.append(xs, ys)) : {_ == String.append(String.reverse(ys), String.reverse(xs)) : String}
  %text_to_base(ys) : {Text.reverse(String.append(xs, ys)) == String.append(_, String.reverse(xs)) : String}
  %text_to_base(xs) : {Text.reverse(String.append(xs, ys)) == String.append(Text.reverse(ys), _) : String}
  Laws.text_reverse_append(xs, ys)

# A string is its end-trimmed self followed by the blanks that were dropped,
# so it starts with its end-trimmed self.
def trim_end_split(+s: String) -> {String.append(String.trim_end(s), String.reverse(trim_lead(String.reverse(s)))) == s : String}:
  Equal.trans(String, String.append(String.trim_end(s), String.reverse(trim_lead(String.reverse(s)))), String.reverse(String.append(trim_lead(String.reverse(s)), String.trim_start(String.reverse(s)))), s, Equal.sym(String, String.reverse(String.append(trim_lead(String.reverse(s)), String.trim_start(String.reverse(s)))), String.append(String.trim_end(s), String.reverse(trim_lead(String.reverse(s)))), string_reverse_append(trim_lead(String.reverse(s)), String.trim_start(String.reverse(s)))), Equal.trans(String, String.reverse(String.append(trim_lead(String.reverse(s)), String.trim_start(String.reverse(s)))), String.reverse(String.reverse(s)), s, Equal.cong(String, String, x => String.reverse(x), String.append(trim_lead(String.reverse(s)), String.trim_start(String.reverse(s))), String.reverse(s), trim_lead_start(String.reverse(s))), Laws.text_base_reverse_reverse(s)))

def trim_end_prefix(+s: String) -> {String.starts_with(s, String.trim_end(s)) == True{} : Bool}:
  %trim_end_split(s) : {String.starts_with(_, String.trim_end(s)) == True{} : Bool}
  prefix_self(String.trim_end(s), String.reverse(trim_lead(String.reverse(s))))

# If the trimmed line IS the marker, the untrimmed start has the marker.
def marker_present(+s: String, -marker: String, same: {String.trim_end(s) == marker : String}) -> {String.starts_with(s, marker) == True{} : Bool}:
  %same : {String.starts_with(s, _) == True{} : Bool}
  trim_end_prefix(s)

def marker_absent_step(q: Bool, +s: String, +marker: String, eq: {q == String.eq(String.trim_end(s), marker) : Bool}, e: {String.starts_with(s, marker) == False{} : Bool}) -> {String.eq(String.trim_end(s), marker) == False{} : Bool}:
  match q:
    case False{}:
      Equal.sym(Bool, False{}, String.eq(String.trim_end(s), marker), eq)
    case True{}:
      impossible({String.eq(String.trim_end(s), marker) == False{} : Bool}, false_is_not_true(Equal.trans(Bool, False{}, String.starts_with(s, marker), True{}, Equal.sym(Bool, String.starts_with(s, marker), False{}, e), marker_present(s, marker, string_same(String.trim_end(s), marker, Equal.sym(Bool, True{}, String.eq(String.trim_end(s), marker), eq))))))

def is_marker_step(possible: Bool, +text: String, +marker: String, ep: {possible == String.starts_with(String.trim_start(text), marker) : Bool}) -> {Recognizer.is_marker_checked(text, marker, possible) == Recognizer.is_marker_exact(text, marker) : Bool}:
  match possible:
    case False{}:
      Equal.sym(Bool, Recognizer.is_marker_exact(text, marker), False{}, marker_absent_step(String.eq(String.trim_end(String.trim_start(text)), marker), String.trim_start(text), marker, {==}, Equal.sym(Bool, False{}, String.starts_with(String.trim_start(text), marker), ep)))
    case True{}:
      {==}

# If the trimmed line STARTS WITH the prefix, so does the untrimmed start.
def prefix_present(+s: String, +prefix: String, e: {String.starts_with(String.trim_end(s), prefix) == True{} : Bool}) -> {String.starts_with(s, prefix) == True{} : Bool}:
  %trim_end_split(s) : {String.starts_with(_, prefix) == True{} : Bool}
  prefix_grows(prefix, String.trim_end(s), String.reverse(trim_lead(String.reverse(s))), e)

def prefix_absent_step(q: Bool, +s: String, +prefix: String, eq: {q == String.starts_with(String.trim_end(s), prefix) : Bool}, e: {String.starts_with(s, prefix) == False{} : Bool}) -> {String.starts_with(String.trim_end(s), prefix) == False{} : Bool}:
  match q:
    case False{}:
      Equal.sym(Bool, False{}, String.starts_with(String.trim_end(s), prefix), eq)
    case True{}:
      impossible({String.starts_with(String.trim_end(s), prefix) == False{} : Bool}, false_is_not_true(Equal.trans(Bool, False{}, String.starts_with(s, prefix), True{}, Equal.sym(Bool, String.starts_with(s, prefix), False{}, e), prefix_present(s, prefix, Equal.sym(Bool, True{}, String.starts_with(String.trim_end(s), prefix), eq)))))

# A prefix that does not end in a blank survives trimming the end of the
# line. The line is its end-trimmed self followed by blanks (`trim_end_split`);
# a prefix reaching into those blanks would end in one.
def bool_and_left(p: Bool, q: Bool, e: {Bool.and(p, q) == True{} : Bool}) -> {p == True{} : Bool}:
  match p:
    case False{}:
      e
    case True{}:
      {==}

def bool_and_right(p: Bool, q: Bool, e: {Bool.and(p, q) == True{} : Bool}) -> {q == True{} : Bool}:
  match p:
    case False{}:
      impossible({q == True{} : Bool}, false_is_not_true(e))
    case True{}:
      e

def bool_and_assoc(a: Bool, -b: Bool, -c: Bool) -> {Bool.and(Bool.and(a, b), c) == Bool.and(a, Bool.and(b, c)) : Bool}:
  match a:
    case False{}:
      {==}
    case True{}:
      {==}

def bool_and_last(p: Bool, q: Bool) -> {Bool.and(q, Bool.and(p, True{})) == Bool.and(p, q) : Bool}:
  match p q:
    case False{} False{}:
      {==}
    case False{} True{}:
      {==}
    case True{} False{}:
      {==}
    case True{} True{}:
      {==}

def bool_not_true(b: Bool, e: {Bool.not(b) == True{} : Bool}) -> {b == False{} : Bool}:
  match b:
    case False{}:
      {==}
    case True{}:
      impossible({True{} == False{} : Bool}, false_is_not_true(e))

def all_blank(text: String) -> Bool:
  match text:
    case SNil{}:
      True{}
    case SCon{head, tail}:
      Bool.and(Char.is_space(head), all_blank(tail))

def all_blank_append(+a: String, +b: String) -> {all_blank(String.append(a, b)) == Bool.and(all_blank(a), all_blank(b)) : Bool}:
  match a:
    case SNil{}:
      {==}
    case SCon{head, tail}:
      Equal.trans(Bool, Bool.and(Char.is_space(head), all_blank(String.append(tail, b))), Bool.and(Char.is_space(head), Bool.and(all_blank(tail), all_blank(b))), Bool.and(Bool.and(Char.is_space(head), all_blank(tail)), all_blank(b)), Equal.cong(Bool, Bool, z => Bool.and(Char.is_space(head), z), all_blank(String.append(tail, b)), Bool.and(all_blank(tail), all_blank(b)), all_blank_append(tail, b)), Equal.sym(Bool, Bool.and(Bool.and(Char.is_space(head), all_blank(tail)), all_blank(b)), Bool.and(Char.is_space(head), Bool.and(all_blank(tail), all_blank(b))), bool_and_assoc(Char.is_space(head), all_blank(tail), all_blank(b))))

def all_blank_text_reverse(+text: String) -> {all_blank(Text.reverse(text)) == all_blank(text) : Bool}:
  match text:
    case SNil{}:
      {==}
    case SCon{head, tail}:
      %Equal.sym(Bool, all_blank(String.append(Text.reverse(tail), SCon{head, SNil{}})), Bool.and(all_blank(Text.reverse(tail)), Bool.and(Char.is_space(head), True{})), all_blank_append(Text.reverse(tail), SCon{head, SNil{}})) : {_ == Bool.and(Char.is_space(head), all_blank(tail)) : Bool}
      %Equal.sym(Bool, all_blank(Text.reverse(tail)), all_blank(tail), all_blank_text_reverse(tail)) : {Bool.and(_, Bool.and(Char.is_space(head), True{})) == Bool.and(Char.is_space(head), all_blank(tail)) : Bool}
      bool_and_last(Char.is_space(head), all_blank(tail))

def all_blank_reverse(+text: String) -> {all_blank(String.reverse(text)) == all_blank(text) : Bool}:
  %text_to_base(text) : {all_blank(_) == all_blank(text) : Bool}
  all_blank_text_reverse(text)

def trim_lead_blank_step(space: Bool, -head: Char, -rest: String, e: {space == Char.is_space(head) : Bool}, ih: {all_blank(rest) == True{} : Bool}) -> {all_blank(trim_lead_pick(head, rest, space)) == True{} : Bool}:
  match space:
    case False{}:
      {==}
    case True{}:
      %e : {Bool.and(_, all_blank(rest)) == True{} : Bool}
      ih

def trim_lead_blank(+text: String) -> {all_blank(trim_lead(text)) == True{} : Bool}:
  match text:
    case SNil{}:
      {==}
    case SCon{head, tail}:
      trim_lead_blank_step(Char.is_space(head), head, trim_lead(tail), {==}, trim_lead_blank(tail))

# A prefix of blanks ends in a blank.
def blank_prefix_step(same: Bool, +x: Char, +y: Char, +yt: String, +xt: String, es: {same == Char.is_eq(x, y) : Bool}, e1: {String.starts_with.go.if(yt, xt, same) == True{} : Bool}, +e2: {Bool.and(Char.is_space(x), all_blank(xt)) == True{} : Bool}, ih: {String.starts_with.go(yt, xt) == True{} : Bool} -> {all_blank(xt) == True{} : Bool} -> {Recognizer.ends_blank(yt, True{}) == True{} : Bool}) -> {Recognizer.ends_blank(yt, Char.is_space(y)) == True{} : Bool}:
  match same:
    case False{}:
      impossible({Recognizer.ends_blank(yt, Char.is_space(y)) == True{} : Bool}, false_is_not_true(e1))
    case True{}:
      %char_same(x, y, Equal.sym(Bool, True{}, Char.is_eq(x, y), es)) : {Recognizer.ends_blank(yt, Char.is_space(_)) == True{} : Bool}
      %Equal.sym(Bool, Char.is_space(x), True{}, bool_and_left(Char.is_space(x), all_blank(xt), e2)) : {Recognizer.ends_blank(yt, _) == True{} : Bool}
      ih(e1, bool_and_right(Char.is_space(x), all_blank(xt), e2))

def blank_prefix(+p: String, +w: String, e1: {String.starts_with.go(p, w) == True{} : Bool}, e2: {all_blank(w) == True{} : Bool}) -> {Recognizer.ends_blank(p, True{}) == True{} : Bool}:
  match p w:
    case SNil{} text:
      {==}
    case SCon{y, yt} SNil{}:
      impossible({Recognizer.ends_blank(SCon{y, yt}, True{}) == True{} : Bool}, false_is_not_true(e1))
    case SCon{y, yt} SCon{x, xt}:
      blank_prefix_step(Char.is_eq(x, y), x, y, yt, xt, {==}, e1, e2, a => b => blank_prefix(yt, xt, a, b))

def tight_prefix_step(same: Bool, -yt: String, -xt: String, -w: String, h1: {String.starts_with.go.if(yt, String.append(xt, w), same) == True{} : Bool}, ih: {String.starts_with.go(yt, String.append(xt, w)) == True{} : Bool} -> {String.starts_with.go(yt, xt) == True{} : Bool}) -> {String.starts_with.go.if(yt, xt, same) == True{} : Bool}:
  match same:
    case False{}:
      h1
    case True{}:
      ih(h1)

def tight_prefix_go(+p: String, +e: String, +w: String, -last: Bool, h1: {String.starts_with.go(p, String.append(e, w)) == True{} : Bool}, +h2: {all_blank(w) == True{} : Bool}, h3: {Recognizer.ends_blank(p, last) == False{} : Bool}) -> {String.starts_with.go(p, e) == True{} : Bool}:
  match p e:
    case SNil{} text:
      {==}
    case SCon{y, yt} SNil{}:
      impossible({String.starts_with.go(SCon{y, yt}, SNil{}) == True{} : Bool}, false_is_not_true(Equal.trans(Bool, False{}, Recognizer.ends_blank(SCon{y, yt}, last), True{}, Equal.sym(Bool, Recognizer.ends_blank(SCon{y, yt}, last), False{}, h3), blank_prefix(SCon{y, yt}, w, h1, h2))))
    case SCon{y, yt} SCon{x, xt}:
      tight_prefix_step(Char.is_eq(x, y), yt, xt, w, h1, z => tight_prefix_go(yt, xt, w, Char.is_space(y), z, h2, h3))

def tight_prefix_whole(+s: String, +prefix: String, e: {String.starts_with(s, prefix) == True{} : Bool}) -> {String.starts_with.go(prefix, String.append(String.trim_end(s), String.reverse(trim_lead(String.reverse(s))))) == True{} : Bool}:
  %Equal.sym(String, String.append(String.trim_end(s), String.reverse(trim_lead(String.reverse(s)))), s, trim_end_split(s)) : {String.starts_with.go(prefix, _) == True{} : Bool}
  e

def trim_end_dropped_blank(+s: String) -> {all_blank(String.reverse(trim_lead(String.reverse(s)))) == True{} : Bool}:
  %Equal.sym(Bool, all_blank(String.reverse(trim_lead(String.reverse(s)))), all_blank(trim_lead(String.reverse(s))), all_blank_reverse(trim_lead(String.reverse(s)))) : {_ == True{} : Bool}
  trim_lead_blank(String.reverse(s))

def tight_prefix(+s: String, +prefix: String, e1: {String.starts_with(s, prefix) == True{} : Bool}, e2: {Recognizer.ends_blank(prefix, False{}) == False{} : Bool}) -> {String.starts_with(String.trim_end(s), prefix) == True{} : Bool}:
  tight_prefix_go(prefix, String.trim_end(s), String.reverse(trim_lead(String.reverse(s))), False{}, tight_prefix_whole(s, prefix, e1), trim_end_dropped_blank(s), e2)

def starts_trimmed_tight_step(tight: Bool, +text: String, +prefix: String, et: {tight == Bool.not(Recognizer.ends_blank(prefix, False{})) : Bool}, ep: {String.starts_with(String.trim_start(text), prefix) == True{} : Bool}) -> {Recognizer.starts_trimmed_tight(text, prefix, tight) == Recognizer.starts_trimmed_exact(text, prefix) : Bool}:
  match tight:
    case False{}:
      {==}
    case True{}:
      Equal.sym(Bool, Recognizer.starts_trimmed_exact(text, prefix), True{}, tight_prefix(String.trim_start(text), prefix, ep, bool_not_true(Recognizer.ends_blank(prefix, False{}), Equal.sym(Bool, True{}, Bool.not(Recognizer.ends_blank(prefix, False{})), et))))

def starts_trimmed_step(possible: Bool, +text: String, +prefix: String, ep: {possible == String.starts_with(String.trim_start(text), prefix) : Bool}) -> {Recognizer.starts_trimmed_checked(text, prefix, possible) == Recognizer.starts_trimmed_exact(text, prefix) : Bool}:
  match possible:
    case False{}:
      Equal.sym(Bool, Recognizer.starts_trimmed_exact(text, prefix), False{}, prefix_absent_step(String.starts_with(String.trim_end(String.trim_start(text)), prefix), String.trim_start(text), prefix, {==}, Equal.sym(Bool, False{}, String.starts_with(String.trim_start(text), prefix), ep)))
    case True{}:
      starts_trimmed_tight_step(Bool.not(Recognizer.ends_blank(prefix, False{})), text, prefix, {==}, Equal.sym(Bool, True{}, String.starts_with(String.trim_start(text), prefix), ep))

def Laws.recognizer_is_marker_exact(text, marker):
  is_marker_step(String.starts_with(String.trim_start(text), marker), text, marker, {==})

def Laws.recognizer_starts_trimmed_exact(text, prefix):
  starts_trimmed_step(String.starts_with(String.trim_start(text), prefix), text, prefix, {==})

def Laws.recognizer_header_after_exact(previous, text):
  match previous:
    case False{}:
      {==}
    case True{}:
      {==}

# Stripping a trailing CR.
def ends_cr_last(+body: String, last: Bool) -> {Recognizer.ends_cr(String.append(body, "\r"), last) == True{} : Bool}:
  match body:
    case SNil{}:
      {==}
    case SCon{head, tail}:
      ends_cr_last(tail, Char.is_eq(head, '\r'))

def Laws.recognizer_clean_exact_strips_cr(body):
  Equal.trans(String, Recognizer.clean_exact(String.append(body, "\r")), String.reverse(String.reverse(body)), body, Equal.cong(String, String, x => Recognizer.clean_reverse(x), String.reverse(String.append(body, "\r")), SCon{'\r', String.reverse(body)}, string_reverse_append(body, "\r")), Laws.text_base_reverse_reverse(body))

def Laws.recognizer_clean_strips_cr(body):
  %Equal.sym(Bool, Recognizer.ends_cr(String.append(body, "\r"), False{}), True{}, ends_cr_last(body, False{})) : {Recognizer.clean_checked(String.append(body, "\r"), _) == body : String}
  Laws.recognizer_clean_exact_strips_cr(body)

def clean_choice_step(cr: Bool, -text: String) -> {Recognizer.clean_checked(text, cr) == Bool.pick(String, cr, Recognizer.clean_exact(text), text) : String}:
  match cr:
    case False{}:
      {==}
    case True{}:
      {==}

def Laws.recognizer_clean_choice(text):
  clean_choice_step(Recognizer.ends_cr(text, False{}), text)

def Laws.recognizer_ends_trimmed_exact(text, suffix):
  %Laws.text_base_reverse_reverse(String.trim_start(String.reverse(String.trim_start(text)))) : {String.starts_with(_, String.reverse(suffix)) == String.starts_with(String.reverse(String.reverse(String.trim_start(String.reverse(String.trim_start(text))))), String.reverse(suffix)) : Bool}
  {==}

# `clean` is `clean_exact` on every line. What was missing above is that
# `clean_exact` returns a line that does not end in CR unchanged. `clean_reverse`
# matches the literal '\r'; a character that `Char.is_eq` says is not '\r'
# differs from it in some bit, and each of those 32 cases computes (the 33rd,
# all bits equal, contradicts the hypothesis).
def true_differs(b: Bool) -> Type:
  match b:
    case False{}:
      Empty
    case True{}:
      Unit

def true_is_not_false(e: {True{} == False{} : Bool}) -> Empty:
  %e : true_differs(_)
  Unit{}

def clean_reverse_other_bits(b0: Bool, b1: Bool, b2: Bool, b3: Bool, b4: Bool, b5: Bool, b6: Bool, b7: Bool, b8: Bool, b9: Bool, b10: Bool, b11: Bool, b12: Bool, b13: Bool, b14: Bool, b15: Bool, b16: Bool, b17: Bool, b18: Bool, b19: Bool, b20: Bool, b21: Bool, b22: Bool, b23: Bool, b24: Bool, b25: Bool, b26: Bool, b27: Bool, b28: Bool, b29: Bool, b30: Bool, b31: Bool, -rest: String, e: {Char.is_eq(Chr{U32{WCon{b0, WCon{b1, WCon{b2, WCon{b3, WCon{b4, WCon{b5, WCon{b6, WCon{b7, WCon{b8, WCon{b9, WCon{b10, WCon{b11, WCon{b12, WCon{b13, WCon{b14, WCon{b15, WCon{b16, WCon{b17, WCon{b18, WCon{b19, WCon{b20, WCon{b21, WCon{b22, WCon{b23, WCon{b24, WCon{b25, WCon{b26, WCon{b27, WCon{b28, WCon{b29, WCon{b30, WCon{b31, WNil{}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, '\r') == False{} : Bool}) -> {Recognizer.clean_reverse(SCon{Chr{U32{WCon{b0, WCon{b1, WCon{b2, WCon{b3, WCon{b4, WCon{b5, WCon{b6, WCon{b7, WCon{b8, WCon{b9, WCon{b10, WCon{b11, WCon{b12, WCon{b13, WCon{b14, WCon{b15, WCon{b16, WCon{b17, WCon{b18, WCon{b19, WCon{b20, WCon{b21, WCon{b22, WCon{b23, WCon{b24, WCon{b25, WCon{b26, WCon{b27, WCon{b28, WCon{b29, WCon{b30, WCon{b31, WNil{}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, rest}) == String.reverse(SCon{Chr{U32{WCon{b0, WCon{b1, WCon{b2, WCon{b3, WCon{b4, WCon{b5, WCon{b6, WCon{b7, WCon{b8, WCon{b9, WCon{b10, WCon{b11, WCon{b12, WCon{b13, WCon{b14, WCon{b15, WCon{b16, WCon{b17, WCon{b18, WCon{b19, WCon{b20, WCon{b21, WCon{b22, WCon{b23, WCon{b24, WCon{b25, WCon{b26, WCon{b27, WCon{b28, WCon{b29, WCon{b30, WCon{b31, WNil{}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, rest}) : String}:
  match b0 b1 b2 b3 b4 b5 b6 b7 b8 b9 b10 b11 b12 b13 b14 b15 b16 b17 b18 b19 b20 b21 b22 b23 b24 b25 b26 b27 b28 b29 b30 b31:
    case False{} x1 x2 x3 x4 x5 x6 x7 x8 x9 x10 x11 x12 x13 x14 x15 x16 x17 x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} True{} x2 x3 x4 x5 x6 x7 x8 x9 x10 x11 x12 x13 x14 x15 x16 x17 x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} False{} x3 x4 x5 x6 x7 x8 x9 x10 x11 x12 x13 x14 x15 x16 x17 x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} False{} x4 x5 x6 x7 x8 x9 x10 x11 x12 x13 x14 x15 x16 x17 x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} True{} x5 x6 x7 x8 x9 x10 x11 x12 x13 x14 x15 x16 x17 x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} True{} x6 x7 x8 x9 x10 x11 x12 x13 x14 x15 x16 x17 x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} True{} x7 x8 x9 x10 x11 x12 x13 x14 x15 x16 x17 x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} True{} x8 x9 x10 x11 x12 x13 x14 x15 x16 x17 x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} True{} x9 x10 x11 x12 x13 x14 x15 x16 x17 x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} True{} x10 x11 x12 x13 x14 x15 x16 x17 x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} True{} x11 x12 x13 x14 x15 x16 x17 x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} False{} True{} x12 x13 x14 x15 x16 x17 x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} False{} False{} True{} x13 x14 x15 x16 x17 x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} False{} False{} False{} True{} x14 x15 x16 x17 x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} True{} x15 x16 x17 x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} True{} x16 x17 x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} True{} x17 x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} True{} x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} True{} x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} True{} x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} True{} x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} True{} x22 x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} True{} x23 x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} True{} x24 x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} True{} x25 x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} True{} x26 x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} True{} x27 x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} True{} x28 x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} True{} x29 x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} True{} x30 x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} True{} x31:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} True{}:
      {==}
    case True{} False{} True{} True{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{} False{}:
      impossible({Recognizer.clean_reverse(SCon{Chr{U32{WCon{True{}, WCon{False{}, WCon{True{}, WCon{True{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WNil{}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, rest}) == String.reverse(SCon{Chr{U32{WCon{True{}, WCon{False{}, WCon{True{}, WCon{True{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WCon{False{}, WNil{}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}, rest}) : String}, true_is_not_false(e))

def clean_reverse_other(c: Char, -rest: String, e: {Char.is_eq(c, '\r') == False{} : Bool}) -> {Recognizer.clean_reverse(SCon{c, rest}) == String.reverse(SCon{c, rest}) : String}:
  match c:
    case Chr{U32{WCon{b0, WCon{b1, WCon{b2, WCon{b3, WCon{b4, WCon{b5, WCon{b6, WCon{b7, WCon{b8, WCon{b9, WCon{b10, WCon{b11, WCon{b12, WCon{b13, WCon{b14, WCon{b15, WCon{b16, WCon{b17, WCon{b18, WCon{b19, WCon{b20, WCon{b21, WCon{b22, WCon{b23, WCon{b24, WCon{b25, WCon{b26, WCon{b27, WCon{b28, WCon{b29, WCon{b30, WCon{b31, WNil{}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}:
      clean_reverse_other_bits(b0, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12, b13, b14, b15, b16, b17, b18, b19, b20, b21, b22, b23, b24, b25, b26, b27, b28, b29, b30, b31, rest, e)


def clean_head_cr(acc: String) -> Bool:
  match acc:
    case SNil{}:
      False{}
    case SCon{h, t}:
      Char.is_eq(h, '\r')

def clean_reverse_plain(acc: String, e: {clean_head_cr(acc) == False{} : Bool}) -> {Recognizer.clean_reverse(acc) == String.reverse(acc) : String}:
  match acc:
    case SNil{}:
      {==}
    case SCon{c, rest}:
      clean_reverse_other(c, rest, e)

def clean_exact_go(+text: String, +acc: String, e: {Recognizer.ends_cr(text, clean_head_cr(acc)) == False{} : Bool}) -> {Recognizer.clean_reverse(String.reverse.go(text, acc)) == String.reverse(String.reverse.go(text, acc)) : String}:
  match text:
    case SNil{}:
      clean_reverse_plain(acc, e)
    case SCon{h, t}:
      clean_exact_go(t, SCon{h, acc}, e)

def clean_exact_plain(+text: String, e: {Recognizer.ends_cr(text, False{}) == False{} : Bool}) -> {Recognizer.clean_exact(text) == text : String}:
  Equal.trans(String, Recognizer.clean_exact(text), String.reverse(String.reverse(text)), text, clean_exact_go(text, SNil{}, e), Laws.text_base_reverse_reverse(text))

def clean_same_step(cr: Bool, +text: String, e: {cr == Recognizer.ends_cr(text, False{}) : Bool}) -> {Recognizer.clean_checked(text, cr) == Recognizer.clean_exact(text) : String}:
  match cr:
    case True{}:
      {==}
    case False{}:
      Equal.sym(String, Recognizer.clean_exact(text), text, clean_exact_plain(text, Equal.sym(Bool, False{}, Recognizer.ends_cr(text, False{}), e)))

def clean_same(+text: String) -> {Recognizer.clean(text) == Recognizer.clean_exact(text) : String}:
  clean_same_step(Recognizer.ends_cr(text, False{}), text, {==})

def Laws.recognizer_clean_exact(text):
  clean_same(text)

# ── Schema lookups that stop at the match ───────────────────────────────────
def schema_member_step(same: Bool, -name: String, -value: Annotation.Json, -rest: List<&2, Annotation.Member>, -key: String, ih: {AnnotationSchema.member(rest, key) == AnnotationSchema.member_exact(rest, key) : Annotation.Field<Annotation.Json>}) -> {AnnotationSchema.member_go(Con{Annotation.Member{name, value}, rest}, key, same) == Bool.pick(Annotation.Field<Annotation.Json>, same, Annotation.PresentField{value}, AnnotationSchema.member_exact(rest, key)) : Annotation.Field<Annotation.Json>}:
  match same:
    case False{}:
      ih
    case True{}:
      {==}

def Laws.schema_member_exact(fields, key):
  match fields:
    case Nil{}:
      {==}
    case Con{Annotation.Member{name, value}, rest}:
      schema_member_step(String.eq(name, key), name, value, rest, key, Laws.schema_member_exact(rest, key))

def schema_known_step(same: Bool, -name: String, -rest: List<&2, String>, -key: String, ih: {AnnotationSchema.known(rest, key) == AnnotationSchema.known_exact(rest, key) : Bool}) -> {AnnotationSchema.known_go(Con{name, rest}, key, same) == Bool.or(same, AnnotationSchema.known_exact(rest, key)) : Bool}:
  match same:
    case False{}:
      ih
    case True{}:
      {==}

def Laws.schema_known_exact(names, key):
  match names:
    case Nil{}:
      {==}
    case Con{name, rest}:
      schema_known_step(String.eq(name, key), name, rest, key, Laws.schema_known_exact(rest, key))

# ── Stretches of a note ─────────────────────────────────────────────────────
# A stretch scanned on its own, as if at line 1 with nothing before it, is the
# same stretch scanned in its place, once its line numbers are moved by the
# lines before it and its parts set on the parts before it. The lemmas below
# say so for each scanner function, then for a line, a run of lines, and a
# list of stretches.
# Modes that hold no line number are their own image when moved.
def mv_mode_comment(-k: Nat, inside: Bool) -> {Segments.move_mode(k, Recognizer.mode_comment(inside)) == Recognizer.mode_comment(inside) : Recognizer.Mode}:
  match inside:
    case False{}:
      {==}
    case True{}:
      {==}

def mv_mode_plain_comment(-k: Nat, marker: Bool, inside: Bool) -> {Segments.move_mode(k, Bool.pick(Recognizer.Mode, marker, Recognizer.ObsidianComment{}, Recognizer.mode_comment(inside))) == Bool.pick(Recognizer.Mode, marker, Recognizer.ObsidianComment{}, Recognizer.mode_comment(inside)) : Recognizer.Mode}:
  match marker inside:
    case False{} False{}:
      {==}
    case False{} True{}:
      {==}
    case True{} False{}:
      {==}
    case True{} True{}:
      {==}

def mv_mode_fence(-k: Nat, mode: Recognizer.Mode, plain: {Segments.fence_plain(Some{mode}) == True{} : Bool}) -> {Segments.move_mode(k, mode) == mode : Recognizer.Mode}:
  match mode:
    case Recognizer.Neutral{}:
      {==}
    case Recognizer.AfterAnnotation{}:
      {==}
    case Recognizer.Opening{first, start}:
      impossible({Segments.move_mode(k, Recognizer.Opening{first, start}) == Recognizer.Opening{first, start} : Recognizer.Mode}, false_is_not_true(plain))
    case Recognizer.Candidate{first, lines, start, formatted}:
      impossible({Segments.move_mode(k, Recognizer.Candidate{first, lines, start, formatted}) == Recognizer.Candidate{first, lines, start, formatted} : Recognizer.Mode}, false_is_not_true(plain))
    case Recognizer.Fence{char, size, quoted}:
      {==}
    case Recognizer.HtmlComment{}:
      {==}
    case Recognizer.ObsidianComment{}:
      {==}
    case Recognizer.Frontmatter{}:
      {==}
    case Recognizer.OpaqueHtml{}:
      {==}
    case Recognizer.ListBody{}:
      {==}

# Each scanner function, given the parts `new` moved by `k` on top of `under`
# and its line moved by `k`, returns its plain result moved by `k` on `under`.
def mv_emit_mode(+k: Nat, +raw: String, -mode: Recognizer.Mode, +new: List<&2, Recognizer.Part>, +under: List<&2, Recognizer.Part>, +line: Nat, same: {Segments.move_mode(k, mode) == mode : Recognizer.Mode}) -> {Recognizer.emit(raw, mode, List.append(&2, Recognizer.Part, Segments.move_parts(k, new), under), Nat.add(line, k)) == Segments.onto(Segments.move_state(k, Recognizer.emit(raw, mode, new, line)), under) : Recognizer.ScanState}:
  %same : {Recognizer.ScanState{_, Con{Recognizer.RawPart{raw}, List.append(&2, Recognizer.Part, Segments.move_parts(k, new), under)}, 1n+Nat.add(line, k)} == Recognizer.ScanState{Segments.move_mode(k, mode), Con{Recognizer.RawPart{raw}, List.append(&2, Recognizer.Part, Segments.move_parts(k, new), under)}, 1n+Nat.add(line, k)} : Recognizer.ScanState}
  {==}

def mv_raw_context(+k: Nat, +raw: String, +text: String, +new: List<&2, Recognizer.Part>, +under: List<&2, Recognizer.Part>, +line: Nat, unsupported: Bool) -> {Recognizer.raw_context(raw, text, List.append(&2, Recognizer.Part, Segments.move_parts(k, new), under), Nat.add(line, k), unsupported) == Segments.onto(Segments.move_state(k, Recognizer.raw_context(raw, text, new, line, unsupported)), under) : Recognizer.ScanState}:
  match unsupported:
    case True{}:
      {==}
    case False{}:
      mv_emit_mode(k, raw, Recognizer.plain_comment_mode(text), new, under, line, mv_mode_plain_comment(k, Recognizer.is_marker(text, "%%"), Recognizer.comment_state(text, False{})))

def mv_quoted_context(+k: Nat, +raw: String, +text: String, +new: List<&2, Recognizer.Part>, +under: List<&2, Recognizer.Part>, +line: Nat, fence: Maybe<&2, Recognizer.Mode>) -> {Recognizer.quoted_context(raw, text, List.append(&2, Recognizer.Part, Segments.move_parts(k, new), under), Nat.add(line, k), fence) == Segments.onto(Segments.move_state(k, Recognizer.quoted_context(raw, text, new, line, fence)), under) : Recognizer.ScanState}:
  match fence:
    case None{}:
      mv_raw_context(k, raw, text, new, under, line, Bool.and(Recognizer.starts_trimmed(text, "<"), Bool.not(Recognizer.starts_trimmed(text, "<!--"))))
    case Some{Recognizer.Neutral{}}:
      mv_raw_context(k, raw, text, new, under, line, Bool.and(Recognizer.starts_trimmed(text, "<"), Bool.not(Recognizer.starts_trimmed(text, "<!--"))))
    case Some{Recognizer.AfterAnnotation{}}:
      mv_raw_context(k, raw, text, new, under, line, Bool.and(Recognizer.starts_trimmed(text, "<"), Bool.not(Recognizer.starts_trimmed(text, "<!--"))))
    case Some{Recognizer.Opening{first, start}}:
      mv_raw_context(k, raw, text, new, under, line, Bool.and(Recognizer.starts_trimmed(text, "<"), Bool.not(Recognizer.starts_trimmed(text, "<!--"))))
    case Some{Recognizer.Candidate{first, lines, start, formatted}}:
      mv_raw_context(k, raw, text, new, under, line, Bool.and(Recognizer.starts_trimmed(text, "<"), Bool.not(Recognizer.starts_trimmed(text, "<!--"))))
    case Some{Recognizer.Fence{char, size, quoted}}:
      {==}
    case Some{Recognizer.HtmlComment{}}:
      mv_raw_context(k, raw, text, new, under, line, Bool.and(Recognizer.starts_trimmed(text, "<"), Bool.not(Recognizer.starts_trimmed(text, "<!--"))))
    case Some{Recognizer.ObsidianComment{}}:
      mv_raw_context(k, raw, text, new, under, line, Bool.and(Recognizer.starts_trimmed(text, "<"), Bool.not(Recognizer.starts_trimmed(text, "<!--"))))
    case Some{Recognizer.Frontmatter{}}:
      mv_raw_context(k, raw, text, new, under, line, Bool.and(Recognizer.starts_trimmed(text, "<"), Bool.not(Recognizer.starts_trimmed(text, "<!--"))))
    case Some{Recognizer.OpaqueHtml{}}:
      mv_raw_context(k, raw, text, new, under, line, Bool.and(Recognizer.starts_trimmed(text, "<"), Bool.not(Recognizer.starts_trimmed(text, "<!--"))))
    case Some{Recognizer.ListBody{}}:
      mv_raw_context(k, raw, text, new, under, line, Bool.and(Recognizer.starts_trimmed(text, "<"), Bool.not(Recognizer.starts_trimmed(text, "<!--"))))

def mv_normal_quote(+k: Nat, +raw: String, +text: String, +new: List<&2, Recognizer.Part>, +under: List<&2, Recognizer.Part>, +line: Nat, quoted: Maybe<&2, String>) -> {Recognizer.normal_quote(raw, text, List.append(&2, Recognizer.Part, Segments.move_parts(k, new), under), Nat.add(line, k), quoted) == Segments.onto(Segments.move_state(k, Recognizer.normal_quote(raw, text, new, line, quoted)), under) : Recognizer.ScanState}:
  match quoted:
    case None{}:
      mv_raw_context(k, raw, text, new, under, line, Bool.and(Recognizer.starts_trimmed(text, "<"), Bool.not(Recognizer.starts_trimmed(text, "<!--"))))
    case Some{+q}:
      mv_quoted_context(k, raw, q, new, under, line, Recognizer.fence_start(q))

def mv_normal_list(+k: Nat, +raw: String, +text: String, +new: List<&2, Recognizer.Part>, +under: List<&2, Recognizer.Part>, +line: Nat, listed: Bool) -> {Recognizer.normal_list(raw, text, List.append(&2, Recognizer.Part, Segments.move_parts(k, new), under), Nat.add(line, k), listed) == Segments.onto(Segments.move_state(k, Recognizer.normal_list(raw, text, new, line, listed)), under) : Recognizer.ScanState}:
  match listed:
    case True{}:
      {==}
    case False{}:
      mv_normal_quote(k, raw, text, new, under, line, Recognizer.unquote(text))

def mv_normal_fence(+k: Nat, +raw: String, +text: String, +new: List<&2, Recognizer.Part>, +under: List<&2, Recognizer.Part>, +line: Nat, fence: Maybe<&2, Recognizer.Mode>, plain: {Segments.fence_plain(fence) == True{} : Bool}) -> {Recognizer.normal_fence(raw, text, List.append(&2, Recognizer.Part, Segments.move_parts(k, new), under), Nat.add(line, k), fence) == Segments.onto(Segments.move_state(k, Recognizer.normal_fence(raw, text, new, line, fence)), under) : Recognizer.ScanState}:
  match fence:
    case None{}:
      mv_normal_list(k, raw, text, new, under, line, Recognizer.list_start(Recognizer.indent(text, 3n)))
    case Some{mode}:
      mv_emit_mode(k, raw, mode, new, under, line, mv_mode_fence(k, mode, plain))

def mv_normal_open(+k: Nat, +raw: String, +text: String, +new: List<&2, Recognizer.Part>, +under: List<&2, Recognizer.Part>, +line: Nat, opening: Bool, orphan: Bool, +plain: {Segments.fence_plain(Recognizer.fence_start(Recognizer.indent(text, 3n))) == True{} : Bool}) -> {Recognizer.normal_open(raw, text, List.append(&2, Recognizer.Part, Segments.move_parts(k, new), under), Nat.add(line, k), opening, orphan) == Segments.onto(Segments.move_state(k, Recognizer.normal_open(raw, text, new, line, opening, orphan)), under) : Recognizer.ScanState}:
  match opening orphan:
    case True{} False{}:
      {==}
    case True{} True{}:
      {==}
    case False{} True{}:
      {==}
    case False{} False{}:
      mv_normal_fence(k, raw, text, new, under, line, Recognizer.fence_start(Recognizer.indent(text, 3n)), plain)

def mv_normal_frontmatter(+k: Nat, +raw: String, +text: String, +new: List<&2, Recognizer.Part>, +under: List<&2, Recognizer.Part>, +line: Nat, front: Bool, +plain: {Segments.fence_plain(Recognizer.fence_start(Recognizer.indent(text, 3n))) == True{} : Bool}) -> {Recognizer.normal_frontmatter(raw, text, List.append(&2, Recognizer.Part, Segments.move_parts(k, new), under), Nat.add(line, k), front) == Segments.onto(Segments.move_state(k, Recognizer.normal_frontmatter(raw, text, new, line, front)), under) : Recognizer.ScanState}:
  match front:
    case True{}:
      {==}
    case False{}:
      mv_normal_open(k, raw, text, new, under, line, Recognizer.quoted_marker(Recognizer.unquote(text), "%%"), Recognizer.quoted_header(Recognizer.unquote(text)), plain)

# After its first line the scanner no longer looks for a BOM or frontmatter.
def mv_normal(+k: Nat, +raw: String, +text: String, +new: List<&2, Recognizer.Part>, +under: List<&2, Recognizer.Part>, +q: Nat, +plain: {Segments.fence_plain(Recognizer.fence_start(Recognizer.indent(text, 3n))) == True{} : Bool}) -> {Recognizer.normal(raw, text, List.append(&2, Recognizer.Part, Segments.move_parts(k, new), under), Nat.add(1n+q, k)) == Segments.onto(Segments.move_state(k, Recognizer.normal(raw, text, new, 1n+q)), under) : Recognizer.ScanState}:
  mv_normal_frontmatter(k, raw, text, new, under, 1n+q, False{}, plain)

def mv_opening_next(+k: Nat, +raw: String, +text: String, +first: String, +start: Nat, +new: List<&2, Recognizer.Part>, +under: List<&2, Recognizer.Part>, +q: Nat, header: Bool, +plain: {Segments.fence_plain(Recognizer.fence_start(Recognizer.indent(text, 3n))) == True{} : Bool}) -> {Recognizer.opening_next(raw, text, first, Nat.add(start, k), List.append(&2, Recognizer.Part, Segments.move_parts(k, new), under), Nat.add(1n+q, k), header) == Segments.onto(Segments.move_state(k, Recognizer.opening_next(raw, text, first, start, new, 1n+q, header)), under) : Recognizer.ScanState}:
  match header:
    case True{}:
      {==}
    case False{}:
      mv_normal(k, raw, text, Con{Recognizer.RawPart{first}, new}, under, q, plain)

def mv_candidate_fields(+k: Nat, +raw: String, +id: String, +start: Nat, +new: List<&2, Recognizer.Part>, +under: List<&2, Recognizer.Part>, +line: Nat, fields: Maybe<&2, Recognizer.Legacy>) -> {Recognizer.candidate_fields(raw, id, Nat.add(start, k), List.append(&2, Recognizer.Part, Segments.move_parts(k, new), under), Nat.add(line, k), fields) == Segments.onto(Segments.move_state(k, Recognizer.candidate_fields(raw, id, start, new, line, fields)), under) : Recognizer.ScanState}:
  match fields:
    case Some{data}:
      {==}
    case None{}:
      {==}

def mv_candidate_anchor(+k: Nat, +raw: String, +lines: List<&2, String>, +start: Nat, +new: List<&2, Recognizer.Part>, +under: List<&2, Recognizer.Part>, +line: Nat, id: Maybe<&2, String>) -> {Recognizer.candidate_anchor(raw, lines, Nat.add(start, k), List.append(&2, Recognizer.Part, Segments.move_parts(k, new), under), Nat.add(line, k), id) == Segments.onto(Segments.move_state(k, Recognizer.candidate_anchor(raw, lines, start, new, line, id)), under) : Recognizer.ScanState}:
  match id:
    case Some{x}:
      mv_candidate_fields(k, raw, x, start, new, under, line, Recognizer.body(List.reverse(&2, String, lines)))
    case None{}:
      {==}

def mv_candidate_line(+k: Nat, +raw: String, +text: String, +first: String, +lines: List<&2, String>, +start: Nat, +formatted: Bool, +new: List<&2, Recognizer.Part>, +under: List<&2, Recognizer.Part>, +line: Nat, quoted: Maybe<&2, String>) -> {Recognizer.candidate_line(raw, text, first, lines, Nat.add(start, k), formatted, List.append(&2, Recognizer.Part, Segments.move_parts(k, new), under), Nat.add(line, k), quoted) == Segments.onto(Segments.move_state(k, Recognizer.candidate_line(raw, text, first, lines, start, formatted, new, line, quoted)), under) : Recognizer.ScanState}:
  match quoted:
    case Some{q}:
      {==}
    case None{}:
      mv_candidate_anchor(k, String.append(first, raw), lines, start, new, under, line, Recognizer.anchor(text))

def mv_fence_line(+k: Nat, +raw: String, +char: Char, +size: Nat, +quoted: Bool, +new: List<&2, Recognizer.Part>, +under: List<&2, Recognizer.Part>, +line: Nat, closed: Bool) -> {Recognizer.fence_line(raw, char, size, quoted, List.append(&2, Recognizer.Part, Segments.move_parts(k, new), under), Nat.add(line, k), closed) == Segments.onto(Segments.move_state(k, Recognizer.fence_line(raw, char, size, quoted, new, line, closed)), under) : Recognizer.ScanState}:
  match closed:
    case True{}:
      {==}
    case False{}:
      {==}

def mv_context_line(+k: Nat, +raw: String, +mode: Recognizer.Mode, +new: List<&2, Recognizer.Part>, +under: List<&2, Recognizer.Part>, +line: Nat, closed: Bool) -> {Recognizer.context_line(raw, Segments.move_mode(k, mode), List.append(&2, Recognizer.Part, Segments.move_parts(k, new), under), Nat.add(line, k), closed) == Segments.onto(Segments.move_state(k, Recognizer.context_line(raw, mode, new, line, closed)), under) : Recognizer.ScanState}:
  match closed:
    case True{}:
      {==}
    case False{}:
      {==}

def mv_list_line(+k: Nat, +raw: String, +text: String, +new: List<&2, Recognizer.Part>, +under: List<&2, Recognizer.Part>, +q: Nat, blank: Bool, indented: Bool, candidate: Bool, +plain: {Segments.fence_plain(Recognizer.fence_start(Recognizer.indent(text, 3n))) == True{} : Bool}) -> {Recognizer.list_line(raw, text, List.append(&2, Recognizer.Part, Segments.move_parts(k, new), under), Nat.add(1n+q, k), blank, indented, candidate) == Segments.onto(Segments.move_state(k, Recognizer.list_line(raw, text, new, 1n+q, blank, indented, candidate)), under) : Recognizer.ScanState}:
  match blank indented candidate:
    case True{} x y:
      {==}
    case False{} True{} True{}:
      {==}
    case False{} True{} False{}:
      {==}
    case False{} False{} y:
      mv_normal(k, raw, text, new, under, q, plain)

# The one function that looks at the part before the line: the part must be
# one of the stretch's own, which `settled` says.
def mv_after_annotation(+k: Nat, +raw: String, +text: String, new: List<&2, Recognizer.Part>, +under: List<&2, Recognizer.Part>, +q: Nat, blank: Bool, settled: {Segments.settled(Recognizer.AfterAnnotation{}, new) == True{} : Bool}, +plain: {Segments.fence_plain(Recognizer.fence_start(Recognizer.indent(text, 3n))) == True{} : Bool}) -> {Recognizer.after_annotation(raw, text, List.append(&2, Recognizer.Part, Segments.move_parts(k, new), under), Nat.add(1n+q, k), blank) == Segments.onto(Segments.move_state(k, Recognizer.after_annotation(raw, text, new, 1n+q, blank)), under) : Recognizer.ScanState}:
  match new blank:
    case Nil{} b:
      impossible({Recognizer.after_annotation(raw, text, List.append(&2, Recognizer.Part, Segments.move_parts(k, Nil{}), under), Nat.add(1n+q, k), blank) == Segments.onto(Segments.move_state(k, Recognizer.after_annotation(raw, text, Nil{}, 1n+q, blank)), under) : Recognizer.ScanState}, false_is_not_true(settled))
    case Con{Recognizer.AnnotationPart{id, previous, fields, start}, rest} True{}:
      {==}
    case Con{Recognizer.AnnotationPart{id, previous, fields, start}, rest} False{}:
      mv_normal(k, raw, text, Con{Recognizer.AnnotationPart{id, previous, fields, start}, rest}, under, q, plain)
    case Con{Recognizer.RawPart{text0}, rest} b:
      mv_normal(k, raw, text, Con{Recognizer.RawPart{text0}, rest}, under, q, plain)
    case Con{Recognizer.CandidateError{text0, message, start}, rest} b:
      mv_normal(k, raw, text, Con{Recognizer.CandidateError{text0, message, start}, rest}, under, q, plain)

# One line: the step from a moved state on `under` is the moved step on `under`.
def mv_step(+k: Nat, mode: Recognizer.Mode, +raw: String, +text: String, +new: List<&2, Recognizer.Part>, +under: List<&2, Recognizer.Part>, +q: Nat, settled: {Segments.settled(mode, new) == True{} : Bool}, +plain: {Segments.fence_plain(Recognizer.fence_start(Recognizer.indent(text, 3n))) == True{} : Bool}) -> {Recognizer.step(Segments.move_mode(k, mode), raw, text, List.append(&2, Recognizer.Part, Segments.move_parts(k, new), under), Nat.add(1n+q, k)) == Segments.onto(Segments.move_state(k, Recognizer.step(mode, raw, text, new, 1n+q)), under) : Recognizer.ScanState}:
  match mode:
    case Recognizer.Neutral{}:
      mv_normal(k, raw, text, new, under, q, plain)
    case Recognizer.AfterAnnotation{}:
      mv_after_annotation(k, raw, text, new, under, q, String.is_empty(text), settled, plain)
    case Recognizer.Opening{first, start}:
      mv_opening_next(k, raw, text, first, start, new, under, q, Recognizer.header(Recognizer.unquote(text)), plain)
    case Recognizer.Candidate{first, lines, start, +formatted}:
      mv_candidate_line(k, raw, text, first, lines, start, formatted, new, under, 1n+q, Recognizer.unquote_style(text, formatted))
    case Recognizer.Fence{+char, +size, +quoted}:
      mv_fence_line(k, raw, char, size, quoted, new, under, 1n+q, Recognizer.close_kind(text, char, size, quoted))
    case Recognizer.HtmlComment{}:
      mv_emit_mode(k, raw, Recognizer.mode_comment(Recognizer.comment_state(text, True{})), new, under, 1n+q, mv_mode_comment(k, Recognizer.comment_state(text, True{})))
    case Recognizer.ObsidianComment{}:
      mv_context_line(k, raw, Recognizer.ObsidianComment{}, new, under, 1n+q, Recognizer.is_marker(text, "%%"))
    case Recognizer.Frontmatter{}:
      mv_context_line(k, raw, Recognizer.Frontmatter{}, new, under, 1n+q, Bool.or(Recognizer.is_marker(text, "---"), Recognizer.is_marker(text, "...")))
    case Recognizer.OpaqueHtml{}:
      mv_context_line(k, raw, Recognizer.OpaqueHtml{}, new, under, 1n+q, String.is_empty(String.trim(text)))
    case Recognizer.ListBody{}:
      mv_list_line(k, raw, text, new, under, q, String.is_empty(String.trim(text)), Bool.or(String.starts_with(text, " "), String.starts_with(text, "\t")), Bool.or(Recognizer.quoted_marker(Recognizer.unquote(text), "%%"), Recognizer.quoted_header(Recognizer.unquote(text))), plain)

# Running over appended lines is running one list after the other.
def run_append(+a: List<&2, Document.Line>, +b: List<&2, Document.Line>, state: Recognizer.ScanState) -> {Recognizer.run(List.append(&2, Document.Line, a, b), state) == Recognizer.run(b, Recognizer.run(a, state)) : Recognizer.ScanState}:
  match a state:
    case Nil{} st:
      {==}
    case Con{Document.Line{+text, +ending}, rest} Recognizer.ScanState{mode, parts, line}:
      run_append(rest, b, Recognizer.step(mode, Document.encode([Document.Line{text, ending}]), Recognizer.clean(text), parts, line))

# What the checked run establishes: run from the moved state on `under`, the
# lines lead to the moved result on `under`.
def moved_claim(+k: Nat, lines: List<&2, Document.Line>, state: Recognizer.ScanState, +under: List<&2, Recognizer.Part>, outcome: Maybe<&2, Recognizer.ScanState>) -> Type:
  match outcome:
    case None{}:
      Unit
    case Some{result}:
      {Recognizer.run(lines, Segments.onto(Segments.move_state(k, state), under)) == Segments.onto(Segments.move_state(k, result), under) : Recognizer.ScanState}

def moved_lift(+k: Nat, +body: String, +ending: Maybe<&2, Char>, +rest: List<&2, Document.Line>, +mode: Recognizer.Mode, +parts: List<&2, Recognizer.Part>, +q: Nat, +under: List<&2, Recognizer.Part>, +next: Recognizer.ScanState, outcome: Maybe<&2, Recognizer.ScanState>, stepped: {Recognizer.step(Segments.move_mode(k, mode), Document.encode([Document.Line{body, ending}]), Recognizer.clean(body), List.append(&2, Recognizer.Part, Segments.move_parts(k, parts), under), Nat.add(1n+q, k)) == Segments.onto(Segments.move_state(k, next), under) : Recognizer.ScanState}, ih: moved_claim(k, rest, next, under, outcome)) -> moved_claim(k, Con{Document.Line{body, ending}, rest}, Recognizer.ScanState{mode, parts, 1n+q}, under, outcome):
  match outcome:
    case None{}:
      Unit{}
    case Some{result}:
      %Equal.sym(Recognizer.ScanState, Recognizer.step(Segments.move_mode(k, mode), Document.encode([Document.Line{body, ending}]), Recognizer.clean(body), List.append(&2, Recognizer.Part, Segments.move_parts(k, parts), under), Nat.add(1n+q, k)), Segments.onto(Segments.move_state(k, next), under), stepped) : {Recognizer.run(rest, _) == Segments.onto(Segments.move_state(k, result), under) : Recognizer.ScanState}
      ih

def plain_at(-text: String, -cleaned: String, same: {text == cleaned : String}, plain: {Segments.fence_plain(Recognizer.fence_start(Recognizer.indent(text, 3n))) == True{} : Bool}) -> {Segments.fence_plain(Recognizer.fence_start(Recognizer.indent(cleaned, 3n))) == True{} : Bool}:
  %same : {Segments.fence_plain(Recognizer.fence_start(Recognizer.indent(_, 3n))) == True{} : Bool}
  plain

def mv_checked_line(+k: Nat, +body: String, +ending: Maybe<&2, Char>, +rest: List<&2, Document.Line>, +text: String, +mode: Recognizer.Mode, +parts: List<&2, Recognizer.Part>, +q: Nat, +under: List<&2, Recognizer.Part>, +et: {text == Recognizer.clean(body) : String}, +eg: {True{} == Bool.and(Segments.settled(mode, parts), Segments.fence_plain(Recognizer.fence_start(Recognizer.indent(text, 3n)))) : Bool}, ih: moved_claim(k, rest, Recognizer.step(mode, Document.encode([Document.Line{body, ending}]), Recognizer.clean(body), parts, 1n+q), under, Segments.checked(rest, Segments.head_text(rest), Segments.ready(Recognizer.step(mode, Document.encode([Document.Line{body, ending}]), Recognizer.clean(body), parts, 1n+q), Segments.head_text(rest)), Recognizer.step(mode, Document.encode([Document.Line{body, ending}]), Recognizer.clean(body), parts, 1n+q)))) -> moved_claim(k, Con{Document.Line{body, ending}, rest}, Recognizer.ScanState{mode, parts, 1n+q}, under, Segments.checked(Con{Document.Line{body, ending}, rest}, text, True{}, Recognizer.ScanState{mode, parts, 1n+q})):
  %Equal.sym(String, text, Recognizer.clean(body), et) : moved_claim(k, Con{Document.Line{body, ending}, rest}, Recognizer.ScanState{mode, parts, 1n+q}, under, Segments.checked(Con{Document.Line{body, ending}, rest}, _, True{}, Recognizer.ScanState{mode, parts, 1n+q}))
  moved_lift(k, body, ending, rest, mode, parts, q, under, Recognizer.step(mode, Document.encode([Document.Line{body, ending}]), Recognizer.clean(body), parts, 1n+q), Segments.checked(rest, Segments.head_text(rest), Segments.ready(Recognizer.step(mode, Document.encode([Document.Line{body, ending}]), Recognizer.clean(body), parts, 1n+q), Segments.head_text(rest)), Recognizer.step(mode, Document.encode([Document.Line{body, ending}]), Recognizer.clean(body), parts, 1n+q)), mv_step(k, mode, Document.encode([Document.Line{body, ending}]), Recognizer.clean(body), parts, under, q, bool_and_left(Segments.settled(mode, parts), Segments.fence_plain(Recognizer.fence_start(Recognizer.indent(text, 3n))), Equal.sym(Bool, True{}, Bool.and(Segments.settled(mode, parts), Segments.fence_plain(Recognizer.fence_start(Recognizer.indent(text, 3n)))), eg)), plain_at(text, Recognizer.clean(body), et, bool_and_right(Segments.settled(mode, parts), Segments.fence_plain(Recognizer.fence_start(Recognizer.indent(text, 3n))), Equal.sym(Bool, True{}, Bool.and(Segments.settled(mode, parts), Segments.fence_plain(Recognizer.fence_start(Recognizer.indent(text, 3n)))), eg)))), ih)

def mv_checked(+k: Nat, +lines: List<&2, Document.Line>, +text: String, good: Bool, +state: Recognizer.ScanState, +under: List<&2, Recognizer.Part>, +et: {text == Segments.head_text(lines) : String}, +eg: {good == Segments.ready(state, text) : Bool}) -> moved_claim(k, lines, state, under, Segments.checked(lines, text, good, state)):
  match lines good state:
    case Nil{} g st:
      {==}
    case Con{line, rest} False{} st:
      Unit{}
    case Con{Document.Line{body, ending}, rest} True{} Recognizer.ScanState{mode, parts, 0n}:
      impossible(moved_claim(k, Con{Document.Line{body, ending}, rest}, Recognizer.ScanState{mode, parts, 0n}, under, Segments.checked(Con{Document.Line{body, ending}, rest}, text, True{}, Recognizer.ScanState{mode, parts, 0n})), false_is_not_true(Equal.sym(Bool, True{}, False{}, eg)))
    case Con{Document.Line{body, ending}, rest} True{} Recognizer.ScanState{mode, parts, 1n+q}:
      mv_checked_line(k, body, ending, rest, text, mode, parts, q, under, et, eg, mv_checked(k, rest, Segments.head_text(rest), Segments.ready(Recognizer.step(mode, Document.encode([Document.Line{body, ending}]), Recognizer.clean(body), parts, 1n+q), Segments.head_text(rest)), Recognizer.step(mode, Document.encode([Document.Line{body, ending}]), Recognizer.clean(body), parts, 1n+q), under, {==}, {==}))

# A later stretch in its place: run from the Neutral mode at line 1+p on the
# parts before it, its lines lead to its own state moved by p on those parts.
def later_placed(+text: String, +next: Recognizer.ScanState, +p: Nat, +parts: List<&2, Recognizer.Part>, proof: {Segments.scan_later(text) == Some{next} : Maybe<&2, Recognizer.ScanState>}) -> {Recognizer.run(Document.decode(text), Recognizer.ScanState{Recognizer.Neutral{}, parts, 1n+p}) == Segments.onto(Segments.move_state(p, next), parts) : Recognizer.ScanState}:
  %proof : moved_claim(p, Document.decode(text), Segments.later_start(), parts, _)
  mv_checked(p, Document.decode(text), Segments.head_text(Document.decode(text)), Segments.ready(Segments.later_start(), Segments.head_text(Document.decode(text))), Segments.later_start(), parts, {==}, {==})

# Decoding a text that ends in a line feed, then more: the lines of each.
def decode_is_onto(+source: String) -> {Document.decode(source) == decode_onto(source, Nil{}) : List<&2, Document.Line>}:
  decode_lines_onto(source, SNil{}, Nil{})

def onto_is_decode(+source: String) -> {decode_onto(source, Nil{}) == Document.decode(source) : List<&2, Document.Line>}:
  Equal.sym(List<&2, Document.Line>, Document.decode(source), decode_onto(source, Nil{}), decode_is_onto(source))

def decode_onto_append(+a: String, +b: String, +lines: List<&2, Document.Line>) -> {decode_onto(String.append(a, b), lines) == decode_onto(a, decode_onto(b, lines)) : List<&2, Document.Line>}:
  match a:
    case SNil{}:
      {==}
    case SCon{+char, rest}:
      Equal.cong(List<&2, Document.Line>, List<&2, Document.Line>, x => Document.push(x, char, Char.is_eq(char, '\n')), decode_onto(String.append(rest, b), lines), decode_onto(rest, decode_onto(b, lines)), decode_onto_append(rest, b, lines))

def push_over(lines: List<&2, Document.Line>, -d: Char, inner: Bool, -c: Char, outer: Bool, -under: List<&2, Document.Line>) -> {Document.push(List.append(&2, Document.Line, Document.push(lines, d, inner), under), c, outer) == List.append(&2, Document.Line, Document.push(Document.push(lines, d, inner), c, outer), under) : List<&2, Document.Line>}:
  match lines inner outer:
    case Nil{} False{} False{}:
      {==}
    case Nil{} False{} True{}:
      {==}
    case Nil{} True{} False{}:
      {==}
    case Nil{} True{} True{}:
      {==}
    case Con{Document.Line{body, ending}, rest} False{} False{}:
      {==}
    case Con{Document.Line{body, ending}, rest} False{} True{}:
      {==}
    case Con{Document.Line{body, ending}, rest} True{} False{}:
      {==}
    case Con{Document.Line{body, ending}, rest} True{} True{}:
      {==}

def decode_onto_ended_step(+c: Char, tail: String, +lines: List<&2, Document.Line>, e: {Document.ends_nl(tail, Char.is_eq(c, '\n')) == True{} : Bool}, ih: {decode_onto(tail, lines) == List.append(&2, Document.Line, decode_onto(tail, Nil{}), lines) : List<&2, Document.Line>}) -> {Document.push(decode_onto(tail, lines), c, Char.is_eq(c, '\n')) == List.append(&2, Document.Line, Document.push(decode_onto(tail, Nil{}), c, Char.is_eq(c, '\n')), lines) : List<&2, Document.Line>}:
  match tail:
    case SNil{}:
      %Equal.sym(Bool, Char.is_eq(c, '\n'), True{}, e) : {Document.push(lines, c, _) == List.append(&2, Document.Line, Document.push(Nil{}, c, _), lines) : List<&2, Document.Line>}
      decode_push_break(lines, c)
    case SCon{+d, +rest}:
      Equal.trans(List<&2, Document.Line>, Document.push(decode_onto(SCon{d, rest}, lines), c, Char.is_eq(c, '\n')), Document.push(List.append(&2, Document.Line, decode_onto(SCon{d, rest}, Nil{}), lines), c, Char.is_eq(c, '\n')), List.append(&2, Document.Line, Document.push(decode_onto(SCon{d, rest}, Nil{}), c, Char.is_eq(c, '\n')), lines), Equal.cong(List<&2, Document.Line>, List<&2, Document.Line>, x => Document.push(x, c, Char.is_eq(c, '\n')), decode_onto(SCon{d, rest}, lines), List.append(&2, Document.Line, decode_onto(SCon{d, rest}, Nil{}), lines), ih), push_over(decode_onto(rest, Nil{}), d, Char.is_eq(d, '\n'), c, Char.is_eq(c, '\n'), lines))

def decode_onto_ended(+a: String, -last: Bool, +lines: List<&2, Document.Line>, +e: {Document.ends_nl(a, last) == True{} : Bool}) -> {decode_onto(a, lines) == List.append(&2, Document.Line, decode_onto(a, Nil{}), lines) : List<&2, Document.Line>}:
  match a:
    case SNil{}:
      {==}
    case SCon{+c, +tail}:
      decode_onto_ended_step(c, tail, lines, e, decode_onto_ended(tail, Char.is_eq(c, '\n'), lines, e))

def decode_append(+a: String, +b: String, e: {Document.ends_nl(a, False{}) == True{} : Bool}) -> {Document.decode(String.append(a, b)) == List.append(&2, Document.Line, Document.decode(a), Document.decode(b)) : List<&2, Document.Line>}:
  %onto_is_decode(String.append(a, b)) : {_ == List.append(&2, Document.Line, Document.decode(a), Document.decode(b)) : List<&2, Document.Line>}
  %onto_is_decode(a) : {decode_onto(String.append(a, b), Nil{}) == List.append(&2, Document.Line, _, Document.decode(b)) : List<&2, Document.Line>}
  %onto_is_decode(b) : {decode_onto(String.append(a, b), Nil{}) == List.append(&2, Document.Line, decode_onto(a, Nil{}), _) : List<&2, Document.Line>}
  Equal.trans(List<&2, Document.Line>, decode_onto(String.append(a, b), Nil{}), decode_onto(a, decode_onto(b, Nil{})), List.append(&2, Document.Line, decode_onto(a, Nil{}), decode_onto(b, Nil{})), decode_onto_append(a, b, Nil{}), decode_onto_ended(a, False{}, decode_onto(b, Nil{}), e))

def Laws.document_decode_append(a, b, ended):
  decode_append(a, b, ended)

def ends_nl_any(text: String, -last: Bool, e: {Document.ends_nl(text, False{}) == True{} : Bool}) -> {Document.ends_nl(text, last) == True{} : Bool}:
  match text:
    case SNil{}:
      impossible({Document.ends_nl(SNil{}, last) == True{} : Bool}, false_is_not_true(e))
    case SCon{h, t}:
      e

def ends_nl_append(a: String, +b: String, -last: Bool, e: {Document.ends_nl(b, False{}) == True{} : Bool}) -> {Document.ends_nl(String.append(a, b), last) == True{} : Bool}:
  match a:
    case SNil{}:
      ends_nl_any(b, last, e)
    case SCon{c, rest}:
      ends_nl_append(rest, b, Char.is_eq(c, '\n'), e)

# Putting stretches together gives the run over the whole text.
def joined_claim(outcome: Maybe<&2, Segments.Joined>) -> Type:
  match outcome:
    case None{}:
      Unit
    case Some{Segments.Joined{text, state}}:
      {state == Recognizer.run(Document.decode(text), Recognizer.ScanState{Recognizer.Neutral{}, Nil{}, 0n}) : Recognizer.ScanState}

def later_joined(+before: String, +last: String, +text: String, +next: Recognizer.ScanState, +p: Nat, +parts: List<&2, Recognizer.Part>, e: {Document.ends_nl(last, False{}) == True{} : Bool}, h: {Recognizer.ScanState{Recognizer.Neutral{}, parts, 1n+p} == Recognizer.run(Document.decode(String.append(before, last)), Recognizer.ScanState{Recognizer.Neutral{}, Nil{}, 0n}) : Recognizer.ScanState}, proof: {Segments.scan_later(text) == Some{next} : Maybe<&2, Recognizer.ScanState>}) -> {Segments.onto(Segments.move_state(p, next), parts) == Recognizer.run(Document.decode(String.append(String.append(before, last), text)), Recognizer.ScanState{Recognizer.Neutral{}, Nil{}, 0n}) : Recognizer.ScanState}:
  Equal.sym(Recognizer.ScanState, Recognizer.run(Document.decode(String.append(String.append(before, last), text)), Recognizer.ScanState{Recognizer.Neutral{}, Nil{}, 0n}), Segments.onto(Segments.move_state(p, next), parts), Equal.trans(Recognizer.ScanState, Recognizer.run(Document.decode(String.append(String.append(before, last), text)), Recognizer.ScanState{Recognizer.Neutral{}, Nil{}, 0n}), Recognizer.run(List.append(&2, Document.Line, Document.decode(String.append(before, last)), Document.decode(text)), Recognizer.ScanState{Recognizer.Neutral{}, Nil{}, 0n}), Segments.onto(Segments.move_state(p, next), parts), Equal.cong(List<&2, Document.Line>, Recognizer.ScanState, x => Recognizer.run(x, Recognizer.ScanState{Recognizer.Neutral{}, Nil{}, 0n}), Document.decode(String.append(String.append(before, last), text)), List.append(&2, Document.Line, Document.decode(String.append(before, last)), Document.decode(text)), decode_append(String.append(before, last), text, ends_nl_append(before, last, False{}, e))), Equal.trans(Recognizer.ScanState, Recognizer.run(List.append(&2, Document.Line, Document.decode(String.append(before, last)), Document.decode(text)), Recognizer.ScanState{Recognizer.Neutral{}, Nil{}, 0n}), Recognizer.run(Document.decode(text), Recognizer.run(Document.decode(String.append(before, last)), Recognizer.ScanState{Recognizer.Neutral{}, Nil{}, 0n})), Segments.onto(Segments.move_state(p, next), parts), run_append(Document.decode(String.append(before, last)), Document.decode(text), Recognizer.ScanState{Recognizer.Neutral{}, Nil{}, 0n}), Equal.trans(Recognizer.ScanState, Recognizer.run(Document.decode(text), Recognizer.run(Document.decode(String.append(before, last)), Recognizer.ScanState{Recognizer.Neutral{}, Nil{}, 0n})), Recognizer.run(Document.decode(text), Recognizer.ScanState{Recognizer.Neutral{}, parts, 1n+p}), Segments.onto(Segments.move_state(p, next), parts), Equal.cong(Recognizer.ScanState, Recognizer.ScanState, x => Recognizer.run(Document.decode(text), x), Recognizer.run(Document.decode(String.append(before, last)), Recognizer.ScanState{Recognizer.Neutral{}, Nil{}, 0n}), Recognizer.ScanState{Recognizer.Neutral{}, parts, 1n+p}, Equal.sym(Recognizer.ScanState, Recognizer.ScanState{Recognizer.Neutral{}, parts, 1n+p}, Recognizer.run(Document.decode(String.append(before, last)), Recognizer.ScanState{Recognizer.Neutral{}, Nil{}, 0n}), h)), later_placed(text, next, p, parts, proof)))))

def extend_claim(+rest: List<&2, Segments.Segment>, +before: String, +last: String, +ends: Maybe<&2, {Document.ends_nl(last, False{}) == True{} : Bool}>, +state: Recognizer.ScanState, h: {state == Recognizer.run(Document.decode(String.append(before, last)), Recognizer.ScanState{Recognizer.Neutral{}, Nil{}, 0n}) : Recognizer.ScanState}) -> joined_claim(Segments.extend(rest, before, last, ends, state)):
  match rest ends state:
    case Nil{} e st:
      h
    case Con{Segments.First{text, s, proof, ends2}, more} e st:
      Unit{}
    case Con{Segments.Later{text, next, proof, ends2}, more} None{} st:
      Unit{}
    case Con{Segments.Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.Neutral{}, parts, 0n}:
      Unit{}
    case Con{Segments.Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.Neutral{}, parts, 1n+p}:
      extend_claim(more, String.append(before, last), text, ends2, Segments.onto(Segments.move_state(p, next), parts), later_joined(before, last, text, next, p, parts, e, h, proof))
    case Con{Segments.Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.AfterAnnotation{}, parts, line}:
      Unit{}
    case Con{Segments.Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.Opening{raw0, line0}, parts, line}:
      Unit{}
    case Con{Segments.Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.Candidate{raw0, lines0, line0, formatted0}, parts, line}:
      Unit{}
    case Con{Segments.Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.Fence{char0, size0, quoted0}, parts, line}:
      Unit{}
    case Con{Segments.Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.HtmlComment{}, parts, line}:
      Unit{}
    case Con{Segments.Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.ObsidianComment{}, parts, line}:
      Unit{}
    case Con{Segments.Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.Frontmatter{}, parts, line}:
      Unit{}
    case Con{Segments.Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.OpaqueHtml{}, parts, line}:
      Unit{}
    case Con{Segments.Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.ListBody{}, parts, line}:
      Unit{}

def join_claim(+segments: List<&2, Segments.Segment>) -> joined_claim(Segments.join(segments)):
  match segments:
    case Nil{}:
      Unit{}
    case Con{Segments.First{text, state, proof, ends}, rest}:
      extend_claim(rest, SNil{}, text, ends, state, proof)
    case Con{Segments.Later{text, state, proof, ends}, rest}:
      Unit{}

def assembled_differs(outcome: Maybe<&2, Segments.Assembled>) -> Type:
  match outcome:
    case None{}:
      Unit
    case Some{result}:
      Empty

def none_is_not_assembled(-result: Segments.Assembled, e: {None{} == Some{result} : Maybe<&2, Segments.Assembled>}) -> Empty:
  %e : assembled_differs(_)
  Unit{}

def assembled_or(outcome: Maybe<&2, Segments.Assembled>) -> Segments.Assembled:
  match outcome:
    case None{}:
      Segments.Assembled{SNil{}, Recognizer.Scan{Nil{}, True{}}}
    case Some{result}:
      result

def assembled_claim(joined: Maybe<&2, Segments.Joined>, c: joined_claim(joined), +result: Segments.Assembled, found: {Segments.assembled(joined) == Some{result} : Maybe<&2, Segments.Assembled>}) -> {Segments.assembled_scan(result) == Recognizer.scan(Segments.assembled_text(result)) : Recognizer.Scan}:
  match joined:
    case None{}:
      impossible({Segments.assembled_scan(result) == Recognizer.scan(Segments.assembled_text(result)) : Recognizer.Scan}, none_is_not_assembled(result, found))
    case Some{Segments.Joined{text, state}}:
      %found : {Segments.assembled_scan(assembled_or(_)) == Recognizer.scan(Segments.assembled_text(assembled_or(_))) : Recognizer.Scan}
      Equal.cong(Recognizer.ScanState, Recognizer.Scan, x => Recognizer.finish(x), state, Recognizer.run(Document.decode(text), Recognizer.ScanState{Recognizer.Neutral{}, Nil{}, 0n}), c)

def Laws.segments_assemble(segments, result, found):
  assembled_claim(Segments.join(segments), join_claim(segments), result, found)


# ── Regions of a page ───────────────────────────────────────────────────────

def nat_min_comm(+a: Nat, +b: Nat) -> {Nat.min(a, b) == Nat.min(b, a) : Nat}:
  match a b:
    case 0n 0n:
      {==}
    case 0n 1n+bp:
      {==}
    case 1n+ap 0n:
      {==}
    case 1n+ap 1n+bp:
      %nat_min_comm(ap, bp) : {1n+Nat.min(ap, bp) == 1n+_ : Nat}
      {==}

def nat_max_comm(+a: Nat, +b: Nat) -> {Nat.max(a, b) == Nat.max(b, a) : Nat}:
  match a b:
    case 0n 0n:
      {==}
    case 0n 1n+bp:
      {==}
    case 1n+ap 0n:
      {==}
    case 1n+ap 1n+bp:
      %nat_max_comm(ap, bp) : {1n+Nat.max(ap, bp) == 1n+_ : Nat}
      {==}

def area_between_comm(+a: Nat, +b: Nat) -> {Area.between(a, b) == Area.between(b, a) : Area.Span}:
  %nat_min_comm(a, b) : {Area.Span{Nat.min(a, b), Nat.sub(Nat.max(a, b), Nat.min(a, b))} == Area.Span{_, Nat.sub(Nat.max(b, a), _)} : Area.Span}
  %nat_max_comm(a, b) : {Area.Span{Nat.min(a, b), Nat.sub(Nat.max(a, b), Nat.min(a, b))} == Area.Span{Nat.min(a, b), Nat.sub(_, Nat.min(a, b))} : Area.Span}
  {==}

def Laws.area_span_symmetric(full, a, b):
  area_between_comm(Nat.min(a, full), Nat.min(b, full))

def Laws.area_fit_symmetric_across(full, least, page, ax, ay, bx, by):
  Equal.cong(Area.Span, Maybe<&2, Area.Area>, across => Area.frame(least, page, across, Area.span(full, ay, by)), Area.span(full, ax, bx), Area.span(full, bx, ax), Laws.area_span_symmetric(full, ax, bx))

def Laws.area_fit_symmetric_down(full, least, page, ax, ay, bx, by):
  Equal.cong(Area.Span, Maybe<&2, Area.Area>, down => Area.frame(least, page, Area.span(full, ax, bx), down), Area.span(full, ay, by), Area.span(full, by, ay), Laws.area_span_symmetric(full, ay, by))

def nat_min_le_r(+a: Nat, +f: Nat) -> {Nat.is_ge(f, Nat.min(a, f)) == True{} : Bool}:
  match a f:
    case 0n 0n:
      {==}
    case 0n 1n+fp:
      {==}
    case 1n+ap 0n:
      {==}
    case 1n+ap 1n+fp:
      nat_min_le_r(ap, fp)

def nat_min_le_l(+a: Nat, +b: Nat) -> {Nat.is_ge(a, Nat.min(a, b)) == True{} : Bool}:
  match a b:
    case 0n 0n:
      {==}
    case 0n 1n+bp:
      {==}
    case 1n+ap 0n:
      {==}
    case 1n+ap 1n+bp:
      nat_min_le_l(ap, bp)

# The larger of two points is the smaller plus the gap between them.

def nat_gap(+a: Nat, +b: Nat) -> {Nat.max(a, b) == Nat.add(Nat.min(a, b), Nat.sub(Nat.max(a, b), Nat.min(a, b))) : Nat}:
  match a b:
    case 0n 0n:
      {==}
    case 0n 1n+bp:
      {==}
    case 1n+ap 0n:
      {==}
    case 1n+ap 1n+bp:
      %nat_gap(ap, bp) : {1n+Nat.max(ap, bp) == 1n+_ : Nat}
      {==}

def area_held_max(+f: Nat, +a: Nat, +b: Nat) -> {Nat.is_ge(f, Nat.max(Nat.min(a, f), Nat.min(b, f))) == True{} : Bool}:
  match f a b:
    case 0n 0n 0n:
      {==}
    case 0n 0n 1n+bp:
      {==}
    case 0n 1n+ap 0n:
      {==}
    case 0n 1n+ap 1n+bp:
      {==}
    case 1n+fp 0n b:
      nat_min_le_r(b, 1n+fp)
    case 1n+fp 1n+ap 0n:
      nat_min_le_r(ap, fp)
    case 1n+fp 1n+ap 1n+bp:
      area_held_max(fp, ap, bp)

def Laws.area_span_within(full, a, b):
  %nat_gap(Nat.min(a, full), Nat.min(b, full)) : {Nat.is_ge(full, _) == True{} : Bool}
  area_held_max(full, a, b)

def nat_min_add(+a: Nat, +x: Nat) -> {a == Nat.min(a, Nat.add(a, x)) : Nat}:
  match a:
    case 0n:
      {==}
    case 1n+p:
      %nat_min_add(p, x) : {1n+p == 1n+_ : Nat}
      {==}

def nat_max_add(+a: Nat, +x: Nat) -> {Nat.add(a, x) == Nat.max(a, Nat.add(a, x)) : Nat}:
  match a:
    case 0n:
      {==}
    case 1n+p:
      %nat_max_add(p, x) : {1n+Nat.add(p, x) == 1n+_ : Nat}
      {==}

def nat_sub_add(+a: Nat, +x: Nat) -> {x == Nat.sub(Nat.add(a, x), a) : Nat}:
  match a x:
    case 0n 0n:
      {==}
    case 0n 1n+xp:
      {==}
    case 1n+p x:
      nat_sub_add(p, x)

def nat_min_add_add(+a: Nat, +d: Nat, +r: Nat) -> {Nat.add(a, d) == Nat.min(Nat.add(a, d), Nat.add(a, Nat.add(d, r))) : Nat}:
  match a:
    case 0n:
      nat_min_add(d, r)
    case 1n+p:
      %nat_min_add_add(p, d, r) : {1n+Nat.add(p, d) == 1n+_ : Nat}
      {==}

def Laws.area_span_exact(a, d, rest):
  %nat_min_add(a, Nat.add(d, rest)) : {Area.between(_, Nat.min(Nat.add(a, d), Nat.add(a, Nat.add(d, rest)))) == Area.Span{a, d} : Area.Span}
  %nat_min_add_add(a, d, rest) : {Area.between(a, _) == Area.Span{a, d} : Area.Span}
  %nat_min_add(a, d) : {Area.Span{_, Nat.sub(Nat.max(a, Nat.add(a, d)), _)} == Area.Span{a, d} : Area.Span}
  %nat_max_add(a, d) : {Area.Span{a, Nat.sub(_, a)} == Area.Span{a, d} : Area.Span}
  %nat_sub_add(a, d) : {Area.Span{a, _} == Area.Span{a, d} : Area.Span}
  {==}

# ── Moving and resizing ─────────────────────────────────────────────────────

def nat_ge_zero(n: Nat) -> {Nat.is_ge(n, 0n) == True{} : Bool}:
  match n:
    case 0n:
      {==}
    case 1n+p:
      {==}

def nat_ge_pred(+f: Nat, +n: Nat, h: {Nat.is_ge(f, 1n+n) == True{} : Bool}) -> {Nat.is_ge(f, n) == True{} : Bool}:
  match f n:
    case 0n n:
      impossible({Nat.is_ge(0n, n) == True{} : Bool}, false_is_not_true(h))
    case 1n+fp 0n:
      {==}
    case 1n+fp 1n+np:
      nat_ge_pred(fp, np, h)

def nat_ge_add_r(+a: Nat, +f: Nat, +s: Nat, h: {Nat.is_ge(f, Nat.add(a, s)) == True{} : Bool}) -> {Nat.is_ge(f, s) == True{} : Bool}:
  match a:
    case 0n:
      h
    case 1n+p:
      nat_ge_add_r(p, f, s, nat_ge_pred(f, Nat.add(p, s), h))

def nat_ge_add_l(+a: Nat, +f: Nat, +s: Nat, h: {Nat.is_ge(f, Nat.add(a, s)) == True{} : Bool}) -> {Nat.is_ge(f, a) == True{} : Bool}:
  match a f:
    case 0n f:
      nat_ge_zero(f)
    case 1n+p 0n:
      impossible({Nat.is_ge(0n, 1n+p) == True{} : Bool}, false_is_not_true(h))
    case 1n+p 1n+fp:
      nat_ge_add_l(p, fp, s, h)

def nat_sub_zero(a: Nat) -> {a == Nat.sub(a, 0n) : Nat}:
  match a:
    case 0n:
      {==}
    case 1n+p:
      {==}

def nat_add_zero(a: Nat) -> {a == Nat.add(a, 0n) : Nat}:
  match a:
    case 0n:
      {==}
    case 1n+p:
      %nat_add_zero(p) : {1n+p == 1n+_ : Nat}
      {==}

def nat_succ_add(a: Nat, -b: Nat) -> {1n+Nat.add(a, b) == Nat.add(a, 1n+b) : Nat}:
  match a:
    case 0n:
      {==}
    case 1n+p:
      %nat_succ_add(p, b) : {1n+1n+Nat.add(p, b) == 1n+_ : Nat}
      {==}

# A start held to what the size leaves free ends on the page.

def area_later_fits(+s: Nat, +f: Nat, +x: Nat, h: {Nat.is_ge(f, s) == True{} : Bool}) -> {Nat.is_ge(f, Nat.add(Nat.min(x, Nat.sub(f, s)), s)) == True{} : Bool}:
  match s f:
    case 0n f:
      %nat_sub_zero(f) : {Nat.is_ge(f, Nat.add(Nat.min(x, _), 0n)) == True{} : Bool}
      %nat_add_zero(Nat.min(x, f)) : {Nat.is_ge(f, _) == True{} : Bool}
      nat_min_le_r(x, f)
    case 1n+sp 0n:
      impossible({Nat.is_ge(0n, Nat.add(Nat.min(x, Nat.sub(0n, 1n+sp)), 1n+sp)) == True{} : Bool}, false_is_not_true(h))
    case 1n+sp 1n+fp:
      %nat_succ_add(Nat.min(x, Nat.sub(fp, sp)), sp) : {Nat.is_ge(1n+fp, _) == True{} : Bool}
      area_later_fits(sp, fp, x, h)

def Laws.area_later_within(full, span, by, kept):
  match span:
    case Area.Span{start, size}:
      area_later_fits(size, full, Nat.add(start, by), nat_ge_add_r(start, full, size, kept))

def area_earlier_fits(+a: Nat, +k: Nat, +f: Nat, +s: Nat, h: {Nat.is_ge(f, Nat.add(a, s)) == True{} : Bool}) -> {Nat.is_ge(f, Nat.add(Nat.sub(a, k), s)) == True{} : Bool}:
  match a k:
    case 0n k:
      h
    case 1n+ap 0n:
      h
    case 1n+ap 1n+kp:
      area_earlier_fits(ap, kp, f, s, nat_ge_pred(f, Nat.add(ap, s), h))

def Laws.area_earlier_within(full, span, by, kept):
  match span:
    case Area.Span{start, size}:
      area_earlier_fits(start, by, full, size, kept)

def area_grow_fits(+a: Nat, +f: Nat, +y: Nat, h: {Nat.is_ge(f, a) == True{} : Bool}) -> {Nat.is_ge(f, Nat.add(a, Nat.min(y, Nat.sub(f, a)))) == True{} : Bool}:
  match a f:
    case 0n 0n:
      nat_min_le_r(y, 0n)
    case 0n 1n+fp:
      nat_min_le_r(y, 1n+fp)
    case 1n+ap 0n:
      impossible({Nat.is_ge(0n, Nat.add(1n+ap, Nat.min(y, Nat.sub(0n, 1n+ap)))) == True{} : Bool}, false_is_not_true(h))
    case 1n+ap 1n+fp:
      area_grow_fits(ap, fp, y, h)

def Laws.area_grow_within(full, span, by, kept):
  match span:
    case Area.Span{start, size}:
      area_grow_fits(start, full, Nat.add(size, by), nat_ge_add_l(start, full, size, kept))

def nat_ge_min(+f: Nat, +s: Nat, +z: Nat, h: {Nat.is_ge(f, s) == True{} : Bool}) -> {Nat.is_ge(f, Nat.min(s, z)) == True{} : Bool}:
  match f s z:
    case 0n 0n z:
      {==}
    case 0n 1n+sp z:
      impossible({Nat.is_ge(0n, Nat.min(1n+sp, z)) == True{} : Bool}, false_is_not_true(h))
    case 1n+fp 0n z:
      {==}
    case 1n+fp 1n+sp 0n:
      {==}
    case 1n+fp 1n+sp 1n+zp:
      nat_ge_min(fp, sp, zp, h)

def area_shrink_fits(+a: Nat, +f: Nat, +s: Nat, +z: Nat, h: {Nat.is_ge(f, Nat.add(a, s)) == True{} : Bool}) -> {Nat.is_ge(f, Nat.add(a, Nat.min(s, z))) == True{} : Bool}:
  match a f:
    case 0n f:
      nat_ge_min(f, s, z, h)
    case 1n+ap 0n:
      impossible({Nat.is_ge(0n, Nat.add(1n+ap, Nat.min(s, z))) == True{} : Bool}, false_is_not_true(h))
    case 1n+ap 1n+fp:
      area_shrink_fits(ap, fp, s, z, h)

def Laws.area_shrink_within(full, least, span, by, kept):
  match span:
    case Area.Span{start, size}:
      area_shrink_fits(start, full, size, Nat.max(Nat.sub(size, by), least), kept)

def Laws.area_shrink_no_larger(least, span, by):
  match span:
    case Area.Span{start, size}:
      nat_min_le_l(size, Nat.max(Nat.sub(size, by), least))

def Laws.area_later_keeps_size(full, span, by):
  match span:
    case Area.Span{start, size}:
      {==}

def Laws.area_earlier_keeps_size(span, by):
  match span:
    case Area.Span{start, size}:
      {==}

def Laws.area_grow_keeps_start(full, span, by):
  match span:
    case Area.Span{start, size}:
      {==}

def Laws.area_shrink_keeps_start(least, span, by):
  match span:
    case Area.Span{start, size}:
      {==}

# ── What `fit` returns can be stored ────────────────────────────────────────

def nat_ge_one(+w: Nat, -least: Nat, e: {True{} == Nat.is_ge(w, 1n+least) : Bool}) -> {True{} == Nat.is_ge(w, 1n) : Bool}:
  match w:
    case 0n:
      impossible({True{} == Nat.is_ge(0n, 1n) : Bool}, true_is_not_false(e))
    case 1n+p:
      Equal.sym(Bool, Nat.is_ge(p, 0n), True{}, nat_ge_zero(p))

def area_made_sound(+full: Nat, -least: Nat, +page: Nat, +x: Nat, +y: Nat, +w: Nat, +h: Nat, paged: Bool, wide: Bool, tall: Bool, ep: {paged == Nat.is_ge(page, 1n) : Bool}, ew: {wide == Nat.is_ge(w, 1n+least) : Bool}, eh: {tall == Nat.is_ge(h, 1n+least) : Bool}, kx: {True{} == Area.within(full, Area.Span{x, w}) : Bool}, ky: {True{} == Area.within(full, Area.Span{y, h}) : Bool}) -> {Area.sound(full, Area.make(page, Area.Span{x, w}, Area.Span{y, h}, Bool.and(paged, Bool.and(wide, tall)))) == True{} : Bool}:
  match paged wide tall:
    case False{} wide tall:
      {==}
    case True{} False{} tall:
      {==}
    case True{} True{} False{}:
      {==}
    case True{} True{} True{}:
      %ep : {Bool.and(_, Bool.and(Nat.is_ge(w, 1n), Bool.and(Nat.is_ge(h, 1n), Bool.and(Area.within(full, Area.Span{x, w}), Area.within(full, Area.Span{y, h}))))) == True{} : Bool}
      %nat_ge_one(w, least, ew) : {Bool.and(_, Bool.and(Nat.is_ge(h, 1n), Bool.and(Area.within(full, Area.Span{x, w}), Area.within(full, Area.Span{y, h})))) == True{} : Bool}
      %nat_ge_one(h, least, eh) : {Bool.and(_, Bool.and(Area.within(full, Area.Span{x, w}), Area.within(full, Area.Span{y, h}))) == True{} : Bool}
      %kx : {Bool.and(_, Area.within(full, Area.Span{y, h})) == True{} : Bool}
      %ky : {_ == True{} : Bool}
      {==}

def area_frame_sound(+full: Nat, +least: Nat, +page: Nat, +across: Area.Span, +down: Area.Span, kx: {Area.within(full, across) == True{} : Bool}, ky: {Area.within(full, down) == True{} : Bool}) -> {Area.sound(full, Area.frame(1n+least, page, across, down)) == True{} : Bool}:
  match across down:
    case Area.Span{x, w} Area.Span{y, h}:
      area_made_sound(full, least, page, x, y, w, h, Nat.is_ge(page, 1n), Nat.is_ge(w, 1n+least), Nat.is_ge(h, 1n+least), {==}, {==}, {==}, Equal.sym(Bool, Area.within(full, Area.Span{x, w}), True{}, kx), Equal.sym(Bool, Area.within(full, Area.Span{y, h}), True{}, ky))

def Laws.area_fit_valid(full, least, page, ax, ay, bx, by):
  area_frame_sound(full, least, page, Area.span(full, ax, bx), Area.span(full, ay, by), Laws.area_span_within(full, ax, bx), Laws.area_span_within(full, ay, by))

# Deleting from an assembled note.
def delete_scanned_same(+text: String, +id: String, +scan: Recognizer.Scan, e: {scan == Recognizer.scan(text) : Recognizer.Scan}) -> {Segments.delete_scanned(text, id, scan) == Recognizer.delete(text, id) : Recognizer.Edit}:
  %Equal.sym(Recognizer.Scan, scan, Recognizer.scan(text), e) : {Segments.delete_scanned(text, id, _) == Recognizer.delete(text, id) : Recognizer.Edit}
  {==}

def delete_same(+result: Segments.Assembled, +id: String, e: {Segments.assembled_scan(result) == Recognizer.scan(Segments.assembled_text(result)) : Recognizer.Scan}) -> {Segments.delete(result, id) == Recognizer.delete(Segments.assembled_text(result), id) : Recognizer.Edit}:
  match result:
    case Segments.Assembled{text, scan}:
      delete_scanned_same(text, id, scan, e)

def Laws.segments_delete(segments, result, id, found):
  delete_same(result, id, Laws.segments_assemble(segments, result, found))

# ── Two texts that each contain the other are the same text ─────────────────

# `a` is no longer than `b`.
def shorter(a: String, b: String) -> Bool:
  match a b:
    case SNil{} SNil{}:
      True{}
    case SNil{} SCon{y, yt}:
      True{}
    case SCon{x, xt} SNil{}:
      False{}
    case SCon{x, xt} SCon{y, yt}:
      shorter(xt, yt)

def prefix_shorter_if(-yt: String, -xt: String, same: Bool, e: {String.starts_with.go.if(yt, xt, same) == True{} : Bool}, ih: {String.starts_with.go(yt, xt) == True{} : Bool} -> {shorter(yt, xt) == True{} : Bool}) -> {shorter(yt, xt) == True{} : Bool}:
  match same:
    case False{}:
      impossible({shorter(yt, xt) == True{} : Bool}, false_is_not_true(e))
    case True{}:
      ih(e)

def prefix_shorter(p: String, s: String, e: {String.starts_with.go(p, s) == True{} : Bool}) -> {shorter(p, s) == True{} : Bool}:
  match p s:
    case SNil{} SNil{}:
      {==}
    case SNil{} SCon{x, xt}:
      {==}
    case SCon{y, yt} SNil{}:
      impossible({shorter(SCon{y, yt}, SNil{}) == True{} : Bool}, false_is_not_true(e))
    case SCon{+y, +yt} SCon{+x, +xt}:
      prefix_shorter_if(yt, xt, Char.is_eq(x, y), e, e2 => prefix_shorter(yt, xt, e2))

def shorter_step(p: String, t: String, -h: Char, e: {shorter(p, t) == True{} : Bool}) -> {shorter(p, SCon{h, t}) == True{} : Bool}:
  match p t:
    case SNil{} SNil{}:
      {==}
    case SNil{} SCon{x, xt}:
      {==}
    case SCon{y, yt} SNil{}:
      impossible({shorter(SCon{y, yt}, SCon{h, SNil{}}) == True{} : Bool}, false_is_not_true(e))
    case SCon{y, yt} SCon{x, xt}:
      shorter_step(yt, xt, x, e)

def empty_shorter(p: String, e: {String.is_empty(p) == True{} : Bool}) -> {shorter(p, SNil{}) == True{} : Bool}:
  match p:
    case SNil{}:
      {==}
    case SCon{y, yt}:
      impossible({shorter(SCon{y, yt}, SNil{}) == True{} : Bool}, false_is_not_true(e))

def contains_shorter_if(+p: String, +h: Char, +t: String, here: Bool, eh: {here == String.starts_with.go(p, SCon{h, t}) : Bool}, e: {String.contains.if(t, p, here) == True{} : Bool}, ih: {String.contains(t, p) == True{} : Bool} -> {shorter(p, t) == True{} : Bool}) -> {shorter(p, SCon{h, t}) == True{} : Bool}:
  match here:
    case False{}:
      shorter_step(p, t, h, ih(e))
    case True{}:
      prefix_shorter(p, SCon{h, t}, Equal.sym(Bool, True{}, String.starts_with.go(p, SCon{h, t}), eh))

def contains_shorter(s: String, +p: String, e: {String.contains(s, p) == True{} : Bool}) -> {shorter(p, s) == True{} : Bool}:
  match s:
    case SNil{}:
      empty_shorter(p, e)
    case SCon{+h, +t}:
      contains_shorter_if(p, h, t, String.starts_with(SCon{h, t}, p), {==}, e, e2 => contains_shorter(t, p, e2))

def prefix_same_if(+y: Char, +yt: String, +x: Char, +xt: String, same: Bool, es: {same == Char.is_eq(x, y) : Bool}, e: {String.starts_with.go.if(yt, xt, same) == True{} : Bool}, ih: {String.starts_with.go(yt, xt) == True{} : Bool} -> {yt == xt : String}) -> {SCon{y, yt} == SCon{x, xt} : String}:
  match same:
    case False{}:
      impossible({SCon{y, yt} == SCon{x, xt} : String}, false_is_not_true(e))
    case True{}:
      Equal.trans(String, SCon{y, yt}, SCon{x, yt}, SCon{x, xt}, Equal.cong(Char, String, c => SCon{c, yt}, y, x, Equal.sym(Char, x, y, char_same(x, y, Equal.sym(Bool, True{}, Char.is_eq(x, y), es)))), Equal.cong(String, String, r => SCon{x, r}, yt, xt, ih(e)))

def prefix_same(p: String, s: String, e: {String.starts_with.go(p, s) == True{} : Bool}, l: {shorter(s, p) == True{} : Bool}) -> {p == s : String}:
  match p s:
    case SNil{} SNil{}:
      {==}
    case SNil{} SCon{x, xt}:
      impossible({SNil{} == SCon{x, xt} : String}, false_is_not_true(l))
    case SCon{y, yt} SNil{}:
      impossible({SCon{y, yt} == SNil{} : String}, false_is_not_true(e))
    case SCon{+y, +yt} SCon{+x, +xt}:
      prefix_same_if(y, yt, x, xt, Char.is_eq(x, y), {==}, e, e2 => prefix_same(yt, xt, e2, l))

def not_both_shorter(p: String, t: String, -h: Char, a: {shorter(p, t) == True{} : Bool}, b: {shorter(SCon{h, t}, p) == True{} : Bool}) -> Empty:
  match p t:
    case SNil{} SNil{}:
      false_is_not_true(b)
    case SNil{} SCon{x, xt}:
      false_is_not_true(b)
    case SCon{y, yt} SNil{}:
      false_is_not_true(a)
    case SCon{y, yt} SCon{x, xt}:
      not_both_shorter(yt, xt, x, a, b)

def empty_same(p: String, e: {String.is_empty(p) == True{} : Bool}) -> {SNil{} == p : String}:
  match p:
    case SNil{}:
      {==}
    case SCon{y, yt}:
      impossible({SNil{} == SCon{y, yt} : String}, false_is_not_true(e))

def contains_same_if(+p: String, +h: Char, +t: String, here: Bool, eh: {here == String.starts_with.go(p, SCon{h, t}) : Bool}, e: {String.contains.if(t, p, here) == True{} : Bool}, l: {shorter(SCon{h, t}, p) == True{} : Bool}) -> {SCon{h, t} == p : String}:
  match here:
    case False{}:
      impossible({SCon{h, t} == p : String}, not_both_shorter(p, t, h, contains_shorter(t, p, e), l))
    case True{}:
      Equal.sym(String, p, SCon{h, t}, prefix_same(p, SCon{h, t}, Equal.sym(Bool, True{}, String.starts_with.go(p, SCon{h, t}), eh), l))

def contains_same(s: String, +p: String, e: {String.contains(s, p) == True{} : Bool}, l: {shorter(s, p) == True{} : Bool}) -> {s == p : String}:
  match s:
    case SNil{}:
      empty_same(p, e)
    case SCon{+h, +t}:
      contains_same_if(p, h, t, String.starts_with(SCon{h, t}, p), {==}, e, l)

def same_text_same(+a: String, +b: String, +e: {Segments.same_text(a, b) == True{} : Bool}) -> {a == b : String}:
  Equal.sym(String, b, a, contains_same(b, a, bool_and_right(String.contains(a, b), String.contains(b, a), e), contains_shorter(a, b, bool_and_left(String.contains(a, b), String.contains(b, a), e))))

def Laws.segments_same_text(a, b, same):
  same_text_same(a, b, same)


# ── Creating in a note put together from stretches ──────────────────────────

# The text a list of stretches stands for.
def texts_from(segments: List<&2, Segments.Segment>, acc: String) -> String:
  match segments:
    case Nil{}:
      acc
    case Con{segment, rest}:
      texts_from(rest, String.append(acc, Segments.segment_text(segment)))

def texts(segments: List<&2, Segments.Segment>) -> String:
  texts_from(segments, SNil{})

def texts_snoc(+a: List<&2, Segments.Segment>, +x: Segments.Segment, +acc: String) -> {texts_from(List.append(&2, Segments.Segment, a, [x]), acc) == String.append(texts_from(a, acc), Segments.segment_text(x)) : String}:
  match a:
    case Nil{}:
      {==}
    case Con{segment, rest}:
      texts_snoc(rest, x, String.append(acc, Segments.segment_text(segment)))

def text_claim(outcome: Maybe<&2, Segments.Joined>, expected: String) -> Type:
  match outcome:
    case None{}:
      Unit
    case Some{Segments.Joined{text, state}}:
      {text == expected : String}

def extend_text(+rest: List<&2, Segments.Segment>, +before: String, +last: String, +ends: Maybe<&2, {Document.ends_nl(last, False{}) == True{} : Bool}>, +state: Recognizer.ScanState) -> text_claim(Segments.extend(rest, before, last, ends, state), texts_from(rest, String.append(before, last))):
  match rest ends state:
    case Nil{} e st:
      {==}
    case Con{Segments.First{text, s, proof, ends2}, more} e st:
      Unit{}
    case Con{Segments.Later{text, next, proof, ends2}, more} None{} st:
      Unit{}
    case Con{Segments.Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.Neutral{}, parts, 0n}:
      Unit{}
    case Con{Segments.Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.Neutral{}, parts, 1n+p}:
      extend_text(more, String.append(before, last), text, ends2, Segments.onto(Segments.move_state(p, next), parts))
    case Con{Segments.Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.AfterAnnotation{}, parts, line}:
      Unit{}
    case Con{Segments.Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.Opening{raw0, line0}, parts, line}:
      Unit{}
    case Con{Segments.Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.Candidate{raw0, lines0, line0, formatted0}, parts, line}:
      Unit{}
    case Con{Segments.Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.Fence{char0, size0, quoted0}, parts, line}:
      Unit{}
    case Con{Segments.Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.HtmlComment{}, parts, line}:
      Unit{}
    case Con{Segments.Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.ObsidianComment{}, parts, line}:
      Unit{}
    case Con{Segments.Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.Frontmatter{}, parts, line}:
      Unit{}
    case Con{Segments.Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.OpaqueHtml{}, parts, line}:
      Unit{}
    case Con{Segments.Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.ListBody{}, parts, line}:
      Unit{}

def join_text(+segments: List<&2, Segments.Segment>) -> text_claim(Segments.join(segments), texts(segments)):
  match segments:
    case Nil{}:
      Unit{}
    case Con{Segments.First{text, state, proof, ends}, rest}:
      extend_text(rest, SNil{}, text, ends, state)
    case Con{Segments.Later{text, state, proof, ends}, rest}:
      Unit{}

def assembled_text_is(joined: Maybe<&2, Segments.Joined>, +expected: String, c: text_claim(joined, expected), +result: Segments.Assembled, found: {Segments.assembled(joined) == Some{result} : Maybe<&2, Segments.Assembled>}) -> {Segments.assembled_text(result) == expected : String}:
  match joined:
    case None{}:
      impossible({Segments.assembled_text(result) == expected : String}, none_is_not_assembled(result, found))
    case Some{Segments.Joined{text, state}}:
      %found : {Segments.assembled_text(assembled_or(_)) == expected : String}
      c

def assemble_text(+segments: List<&2, Segments.Segment>, +result: Segments.Assembled, found: {Segments.assemble(segments) == Some{result} : Maybe<&2, Segments.Assembled>}) -> {Segments.assembled_text(result) == texts(segments) : String}:
  assembled_text_is(Segments.join(segments), texts(segments), join_text(segments), result, found)

# After a line feed the boundary is in one of two states, and from either it
# reads a character in the same way.
def fed(state: Boundary.State) -> Bool:
  match state:
    case Boundary.AfterText{}:
      True{}
    case Boundary.AfterBlank{}:
      True{}
    case _:
      False{}

def fed_if(last: Bool, state: Boundary.State) -> Bool:
  match last:
    case False{}:
      True{}
    case True{}:
      fed(state)

def kind_fed(lf: Bool, state: Boundary.State, -ws: Bool) -> {fed_if(lf, Boundary.step_kind(state, (lf, ws))) == True{} : Bool}:
  match lf state:
    case False{} st:
      {==}
    case True{} Boundary.EmptySource{}:
      {==}
    case True{} Boundary.TextLine{}:
      {==}
    case True{} Boundary.SpaceLine{}:
      {==}
    case True{} Boundary.AfterText{}:
      {==}
    case True{} Boundary.AfterBlank{}:
      {==}

def ends_fed(a: String, +last: Bool, +state: Boundary.State, e: {Document.ends_nl(a, last) == True{} : Bool}, h: {fed_if(last, state) == True{} : Bool}) -> {fed(Boundary.run(a, state)) == True{} : Bool}:
  match a:
    case SNil{}:
      Equal.trans(Bool, fed(state), fed_if(last, state), True{}, Equal.cong(Bool, Bool, x => fed_if(x, state), True{}, last, Equal.sym(Bool, last, True{}, e)), h)
    case SCon{+c, rest}:
      ends_fed(rest, Char.is_eq(c, '\n'), Boundary.step(state, c), e, kind_fed(Char.is_eq(c, '\n'), state, Bool.or(Char.is_eq(c, ' '), Bool.or(Char.is_eq(c, '\t'), Char.is_eq(c, '\r')))))

def kind_same(lf: Bool, ws: Bool) -> {Boundary.step_kind(Boundary.AfterText{}, (lf, ws)) == Boundary.step_kind(Boundary.AfterBlank{}, (lf, ws)) : Boundary.State}:
  match lf ws:
    case True{} True{}:
      {==}
    case True{} False{}:
      {==}
    case False{} True{}:
      {==}
    case False{} False{}:
      {==}

def run_fed_same(t: String, state: Boundary.State, hf: {fed(state) == True{} : Bool}, hn: {Segments.nonempty(t) == True{} : Bool}) -> {Boundary.run(t, state) == Boundary.run(t, Boundary.AfterBlank{}) : Boundary.State}:
  match t state:
    case SNil{} st:
      impossible({Boundary.run(SNil{}, st) == Boundary.run(SNil{}, Boundary.AfterBlank{}) : Boundary.State}, false_is_not_true(hn))
    case SCon{c, rest} Boundary.AfterBlank{}:
      {==}
    case SCon{+c, +rest} Boundary.AfterText{}:
      Equal.cong(Boundary.State, Boundary.State, x => Boundary.run(rest, x), Boundary.step(Boundary.AfterText{}, c), Boundary.step(Boundary.AfterBlank{}, c), kind_same(Char.is_eq(c, '\n'), Bool.or(Char.is_eq(c, ' '), Bool.or(Char.is_eq(c, '\t'), Char.is_eq(c, '\r')))))
    case SCon{c, rest} Boundary.EmptySource{}:
      impossible({Boundary.run(SCon{c, rest}, Boundary.EmptySource{}) == Boundary.run(SCon{c, rest}, Boundary.AfterBlank{}) : Boundary.State}, false_is_not_true(hf))
    case SCon{c, rest} Boundary.TextLine{}:
      impossible({Boundary.run(SCon{c, rest}, Boundary.TextLine{}) == Boundary.run(SCon{c, rest}, Boundary.AfterBlank{}) : Boundary.State}, false_is_not_true(hf))
    case SCon{c, rest} Boundary.SpaceLine{}:
      impossible({Boundary.run(SCon{c, rest}, Boundary.SpaceLine{}) == Boundary.run(SCon{c, rest}, Boundary.AfterBlank{}) : Boundary.State}, false_is_not_true(hf))

# The stretches before the last end in a line feed when the last of them does.
def segment_ends(segment: Segments.Segment, +acc: String, h: {Segments.segment_ended(segment) == True{} : Bool}) -> {Document.ends_nl(String.append(acc, Segments.segment_text(segment)), False{}) == True{} : Bool}:
  match segment:
    case Segments.First{text, state, proof, None{}}:
      impossible({Document.ends_nl(String.append(acc, text), False{}) == True{} : Bool}, false_is_not_true(h))
    case Segments.First{text, state, proof, Some{e}}:
      ends_nl_append(acc, text, False{}, e)
    case Segments.Later{text, state, proof, None{}}:
      impossible({Document.ends_nl(String.append(acc, text), False{}) == True{} : Bool}, false_is_not_true(h))
    case Segments.Later{text, state, proof, Some{e}}:
      ends_nl_append(acc, text, False{}, e)

def ends_texts(rest: List<&2, Segments.Segment>, +first: Segments.Segment, +acc: String, h: {Segments.ends_last(rest, first) == True{} : Bool}) -> {Document.ends_nl(texts_from(Con{first, rest}, acc), False{}) == True{} : Bool}:
  match rest:
    case Nil{}:
      segment_ends(first, acc, h)
    case Con{next, more}:
      ends_texts(more, next, String.append(acc, Segments.segment_text(first)), h)

# The boundary state at the end of a note is the one worked out from its last stretch.
def end_run(init: List<&2, Segments.Segment>, +last: String, +known: {Segments.end_known(init, last) == True{} : Bool}) -> {Boundary.run(String.append(texts(init), last), Boundary.EmptySource{}) == Segments.end_state(init, last) : Boundary.State}:
  match init:
    case Nil{}:
      {==}
    case Con{+first, +rest}:
      Equal.trans(Boundary.State, Boundary.run(String.append(texts(Con{first, rest}), last), Boundary.EmptySource{}), Boundary.run(last, Boundary.run(texts(Con{first, rest}), Boundary.EmptySource{})), Boundary.run(last, Boundary.AfterBlank{}), Laws.boundary_run_append(texts(Con{first, rest}), last, Boundary.EmptySource{}), run_fed_same(last, Boundary.run(texts(Con{first, rest}), Boundary.EmptySource{}), ends_fed(texts(Con{first, rest}), False{}, Boundary.EmptySource{}, ends_texts(rest, first, SNil{}, bool_and_left(Segments.ends_last(rest, first), Segments.nonempty(last), known)), {==}), bool_and_right(Segments.ends_last(rest, first), Segments.nonempty(last), known)))

# The stretch made for the candidate has the text it was made from.
def placed_claim(placed: Maybe<&2, Segments.Segment>, text: String) -> Type:
  match placed:
    case None{}:
      Unit
    case Some{segment}:
      {Segments.segment_text(segment) == text : String}

def following_text(+text: String, outcome: Maybe<&2, Recognizer.ScanState>, e: {Segments.scan_later(text) == outcome : Maybe<&2, Recognizer.ScanState>}) -> placed_claim(Segments.following_checked(text, outcome, e), text):
  match outcome:
    case None{}:
      Unit{}
    case Some{state}:
      {==}

def place_text(init: List<&2, Segments.Segment>, +text: String) -> placed_claim(Segments.place(init, text), text):
  match init:
    case Nil{}:
      {==}
    case Con{first, rest}:
      following_text(text, Segments.scan_later(text), {==})

def and_true(p: Bool, -q: Bool, ep: {p == True{} : Bool}, eq: {q == True{} : Bool}) -> {Bool.and(p, q) == True{} : Bool}:
  match p:
    case False{}:
      impossible({Bool.and(False{}, q) == True{} : Bool}, false_is_not_true(ep))
    case True{}:
      eq

def string_eq_refl(a: String) -> {String.eq(a, a) == True{} : Bool}:
  match a:
    case SNil{}:
      {==}
    case SCon{+c, +rest}:
      Equal.trans(Bool, String.eq(SCon{c, rest}, SCon{c, rest}), Bool.and(Char.is_eq(c, c), String.eq(rest, rest)), True{}, string_eq_cons(c, c, rest, rest), and_true(Char.is_eq(c, c), String.eq(rest, rest), char_refl(c), string_eq_refl(rest)))

# A text whose boundary run ends ready is its own normal form.
def ended_suffix(state: Boundary.State, h: {Segments.ended(state) == True{} : Bool}) -> {Boundary.suffix(state) == "" : String}:
  match state:
    case Boundary.EmptySource{}:
      {==}
    case Boundary.AfterBlank{}:
      {==}
    case Boundary.TextLine{}:
      impossible({Boundary.suffix(Boundary.TextLine{}) == "" : String}, false_is_not_true(h))
    case Boundary.SpaceLine{}:
      impossible({Boundary.suffix(Boundary.SpaceLine{}) == "" : String}, false_is_not_true(h))
    case Boundary.AfterText{}:
      impossible({Boundary.suffix(Boundary.AfterText{}) == "" : String}, false_is_not_true(h))

def normalize_fixed(+c: String, h: {Boundary.suffix(Boundary.run(c, Boundary.EmptySource{})) == "" : String}) -> {String.eq(Boundary.normalize(c), c) == True{} : Bool}:
  Equal.trans(Bool, String.eq(Boundary.normalize(c), c), String.eq(c, c), True{}, Equal.cong(String, Bool, x => String.eq(x, c), Boundary.normalize(c), c, Equal.trans(String, Boundary.normalize(c), String.append(c, ""), c, Equal.cong(String, String, x => String.append(c, x), Boundary.suffix(Boundary.run(c, Boundary.EmptySource{})), "", h), Laws.text_append_nil(c))), string_eq_refl(c))

# `SourceCrud.create` makes its candidate when each of its checks passes.
def stable_made(+original: String, +id: String, +candidate: String, proof: {String.eq(Recognizer.output(Recognizer.delete(candidate, id)), Boundary.normalize(original)) == True{} : Bool}, equal: Bool, e: {String.eq(Boundary.normalize(candidate), candidate) == equal : Bool}, h: {equal == True{} : Bool}) -> {SourceCrud.created(original, id, SourceCrud.certify_stable(original, id, candidate, proof, Evidence.same_checked(Boundary.normalize(candidate), candidate, equal, e))) == Some{candidate} : Maybe<&2, String>}:
  match equal:
    case False{}:
      impossible({SourceCrud.created(original, id, SourceCrud.certify_stable(original, id, candidate, proof, Evidence.same_checked(Boundary.normalize(candidate), candidate, False{}, e))) == Some{candidate} : Maybe<&2, String>}, false_is_not_true(h))
    case True{}:
      {==}

def deleted_made(+original: String, +id: String, +candidate: String, +text: String, same: {Recognizer.SourceEdit{text, None{}} == Recognizer.delete(candidate, id) : Recognizer.Edit}, equal: Bool, e: {String.eq(text, Boundary.normalize(original)) == equal : Bool}, h: {equal == True{} : Bool}, hst: {String.eq(Boundary.normalize(candidate), candidate) == True{} : Bool}) -> {SourceCrud.created(original, id, SourceCrud.certify(original, id, candidate, SourceCrud.deleted_same(original, id, candidate, text, same, Evidence.same_checked(text, Boundary.normalize(original), equal, e)))) == Some{candidate} : Maybe<&2, String>}:
  match equal:
    case False{}:
      impossible({SourceCrud.created(original, id, SourceCrud.certify(original, id, candidate, SourceCrud.deleted_same(original, id, candidate, text, same, Evidence.same_checked(text, Boundary.normalize(original), False{}, e)))) == Some{candidate} : Maybe<&2, String>}, false_is_not_true(h))
    case True{}:
      stable_made(original, id, candidate, SourceCrud.deleted_proof(original, id, candidate, text, same, e), String.eq(Boundary.normalize(candidate), candidate), {==}, hst)

def edit_differs(edit: Recognizer.Edit) -> Type:
  match edit:
    case Recognizer.SourceEdit{text, None{}}:
      Empty
    case Recognizer.SourceEdit{text, Some{refusal}}:
      Unit

def edit_refused(-text: String, -refusal: String, -out: String, e: {Recognizer.SourceEdit{text, Some{refusal}} == Recognizer.SourceEdit{out, None{}} : Recognizer.Edit}) -> Empty:
  %e : edit_differs(_)
  Unit{}

def candidate_made(+original: String, +id: String, +candidate: String, deleted: Recognizer.Edit, same: {deleted == Recognizer.delete(candidate, id) : Recognizer.Edit}, +out: String, hd: {deleted == Recognizer.SourceEdit{out, None{}} : Recognizer.Edit}, heq: {String.eq(out, Boundary.normalize(original)) == True{} : Bool}, hst: {String.eq(Boundary.normalize(candidate), candidate) == True{} : Bool}) -> {SourceCrud.created(original, id, SourceCrud.check_candidate(original, id, candidate, deleted, same)) == Some{candidate} : Maybe<&2, String>}:
  match deleted:
    case Recognizer.SourceEdit{text, Some{refusal}}:
      impossible({SourceCrud.created(original, id, SourceCrud.check_candidate(original, id, candidate, Recognizer.SourceEdit{text, Some{refusal}}, same)) == Some{candidate} : Maybe<&2, String>}, edit_refused(text, refusal, out, hd))
    case Recognizer.SourceEdit{+text, None{}}:
      deleted_made(original, id, candidate, text, same, String.eq(text, Boundary.normalize(original)), {==}, Equal.trans(Bool, String.eq(text, Boundary.normalize(original)), String.eq(out, Boundary.normalize(original)), True{}, Equal.cong(String, Bool, x => String.eq(x, Boundary.normalize(original)), text, out, Equal.cong(Recognizer.Edit, String, x => Recognizer.output(x), Recognizer.SourceEdit{text, None{}}, Recognizer.SourceEdit{out, None{}}, hd)), heq), hst)

def create_made(+to: String, +id: String, +body: String, +out: String, ha: {SourceCrud.allowed(id, Recognizer.scan(to)) == True{} : Bool}, hd: {Recognizer.delete(String.append(Boundary.normalize(to), Segments.anchor_tail(body, id)), id) == Recognizer.SourceEdit{out, None{}} : Recognizer.Edit}, heq: {String.eq(out, Boundary.normalize(to)) == True{} : Bool}, hst: {String.eq(Boundary.normalize(String.append(Boundary.normalize(to), Segments.anchor_tail(body, id))), String.append(Boundary.normalize(to), Segments.anchor_tail(body, id))) == True{} : Bool}) -> {SourceCrud.created(to, id, SourceCrud.create(to, id, body)) == Some{String.append(Boundary.normalize(to), Segments.anchor_tail(body, id))} : Maybe<&2, String>}:
  %Equal.sym(Bool, SourceCrud.allowed(id, Recognizer.scan(to)), True{}, ha) : {SourceCrud.created(to, id, SourceCrud.create_allowed(to, id, body, _)) == Some{String.append(Boundary.normalize(to), Segments.anchor_tail(body, id))} : Maybe<&2, String>}
  candidate_made(to, id, String.append(Boundary.normalize(to), Segments.anchor_tail(body, id)), Recognizer.delete(String.append(Boundary.normalize(to), Segments.anchor_tail(body, id)), id), {==}, out, hd, heq, hst)

def create_made_at(+to: String, +id: String, +body: String, +src: String, +out: String, +e1: {src == String.append(Boundary.normalize(to), Segments.anchor_tail(body, id)) : String}, ha: {SourceCrud.allowed(id, Recognizer.scan(to)) == True{} : Bool}, hd: {Recognizer.delete(src, id) == Recognizer.SourceEdit{out, None{}} : Recognizer.Edit}, heq: {String.eq(out, Boundary.normalize(to)) == True{} : Bool}, hst: {String.eq(Boundary.normalize(src), src) == True{} : Bool}) -> {SourceCrud.created(to, id, SourceCrud.create(to, id, body)) == Some{src} : Maybe<&2, String>}:
  %Equal.sym(String, src, String.append(Boundary.normalize(to), Segments.anchor_tail(body, id)), e1) : {SourceCrud.created(to, id, SourceCrud.create(to, id, body)) == Some{_} : Maybe<&2, String>}
  create_made(to, id, body, out, ha, Equal.trans(Recognizer.Edit, Recognizer.delete(String.append(Boundary.normalize(to), Segments.anchor_tail(body, id)), id), Recognizer.delete(src, id), Recognizer.SourceEdit{out, None{}}, Equal.cong(String, Recognizer.Edit, x => Recognizer.delete(x, id), String.append(Boundary.normalize(to), Segments.anchor_tail(body, id)), src, Equal.sym(String, src, String.append(Boundary.normalize(to), Segments.anchor_tail(body, id)), e1)), hd), heq, Equal.trans(Bool, String.eq(Boundary.normalize(String.append(Boundary.normalize(to), Segments.anchor_tail(body, id))), String.append(Boundary.normalize(to), Segments.anchor_tail(body, id))), String.eq(Boundary.normalize(src), src), True{}, Equal.cong(String, Bool, x => String.eq(Boundary.normalize(x), x), String.append(Boundary.normalize(to), Segments.anchor_tail(body, id)), src, Equal.sym(String, src, String.append(Boundary.normalize(to), Segments.anchor_tail(body, id)), e1)), hst))

def candidate_text(+p: String, +l: String, +sfx: String, +tail: String, +text: String, a2: {text == String.append(p, l) : String}) -> {String.append(p, String.append(String.append(l, sfx), tail)) == String.append(String.append(text, sfx), tail) : String}:
  Equal.sym(String, String.append(String.append(text, sfx), tail), String.append(p, String.append(String.append(l, sfx), tail)), Equal.trans(String, String.append(String.append(text, sfx), tail), String.append(String.append(String.append(p, l), sfx), tail), String.append(p, String.append(String.append(l, sfx), tail)), Equal.cong(String, String, x => String.append(String.append(x, sfx), tail), text, String.append(p, l), a2), Equal.trans(String, String.append(String.append(String.append(p, l), sfx), tail), String.append(String.append(p, String.append(l, sfx)), tail), String.append(p, String.append(String.append(l, sfx), tail)), Equal.cong(String, String, x => String.append(x, tail), String.append(String.append(p, l), sfx), String.append(p, String.append(l, sfx)), Laws.text_append_assoc(p, l, sfx)), Laws.text_append_assoc(p, String.append(l, sfx), tail))))

# The facts gathered on the way through `Segments.create` are what `SourceCrud.create` checks.
def end_of(+init: List<&2, Segments.Segment>, +last: String, +id: String, +scan: Recognizer.Scan, +text: String, a2: {text == String.append(texts(init), last) : String}, ok: {True{} == Bool.and(SourceCrud.allowed(id, scan), Segments.end_known(init, last)) : Bool}) -> {Boundary.run(text, Boundary.EmptySource{}) == Segments.end_state(init, last) : Boundary.State}:
  Equal.trans(Boundary.State, Boundary.run(text, Boundary.EmptySource{}), Boundary.run(String.append(texts(init), last), Boundary.EmptySource{}), Segments.end_state(init, last), Equal.cong(String, Boundary.State, x => Boundary.run(x, Boundary.EmptySource{}), text, String.append(texts(init), last), a2), end_run(init, last, bool_and_right(SourceCrud.allowed(id, scan), Segments.end_known(init, last), Equal.sym(Bool, True{}, Bool.and(SourceCrud.allowed(id, scan), Segments.end_known(init, last)), ok))))

def normal_of(+init: List<&2, Segments.Segment>, +last: String, +text: String, a5: {Boundary.run(text, Boundary.EmptySource{}) == Segments.end_state(init, last) : Boundary.State}) -> {String.append(text, Boundary.suffix(Segments.end_state(init, last))) == Boundary.normalize(text) : String}:
  Equal.cong(Boundary.State, String, x => String.append(text, Boundary.suffix(x)), Segments.end_state(init, last), Boundary.run(text, Boundary.EmptySource{}), Equal.sym(Boundary.State, Boundary.run(text, Boundary.EmptySource{}), Segments.end_state(init, last), a5))

def whole_of(+init: List<&2, Segments.Segment>, +last: String, +id: String, +body: String, +text: String, +ctext: String, a2: {text == String.append(texts(init), last) : String}, b2: {ctext == String.append(texts(init), String.append(String.append(last, Boundary.suffix(Segments.end_state(init, last))), Segments.anchor_tail(body, id))) : String}) -> {ctext == String.append(String.append(text, Boundary.suffix(Segments.end_state(init, last))), Segments.anchor_tail(body, id)) : String}:
  Equal.trans(String, ctext, String.append(texts(init), String.append(String.append(last, Boundary.suffix(Segments.end_state(init, last))), Segments.anchor_tail(body, id))), String.append(String.append(text, Boundary.suffix(Segments.end_state(init, last))), Segments.anchor_tail(body, id)), b2, candidate_text(texts(init), last, Boundary.suffix(Segments.end_state(init, last)), Segments.anchor_tail(body, id), text, a2))

def ready_of(+init: List<&2, Segments.Segment>, +last: String, +id: String, +body: String, +text: String, +ctext: String, e0: {ctext == String.append(String.append(text, Boundary.suffix(Segments.end_state(init, last))), Segments.anchor_tail(body, id)) : String}, +a5: {Boundary.run(text, Boundary.EmptySource{}) == Segments.end_state(init, last) : Boundary.State}, es: {True{} == Segments.ended(Boundary.run(Segments.anchor_tail(body, id), Boundary.run(Boundary.suffix(Segments.end_state(init, last)), Segments.end_state(init, last)))) : Bool}) -> {String.eq(Boundary.normalize(ctext), ctext) == True{} : Bool}:
  normalize_fixed(ctext, ended_suffix(Boundary.run(ctext, Boundary.EmptySource{}), Equal.trans(Bool, Segments.ended(Boundary.run(ctext, Boundary.EmptySource{})), Segments.ended(Boundary.run(Segments.anchor_tail(body, id), Boundary.run(Boundary.suffix(Segments.end_state(init, last)), Segments.end_state(init, last)))), True{}, Equal.cong(Boundary.State, Bool, x => Segments.ended(x), Boundary.run(ctext, Boundary.EmptySource{}), Boundary.run(Segments.anchor_tail(body, id), Boundary.run(Boundary.suffix(Segments.end_state(init, last)), Segments.end_state(init, last))), Equal.trans(Boundary.State, Boundary.run(ctext, Boundary.EmptySource{}), Boundary.run(String.append(String.append(text, Boundary.suffix(Segments.end_state(init, last))), Segments.anchor_tail(body, id)), Boundary.EmptySource{}), Boundary.run(Segments.anchor_tail(body, id), Boundary.run(Boundary.suffix(Segments.end_state(init, last)), Segments.end_state(init, last))), Equal.cong(String, Boundary.State, x => Boundary.run(x, Boundary.EmptySource{}), ctext, String.append(String.append(text, Boundary.suffix(Segments.end_state(init, last))), Segments.anchor_tail(body, id)), e0), Equal.trans(Boundary.State, Boundary.run(String.append(String.append(text, Boundary.suffix(Segments.end_state(init, last))), Segments.anchor_tail(body, id)), Boundary.EmptySource{}), Boundary.run(Segments.anchor_tail(body, id), Boundary.run(String.append(text, Boundary.suffix(Segments.end_state(init, last))), Boundary.EmptySource{})), Boundary.run(Segments.anchor_tail(body, id), Boundary.run(Boundary.suffix(Segments.end_state(init, last)), Segments.end_state(init, last))), Laws.boundary_run_append(String.append(text, Boundary.suffix(Segments.end_state(init, last))), Segments.anchor_tail(body, id), Boundary.EmptySource{}), Equal.cong(Boundary.State, Boundary.State, x => Boundary.run(Segments.anchor_tail(body, id), x), Boundary.run(String.append(text, Boundary.suffix(Segments.end_state(init, last))), Boundary.EmptySource{}), Boundary.run(Boundary.suffix(Segments.end_state(init, last)), Segments.end_state(init, last)), Equal.trans(Boundary.State, Boundary.run(String.append(text, Boundary.suffix(Segments.end_state(init, last))), Boundary.EmptySource{}), Boundary.run(Boundary.suffix(Segments.end_state(init, last)), Boundary.run(text, Boundary.EmptySource{})), Boundary.run(Boundary.suffix(Segments.end_state(init, last)), Segments.end_state(init, last)), Laws.boundary_run_append(text, Boundary.suffix(Segments.end_state(init, last)), Boundary.EmptySource{}), Equal.cong(Boundary.State, Boundary.State, x => Boundary.run(Boundary.suffix(Segments.end_state(init, last)), x), Boundary.run(text, Boundary.EmptySource{}), Segments.end_state(init, last), a5)))))), Equal.sym(Bool, True{}, Segments.ended(Boundary.run(Segments.anchor_tail(body, id), Boundary.run(Boundary.suffix(Segments.end_state(init, last)), Segments.end_state(init, last)))), es))))

def final_at(+init: List<&2, Segments.Segment>, +last: String, +id: String, +body: String, +text: String, +scan: Recognizer.Scan, +ctext: String, +cscan: Recognizer.Scan, +out: String, a1: {scan == Recognizer.scan(text) : Recognizer.Scan}, +ok: {True{} == Bool.and(SourceCrud.allowed(id, scan), Segments.end_known(init, last)) : Bool}, b1: {cscan == Recognizer.scan(ctext) : Recognizer.Scan}, +e0: {ctext == String.append(String.append(text, Boundary.suffix(Segments.end_state(init, last))), Segments.anchor_tail(body, id)) : String}, +a5: {Boundary.run(text, Boundary.EmptySource{}) == Segments.end_state(init, last) : Boundary.State}, +en: {String.append(text, Boundary.suffix(Segments.end_state(init, last))) == Boundary.normalize(text) : String}, es: {True{} == Segments.ended(Boundary.run(Segments.anchor_tail(body, id), Boundary.run(Boundary.suffix(Segments.end_state(init, last)), Segments.end_state(init, last)))) : Bool}, ed: {Recognizer.SourceEdit{out, None{}} == Segments.delete_scanned(ctext, id, cscan) : Recognizer.Edit}, esame: {True{} == Segments.same_text(out, String.append(text, Boundary.suffix(Segments.end_state(init, last)))) : Bool}) -> {SourceCrud.created(text, id, SourceCrud.create(text, id, body)) == Some{ctext} : Maybe<&2, String>}:
  create_made_at(text, id, body, ctext, out,
    Equal.trans(String, ctext, String.append(String.append(text, Boundary.suffix(Segments.end_state(init, last))), Segments.anchor_tail(body, id)), String.append(Boundary.normalize(text), Segments.anchor_tail(body, id)), e0, Equal.cong(String, String, x => String.append(x, Segments.anchor_tail(body, id)), String.append(text, Boundary.suffix(Segments.end_state(init, last))), Boundary.normalize(text), en)),
    Equal.trans(Bool, SourceCrud.allowed(id, Recognizer.scan(text)), SourceCrud.allowed(id, scan), True{}, Equal.cong(Recognizer.Scan, Bool, x => SourceCrud.allowed(id, x), Recognizer.scan(text), scan, Equal.sym(Recognizer.Scan, scan, Recognizer.scan(text), a1)), bool_and_left(SourceCrud.allowed(id, scan), Segments.end_known(init, last), Equal.sym(Bool, True{}, Bool.and(SourceCrud.allowed(id, scan), Segments.end_known(init, last)), ok))),
    Equal.trans(Recognizer.Edit, Recognizer.delete(ctext, id), Segments.delete_scanned(ctext, id, cscan), Recognizer.SourceEdit{out, None{}}, Equal.sym(Recognizer.Edit, Segments.delete_scanned(ctext, id, cscan), Recognizer.delete(ctext, id), delete_scanned_same(ctext, id, cscan, b1)), Equal.sym(Recognizer.Edit, Recognizer.SourceEdit{out, None{}}, Segments.delete_scanned(ctext, id, cscan), ed)),
    Equal.trans(Bool, String.eq(out, Boundary.normalize(text)), String.eq(out, out), True{}, Equal.cong(String, Bool, x => String.eq(out, x), Boundary.normalize(text), out, Equal.sym(String, out, Boundary.normalize(text), Equal.trans(String, out, String.append(text, Boundary.suffix(Segments.end_state(init, last))), Boundary.normalize(text), same_text_same(out, String.append(text, Boundary.suffix(Segments.end_state(init, last))), Equal.sym(Bool, True{}, Segments.same_text(out, String.append(text, Boundary.suffix(Segments.end_state(init, last)))), esame)), en))), string_eq_refl(out)),
    ready_of(init, last, id, body, text, ctext, e0, a5, es))

def final(+init: List<&2, Segments.Segment>, +last: String, +id: String, +body: String, +text: String, +scan: Recognizer.Scan, +ctext: String, +cscan: Recognizer.Scan, +out: String, a1: {scan == Recognizer.scan(text) : Recognizer.Scan}, +a2: {text == String.append(texts(init), last) : String}, +ok: {True{} == Bool.and(SourceCrud.allowed(id, scan), Segments.end_known(init, last)) : Bool}, b1: {cscan == Recognizer.scan(ctext) : Recognizer.Scan}, b2: {ctext == String.append(texts(init), String.append(String.append(last, Boundary.suffix(Segments.end_state(init, last))), Segments.anchor_tail(body, id))) : String}, es: {True{} == Segments.ended(Boundary.run(Segments.anchor_tail(body, id), Boundary.run(Boundary.suffix(Segments.end_state(init, last)), Segments.end_state(init, last)))) : Bool}, ed: {Recognizer.SourceEdit{out, None{}} == Segments.delete_scanned(ctext, id, cscan) : Recognizer.Edit}, esame: {True{} == Segments.same_text(out, String.append(text, Boundary.suffix(Segments.end_state(init, last)))) : Bool}) -> {SourceCrud.created(text, id, SourceCrud.create(text, id, body)) == Some{ctext} : Maybe<&2, String>}:
  final_at(init, last, id, body, text, scan, ctext, cscan, out, a1, ok, b1, whole_of(init, last, id, body, text, ctext, a2, b2), end_of(init, last, id, scan, text, a2, ok), normal_of(init, last, text, end_of(init, last, id, scan, text, a2, ok)), es, ed, esame)

def create_claim(+id: String, +body: String, outcome: Maybe<&2, Segments.Created>) -> Type:
  match outcome:
    case None{}:
      Unit
    case Some{Segments.Created{original, source}}:
      {SourceCrud.created(original, id, SourceCrud.create(original, id, body)) == Some{source} : Maybe<&2, String>}

def checked_stage(+init: List<&2, Segments.Segment>, +last: String, +id: String, +body: String, +text: String, +scan: Recognizer.Scan, +ctext: String, +cscan: Recognizer.Scan, +out: String, a1: {scan == Recognizer.scan(text) : Recognizer.Scan}, a2: {text == String.append(texts(init), last) : String}, ok: {True{} == Bool.and(SourceCrud.allowed(id, scan), Segments.end_known(init, last)) : Bool}, b1: {cscan == Recognizer.scan(ctext) : Recognizer.Scan}, b2: {ctext == String.append(texts(init), String.append(String.append(last, Boundary.suffix(Segments.end_state(init, last))), Segments.anchor_tail(body, id))) : String}, es: {True{} == Segments.ended(Boundary.run(Segments.anchor_tail(body, id), Boundary.run(Boundary.suffix(Segments.end_state(init, last)), Segments.end_state(init, last)))) : Bool}, ed: {Recognizer.SourceEdit{out, None{}} == Segments.delete_scanned(ctext, id, cscan) : Recognizer.Edit}, same: Bool, esame: {same == Segments.same_text(out, String.append(text, Boundary.suffix(Segments.end_state(init, last)))) : Bool}) -> create_claim(id, body, Segments.create_checked(text, ctext, same)):
  match same:
    case False{}:
      Unit{}
    case True{}:
      final(init, last, id, body, text, scan, ctext, cscan, out, a1, a2, ok, b1, b2, es, ed, esame)

def deleted_stage(+init: List<&2, Segments.Segment>, +last: String, +id: String, +body: String, +text: String, +scan: Recognizer.Scan, +ctext: String, +cscan: Recognizer.Scan, a1: {scan == Recognizer.scan(text) : Recognizer.Scan}, a2: {text == String.append(texts(init), last) : String}, ok: {True{} == Bool.and(SourceCrud.allowed(id, scan), Segments.end_known(init, last)) : Bool}, b1: {cscan == Recognizer.scan(ctext) : Recognizer.Scan}, b2: {ctext == String.append(texts(init), String.append(String.append(last, Boundary.suffix(Segments.end_state(init, last))), Segments.anchor_tail(body, id))) : String}, es: {True{} == Segments.ended(Boundary.run(Segments.anchor_tail(body, id), Boundary.run(Boundary.suffix(Segments.end_state(init, last)), Segments.end_state(init, last)))) : Bool}, deleted: Recognizer.Edit, ed: {deleted == Segments.delete_scanned(ctext, id, cscan) : Recognizer.Edit}) -> create_claim(id, body, Segments.create_deleted(text, ctext, String.append(text, Boundary.suffix(Segments.end_state(init, last))), deleted)):
  match deleted:
    case Recognizer.SourceEdit{out, Some{refusal}}:
      Unit{}
    case Recognizer.SourceEdit{+out, None{}}:
      checked_stage(init, last, id, body, text, scan, ctext, cscan, out, a1, a2, ok, b1, b2, es, ed, Segments.same_text(out, String.append(text, Boundary.suffix(Segments.end_state(init, last)))), {==})

def scanned_stage(+init: List<&2, Segments.Segment>, +last: String, +id: String, +body: String, +text: String, +scan: Recognizer.Scan, +segment: Segments.Segment, a1: {scan == Recognizer.scan(text) : Recognizer.Scan}, a2: {text == String.append(texts(init), last) : String}, ok: {True{} == Bool.and(SourceCrud.allowed(id, scan), Segments.end_known(init, last)) : Bool}, ep: {Segments.segment_text(segment) == String.append(String.append(last, Boundary.suffix(Segments.end_state(init, last))), Segments.anchor_tail(body, id)) : String}, es: {True{} == Segments.ended(Boundary.run(Segments.anchor_tail(body, id), Boundary.run(Boundary.suffix(Segments.end_state(init, last)), Segments.end_state(init, last)))) : Bool}, candidate: Maybe<&2, Segments.Assembled>, +ec: {candidate == Segments.assemble(List.append(&2, Segments.Segment, init, [segment])) : Maybe<&2, Segments.Assembled>}) -> create_claim(id, body, Segments.create_scanned(id, text, String.append(text, Boundary.suffix(Segments.end_state(init, last))), candidate)):
  match candidate:
    case None{}:
      Unit{}
    case Some{Segments.Assembled{+ctext, +cscan}}:
      deleted_stage(init, last, id, body, text, scan, ctext, cscan, a1, a2, ok,
        Laws.segments_assemble(List.append(&2, Segments.Segment, init, [segment]), Segments.Assembled{ctext, cscan}, Equal.sym(Maybe<&2, Segments.Assembled>, Some{Segments.Assembled{ctext, cscan}}, Segments.assemble(List.append(&2, Segments.Segment, init, [segment])), ec)),
        Equal.trans(String, ctext, String.append(texts(init), Segments.segment_text(segment)), String.append(texts(init), String.append(String.append(last, Boundary.suffix(Segments.end_state(init, last))), Segments.anchor_tail(body, id))), Equal.trans(String, ctext, texts(List.append(&2, Segments.Segment, init, [segment])), String.append(texts(init), Segments.segment_text(segment)), assemble_text(List.append(&2, Segments.Segment, init, [segment]), Segments.Assembled{ctext, cscan}, Equal.sym(Maybe<&2, Segments.Assembled>, Some{Segments.Assembled{ctext, cscan}}, Segments.assemble(List.append(&2, Segments.Segment, init, [segment])), ec)), texts_snoc(init, segment, SNil{})), Equal.cong(String, String, x => String.append(texts(init), x), Segments.segment_text(segment), String.append(String.append(last, Boundary.suffix(Segments.end_state(init, last))), Segments.anchor_tail(body, id)), ep)),
        es, Segments.delete_scanned(ctext, id, cscan), {==})

def placed_stage(+init: List<&2, Segments.Segment>, +last: String, +id: String, +body: String, +text: String, +scan: Recognizer.Scan, a1: {scan == Recognizer.scan(text) : Recognizer.Scan}, a2: {text == String.append(texts(init), last) : String}, ok: {True{} == Bool.and(SourceCrud.allowed(id, scan), Segments.end_known(init, last)) : Bool}, placed: Maybe<&2, Segments.Segment>, ep: placed_claim(placed, String.append(String.append(last, Boundary.suffix(Segments.end_state(init, last))), Segments.anchor_tail(body, id))), stable: Bool, es: {stable == Segments.ended(Boundary.run(Segments.anchor_tail(body, id), Boundary.run(Boundary.suffix(Segments.end_state(init, last)), Segments.end_state(init, last)))) : Bool}) -> create_claim(id, body, Segments.create_placed(init, id, text, String.append(text, Boundary.suffix(Segments.end_state(init, last))), placed, stable)):
  match placed stable:
    case Some{+segment} True{}:
      scanned_stage(init, last, id, body, text, scan, segment, a1, a2, ok, ep, es, Segments.assemble(List.append(&2, Segments.Segment, init, [segment])), {==})
    case Some{segment} False{}:
      Unit{}
    case None{} True{}:
      Unit{}
    case None{} False{}:
      Unit{}

def allowed_stage(+init: List<&2, Segments.Segment>, +last: String, +id: String, +body: String, +text: String, +scan: Recognizer.Scan, a1: {scan == Recognizer.scan(text) : Recognizer.Scan}, a2: {text == String.append(texts(init), last) : String}, ok: Bool, eok: {ok == Bool.and(SourceCrud.allowed(id, scan), Segments.end_known(init, last)) : Bool}) -> create_claim(id, body, Segments.create_allowed(init, last, id, body, text, ok)):
  match ok:
    case False{}:
      Unit{}
    case True{}:
      placed_stage(init, last, id, body, text, scan, a1, a2, eok, Segments.place(init, String.append(String.append(last, Boundary.suffix(Segments.end_state(init, last))), Segments.anchor_tail(body, id))), place_text(init, String.append(String.append(last, Boundary.suffix(Segments.end_state(init, last))), Segments.anchor_tail(body, id))), Segments.ended(Boundary.run(Segments.anchor_tail(body, id), Boundary.run(Boundary.suffix(Segments.end_state(init, last)), Segments.end_state(init, last)))), {==})

def from_stage(+init: List<&2, Segments.Segment>, +last: Segments.Segment, +id: String, +body: String, original: Maybe<&2, Segments.Assembled>, +eo: {original == Segments.assemble(List.append(&2, Segments.Segment, init, [last])) : Maybe<&2, Segments.Assembled>}) -> create_claim(id, body, Segments.create_from(init, Segments.segment_text(last), id, body, original)):
  match original:
    case None{}:
      Unit{}
    case Some{Segments.Assembled{+text, +scan}}:
      allowed_stage(init, Segments.segment_text(last), id, body, text, scan,
        Laws.segments_assemble(List.append(&2, Segments.Segment, init, [last]), Segments.Assembled{text, scan}, Equal.sym(Maybe<&2, Segments.Assembled>, Some{Segments.Assembled{text, scan}}, Segments.assemble(List.append(&2, Segments.Segment, init, [last])), eo)),
        Equal.trans(String, text, texts(List.append(&2, Segments.Segment, init, [last])), String.append(texts(init), Segments.segment_text(last)), assemble_text(List.append(&2, Segments.Segment, init, [last]), Segments.Assembled{text, scan}, Equal.sym(Maybe<&2, Segments.Assembled>, Some{Segments.Assembled{text, scan}}, Segments.assemble(List.append(&2, Segments.Segment, init, [last])), eo)), texts_snoc(init, last, SNil{})),
        Bool.and(SourceCrud.allowed(id, scan), Segments.end_known(init, Segments.segment_text(last))), {==})

def created_differs(outcome: Maybe<&2, Segments.Created>) -> Type:
  match outcome:
    case None{}:
      Unit
    case Some{result}:
      Empty

def none_is_not_created(-result: Segments.Created, e: {None{} == Some{result} : Maybe<&2, Segments.Created>}) -> Empty:
  %e : created_differs(_)
  Unit{}

def created_or(outcome: Maybe<&2, Segments.Created>) -> Segments.Created:
  match outcome:
    case None{}:
      Segments.Created{SNil{}, SNil{}}
    case Some{result}:
      result

def created_at(+id: String, +body: String, outcome: Maybe<&2, Segments.Created>, c: create_claim(id, body, outcome), +result: Segments.Created, made: {outcome == Some{result} : Maybe<&2, Segments.Created>}) -> {SourceCrud.created(Segments.created_original(result), id, SourceCrud.create(Segments.created_original(result), id, body)) == Some{Segments.created_source(result)} : Maybe<&2, String>}:
  match outcome:
    case None{}:
      impossible({SourceCrud.created(Segments.created_original(result), id, SourceCrud.create(Segments.created_original(result), id, body)) == Some{Segments.created_source(result)} : Maybe<&2, String>}, none_is_not_created(result, made))
    case Some{Segments.Created{original, source}}:
      %made : {SourceCrud.created(Segments.created_original(created_or(_)), id, SourceCrud.create(Segments.created_original(created_or(_)), id, body)) == Some{Segments.created_source(created_or(_))} : Maybe<&2, String>}
      c

def Laws.segments_create(init, last, id, body, result, made):
  created_at(id, body, Segments.create(init, last, id, body), from_stage(init, last, id, body, Segments.assemble(List.append(&2, Segments.Segment, init, [last])), {==}), result, made)

# ── A stored region moved or resized whole ──────────────────────────────────
def area_pick_valid(+full: Nat, ok: Bool, +old: Area.Area, +new: Area.Area, e: {ok == Area.valid(full, new) : Bool}, kept: {Area.valid(full, old) == True{} : Bool}) -> {Area.valid(full, Area.pick(ok, old, new)) == True{} : Bool}:
  match ok:
    case True{}:
      Equal.sym(Bool, True{}, Area.valid(full, new), e)
    case False{}:
      kept

def Laws.area_move_valid(full, area, way, by, kept):
  area_pick_valid(full, Area.valid(full, Area.moved(full, area, way, by)), area, Area.moved(full, area, way, by), {==}, kept)

def Laws.area_resize_valid(full, least, area, way, by, kept):
  area_pick_valid(full, Area.valid(full, Area.resized(full, least, area, way, by)), area, Area.resized(full, least, area, way, by), {==}, kept)

def area_pick_extent(ok: Bool, +old: Area.Area, +new: Area.Area, same: {Area.extent(new) == Area.extent(old) : Area.Point}) -> {Area.extent(Area.pick(ok, old, new)) == Area.extent(old) : Area.Point}:
  match ok:
    case True{}:
      same
    case False{}:
      {==}

def area_moved_extent(+full: Nat, +area: Area.Area, +way: Area.Way, +by: Nat) -> {Area.extent(Area.moved(full, area, way, by)) == Area.extent(area) : Area.Point}:
  match area way:
    case Area.Area{page, x, y, w, h} Area.Left{}:
      {==}
    case Area.Area{page, x, y, w, h} Area.Right{}:
      {==}
    case Area.Area{page, x, y, w, h} Area.Up{}:
      {==}
    case Area.Area{page, x, y, w, h} Area.Down{}:
      {==}

def Laws.area_move_keeps_extent(full, area, way, by):
  area_pick_extent(Area.valid(full, Area.moved(full, area, way, by)), area, Area.moved(full, area, way, by), area_moved_extent(full, area, way, by))

def area_pick_corner(ok: Bool, +old: Area.Area, +new: Area.Area, same: {Area.corner(new) == Area.corner(old) : Area.Point}) -> {Area.corner(Area.pick(ok, old, new)) == Area.corner(old) : Area.Point}:
  match ok:
    case True{}:
      same
    case False{}:
      {==}

def area_resized_corner(+full: Nat, +least: Nat, +area: Area.Area, +way: Area.Way, +by: Nat) -> {Area.corner(Area.resized(full, least, area, way, by)) == Area.corner(area) : Area.Point}:
  match area way:
    case Area.Area{page, x, y, w, h} Area.Left{}:
      {==}
    case Area.Area{page, x, y, w, h} Area.Right{}:
      {==}
    case Area.Area{page, x, y, w, h} Area.Up{}:
      {==}
    case Area.Area{page, x, y, w, h} Area.Down{}:
      {==}

def Laws.area_resize_keeps_corner(full, least, area, way, by):
  area_pick_corner(Area.valid(full, Area.resized(full, least, area, way, by)), area, Area.resized(full, least, area, way, by), area_resized_corner(full, least, area, way, by))

# ── A move or a resize of a stored region is never refused ──────────────────
def area_swap_across(p: Bool, a: Bool, b: Bool, kx: Bool, ky: Bool, -kx2: Bool, kept: {Bool.and(p, Bool.and(a, Bool.and(b, Bool.and(kx, ky)))) == True{} : Bool}, step: {kx == True{} : Bool} -> {kx2 == True{} : Bool}) -> {Bool.and(p, Bool.and(a, Bool.and(b, Bool.and(kx2, ky)))) == True{} : Bool}:
  match p a b kx:
    case False{} a b kx:
      impossible({Bool.and(False{}, Bool.and(a, Bool.and(b, Bool.and(kx2, ky)))) == True{} : Bool}, false_is_not_true(kept))
    case True{} False{} b kx:
      impossible({Bool.and(True{}, Bool.and(False{}, Bool.and(b, Bool.and(kx2, ky)))) == True{} : Bool}, false_is_not_true(kept))
    case True{} True{} False{} kx:
      impossible({Bool.and(True{}, Bool.and(True{}, Bool.and(False{}, Bool.and(kx2, ky)))) == True{} : Bool}, false_is_not_true(kept))
    case True{} True{} True{} False{}:
      impossible({Bool.and(True{}, Bool.and(True{}, Bool.and(True{}, Bool.and(kx2, ky)))) == True{} : Bool}, false_is_not_true(kept))
    case True{} True{} True{} True{}:
      %Equal.sym(Bool, kx2, True{}, step({==})) : {Bool.and(_, ky) == True{} : Bool}
      kept

def area_swap_down(p: Bool, a: Bool, b: Bool, kx: Bool, ky: Bool, -ky2: Bool, kept: {Bool.and(p, Bool.and(a, Bool.and(b, Bool.and(kx, ky)))) == True{} : Bool}, step: {ky == True{} : Bool} -> {ky2 == True{} : Bool}) -> {Bool.and(p, Bool.and(a, Bool.and(b, Bool.and(kx, ky2)))) == True{} : Bool}:
  match p a b kx:
    case False{} a b kx:
      impossible({Bool.and(False{}, Bool.and(a, Bool.and(b, Bool.and(kx, ky2)))) == True{} : Bool}, false_is_not_true(kept))
    case True{} False{} b kx:
      impossible({Bool.and(True{}, Bool.and(False{}, Bool.and(b, Bool.and(kx, ky2)))) == True{} : Bool}, false_is_not_true(kept))
    case True{} True{} False{} kx:
      impossible({Bool.and(True{}, Bool.and(True{}, Bool.and(False{}, Bool.and(kx, ky2)))) == True{} : Bool}, false_is_not_true(kept))
    case True{} True{} True{} False{}:
      impossible({Bool.and(True{}, Bool.and(True{}, Bool.and(True{}, Bool.and(False{}, ky2)))) == True{} : Bool}, false_is_not_true(kept))
    case True{} True{} True{} True{}:
      step(kept)

def area_moved_valid(+full: Nat, +area: Area.Area, +way: Area.Way, +by: Nat, kept: {Area.valid(full, area) == True{} : Bool}) -> {Area.valid(full, Area.moved(full, area, way, by)) == True{} : Bool}:
  match area way:
    case Area.Area{page, x, y, w, h} Area.Left{}:
      area_swap_across(Nat.is_ge(page, 1n), Nat.is_ge(w, 1n), Nat.is_ge(h, 1n), Area.within(full, Area.Span{x, w}), Area.within(full, Area.Span{y, h}), Area.within(full, Area.Span{Nat.sub(x, by), w}), kept, k => area_earlier_fits(x, by, full, w, k))
    case Area.Area{page, x, y, w, h} Area.Right{}:
      area_swap_across(Nat.is_ge(page, 1n), Nat.is_ge(w, 1n), Nat.is_ge(h, 1n), Area.within(full, Area.Span{x, w}), Area.within(full, Area.Span{y, h}), Area.within(full, Area.Span{Nat.min(Nat.add(x, by), Nat.sub(full, w)), w}), kept, k => area_later_fits(w, full, Nat.add(x, by), nat_ge_add_r(x, full, w, k)))
    case Area.Area{page, x, y, w, h} Area.Up{}:
      area_swap_down(Nat.is_ge(page, 1n), Nat.is_ge(w, 1n), Nat.is_ge(h, 1n), Area.within(full, Area.Span{x, w}), Area.within(full, Area.Span{y, h}), Area.within(full, Area.Span{Nat.sub(y, by), h}), kept, k => area_earlier_fits(y, by, full, h, k))
    case Area.Area{page, x, y, w, h} Area.Down{}:
      area_swap_down(Nat.is_ge(page, 1n), Nat.is_ge(w, 1n), Nat.is_ge(h, 1n), Area.within(full, Area.Span{x, w}), Area.within(full, Area.Span{y, h}), Area.within(full, Area.Span{Nat.min(Nat.add(y, by), Nat.sub(full, h)), h}), kept, k => area_later_fits(h, full, Nat.add(y, by), nat_ge_add_r(y, full, h, k)))

def Laws.area_move_goes(full, area, way, by, kept):
  %Equal.sym(Bool, Area.valid(full, Area.moved(full, area, way, by)), True{}, area_moved_valid(full, area, way, by, kept)) : {Area.pick(_, area, Area.moved(full, area, way, by)) == Area.moved(full, area, way, by) : Area.Area}
  {==}

def nat_one_min(+a: Nat, +b: Nat, ea: {Nat.is_ge(a, 1n) == True{} : Bool}, eb: {Nat.is_ge(b, 1n) == True{} : Bool}) -> {Nat.is_ge(Nat.min(a, b), 1n) == True{} : Bool}:
  match a b:
    case 0n b:
      impossible({Nat.is_ge(Nat.min(0n, b), 1n) == True{} : Bool}, false_is_not_true(ea))
    case 1n+ap 0n:
      impossible({Nat.is_ge(Nat.min(1n+ap, 0n), 1n) == True{} : Bool}, false_is_not_true(eb))
    case 1n+ap 1n+bp:
      nat_ge_zero(Nat.min(ap, bp))

def nat_one_max(+a: Nat, +l: Nat) -> {Nat.is_ge(Nat.max(a, 1n+l), 1n) == True{} : Bool}:
  match a:
    case 0n:
      nat_ge_zero(l)
    case 1n+ap:
      nat_ge_zero(Nat.max(ap, l))

# What is left of the page after the start is at least one unit when a span
# with some extent fits there.
def nat_one_sub(+x: Nat, +f: Nat, +w: Nat, ew: {Nat.is_ge(w, 1n) == True{} : Bool}, k: {Nat.is_ge(f, Nat.add(x, w)) == True{} : Bool}) -> {Nat.is_ge(Nat.sub(f, x), 1n) == True{} : Bool}:
  match x f w:
    case 0n 0n 0n:
      impossible({Nat.is_ge(Nat.sub(0n, 0n), 1n) == True{} : Bool}, false_is_not_true(ew))
    case 0n 0n 1n+wp:
      impossible({Nat.is_ge(Nat.sub(0n, 0n), 1n) == True{} : Bool}, false_is_not_true(k))
    case 0n 1n+fp w:
      nat_ge_zero(fp)
    case 1n+xp 0n w:
      impossible({Nat.is_ge(Nat.sub(0n, 1n+xp), 1n) == True{} : Bool}, false_is_not_true(k))
    case 1n+xp 1n+fp w:
      nat_one_sub(xp, fp, w, ew, k)

# Growing leaves a span some extent: there is room past the start, because a
# span with extent already fits there.
def area_grow_some(+x: Nat, +f: Nat, +w: Nat, +by: Nat, ew: {Nat.is_ge(w, 1n) == True{} : Bool}, k: {Nat.is_ge(f, Nat.add(x, w)) == True{} : Bool}) -> {Nat.is_ge(Nat.min(Nat.add(w, by), Nat.sub(f, x)), 1n) == True{} : Bool}:
  match w:
    case 0n:
      impossible({Nat.is_ge(Nat.min(Nat.add(0n, by), Nat.sub(f, x)), 1n) == True{} : Bool}, false_is_not_true(ew))
    case 1n+wp:
      nat_one_min(1n+Nat.add(wp, by), Nat.sub(f, x), nat_ge_zero(Nat.add(wp, by)), nat_one_sub(x, f, 1n+wp, nat_ge_zero(wp), k))

def area_swap_wide(p: Bool, a: Bool, b: Bool, kx: Bool, ky: Bool, -a2: Bool, -kx2: Bool, kept: {Bool.and(p, Bool.and(a, Bool.and(b, Bool.and(kx, ky)))) == True{} : Bool}, extent: {a == True{} : Bool} -> {kx == True{} : Bool} -> {a2 == True{} : Bool}, fits: {kx == True{} : Bool} -> {kx2 == True{} : Bool}) -> {Bool.and(p, Bool.and(a2, Bool.and(b, Bool.and(kx2, ky)))) == True{} : Bool}:
  match p a b kx:
    case False{} a b kx:
      impossible({Bool.and(False{}, Bool.and(a2, Bool.and(b, Bool.and(kx2, ky)))) == True{} : Bool}, false_is_not_true(kept))
    case True{} False{} b kx:
      impossible({Bool.and(True{}, Bool.and(a2, Bool.and(b, Bool.and(kx2, ky)))) == True{} : Bool}, false_is_not_true(kept))
    case True{} True{} False{} kx:
      impossible({Bool.and(True{}, Bool.and(a2, Bool.and(False{}, Bool.and(kx2, ky)))) == True{} : Bool}, false_is_not_true(kept))
    case True{} True{} True{} False{}:
      impossible({Bool.and(True{}, Bool.and(a2, Bool.and(True{}, Bool.and(kx2, ky)))) == True{} : Bool}, false_is_not_true(kept))
    case True{} True{} True{} True{}:
      %Equal.sym(Bool, a2, True{}, extent({==}, {==})) : {Bool.and(_, Bool.and(kx2, ky)) == True{} : Bool}
      %Equal.sym(Bool, kx2, True{}, fits({==})) : {Bool.and(_, ky) == True{} : Bool}
      kept

def area_swap_tall(p: Bool, a: Bool, b: Bool, kx: Bool, ky: Bool, -b2: Bool, -ky2: Bool, +kept: {Bool.and(p, Bool.and(a, Bool.and(b, Bool.and(kx, ky)))) == True{} : Bool}, extent: {b == True{} : Bool} -> {ky == True{} : Bool} -> {b2 == True{} : Bool}, fits: {ky == True{} : Bool} -> {ky2 == True{} : Bool}) -> {Bool.and(p, Bool.and(a, Bool.and(b2, Bool.and(kx, ky2)))) == True{} : Bool}:
  match p a b kx:
    case False{} a b kx:
      impossible({Bool.and(False{}, Bool.and(a, Bool.and(b2, Bool.and(kx, ky2)))) == True{} : Bool}, false_is_not_true(kept))
    case True{} False{} b kx:
      impossible({Bool.and(True{}, Bool.and(False{}, Bool.and(b2, Bool.and(kx, ky2)))) == True{} : Bool}, false_is_not_true(kept))
    case True{} True{} False{} kx:
      impossible({Bool.and(True{}, Bool.and(True{}, Bool.and(b2, Bool.and(kx, ky2)))) == True{} : Bool}, false_is_not_true(kept))
    case True{} True{} True{} False{}:
      impossible({Bool.and(True{}, Bool.and(True{}, Bool.and(b2, Bool.and(False{}, ky2)))) == True{} : Bool}, false_is_not_true(kept))
    case True{} True{} True{} True{}:
      %Equal.sym(Bool, b2, True{}, extent({==}, kept)) : {Bool.and(_, ky2) == True{} : Bool}
      fits(kept)

def area_resized_valid(+full: Nat, +least: Nat, +area: Area.Area, +way: Area.Way, +by: Nat, kept: {Area.valid(full, area) == True{} : Bool}) -> {Area.valid(full, Area.resized(full, 1n+least, area, way, by)) == True{} : Bool}:
  match area way:
    case Area.Area{page, x, y, w, h} Area.Left{}:
      area_swap_wide(Nat.is_ge(page, 1n), Nat.is_ge(w, 1n), Nat.is_ge(h, 1n), Area.within(full, Area.Span{x, w}), Area.within(full, Area.Span{y, h}), Nat.is_ge(Nat.min(w, Nat.max(Nat.sub(w, by), 1n+least)), 1n), Area.within(full, Area.Span{x, Nat.min(w, Nat.max(Nat.sub(w, by), 1n+least))}), kept, ew => k => nat_one_min(w, Nat.max(Nat.sub(w, by), 1n+least), ew, nat_one_max(Nat.sub(w, by), least)), k => area_shrink_fits(x, full, w, Nat.max(Nat.sub(w, by), 1n+least), k))
    case Area.Area{page, x, y, w, h} Area.Right{}:
      area_swap_wide(Nat.is_ge(page, 1n), Nat.is_ge(w, 1n), Nat.is_ge(h, 1n), Area.within(full, Area.Span{x, w}), Area.within(full, Area.Span{y, h}), Nat.is_ge(Nat.min(Nat.add(w, by), Nat.sub(full, x)), 1n), Area.within(full, Area.Span{x, Nat.min(Nat.add(w, by), Nat.sub(full, x))}), kept, ew => k => area_grow_some(x, full, w, by, ew, k), k => area_grow_fits(x, full, Nat.add(w, by), nat_ge_add_l(x, full, w, k)))
    case Area.Area{page, x, y, w, h} Area.Up{}:
      area_swap_tall(Nat.is_ge(page, 1n), Nat.is_ge(w, 1n), Nat.is_ge(h, 1n), Area.within(full, Area.Span{x, w}), Area.within(full, Area.Span{y, h}), Nat.is_ge(Nat.min(h, Nat.max(Nat.sub(h, by), 1n+least)), 1n), Area.within(full, Area.Span{y, Nat.min(h, Nat.max(Nat.sub(h, by), 1n+least))}), kept, eh => k => nat_one_min(h, Nat.max(Nat.sub(h, by), 1n+least), eh, nat_one_max(Nat.sub(h, by), least)), k => area_shrink_fits(y, full, h, Nat.max(Nat.sub(h, by), 1n+least), k))
    case Area.Area{page, x, y, w, h} Area.Down{}:
      area_swap_tall(Nat.is_ge(page, 1n), Nat.is_ge(w, 1n), Nat.is_ge(h, 1n), Area.within(full, Area.Span{x, w}), Area.within(full, Area.Span{y, h}), Nat.is_ge(Nat.min(Nat.add(h, by), Nat.sub(full, y)), 1n), Area.within(full, Area.Span{y, Nat.min(Nat.add(h, by), Nat.sub(full, y))}), kept, eh => k => area_grow_some(y, full, h, by, eh, k), k => area_grow_fits(y, full, Nat.add(h, by), nat_ge_add_l(y, full, h, k)))

def Laws.area_resize_goes(full, least, area, way, by, kept):
  %Equal.sym(Bool, Area.valid(full, Area.resized(full, 1n+least, area, way, by)), True{}, area_resized_valid(full, least, area, way, by, kept)) : {Area.pick(_, area, Area.resized(full, 1n+least, area, way, by)) == Area.resized(full, 1n+least, area, way, by) : Area.Area}
  {==}

# ── Lines drawn by hand ─────────────────────────────────────────────────────
def Laws.stroke_held_on_page(wide, tall, point):
  match point:
    case Stroke.Point{x, y, at}:
      %Equal.sym(Bool, Nat.is_ge(wide, Nat.min(x, wide)), True{}, nat_min_le_r(x, wide)) : {Bool.and(_, Nat.is_ge(tall, Nat.min(y, tall))) == True{} : Bool}
      nat_min_le_r(y, tall)

def nat_min_of_ge(+x: Nat, +f: Nat, h: {Nat.is_ge(f, x) == True{} : Bool}) -> {Nat.min(x, f) == x : Nat}:
  match x f:
    case 0n 0n:
      {==}
    case 0n 1n+fp:
      {==}
    case 1n+xp 0n:
      impossible({Nat.min(1n+xp, 0n) == 1n+xp : Nat}, false_is_not_true(h))
    case 1n+xp 1n+fp:
      %nat_min_of_ge(xp, fp, h) : {1n+Nat.min(xp, fp) == 1n+_ : Nat}
      {==}

def Laws.stroke_held_keeps(wide, tall, point, on):
  match point:
    case Stroke.Point{x, y, at}:
      %Equal.sym(Nat, Nat.min(x, wide), x, nat_min_of_ge(x, wide, bool_and_left(Nat.is_ge(wide, x), Nat.is_ge(tall, y), on))) : {Stroke.Point{_, Nat.min(y, tall), at} == Stroke.Point{x, y, at} : Stroke.Point}
      %Equal.sym(Nat, Nat.min(y, tall), y, nat_min_of_ge(y, tall, bool_and_right(Nat.is_ge(wide, x), Nat.is_ge(tall, y), on))) : {Stroke.Point{x, _, at} == Stroke.Point{x, y, at} : Stroke.Point}
      {==}

def nat_eq_refl(+a: Nat) -> {Nat.is_eq(a, a) == True{} : Bool}:
  match a:
    case 0n:
      {==}
    case 1n+p:
      nat_eq_refl(p)

def stroke_equal_refl(+point: Stroke.Point) -> {Stroke.equal(point, point) == True{} : Bool}:
  match point:
    case Stroke.Point{x, y, at}:
      %Equal.sym(Bool, Nat.is_eq(x, x), True{}, nat_eq_refl(x)) : {Bool.and(_, Bool.and(Nat.is_eq(y, y), Nat.is_eq(at, at))) == True{} : Bool}
      %Equal.sym(Bool, Nat.is_eq(y, y), True{}, nat_eq_refl(y)) : {Bool.and(_, Nat.is_eq(at, at)) == True{} : Bool}
      nat_eq_refl(at)

def stroke_same_refl(+point: Stroke.Point) -> {Stroke.same(point, point) == True{} : Bool}:
  match point:
    case Stroke.Point{x, y, at}:
      %Equal.sym(Bool, Nat.is_eq(x, x), True{}, nat_eq_refl(x)) : {Bool.and(_, Nat.is_eq(y, y)) == True{} : Bool}
      nat_eq_refl(y)

# A line with a point put before it still has left out of it whatever it had.
def stroke_left_out_more(+point: Stroke.Point, +whole: List<&2, Stroke.Point>, +part: List<&2, Stroke.Point>, had: {Stroke.left_out(whole, part) == True{} : Bool}) -> {Stroke.left_out(Con{point, whole}, part) == True{} : Bool}:
  match part:
    case Nil{}:
      {==}
    case Con{first, rest}:
      %Equal.sym(Bool, Stroke.left_out(whole, Con{first, rest}), True{}, had) : {Bool.or(Bool.and(Stroke.equal(first, point), Stroke.left_out(whole, rest)), _) == True{} : Bool}
      bool_or_true(Bool.and(Stroke.equal(first, point), Stroke.left_out(whole, rest)))

# One more point of the line, kept or not: still only points left out.
def stroke_keep_left_out(far: Bool, +point: Stroke.Point, +whole: List<&2, Stroke.Point>, +part: List<&2, Stroke.Point>, had: {Stroke.left_out(whole, part) == True{} : Bool}) -> {Stroke.left_out(Con{point, whole}, Stroke.keep(far, point, part)) == True{} : Bool}:
  match far:
    case True{}:
      %Equal.sym(Bool, Stroke.equal(point, point), True{}, stroke_equal_refl(point)) : {Bool.or(Bool.and(_, Stroke.left_out(whole, part)), Stroke.left_out(whole, Con{point, part})) == True{} : Bool}
      %Equal.sym(Bool, Stroke.left_out(whole, part), True{}, had) : {Bool.or(_, Stroke.left_out(whole, Con{point, part})) == True{} : Bool}
      {==}
    case False{}:
      stroke_left_out_more(point, whole, part, had)

def stroke_thin_from_left_out(+least: Nat, +rest: List<&2, Stroke.Point>, +last: Stroke.Point) -> {Stroke.left_out(rest, Stroke.thin_from(least, rest, last)) == True{} : Bool}:
  match rest:
    case Nil{}:
      {==}
    case Con{point, Nil{}}:
      stroke_keep_left_out(Bool.not(Stroke.same(last, point)), point, Nil{}, Nil{}, {==})
    case Con{point, Con{next, more}}:
      stroke_keep_left_out(Nat.is_ge(Stroke.apart(last, point), least), point, Con{next, more}, Stroke.thin_from(least, Con{next, more}, Stroke.choose(Nat.is_ge(Stroke.apart(last, point), least), point, last)), stroke_thin_from_left_out(least, Con{next, more}, Stroke.choose(Nat.is_ge(Stroke.apart(last, point), least), point, last)))

def Laws.stroke_thin_leaves_out(least, points):
  match points:
    case Nil{}:
      {==}
    case Con{point, rest}:
      stroke_keep_left_out(True{}, point, rest, Stroke.thin_from(least, rest, point), stroke_thin_from_left_out(least, rest, point))

def Laws.stroke_thin_starts(least, first, rest, other):
  {==}

def bool_not_false(b: Bool, e: {False{} == Bool.not(b) : Bool}) -> {b == True{} : Bool}:
  match b:
    case True{}:
      {==}
    case False{}:
      impossible({False{} == True{} : Bool}, false_is_not_true(e))

# The hand's final point: kept, or left out because the line is there already.
def stroke_ends_one(hit: Bool, +last: Stroke.Point, +point: Stroke.Point, e: {hit == Bool.not(Stroke.same(last, point)) : Bool}) -> {Stroke.same(Stroke.last(Stroke.keep(hit, point, Nil{}), last), point) == True{} : Bool}:
  match hit:
    case True{}:
      stroke_same_refl(point)
    case False{}:
      bool_not_false(Stroke.same(last, point), e)

def stroke_ends_step(far: Bool, +least: Nat, +last: Stroke.Point, +point: Stroke.Point, +next: Stroke.Point, +more: List<&2, Stroke.Point>, kept: {Stroke.same(Stroke.last(Stroke.thin_from(least, Con{next, more}, point), point), Stroke.last(Con{next, more}, point)) == True{} : Bool}, skipped: {Stroke.same(Stroke.last(Stroke.thin_from(least, Con{next, more}, last), last), Stroke.last(Con{next, more}, last)) == True{} : Bool}) -> {Stroke.same(Stroke.last(Stroke.keep(far, point, Stroke.thin_from(least, Con{next, more}, Stroke.choose(far, point, last))), last), Stroke.last(more, next)) == True{} : Bool}:
  match far:
    case True{}:
      kept
    case False{}:
      skipped

def stroke_thin_from_ends(+least: Nat, +rest: List<&2, Stroke.Point>, +last: Stroke.Point) -> {Stroke.same(Stroke.last(Stroke.thin_from(least, rest, last), last), Stroke.last(rest, last)) == True{} : Bool}:
  match rest:
    case Nil{}:
      stroke_same_refl(last)
    case Con{point, Nil{}}:
      stroke_ends_one(Bool.not(Stroke.same(last, point)), last, point, {==})
    case Con{point, Con{next, more}}:
      stroke_ends_step(Nat.is_ge(Stroke.apart(last, point), least), least, last, point, next, more, stroke_thin_from_ends(least, Con{next, more}, point), stroke_thin_from_ends(least, Con{next, more}, last))

def Laws.stroke_thin_ends(least, first, rest, other):
  stroke_thin_from_ends(least, rest, first)

def bool_and_both(a: Bool, b: Bool, ea: {a == True{} : Bool}, eb: {b == True{} : Bool}) -> {Bool.and(a, b) == True{} : Bool}:
  match a b:
    case True{} True{}:
      {==}
    case True{} False{}:
      impossible({Bool.and(True{}, False{}) == True{} : Bool}, false_is_not_true(eb))
    case False{} b:
      impossible({Bool.and(False{}, b) == True{} : Bool}, false_is_not_true(ea))

def nat_ge_refl(+a: Nat) -> {Nat.is_ge(a, a) == True{} : Bool}:
  match a:
    case 0n:
      {==}
    case 1n+p:
      nat_ge_refl(p)

def nat_max_ge_r(+a: Nat, +b: Nat) -> {Nat.is_ge(Nat.max(a, b), b) == True{} : Bool}:
  match a b:
    case 0n 0n:
      {==}
    case 0n 1n+bp:
      nat_ge_refl(bp)
    case 1n+ap 0n:
      {==}
    case 1n+ap 1n+bp:
      nat_max_ge_r(ap, bp)

def nat_max_ge_of(+f: Nat, +z: Nat, +s: Nat, h: {Nat.is_ge(f, s) == True{} : Bool}) -> {Nat.is_ge(Nat.max(f, z), s) == True{} : Bool}:
  match f z s:
    case 0n z 0n:
      nat_ge_zero(Nat.max(0n, z))
    case 0n z 1n+sp:
      impossible({Nat.is_ge(Nat.max(0n, z), 1n+sp) == True{} : Bool}, false_is_not_true(h))
    case 1n+fp 0n s:
      h
    case 1n+fp 1n+zp 0n:
      {==}
    case 1n+fp 1n+zp 1n+sp:
      nat_max_ge_of(fp, zp, sp, h)

def stroke_holds_around(+point: Stroke.Point) -> {Stroke.holds(Stroke.around(point), point) == True{} : Bool}:
  match point:
    case Stroke.Point{x, y, at}:
      bool_and_both(Bool.and(Nat.is_ge(x, x), Nat.is_ge(x, x)), Bool.and(Nat.is_ge(y, y), Nat.is_ge(y, y)), bool_and_both(Nat.is_ge(x, x), Nat.is_ge(x, x), nat_ge_refl(x), nat_ge_refl(x)), bool_and_both(Nat.is_ge(y, y), Nat.is_ge(y, y), nat_ge_refl(y), nat_ge_refl(y)))

# A box widened for a point holds that point,
def stroke_holds_new(+box: Stroke.Box, +point: Stroke.Point) -> {Stroke.holds(Stroke.widen(box, point), point) == True{} : Bool}:
  match box point:
    case Stroke.Box{left, top, right, bottom} Stroke.Point{x, y, at}:
      bool_and_both(Bool.and(Nat.is_ge(x, Nat.min(left, x)), Nat.is_ge(Nat.max(right, x), x)), Bool.and(Nat.is_ge(y, Nat.min(top, y)), Nat.is_ge(Nat.max(bottom, y), y)), bool_and_both(Nat.is_ge(x, Nat.min(left, x)), Nat.is_ge(Nat.max(right, x), x), nat_min_le_r(left, x), nat_max_ge_r(right, x)), bool_and_both(Nat.is_ge(y, Nat.min(top, y)), Nat.is_ge(Nat.max(bottom, y), y), nat_min_le_r(top, y), nat_max_ge_r(bottom, y)))

# and still holds whatever it held.
def stroke_holds_old(+box: Stroke.Box, +point: Stroke.Point, +held: Stroke.Point, +had: {Stroke.holds(box, held) == True{} : Bool}) -> {Stroke.holds(Stroke.widen(box, point), held) == True{} : Bool}:
  match box point held:
    case Stroke.Box{left, top, right, bottom} Stroke.Point{x, y, at} Stroke.Point{hx, hy, hat}:
      bool_and_both(Bool.and(Nat.is_ge(hx, Nat.min(left, x)), Nat.is_ge(Nat.max(right, x), hx)), Bool.and(Nat.is_ge(hy, Nat.min(top, y)), Nat.is_ge(Nat.max(bottom, y), hy)), bool_and_both(Nat.is_ge(hx, Nat.min(left, x)), Nat.is_ge(Nat.max(right, x), hx), nat_ge_min(hx, left, x, bool_and_left(Nat.is_ge(hx, left), Nat.is_ge(right, hx), bool_and_left(Bool.and(Nat.is_ge(hx, left), Nat.is_ge(right, hx)), Bool.and(Nat.is_ge(hy, top), Nat.is_ge(bottom, hy)), had))), nat_max_ge_of(right, x, hx, bool_and_right(Nat.is_ge(hx, left), Nat.is_ge(right, hx), bool_and_left(Bool.and(Nat.is_ge(hx, left), Nat.is_ge(right, hx)), Bool.and(Nat.is_ge(hy, top), Nat.is_ge(bottom, hy)), had)))), bool_and_both(Nat.is_ge(hy, Nat.min(top, y)), Nat.is_ge(Nat.max(bottom, y), hy), nat_ge_min(hy, top, y, bool_and_left(Nat.is_ge(hy, top), Nat.is_ge(bottom, hy), bool_and_right(Bool.and(Nat.is_ge(hx, left), Nat.is_ge(right, hx)), Bool.and(Nat.is_ge(hy, top), Nat.is_ge(bottom, hy)), had))), nat_max_ge_of(bottom, y, hy, bool_and_right(Nat.is_ge(hy, top), Nat.is_ge(bottom, hy), bool_and_right(Bool.and(Nat.is_ge(hx, left), Nat.is_ge(right, hx)), Bool.and(Nat.is_ge(hy, top), Nat.is_ge(bottom, hy)), had)))))

def stroke_holds_through(+rest: List<&2, Stroke.Point>, +box: Stroke.Box, +held: Stroke.Point, +had: {Stroke.holds(box, held) == True{} : Bool}) -> {Stroke.holds(Stroke.box_from(rest, box), held) == True{} : Bool}:
  match rest:
    case Nil{}:
      had
    case Con{point, more}:
      stroke_holds_through(more, Stroke.widen(box, point), held, stroke_holds_old(box, point, held, had))

def stroke_holds_all_from(+rest: List<&2, Stroke.Point>, +box: Stroke.Box) -> {Stroke.holds_all(Stroke.box_from(rest, box), rest) == True{} : Bool}:
  match rest:
    case Nil{}:
      {==}
    case Con{point, more}:
      bool_and_both(Stroke.holds(Stroke.box_from(more, Stroke.widen(box, point)), point), Stroke.holds_all(Stroke.box_from(more, Stroke.widen(box, point)), more), stroke_holds_through(more, Stroke.widen(box, point), point, stroke_holds_new(box, point)), stroke_holds_all_from(more, Stroke.widen(box, point)))

def Laws.stroke_box_holds(first, rest):
  bool_and_both(Stroke.holds(Stroke.box_from(rest, Stroke.around(first)), first), Stroke.holds_all(Stroke.box_from(rest, Stroke.around(first)), rest), stroke_holds_through(rest, Stroke.around(first), first, stroke_holds_around(first)), stroke_holds_all_from(rest, Stroke.around(first)))

# Keeping a point on the gathered side, or on the side still to come: the same line once turned round.
def stroke_keep_turned(far: Bool, -point: Stroke.Point, -kept: List<&2, Stroke.Point>, -after: List<&2, Stroke.Point>) -> {List.reverse.go(&2, Stroke.Point, Stroke.keep(far, point, kept), after) == List.reverse.go(&2, Stroke.Point, kept, Stroke.keep(far, point, after)) : List<&2, Stroke.Point>}:
  match far:
    case True{}:
      {==}
    case False{}:
      {==}

def stroke_thin_go_same(+least: Nat, +rest: List<&2, Stroke.Point>, +last: Stroke.Point, +kept: List<&2, Stroke.Point>) -> {List.reverse.go(&2, Stroke.Point, Stroke.thin_go(least, rest, last, kept), Nil{}) == List.reverse.go(&2, Stroke.Point, kept, Stroke.thin_from(least, rest, last)) : List<&2, Stroke.Point>}:
  match rest:
    case Nil{}:
      {==}
    case Con{point, Nil{}}:
      stroke_keep_turned(Bool.not(Stroke.same(last, point)), point, kept, Nil{})
    case Con{point, Con{next, more}}:
      %stroke_keep_turned(Nat.is_ge(Stroke.apart(last, point), least), point, kept, Stroke.thin_from(least, Con{next, more}, Stroke.choose(Nat.is_ge(Stroke.apart(last, point), least), point, last))) : {List.reverse.go(&2, Stroke.Point, Stroke.thin_go(least, Con{next, more}, Stroke.choose(Nat.is_ge(Stroke.apart(last, point), least), point, last), Stroke.keep(Nat.is_ge(Stroke.apart(last, point), least), point, kept)), Nil{}) == _ : List<&2, Stroke.Point>}
      stroke_thin_go_same(least, Con{next, more}, Stroke.choose(Nat.is_ge(Stroke.apart(last, point), least), point, last), Stroke.keep(Nat.is_ge(Stroke.apart(last, point), least), point, kept))

def Laws.stroke_thin_fast_same(least, points):
  match points:
    case Nil{}:
      {==}
    case Con{point, rest}:
      stroke_thin_go_same(least, rest, point, Con{point, Nil{}})

# ── How far through a book ──────────────────────────────────────────────────
def nat_min_zero_r(+a: Nat) -> {0n == Nat.min(a, 0n) : Nat}:
  match a:
    case 0n:
      {==}
    case 1n+p:
      {==}

def nat_min_idem_r(+a: Nat, +l: Nat) -> {Nat.min(Nat.min(a, l), l) == Nat.min(a, l) : Nat}:
  match a l:
    case 0n 0n:
      {==}
    case 0n 1n+lp:
      {==}
    case 1n+ap 0n:
      {==}
    case 1n+ap 1n+lp:
      %nat_min_idem_r(ap, lp) : {1n+Nat.min(Nat.min(ap, lp), lp) == 1n+_ : Nat}
      {==}

# Past the first chapter: its length, and then as far as is left.
def nat_add_min_sub(+l: Nat, +a: Nat, +t: Nat, h: {Nat.is_ge(a, l) == True{} : Bool}) -> {Nat.add(l, Nat.min(Nat.sub(a, l), t)) == Nat.min(a, Nat.add(l, t)) : Nat}:
  match l a:
    case 0n a:
      %nat_sub_zero(a) : {Nat.min(_, t) == Nat.min(a, t) : Nat}
      {==}
    case 1n+lp 0n:
      impossible({Nat.add(1n+lp, Nat.min(Nat.sub(0n, 1n+lp), t)) == Nat.min(0n, Nat.add(1n+lp, t)) : Nat}, false_is_not_true(h))
    case 1n+lp 1n+ap:
      %nat_add_min_sub(lp, ap, t, h) : {1n+Nat.add(lp, Nat.min(Nat.sub(ap, lp), t)) == 1n+_ : Nat}
      {==}

# Inside the first chapter: what comes after it changes nothing.
def nat_min_inside(+a: Nat, +l: Nat, +t: Nat, h: {Nat.is_ge(a, l) == False{} : Bool}) -> {Nat.min(a, l) == Nat.min(a, Nat.add(l, t)) : Nat}:
  match a l:
    case 0n 0n:
      impossible({Nat.min(0n, 0n) == Nat.min(0n, Nat.add(0n, t)) : Nat}, true_is_not_false(h))
    case 0n 1n+lp:
      {==}
    case 1n+ap 0n:
      impossible({Nat.min(1n+ap, 0n) == Nat.min(1n+ap, Nat.add(0n, t)) : Nat}, true_is_not_false(h))
    case 1n+ap 1n+lp:
      %nat_min_inside(ap, lp, t, h) : {1n+Nat.min(ap, lp) == 1n+_ : Nat}
      {==}

def nat_inside_ge(+a: Nat, +l: Nat, h: {Nat.is_ge(a, l) == False{} : Bool}) -> {Nat.is_ge(l, a) == True{} : Bool}:
  match a l:
    case 0n 0n:
      {==}
    case 0n 1n+lp:
      {==}
    case 1n+ap 0n:
      impossible({Nat.is_ge(0n, 1n+ap) == True{} : Bool}, true_is_not_false(h))
    case 1n+ap 1n+lp:
      nat_inside_ge(ap, lp, h)

def book_before_later(+length: Nat, +rest: List<&2, Nat>, +place: Book.Place) -> {Book.before(Con{length, rest}, Book.later(place)) == Nat.add(length, Book.before(rest, place)) : Nat}:
  match place:
    case Book.Place{chapter, offset}:
      {==}

def book_exact_step(far: Bool, +length: Nat, +at: Nat, +rest: List<&2, Nat>, e: {far == Nat.is_ge(at, length) : Bool}, ih: {Book.before(rest, Book.place(rest, Nat.sub(at, length))) == Nat.min(Nat.sub(at, length), Book.total(rest)) : Nat}) -> {Book.before(Con{length, rest}, Book.pick(far, Book.later(Book.place(rest, Nat.sub(at, length))), Book.Place{0n, at})) == Nat.min(at, Nat.add(length, Book.total(rest))) : Nat}:
  match far:
    case True{}:
      %Equal.sym(Nat, Book.before(Con{length, rest}, Book.later(Book.place(rest, Nat.sub(at, length)))), Nat.add(length, Book.before(rest, Book.place(rest, Nat.sub(at, length)))), book_before_later(length, rest, Book.place(rest, Nat.sub(at, length)))) : {_ == Nat.min(at, Nat.add(length, Book.total(rest))) : Nat}
      %Equal.sym(Nat, Book.before(rest, Book.place(rest, Nat.sub(at, length))), Nat.min(Nat.sub(at, length), Book.total(rest)), ih) : {Nat.add(length, _) == Nat.min(at, Nat.add(length, Book.total(rest))) : Nat}
      nat_add_min_sub(length, at, Book.total(rest), Equal.sym(Bool, True{}, Nat.is_ge(at, length), e))
    case False{}:
      nat_min_inside(at, length, Book.total(rest), Equal.sym(Bool, False{}, Nat.is_ge(at, length), e))

def Laws.book_place_exact(lengths, at):
  match lengths:
    case Nil{}:
      nat_min_zero_r(at)
    case Con{length, Nil{}}:
      %nat_add_zero(length) : {Nat.min(Nat.min(at, length), length) == Nat.min(at, _) : Nat}
      nat_min_idem_r(at, length)
    case Con{length, Con{next, more}}:
      book_exact_step(Nat.is_ge(at, length), length, at, Con{next, more}, {==}, Laws.book_place_exact(Con{next, more}, Nat.sub(at, length)))

def book_real_later(+length: Nat, +rest: List<&2, Nat>, +place: Book.Place) -> {Book.real(Con{length, rest}, Book.later(place)) == Book.real(rest, place) : Bool}:
  match place:
    case Book.Place{chapter, offset}:
      {==}

def book_real_step(far: Bool, +length: Nat, +at: Nat, +rest: List<&2, Nat>, e: {far == Nat.is_ge(at, length) : Bool}, ih: {Book.real(rest, Book.place(rest, Nat.sub(at, length))) == True{} : Bool}) -> {Book.real(Con{length, rest}, Book.pick(far, Book.later(Book.place(rest, Nat.sub(at, length))), Book.Place{0n, at})) == True{} : Bool}:
  match far:
    case True{}:
      %Equal.sym(Bool, Book.real(Con{length, rest}, Book.later(Book.place(rest, Nat.sub(at, length)))), Book.real(rest, Book.place(rest, Nat.sub(at, length))), book_real_later(length, rest, Book.place(rest, Nat.sub(at, length)))) : {_ == True{} : Bool}
      ih
    case False{}:
      nat_inside_ge(at, length, Equal.sym(Bool, False{}, Nat.is_ge(at, length), e))

def book_real(+rest: List<&2, Nat>, +length: Nat, +at: Nat) -> {Book.real(Con{length, rest}, Book.place(Con{length, rest}, at)) == True{} : Bool}:
  match rest:
    case Nil{}:
      nat_min_le_r(at, length)
    case Con{next, more}:
      book_real_step(Nat.is_ge(at, length), length, at, Con{next, more}, {==}, book_real(more, next, Nat.sub(at, length)))

def Laws.book_place_real(length, rest, at):
  book_real(rest, length, at)

# ── The video note's duplicate check ────────────────────────────────────────
# The IDs of a part list, added from the last part to the first: the set the
# one-pass check holds when it has walked those parts.
def video_seen_of(parts: List<&2, VideoDocument.Part>) -> Recognizer.Seen:
  match parts:
    case Nil{}:
      Recognizer.SeenNone{}
    case Con{VideoDocument.Raw{raw}, rest}:
      video_seen_of(rest)
    case Con{VideoDocument.Video{id, raw, fields, line}, rest}:
      Recognizer.seen_add(video_seen_of(rest), id)
    case Con{VideoDocument.Foreign{id}, rest}:
      Recognizer.seen_add(video_seen_of(rest), id)
    case Con{VideoDocument.Problem{raw, message, line}, rest}:
      video_seen_of(rest)

def video_seen_of_has(+parts: List<&2, VideoDocument.Part>, +id: String) -> {Recognizer.seen_has(video_seen_of(parts), id) == VideoDocument.has_id(parts, id) : Bool}:
  match parts:
    case Nil{}:
      {==}
    case Con{VideoDocument.Raw{raw}, rest}:
      video_seen_of_has(rest, id)
    case Con{VideoDocument.Video{key, raw, fields, line}, rest}:
      %video_seen_of_has(rest, id) : {Recognizer.seen_has(Recognizer.seen_add(video_seen_of(rest), key), id) == Bool.or(String.eq(key, id), _) : Bool}
      seen_add_has(video_seen_of(rest), key, id)
    case Con{VideoDocument.Foreign{key}, rest}:
      %video_seen_of_has(rest, id) : {Recognizer.seen_has(Recognizer.seen_add(video_seen_of(rest), key), id) == Bool.or(String.eq(key, id), _) : Bool}
      seen_add_has(video_seen_of(rest), key, id)
    case Con{VideoDocument.Problem{raw, message, line}, rest}:
      video_seen_of_has(rest, id)

def video_reverse_twice(+parts: List<&2, VideoDocument.Part>, +acc: List<&2, VideoDocument.Part>) -> {List.reverse.go(&2, VideoDocument.Part, List.reverse.go(&2, VideoDocument.Part, parts, acc), Nil{}) == List.reverse.go(&2, VideoDocument.Part, acc, parts) : List<&2, VideoDocument.Part>}:
  match parts:
    case Nil{}:
      {==}
    case Con{head, rest}:
      video_reverse_twice(rest, Con{head, acc})

def video_errors_seen_fold(+reversed: List<&2, VideoDocument.Part>, +later: List<&2, VideoDocument.Part>) -> {VideoDocument.errors_seen(reversed, video_seen_of(later), VideoDocument.errors_pairwise(later)) == VideoDocument.errors_pairwise(List.reverse.go(&2, VideoDocument.Part, reversed, later)) : Bool}:
  match reversed:
    case Nil{}:
      {==}
    case Con{VideoDocument.Raw{raw}, rest}:
      video_errors_seen_fold(rest, Con{VideoDocument.Raw{raw}, later})
    case Con{VideoDocument.Video{id, raw, fields, line}, rest}:
      %Equal.sym(Bool, Recognizer.seen_has(video_seen_of(later), id), VideoDocument.has_id(later, id), video_seen_of_has(later, id)) : {VideoDocument.errors_seen(rest, Recognizer.seen_add(video_seen_of(later), id), Bool.or(_, VideoDocument.errors_pairwise(later))) == VideoDocument.errors_pairwise(List.reverse.go(&2, VideoDocument.Part, rest, Con{VideoDocument.Video{id, raw, fields, line}, later})) : Bool}
      video_errors_seen_fold(rest, Con{VideoDocument.Video{id, raw, fields, line}, later})
    case Con{VideoDocument.Foreign{id}, rest}:
      %Equal.sym(Bool, Recognizer.seen_has(video_seen_of(later), id), VideoDocument.has_id(later, id), video_seen_of_has(later, id)) : {VideoDocument.errors_seen(rest, Recognizer.seen_add(video_seen_of(later), id), Bool.or(_, VideoDocument.errors_pairwise(later))) == VideoDocument.errors_pairwise(List.reverse.go(&2, VideoDocument.Part, rest, Con{VideoDocument.Foreign{id}, later})) : Bool}
      video_errors_seen_fold(rest, Con{VideoDocument.Foreign{id}, later})
    case Con{VideoDocument.Problem{raw, message, line}, rest}:
      video_errors_seen_fold(rest, Con{VideoDocument.Problem{raw, message, line}, later})

def Laws.video_errors_pairwise(parts):
  Equal.trans(Bool, VideoDocument.errors(parts), VideoDocument.errors_pairwise(List.reverse.go(&2, VideoDocument.Part, List.reverse.go(&2, VideoDocument.Part, parts, Nil{}), Nil{})), VideoDocument.errors_pairwise(parts), video_errors_seen_fold(List.reverse.go(&2, VideoDocument.Part, parts, Nil{}), Nil{}), Equal.cong(List<&2, VideoDocument.Part>, Bool, x => VideoDocument.errors_pairwise(x), List.reverse.go(&2, VideoDocument.Part, List.reverse.go(&2, VideoDocument.Part, parts, Nil{}), Nil{}), parts, video_reverse_twice(parts, Nil{})))
