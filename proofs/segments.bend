import Base
import ./document.bend as Source
import ./recognizer.bend as Recognizer
import ./boundary.bend as Boundary
import ./source-crud.bend as SourceCrud

# A note scanned in stretches. A stretch that starts where the scanner is in
# its Neutral mode can be scanned on its own, as if at line 1 with no parts
# before it, and then be moved to its place: every line number raised by the
# lines before it (`move_state`) and its parts set on top of the parts before
# it (`onto`). LAWS.bend proves that putting stretches together this way gives
# the scan of the whole text (`segments_assemble`).

def move_part(k: Nat, part: Recognizer.Part) -> Recognizer.Part:
  match part:
    case Recognizer.RawPart{raw}:
      Recognizer.RawPart{raw}
    case Recognizer.AnnotationPart{id, raw, fields, line}:
      Recognizer.AnnotationPart{id, raw, fields, Nat.add(line, k)}
    case Recognizer.CandidateError{raw, message, line}:
      Recognizer.CandidateError{raw, message, Nat.add(line, k)}

def move_parts(+k: Nat, parts: List<&2, Recognizer.Part>) -> List<&2, Recognizer.Part>:
  match parts:
    case Nil{}:
      Nil{}
    case Con{part, rest}:
      Con{move_part(k, part), move_parts(k, rest)}

def move_mode(k: Nat, mode: Recognizer.Mode) -> Recognizer.Mode:
  match mode:
    case Recognizer.Neutral{}:
      Recognizer.Neutral{}
    case Recognizer.AfterAnnotation{}:
      Recognizer.AfterAnnotation{}
    case Recognizer.Opening{raw, line}:
      Recognizer.Opening{raw, Nat.add(line, k)}
    case Recognizer.Candidate{raw, lines, line, formatted}:
      Recognizer.Candidate{raw, lines, Nat.add(line, k), formatted}
    case Recognizer.Fence{char, size, quoted}:
      Recognizer.Fence{char, size, quoted}
    case Recognizer.HtmlComment{}:
      Recognizer.HtmlComment{}
    case Recognizer.ObsidianComment{}:
      Recognizer.ObsidianComment{}
    case Recognizer.Frontmatter{}:
      Recognizer.Frontmatter{}
    case Recognizer.OpaqueHtml{}:
      Recognizer.OpaqueHtml{}
    case Recognizer.ListBody{}:
      Recognizer.ListBody{}

def move_state(+k: Nat, state: Recognizer.ScanState) -> Recognizer.ScanState:
  Recognizer.ScanState{mode, parts, line} = state
  Recognizer.ScanState{move_mode(k, mode), move_parts(k, parts), Nat.add(line, k)}

def onto(state: Recognizer.ScanState, under: List<&2, Recognizer.Part>) -> Recognizer.ScanState:
  Recognizer.ScanState{mode, parts, line} = state
  Recognizer.ScanState{mode, List.append(&2, Recognizer.Part, parts, under), line}

# What the checked run asks of a state before each line. A state in the
# AfterAnnotation mode looks at the part before it, so there must be one above
# the stretch's own start; and a fence opener must open a fence, which is all
# `fence_start` ever returns but is checked here rather than argued.
def settled(mode: Recognizer.Mode, parts: List<&2, Recognizer.Part>) -> Bool:
  match mode parts:
    case Recognizer.AfterAnnotation{} Nil{}:
      False{}
    case _ _:
      True{}

def fence_plain(fence: Maybe<&2, Recognizer.Mode>) -> Bool:
  match fence:
    case Some{Recognizer.Opening{raw, line}}:
      False{}
    case Some{Recognizer.Candidate{raw, lines, line, formatted}}:
      False{}
    case _:
      True{}

# The recognition text of the next line ("" when there is none).
def head_text(lines: List<&2, Source.Line>) -> String:
  match lines:
    case Nil{}:
      SNil{}
    case Con{Source.Line{body, ending}, rest}:
      Recognizer.clean(body)

def ready(state: Recognizer.ScanState, text: String) -> Bool:
  match state:
    case Recognizer.ScanState{mode, parts, 0n}:
      False{}
    case Recognizer.ScanState{mode, parts, 1n+q}:
      Bool.and(settled(mode, parts), fence_plain(Recognizer.fence_start(Recognizer.indent(text, 3n))))

# `Recognizer.run`, stopping with nothing if a line finds the state not ready.
# `text` is the recognition text of the first line and `good` whether the state
# is ready for it; both are worked out before the step so that a line is
# cleaned once.
def checked(lines: List<&2, Source.Line>, +text: String, good: Bool, state: Recognizer.ScanState) -> Maybe<&2, Recognizer.ScanState>:
  match lines good:
    case Nil{} _:
      Some{state}
    case Con{line, rest} False{}:
      None{}
    case Con{Source.Line{+body, +ending}, +rest} True{}:
      Recognizer.ScanState{mode, parts, line} = state
      +next = Recognizer.step(mode, Source.encode([Source.Line{body, ending}]), text, parts, line)
      +after = head_text(rest)
      checked(rest, after, ready(next, after), next)

