import Base
import ./document.bend as Source
import ./recognizer.bend as Context
import ./video_block.bend as Body

# A mixed-format, lossless video recognizer. Existing Hypothesis blocks stay
# opaque; their contexts and IDs still participate in mutation safety.
type Part is Data:
  Raw{raw: String}
  Video{id: String, raw: String, fields: Body.Fields, line: Nat}
  Foreign{id: String}
  Problem{raw: String, message: String, line: Nat}

type Mode is Data:
  Watching{context: Context.Mode}
  Reading{raw: String, lines: List<&2, String>, line: Nat, valid: Bool}
  AfterVideo{}
  PendingBlank{raw: String}

type State is Data:
  State{mode: Mode, reversed: List<&2, Part>, line: Nat}

type Scan is Data:
  Scan{parts: List<&2, Part>, closed: Bool}

def part_raw(part: Part) -> String:
  match part:
    case Raw{raw}:
      raw
    case Video{id, raw, fields, line}:
      raw
    case Foreign{id}:
      ""
    case Problem{raw, message, line}:
      raw

def render_go(parts: List<&2, Part>, acc: String) -> String:
  match parts:
    case Nil{}:
      acc
    case Con{head, rest}:
      render_go(rest, String.append(acc, part_raw(head)))

def render(parts: List<&2, Part>) -> String:
  render_go(parts, "")

def identifier(text: String) -> Bool:
  match text:
    case SNil{}:
      True{}
    case SCon{h, rest}:
      Bool.and(String.contains("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", SCon{h, ""}), identifier(rest))

def id_valid(+text: String) -> Bool:
  Bool.and(Bool.not(String.is_empty(text)), identifier(text))

def anchor(text: String) -> Maybe<&2, String>:
  match text:
    case SCon{'^', +id}:
      Context.checked_identifier(id, id_valid(id))
    case _:
      None{}

def candidate(+text: String) -> Bool:
  Bool.and(String.starts_with(String.trim_start(text), ">"), String.contains(text, "%%TIMESTAMP:"))

def lf_line(+text: String, ending: Maybe<&2, Char>) -> Bool:
  match ending:
    case Some{'\n'}:
      Bool.not(String.ends_with(text, "\r"))
    case _:
      False{}

def context_allows(mode: Context.Mode) -> Bool:
  match mode:
    case Context.Neutral{}:
      True{}
    case Context.AfterAnnotation{}:
      True{}
    case Context.ListBody{}:
      True{}
    case _:
      False{}

# Shadow the existing Markdown context machine, retaining each raw physical
# line exactly once. Hypothesis payload lines never become video candidates.
def shadow_parts(parts: List<&2, Context.Part>, acc: List<&2, Part>) -> List<&2, Part>:
  match parts:
    case Nil{}:
      acc
    case Con{Context.AnnotationPart{id, raw, fields, line}, rest}:
      shadow_parts(rest, Con{Foreign{id}, acc})
    case Con{Context.CandidateError{raw, message, line}, rest}:
      shadow_parts(rest, Con{Problem{"", message, line}, acc})
    case Con{_, rest}:
      shadow_parts(rest, acc)

def shadow_result(raw: String, reversed: List<&2, Part>, result: Context.ScanState) -> State:
  Context.ScanState{context, parts, line} = result
  State{Watching{context}, shadow_parts(parts, Con{Raw{raw}, reversed}), line}

def shadow(+raw: String, text: String, reversed: List<&2, Part>, line: Nat, context: Context.Mode) -> State:
  shadow_result(raw, reversed, Context.step(context, raw, text, Nil{}, line))

def start_leading(raw: String, text: String, rest: List<&2, Part>, +line: Nat, valid: Bool, leading: String, good: Bool) -> State:
  match good:
    case True{}:
      State{Reading{String.append(leading, raw), [text], line, valid}, rest, 1n+line}
    case False{}:
      State{Watching{Context.Neutral{}}, Con{Problem{raw, "video annotation needs a separate leading LF blank line", line}, Con{Raw{leading}, rest}}, 1n+line}

def start_body(raw: String, +text: String, reversed: List<&2, Part>, +line: Nat, valid: Bool) -> State:
  match reversed:
    case Con{Raw{+leading}, rest}:
      start_leading(raw, text, rest, line, valid, leading, String.eq(leading, "\n"))
    case _:
      State{Watching{Context.Neutral{}}, Con{Problem{raw, "video annotation needs a separate leading LF blank line", line}, reversed}, 1n+line}

def watch(raw: String, +text: String, reversed: List<&2, Part>, +line: Nat, +context: Context.Mode, lf: Bool, starts: Bool) -> State:
  match starts:
    case True{}:
      start_body(raw, text, reversed, line, lf)
    case False{}:
      shadow(raw, text, reversed, line, context)