# A later stretch is scanned as if it were at line 1 with nothing before it.
def later_start() -> Recognizer.ScanState:
  Recognizer.ScanState{Recognizer.Neutral{}, Nil{}, 1n}

def scan_lines_later(+lines: List<&2, Source.Line>) -> Maybe<&2, Recognizer.ScanState>:
  +text = head_text(lines)
  checked(lines, text, ready(later_start(), text), later_start())

def scan_later(text: String) -> Maybe<&2, Recognizer.ScanState>:
  scan_lines_later(Source.decode(text))

# A stretch of a note with its scan. Only `opening` and `following` make one,
# and each carries the proof of what its state is: the first stretch is run
# from the start of a note, a later one by the checked run from line 1. `ends`
# holds the evidence that the text ends in a line feed, when it does.
type Segment is Data:
  First{text: String, state: Recognizer.ScanState, proof: {state == Recognizer.run(Source.decode(text), Recognizer.ScanState{Recognizer.Neutral{}, Nil{}, 0n}) : Recognizer.ScanState}, ends: Maybe<&2, {Source.ends_nl(text, False{}) == True{} : Bool}>}
  Later{text: String, state: Recognizer.ScanState, proof: {scan_later(text) == Some{state} : Maybe<&2, Recognizer.ScanState>}, ends: Maybe<&2, {Source.ends_nl(text, False{}) == True{} : Bool}>}

def ends_checked(-text: String, found: Bool, e: {Source.ends_nl(text, False{}) == found : Bool}) -> Maybe<&2, {Source.ends_nl(text, False{}) == True{} : Bool}>:
  match found:
    case False{}:
      None{}
    case True{}:
      Some{e}

def ends_evidence(+text: String) -> Maybe<&2, {Source.ends_nl(text, False{}) == True{} : Bool}>:
  ends_checked(text, Source.ends_nl(text, False{}), {==})

def opening(+text: String) -> Segment:
  First{text, Recognizer.run(Source.decode(text), Recognizer.ScanState{Recognizer.Neutral{}, Nil{}, 0n}), {==}, ends_evidence(text)}

def following_checked(+text: String, outcome: Maybe<&2, Recognizer.ScanState>, e: {scan_later(text) == outcome : Maybe<&2, Recognizer.ScanState>}) -> Maybe<&2, Segment>:
  match outcome:
    case None{}:
      None{}
    case Some{state}:
      Some{Later{text, state, e, ends_evidence(text)}}

def following(+text: String) -> Maybe<&2, Segment>:
  following_checked(text, scan_later(text), {==})

# Putting stretches together. The text so far is `before ++ last`; the next
# stretch may follow only if `last` ends in a line feed, the scanner is in its
# Neutral mode and at least one line has gone by. The next stretch's state is
# then moved by the lines before it and set on the parts before it.
type Joined is Data:
  Joined{text: String, state: Recognizer.ScanState}

def extend(rest: List<&2, Segment>, before: String, last: String, ends: Maybe<&2, {Source.ends_nl(last, False{}) == True{} : Bool}>, state: Recognizer.ScanState) -> Maybe<&2, Joined>:
  match rest ends state:
    case Nil{} e st:
      Some{Joined{String.append(before, last), st}}
    case Con{Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.Neutral{}, parts, 1n+p}:
      extend(more, String.append(before, last), text, ends2, onto(move_state(p, next), parts))
    case _ _ _:
      None{}

def join(segments: List<&2, Segment>) -> Maybe<&2, Joined>:
  match segments:
    case Con{First{text, state, proof, ends}, rest}:
      extend(rest, SNil{}, text, ends, state)
    case _:
      None{}

type Assembled is Data:
  Assembled{text: String, scan: Recognizer.Scan}

def assembled(joined: Maybe<&2, Joined>) -> Maybe<&2, Assembled>:
  match joined:
    case None{}:
      None{}
    case Some{Joined{text, state}}:
      Some{Assembled{text, Recognizer.finish(state)}}

# The text a list of stretches stands for and its scan, or nothing if the
# stretches do not fit together. For every list, the scan is the scan of the
# text (law `segments_assemble`).
def assemble(segments: List<&2, Segment>) -> Maybe<&2, Assembled>:
  assembled(join(segments))

def assembled_text(result: Assembled) -> String:
  Assembled{text, scan} = result
  text

def assembled_scan(result: Assembled) -> Recognizer.Scan:
  Assembled{text, scan} = result
  scan

# Deleting from an assembled note. This is `Recognizer.delete` given the scan
# instead of making it; for an assembled note the two are the same (law
# `segments_delete`).
def delete_scanned(+text: String, id: String, +scan: Recognizer.Scan) -> Recognizer.Edit:
  Recognizer.delete_checked(text, id, scan, Recognizer.safe(scan))

def delete(result: Assembled, id: String) -> Recognizer.Edit:
  Assembled{text, scan} = result
  delete_scanned(text, id, scan)