def close_body(raw: String, reversed: List<&2, Part>, line: Nat, start: Nat, id: Maybe<&2, String>, fields: Maybe<&2, Body.Fields>, valid: Bool) -> State:
  match id fields valid:
    case Some{key} Some{value} True{}:
      State{AfterVideo{}, Con{Video{key, raw, value, start}, reversed}, 1n+line}
    case _ _ _:
      State{Watching{Context.Neutral{}}, Con{Problem{raw, "malformed or unsupported video block (LF, header, body or ID)", start}, reversed}, 1n+line}

def read_line(raw: String, +text: String, previous: String, lines: List<&2, String>, start: Nat, valid: Bool, reversed: List<&2, Part>, +line: Nat, lf: Bool, quoted: Bool) -> State:
  match quoted:
    case True{}:
      State{Reading{String.append(previous, raw), Con{text, lines}, start, Bool.and(valid, Bool.and(lf, Bool.and(Body.comment_line_valid(text), Bool.not(candidate(text)))))}, reversed, 1n+line}
    case False{}:
      close_body(String.append(previous, raw), reversed, line, start, anchor(text), Body.decode(List.reverse(&2, String, lines)), Bool.and(valid, lf))

# Delay separator ownership by one line. A lone blank before the next video
# belongs to that next block; otherwise one trailing blank belongs to the prior
# block. Newly created records supply both, avoiding shared separator ownership.
def append_blank(reversed: List<&2, Part>, raw: String) -> List<&2, Part>:
  match reversed:
    case Con{Video{id, previous, fields, line}, rest}:
      Con{Video{id, String.append(previous, raw), fields, line}, rest}
    case _:
      Con{Raw{raw}, reversed}

def after(raw: String, +text: String, reversed: List<&2, Part>, +line: Nat, lf: Bool, blank: Bool) -> State:
  match blank:
    case True{}:
      State{PendingBlank{raw}, reversed, 1n+line}
    case False{}:
      watch(raw, text, reversed, line, Context.Neutral{}, lf, candidate(text))

def pending(raw: String, +text: String, previous: String, reversed: List<&2, Part>, line: Nat, lf: Bool, starts: Bool) -> State:
  match starts:
    case True{}:
      start_body(raw, text, Con{Raw{previous}, reversed}, line, lf)
    case False{}:
      watch(raw, text, append_blank(reversed, previous), line, Context.Neutral{}, lf, False{})

def step(raw: String, +text: String, +ending: Maybe<&2, Char>, state: State) -> State:
  State{mode, reversed, line} = state
  match mode:
    case Watching{+context}:
      watch(raw, text, reversed, line, context, lf_line(text, ending), Bool.and(context_allows(context), candidate(text)))
    case Reading{previous, lines, start, valid}:
      read_line(raw, text, previous, lines, start, valid, reversed, line, lf_line(text, ending), String.starts_with(text, ">"))
    case AfterVideo{}:
      after(raw, text, reversed, line, lf_line(text, ending), Bool.and(String.is_empty(text), lf_line(text, ending)))
    case PendingBlank{previous}:
      pending(raw, text, previous, reversed, line, lf_line(text, ending), candidate(text))

def run(lines: List<&2, Source.Line>, state: State) -> State:
  match lines:
    case Nil{}:
      state
    case Con{Source.Line{+text, +ending}, rest}:
      run(rest, step(Source.encode([Source.Line{text, ending}]), text, ending, state))

def finish_context(reversed: List<&2, Part>, context: Context.Scan) -> Scan:
  Context.Scan{parts, closed} = context
  Scan{List.reverse(&2, Part, shadow_parts(parts, reversed)), closed}

def finish(state: State) -> Scan:
  State{mode, reversed, line} = state
  match mode:
    case Watching{context}:
      finish_context(reversed, Context.finish(Context.ScanState{context, Nil{}, line}))
    case Reading{raw, lines, start, valid}:
      Scan{List.reverse(&2, Part, Con{Problem{raw, "video annotation has no closing block ID", start}, reversed}), False{}}
    case AfterVideo{}:
      Scan{List.reverse(&2, Part, reversed), True{}}
    case PendingBlank{raw}:
      Scan{List.reverse(&2, Part, append_blank(reversed, raw)), True{}}

def scan(source: String) -> Scan:
  finish(run(Source.decode(source), State{Watching{Context.Neutral{}}, Nil{}, 0n}))

def part_id(part: Part) -> Maybe<&2, String>:
  match part:
    case Video{id, raw, fields, line}:
      Some{id}
    case Foreign{id}:
      Some{id}
    case _:
      None{}