# Creating an annotation in a note given as its stretches: all but the last
# (`init`) and the last. This is `SourceCrud.create` without a scan of the
# whole note or of the whole candidate: the candidate is the same stretches
# with the last one made again (the boundary's line ends and the new
# annotation added to its text), and what `SourceCrud.create` checks is
# checked on the two assembled scans. A result is the note's text and the
# candidate that `SourceCrud.create` returns for that text (law
# `segments_create`); nothing is a refusal to try, never a refusal to create.
type Created is Data:
  Created{original: String, source: String}

def created_original(result: Created) -> String:
  Created{original, source} = result
  original

def created_source(result: Created) -> String:
  Created{original, source} = result
  source

def segment_text(segment: Segment) -> String:
  match segment:
    case First{text, state, proof, ends}:
      text
    case Later{text, state, proof, ends}:
      text

def segment_ended(segment: Segment) -> Bool:
  match segment:
    case First{text, state, proof, None{}}:
      False{}
    case First{text, state, proof, Some{e}}:
      True{}
    case Later{text, state, proof, None{}}:
      False{}
    case Later{text, state, proof, Some{e}}:
      True{}

# Whether the last of the stretches `first, rest` ends in a line feed.
def ends_last(rest: List<&2, Segment>, first: Segment) -> Bool:
  match rest:
    case Nil{}:
      segment_ended(first)
    case Con{next, more}:
      ends_last(more, next)

def nonempty(text: String) -> Bool:
  match text:
    case SNil{}:
      False{}
    case SCon{char, rest}:
      True{}

# The boundary state before the last stretch's characters: the start of a
# note, or just after a line feed. After a line feed the boundary reads on in
# the same way whatever came before it, once there is a character to read.
def end_start(init: List<&2, Segment>) -> Boundary.State:
  match init:
    case Nil{}:
      Boundary.EmptySource{}
    case Con{first, rest}:
      Boundary.AfterBlank{}

def end_known(init: List<&2, Segment>, last: String) -> Bool:
  match init:
    case Nil{}:
      True{}
    case Con{first, rest}:
      Bool.and(ends_last(rest, first), nonempty(last))

def end_state(init: List<&2, Segment>, last: String) -> Boundary.State:
  Boundary.run(last, end_start(init))

def ended(state: Boundary.State) -> Bool:
  match state:
    case Boundary.EmptySource{}:
      True{}
    case Boundary.AfterBlank{}:
      True{}
    case _:
      False{}

def anchor_tail(body: String, id: String) -> String:
  String.append(body, String.append("\n^", String.append(id, "\n\n")))

def place(init: List<&2, Segment>, +text: String) -> Maybe<&2, Segment>:
  match init:
    case Nil{}:
      Some{opening(text)}
    case Con{first, rest}:
      following(text)

# Whether two texts are the same, asked as "each contains the other". Bend's
# compiled `String.contains` searches natively, so this costs a comparison of
# the two texts and not a walk over their characters; that it means equality
# is the law `segments_same_text`.
def same_text(+a: String, +b: String) -> Bool:
  Bool.and(String.contains(a, b), String.contains(b, a))

def create_checked(original: String, source: String, same: Bool) -> Maybe<&2, Created>:
  match same:
    case False{}:
      None{}
    case True{}:
      Some{Created{original, source}}

def create_deleted(original: String, source: String, +normal: String, deleted: Recognizer.Edit) -> Maybe<&2, Created>:
  match deleted:
    case Recognizer.SourceEdit{text, Some{refusal}}:
      None{}
    case Recognizer.SourceEdit{text, None{}}:
      create_checked(original, source, same_text(text, normal))

def create_scanned(+id: String, original: String, normal: String, candidate: Maybe<&2, Assembled>) -> Maybe<&2, Created>:
  match candidate:
    case None{}:
      None{}
    case Some{Assembled{+text, scan}}:
      create_deleted(original, text, normal, delete_scanned(text, id, scan))

def create_placed(init: List<&2, Segment>, +id: String, original: String, normal: String, placed: Maybe<&2, Segment>, stable: Bool) -> Maybe<&2, Created>:
  match placed stable:
    case Some{segment} True{}:
      create_scanned(id, original, normal, assemble(List.append(&2, Segment, init, [segment])))
    case _ _:
      None{}

def create_allowed(+init: List<&2, Segment>, +last: String, +id: String, body: String, +original: String, ok: Bool) -> Maybe<&2, Created>:
  match ok:
    case False{}:
      None{}
    case True{}:
      +suffix = Boundary.suffix(end_state(init, last))
      +tail = anchor_tail(body, id)
      create_placed(init, id, original, String.append(original, suffix), place(init, String.append(String.append(last, suffix), tail)), ended(Boundary.run(tail, Boundary.run(suffix, end_state(init, last)))))

def create_from(+init: List<&2, Segment>, +last: String, +id: String, body: String, original: Maybe<&2, Assembled>) -> Maybe<&2, Created>:
  match original:
    case None{}:
      None{}
    case Some{Assembled{text, scan}}:
      create_allowed(init, last, id, body, text, Bool.and(SourceCrud.allowed(id, scan), end_known(init, last)))

def create(+init: List<&2, Segment>, +last: Segment, +id: String, body: String) -> Maybe<&2, Created>:
  create_from(init, segment_text(last), id, body, assemble(List.append(&2, Segment, init, [last])))