def same_id(id: Maybe<&2, String>, key: String) -> Bool:
  match id:
    case Some{value}:
      String.eq(value, key)
    case None{}:
      False{}

def has_id(parts: List<&2, Part>, +key: String) -> Bool:
  match parts:
    case Nil{}:
      False{}
    case Con{head, rest}:
      Bool.or(same_id(part_id(head), key), has_id(rest, key))

def duplicate(id: Maybe<&2, String>, rest: List<&2, Part>) -> Bool:
  match id:
    case Some{key}:
      has_id(rest, key)
    case None{}:
      False{}

# What it is for a note to have an error: a part that is a problem, or an ID
# that a later part has too. Every ID is compared with every later one, which
# says it plainly and takes time by the square of the number of parts.
def errors_pairwise(parts: List<&2, Part>) -> Bool:
  match parts:
    case Nil{}:
      False{}
    case Con{Problem{raw, message, line}, rest}:
      True{}
    case Con{head, +rest}:
      Bool.or(duplicate(part_id(head), rest), errors_pairwise(rest))

# The same in one pass, from the last part to the first, carrying the IDs of
# the parts after the current one in a set (the recognizer's character trie).
# A part's ID is a duplicate when it is in that set already: `has_id(rest, id)`
# of `errors_pairwise` without the rescan. Law video_errors_pairwise says the
# two agree for every list of parts; this is the one that runs.
def errors_seen(reversed: List<&2, Part>, +seen: Context.Seen, found: Bool) -> Bool:
  match reversed:
    case Nil{}:
      found
    case Con{Problem{raw, message, line}, rest}:
      errors_seen(rest, seen, True{})
    case Con{Video{+id, raw, fields, line}, rest}:
      errors_seen(rest, Context.seen_add(seen, id), Bool.or(Context.seen_has(seen, id), found))
    case Con{Foreign{+id}, rest}:
      errors_seen(rest, Context.seen_add(seen, id), Bool.or(Context.seen_has(seen, id), found))
    case Con{Raw{raw}, rest}:
      errors_seen(rest, seen, found)

def errors(parts: List<&2, Part>) -> Bool:
  errors_seen(List.reverse(&2, Part, parts), Context.SeenNone{}, False{})

def safe(result: Scan) -> Bool:
  Scan{parts, closed} = result
  Bool.and(closed, Bool.not(errors(parts)))

def is_video(part: Part, key: String) -> Bool:
  match part:
    case Video{id, raw, fields, line}:
      String.eq(id, key)
    case _:
      False{}

def without(parts: List<&2, Part>, +key: String, acc: String) -> String:
  match parts:
    case Nil{}:
      acc
    case Con{+head, rest}:
      without(rest, key, String.append(acc, Bool.pick(String, is_video(head, key), "", part_raw(head))))

type Edit is Data:
  Edit{source: String, error: Maybe<&2, String>}

def get_parts(result: Scan) -> List<&2, Part>:
  Scan{parts, closed} = result
  parts

def has_video(parts: List<&2, Part>, +key: String) -> Bool:
  match parts:
    case Nil{}:
      False{}
    case Con{head, rest}:
      Bool.or(is_video(head, key), has_video(rest, key))

def delete_good(parsed: Scan, key: String) -> Edit:
  Scan{parts, closed} = parsed
  Edit{without(parts, key, ""), None{}}

def delete_checked(+source: String, key: String, parsed: Scan, valid: Bool) -> Edit:
  match valid:
    case False{}:
      Edit{source, Some{"unsafe or ambiguous annotation document"}}
    case True{}:
      delete_good(parsed, key)

def delete(+source: String, +key: String) -> Edit:
  +parsed = scan(source)
  delete_checked(source, key, parsed, Bool.and(safe(parsed), has_video(get_parts(parsed), key)))

def output(edit: Edit) -> String:
  Edit{source, error} = edit
  source

def lookup(parts: List<&2, Part>, +key: String) -> Maybe<&2, Part>:
  match parts:
    case Nil{}:
      None{}
    case Con{+head, rest}:
      Bool.pick(Maybe<&2, Part>, is_video(head, key), Some{head}, lookup(rest, key))

def replace_go(parts: List<&2, Part>, +key: String, +replacement: String, acc: String) -> String:
  match parts:
    case Nil{}:
      acc
    case Con{+head, rest}:
      replace_go(rest, key, replacement, String.append(acc, Bool.pick(String, is_video(head, key), replacement, part_raw(head))))

def masked(source: String, id: String) -> String:
  without(get_parts(scan(source)), id, "")
