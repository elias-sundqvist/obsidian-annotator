import Base
import ./document.bend as Source

# Structural recognizer. JSON validation is a separate adapter boundary.
type Legacy is Data:
  Legacy{json: String, display: List<&2, String>, link: Maybe<&2, String>, comment: Maybe<&2, List<&2, String>>, tags: Maybe<&2, String>}

type Part is Data:
  RawPart{raw: String}
  AnnotationPart{id: String, raw: String, fields: Legacy, line: Nat}
  CandidateError{raw: String, message: String, line: Nat}

type Mode is Data:
  Neutral{}
  AfterAnnotation{}
  Opening{raw: String, line: Nat}
  Candidate{raw: String, reversed: List<&2, String>, line: Nat, formatted: Bool}
  Fence{char: Char, size: Nat, quoted: Bool}
  HtmlComment{}
  ObsidianComment{}
  Frontmatter{}
  OpaqueHtml{}
  ListBody{}

type ScanState is Data:
  ScanState{mode: Mode, reversed: List<&2, Part>, line: Nat}

type Scan is Data:
  Scan{parts: List<&2, Part>, closed: Bool}

type Split is Data:
  Absent{}
  Found{before: List<&2, String>, after: List<&2, String>}

# Strip CR only for recognition; raw source always retains it.
def clean_reverse(text: String) -> String:
  match text:
    case SCon{'\r', rest}:
      String.reverse(rest)
    case _:
      String.reverse(text)

def clean_exact(text: String) -> String:
  clean_reverse(String.reverse(text))

# Whether the last character is CR; `last` says whether the previous one was.
def ends_cr(text: String, last: Bool) -> Bool:
  match text:
    case SNil{}:
      last
    case SCon{h, t}:
      ends_cr(t, Char.is_eq(h, '\r'))

def clean_checked(text: String, cr: Bool) -> String:
  match cr:
    case False{}:
      text
    case True{}:
      clean_exact(text)

# Only a line that ends in CR is reversed to strip it; any other is returned
# as it is, without the two reversals.
def clean(+text: String) -> String:
  clean_checked(text, ends_cr(text, False{}))

def indent(text: String, fuel: Nat) -> String:
  match text fuel:
    case SCon{' ', rest} 1n+p:
      indent(rest, p)
    case _ _:
      text

def optional_space(text: String) -> String:
  match text:
    case SCon{' ', rest}:
      rest
    case _:
      text

def unquote_prefix(text: String) -> Maybe<&2, String>:
  match text:
    case SCon{'>', rest}:
      Some{optional_space(rest)}
    case _:
      None{}

def unquote(text: String) -> Maybe<&2, String>:
  unquote_prefix(indent(text, 3n))

def unquote_style_prefix(text: String, formatted: Bool) -> Maybe<&2, String>:
  match text:
    case SCon{'>', +rest}:
      Some{Bool.pick(String, formatted, optional_space(rest), rest)}
    case _:
      None{}

def unquote_style(text: String, formatted: Bool) -> Maybe<&2, String>:
  unquote_style_prefix(indent(text, 3n), formatted)

# Marker and prefix tests on a whole line. `String.trim` reverses the line
# twice, so each `_exact` definition (the specification) is only evaluated
# once a cheap test on the untrimmed start says the answer can be True:
# a trimmed line that equals, or starts with, a marker has that marker right
# after its leading blanks. LAWS.bend proves each guarded test equal to its
# `_exact` definition for every line and every marker.
def is_marker_exact(text: String, marker: String) -> Bool:
  String.eq(String.trim(text), marker)

def is_marker_checked(text: String, marker: String, possible: Bool) -> Bool:
  match possible:
    case False{}:
      False{}
    case True{}:
      is_marker_exact(text, marker)

def is_marker(+text: String, +marker: String) -> Bool:
  is_marker_checked(text, marker, String.starts_with(String.trim_start(text), marker))

def starts_trimmed_exact(text: String, prefix: String) -> Bool:
  String.starts_with(String.trim(text), prefix)

# Whether the last character is a blank; `last` says whether the previous one was.
def ends_blank(text: String, last: Bool) -> Bool:
  match text:
    case SNil{}:
      last
    case SCon{h, t}:
      ends_blank(t, Char.is_space(h))

# The start of the line has the prefix. Trimming the end of the line can only
# take blanks away, so it cannot break a prefix that does not end in a blank:
# only for a prefix that does is the trimming definition evaluated.
def starts_trimmed_tight(text: String, prefix: String, tight: Bool) -> Bool:
  match tight:
    case False{}:
      starts_trimmed_exact(text, prefix)
    case True{}:
      True{}

def starts_trimmed_checked(text: String, +prefix: String, possible: Bool) -> Bool:
  match possible:
    case False{}:
      False{}
    case True{}:
      starts_trimmed_tight(text, prefix, Bool.not(ends_blank(prefix, False{})))

def starts_trimmed(+text: String, +prefix: String) -> Bool:
  starts_trimmed_checked(text, prefix, String.starts_with(String.trim_start(text), prefix))

def quoted_marker(text: Maybe<&2, String>, marker: String) -> Bool:
  match text:
    case None{}:
      False{}
    case Some{x}:
      is_marker(x, marker)

def header_text(text: String) -> Bool:
  match text:
    case SCon{'`', SCon{'`', SCon{'`', rest}}}:
      String.eq(String.trim(rest), "annotation-json")
    case _:
      False{}

def header(text: Maybe<&2, String>) -> Bool:
  match text:
    case None{}:
      False{}
    case Some{q}:
      header_text(String.trim(q))

def quoted_header(text: Maybe<&2, String>) -> Bool:
  match text:
    case None{}:
      False{}
    case Some{+q}:
      Bool.or(starts_trimmed(q, "```annotation-json"), starts_trimmed(q, "``` annotation-json"))

def identifier_chars(text: String) -> Bool:
  match text:
    case SNil{}:
      True{}
    case SCon{+h, t}:
      Bool.and(Bool.or(Char.is_alpha(h), Bool.or(Char.is_digit(h), Char.is_eq(h, '-'))), identifier_chars(t))

def identifier_nonempty(+text: String) -> Bool:
  Bool.and(Bool.not(String.is_empty(text)), identifier_chars(text))

def checked_identifier(text: String, valid: Bool) -> Maybe<&2, String>:
  match valid:
    case True{}:
      Some{text}
    case False{}:
      None{}

def anchor_text(text: String) -> Maybe<&2, String>:
  match text:
    case SCon{'^', +id}:
      checked_identifier(id, identifier_nonempty(id))
    case _:
      None{}

def anchor(text: String) -> Maybe<&2, String>:
  anchor_text(String.trim_end(indent(text, 3n)))

def split_prepend(head: String, result: Split) -> Split:
  match result:
    case Absent{}:
      Absent{}
    case Found{before, after}:
      Found{Con{head, before}, after}

def split_choose(head: String, tail: List<&2, String>, result: Split, here: Bool) -> Split:
  match here:
    case True{}:
      Found{Nil{}, tail}
    case False{}:
      split_prepend(head, result)

def split(lines: List<&2, String>, +marker: String, +prefix: Bool) -> Split:
  match lines:
    case Nil{}:
      Absent{}
    case Con{+h, +t}:
      split_choose(h, t, split(t, marker, prefix), Bool.pick(Bool, prefix, starts_trimmed(h, marker), is_marker(h, marker)))

def tags_choose(reversed: List<&2, String>, tags: String, rest: List<&2, String>, found: Bool) -> List<&2, String> & Maybe<&2, String>:
  match found:
    case True{}:
      (List.reverse(&2, String, rest), Some{tags})
    case False{}:
      (List.reverse(&2, String, reversed), None{})

def tags_suffix(reversed: List<&2, String>) -> List<&2, String> & Maybe<&2, String>:
  match reversed:
    case Con{+tags, Con{+marker, +rest}}:
      tags_choose(Con{tags, Con{marker, rest}}, tags, rest, is_marker(marker, "%%TAGS%%"))
    case _:
      (List.reverse(&2, String, reversed), None{})

# Whether the trimmed text ends with `suffix`. Reversing the trimmed text
# undoes the reversal inside `String.trim_end`, so one reversal does where the
# definition (`ends_trimmed_exact`) makes three.
def ends_trimmed_exact(text: String, suffix: String) -> Bool:
  String.ends_with(String.trim(text), suffix)

def ends_trimmed(text: String, suffix: String) -> Bool:
  String.starts_with(String.trim_start(String.reverse(String.trim_start(text))), String.reverse(suffix))

def display_valid(lines: List<&2, String>) -> Bool:
  match lines:
    case Nil{}:
      True{}
    case Con{+h, +t}:
      Bool.and(starts_trimmed(h, "*"), ends_trimmed(String.join(Con{h, t}, "\n"), "*"))

def assemble(json: String, display: List<&2, String>, link: Maybe<&2, String>, comment: Maybe<&2, List<&2, String>>, tags: Maybe<&2, String>, valid: Bool) -> Maybe<&2, Legacy>:
  match valid:
    case True{}:
      Some{Legacy{json, display, link, comment, tags}}
    case False{}:
      None{}

def sections_link(json: String, +pre: List<&2, String>, comment: Maybe<&2, List<&2, String>>, tags: Maybe<&2, String>, found: Split) -> Maybe<&2, Legacy>:
  match found:
    case Absent{}:
      assemble(json, pre, None{}, comment, tags, display_valid(pre))
    case Found{+display, after}:
      assemble(json, display, List.head(&2, String, List.drop(&2, String, pre, List.length(&2, String, display))), comment, tags, Bool.and(display_valid(display), List.is_empty(&2, String, after)))

def sections_comment(json: String, +lines: List<&2, String>, tags: Maybe<&2, String>, found: Split) -> Maybe<&2, Legacy>:
  match found:
    case Absent{}:
      sections_link(json, lines, None{}, tags, split(lines, "%%LINK%%", True{}))
    case Found{+pre, comment}:
      sections_link(json, pre, Some{comment}, tags, split(pre, "%%LINK%%", True{}))

def sections(json: String, tail: List<&2, String> & Maybe<&2, String>) -> Maybe<&2, Legacy>:
  (+lines, tags) = tail
  sections_comment(json, lines, tags, split(lines, "%%COMMENT%%", False{}))

def after_json_marker(json: String, rest: List<&2, String>, valid: Bool) -> Maybe<&2, Legacy>:
  match valid:
    case True{}:
      sections(json, tags_suffix(List.reverse(&2, String, rest)))
    case False{}:
      None{}

def after_json(json: String, lines: List<&2, String>) -> Maybe<&2, Legacy>:
  match lines:
    case Con{head, rest}:
      after_json_marker(json, rest, is_marker(head, "%%"))
    case _:
      None{}

def json_split(result: Split) -> Maybe<&2, Legacy>:
  match result:
    case Absent{}:
      None{}
    case Found{json, rest}:
      after_json(String.join(json, "\n"), rest)

def parse_body_checked(rest: List<&2, String>, valid: Bool) -> Maybe<&2, Legacy>:
  match valid:
    case True{}:
      json_split(split(rest, "```", False{}))
    case False{}:
      None{}

# Explicit equality avoids the pinned JS compiler expanding literal patterns.
def parse_body(lines: List<&2, String>) -> Maybe<&2, Legacy>:
  match lines:
    case Con{opening, Con{header_line, rest}}:
      parse_body_checked(rest, Bool.and(String.eq(opening, "%%"), String.eq(header_line, "```annotation-json")))
    case _:
      None{}

# The header test trims its line, so it runs only on the line after a marker.
def header_after(previous: Bool, text: String) -> Bool:
  match previous:
    case False{}:
      False{}
    case True{}:
      header_text(String.trim(text))

# A second complete opener/header pair may be a missing first anchor or a
# literal nested example. Do not silently guess and merge two annotations.
def count_headers(lines: List<&2, String>, previous: Bool, +count: Nat) -> Nat:
  match lines:
    case Nil{}:
      count
    case Con{+h, rest}:
      count_headers(rest, is_marker(h, "%%"), Bool.pick(Nat, header_after(previous, h), 1n+count, count))

def body_guard(lines: List<&2, String>, unambiguous: Bool) -> Maybe<&2, Legacy>:
  match unambiguous:
    case True{}:
      parse_body(lines)
    case False{}:
      None{}

def body(+lines: List<&2, String>) -> Maybe<&2, Legacy>:
  body_guard(lines, Nat.is_le(count_headers(lines, False{}, 0n), 1n))

# Fences are recognized in raw Markdown, not inside annotation payloads.
def count_prefix(text: String, +char: Char, +count: Nat, active: Bool) -> Nat:
  match text:
    case SNil{}:
      count
    case SCon{h, rest}:
      +next = Bool.and(active, Char.is_eq(h, char))
      count_prefix(rest, char, Bool.pick(Nat, next, 1n+count, count), next)

def fence_start(text: String) -> Maybe<&2, Mode>:
  match text:
    case SCon{'`', SCon{'`', SCon{'`', rest}}}:
      Some{Fence{'`', count_prefix(rest, '`', 3n, True{}), False{}}}
    case SCon{'~', SCon{'~', SCon{'~', rest}}}:
      Some{Fence{'~', count_prefix(rest, '~', 3n, True{}), False{}}}
    case _:
      None{}

def fence_close(+text: String, +char: Char, +size: Nat) -> Bool:
  +count = count_prefix(text, char, 0n, True{})
  Bool.and(Nat.is_ge(count, size), String.is_empty(String.trim(String.drop(text, count))))

def comment_state(text: String, inside: Bool) -> Bool:
  match text:
    case SNil{}:
      inside
    case SCon{+h, +rest}:
      comment_state(rest, Bool.pick(Bool, String.starts_with(SCon{h, rest}, "<!--"), True{}, Bool.pick(Bool, String.starts_with(SCon{h, rest}, "-->"), False{}, inside)))

def mode_comment(mode: Bool) -> Mode:
  match mode:
    case True{}:
      HtmlComment{}
    case False{}:
      Neutral{}

def emit(raw: String, mode: Mode, reversed: List<&2, Part>, line: Nat) -> ScanState:
  ScanState{mode, Con{RawPart{raw}, reversed}, 1n+line}

def plain_comment_mode(+text: String) -> Mode:
  Bool.pick(Mode, is_marker(text, "%%"), ObsidianComment{}, mode_comment(comment_state(text, False{})))

def raw_context(raw: String, +text: String, reversed: List<&2, Part>, +line: Nat, unsupported: Bool) -> ScanState:
  match unsupported:
    case True{}:
      ScanState{OpaqueHtml{}, Con{CandidateError{raw, "unsupported raw HTML context", line}, reversed}, 1n+line}
    case False{}:
      emit(raw, plain_comment_mode(text), reversed, line)

def quoted_context(raw: String, +text: String, reversed: List<&2, Part>, line: Nat, fence: Maybe<&2, Mode>) -> ScanState:
  match fence:
    case Some{Fence{char, size, quoted}}:
      emit(raw, Fence{char, size, True{}}, reversed, line)
    case _:
      raw_context(raw, text, reversed, line, Bool.and(starts_trimmed(text, "<"), Bool.not(starts_trimmed(text, "<!--"))))

def normal_quote(raw: String, +text: String, reversed: List<&2, Part>, +line: Nat, quoted: Maybe<&2, String>) -> ScanState:
  match quoted:
    case None{}:
      raw_context(raw, text, reversed, line, Bool.and(starts_trimmed(text, "<"), Bool.not(starts_trimmed(text, "<!--"))))
    case Some{+q}:
      quoted_context(raw, q, reversed, line, fence_start(q))

def ordered_list(+text: String, fuel: Nat, seen: Bool) -> Bool:
  match text fuel:
    case SCon{+h, +rest} 1n+p:
      +current = {SCon{h, rest} : String}
      Bool.or(Bool.and(seen, Bool.or(String.starts_with(current, ". "), String.starts_with(current, ") "))), Bool.and(Char.is_digit(h), ordered_list(rest, p, True{})))
    case _ _:
      False{}

def list_start(+text: String) -> Bool:
  Bool.or(ordered_list(text, 10n, False{}), Bool.or(String.starts_with(text, "- "), Bool.or(String.starts_with(text, "+ "), String.starts_with(text, "* "))))

def normal_list(raw: String, +text: String, reversed: List<&2, Part>, line: Nat, listed: Bool) -> ScanState:
  match listed:
    case True{}:
      emit(raw, ListBody{}, reversed, line)
    case False{}:
      normal_quote(raw, text, reversed, line, unquote(text))

def normal_fence(raw: String, +text: String, reversed: List<&2, Part>, +line: Nat, fence: Maybe<&2, Mode>) -> ScanState:
  match fence:
    case Some{mode}:
      emit(raw, mode, reversed, line)
    case None{}:
      normal_list(raw, text, reversed, line, list_start(indent(text, 3n)))

def normal_open(raw: String, +text: String, reversed: List<&2, Part>, +line: Nat, opening: Bool, orphan: Bool) -> ScanState:
  match opening orphan:
    case True{} _:
      ScanState{Opening{raw, line}, reversed, 1n+line}
    case False{} True{}:
      ScanState{Neutral{}, Con{CandidateError{raw, "annotation fence without opening marker", line}, reversed}, 1n+line}
    case False{} False{}:
      normal_fence(raw, text, reversed, line, fence_start(indent(text, 3n)))

def normal_frontmatter(raw: String, +text: String, reversed: List<&2, Part>, +line: Nat, front: Bool) -> ScanState:
  match front:
    case True{}:
      emit(raw, Frontmatter{}, reversed, line)
    case False{}:
      normal_open(raw, text, reversed, line, quoted_marker(unquote(text), "%%"), quoted_header(unquote(text)))

def remove_bom(text: String) -> String:
  match text:
    case SCon{'﻿', rest}:
      rest
    case _:
      text

def normal(raw: String, +text: String, reversed: List<&2, Part>, +line: Nat) -> ScanState:
  normal_frontmatter(raw, Bool.pick(String, Nat.is_eq(line, 0n), remove_bom(text), text), reversed, line, Bool.and(Nat.is_eq(line, 0n), is_marker(remove_bom(text), "---")))

def opening_next(raw: String, +text: String, +first: String, start: Nat, reversed: List<&2, Part>, line: Nat, header: Bool) -> ScanState:
  match header:
    case True{}:
      ScanState{Candidate{String.append(first, raw), ["```annotation-json", "%%"], start, starts_trimmed(first, "> ")}, reversed, 1n+line}
    case False{}:
      normal(raw, text, Con{RawPart{first}, reversed}, line)

def candidate_fields(raw: String, id: String, start: Nat, reversed: List<&2, Part>, line: Nat, fields: Maybe<&2, Legacy>) -> ScanState:
  match fields:
    case Some{data}:
      ScanState{AfterAnnotation{}, Con{AnnotationPart{id, raw, data, start}, reversed}, 1n+line}
    case None{}:
      ScanState{Neutral{}, Con{CandidateError{raw, "malformed or unsupported annotation body", start}, reversed}, 1n+line}

def candidate_anchor(raw: String, lines: List<&2, String>, start: Nat, reversed: List<&2, Part>, line: Nat, id: Maybe<&2, String>) -> ScanState:
  match id:
    case Some{x}:
      candidate_fields(raw, x, start, reversed, line, body(List.reverse(&2, String, lines)))
    case None{}:
      ScanState{Neutral{}, Con{CandidateError{raw, "missing or unsupported annotation block ID", start}, reversed}, 1n+line}

def candidate_line(raw: String, +text: String, first: String, lines: List<&2, String>, start: Nat, formatted: Bool, reversed: List<&2, Part>, line: Nat, quoted: Maybe<&2, String>) -> ScanState:
  match quoted:
    case Some{q}:
      ScanState{Candidate{String.append(first, raw), Con{q, lines}, start, formatted}, reversed, 1n+line}
    case None{}:
      candidate_anchor(String.append(first, raw), lines, start, reversed, line, anchor(text))

def fence_line(raw: String, char: Char, size: Nat, quoted: Bool, reversed: List<&2, Part>, line: Nat, closed: Bool) -> ScanState:
  match closed:
    case True{}:
      emit(raw, Neutral{}, reversed, line)
    case False{}:
      emit(raw, Fence{char, size, quoted}, reversed, line)

def quoted_fence_close(text: Maybe<&2, String>, char: Char, size: Nat) -> Bool:
  match text:
    case None{}:
      False{}
    case Some{q}:
      fence_close(indent(q, 3n), char, size)

def close_kind(+text: String, +char: Char, +size: Nat, quoted: Bool) -> Bool:
  match quoted:
    case True{}:
      quoted_fence_close(unquote(text), char, size)
    case False{}:
      fence_close(indent(text, 3n), char, size)

def context_line(raw: String, mode: Mode, reversed: List<&2, Part>, line: Nat, closed: Bool) -> ScanState:
  match closed:
    case True{}:
      emit(raw, Neutral{}, reversed, line)
    case False{}:
      emit(raw, mode, reversed, line)

def list_line(raw: String, +text: String, reversed: List<&2, Part>, +line: Nat, blank: Bool, indented: Bool, candidate: Bool) -> ScanState:
  match blank indented candidate:
    case True{} _ _:
      emit(raw, ListBody{}, reversed, line)
    case False{} True{} True{}:
      ScanState{ListBody{}, Con{CandidateError{raw, "nested annotation candidate inside list is unsupported", line}, reversed}, 1n+line}
    case False{} True{} False{}:
      emit(raw, ListBody{}, reversed, line)
    case False{} False{} _:
      normal(raw, text, reversed, line)

# One physically empty line immediately AFTER a closing anchor belongs to that
# annotation. Leading prose/newlines and further blank lines remain raw. This
# gives new blocks their own separator without borrowing from the next create.
def after_annotation(raw: String, +text: String, +reversed: List<&2, Part>, +line: Nat, blank: Bool) -> ScanState:
  match reversed blank:
    case Con{AnnotationPart{id, previous, fields, start}, rest} True{}:
      ScanState{Neutral{}, Con{AnnotationPart{id, String.append(previous, raw), fields, start}, rest}, 1n+line}
    case _ _:
      normal(raw, text, reversed, line)

def step(mode: Mode, raw: String, +text: String, reversed: List<&2, Part>, line: Nat) -> ScanState:
  match mode:
    case Neutral{}:
      normal(raw, text, reversed, line)
    case AfterAnnotation{}:
      after_annotation(raw, text, reversed, line, String.is_empty(text))
    case Opening{first, start}:
      opening_next(raw, text, first, start, reversed, line, header(unquote(text)))
    case Candidate{first, lines, start, +formatted}:
      candidate_line(raw, text, first, lines, start, formatted, reversed, line, unquote_style(text, formatted))
    case Fence{+char, +size, +quoted}:
      fence_line(raw, char, size, quoted, reversed, line, close_kind(text, char, size, quoted))
    case HtmlComment{}:
      emit(raw, mode_comment(comment_state(text, True{})), reversed, line)
    case ObsidianComment{}:
      context_line(raw, ObsidianComment{}, reversed, line, is_marker(text, "%%"))
    case Frontmatter{}:
      context_line(raw, Frontmatter{}, reversed, line, Bool.or(is_marker(text, "---"), is_marker(text, "...")))
    case OpaqueHtml{}:
      context_line(raw, OpaqueHtml{}, reversed, line, String.is_empty(String.trim(text)))
    case ListBody{}:
      list_line(raw, text, reversed, line, String.is_empty(String.trim(text)), Bool.or(String.starts_with(text, " "), String.starts_with(text, "\t")), Bool.or(quoted_marker(unquote(text), "%%"), quoted_header(unquote(text))))

def run(lines: List<&2, Source.Line>, state: ScanState) -> ScanState:
  match lines:
    case Nil{}:
      state
    case Con{Source.Line{+text, +ending}, rest}:
      ScanState{mode, reversed, line} = state
      run(rest, step(mode, Source.encode([Source.Line{text, ending}]), clean(text), reversed, line))

def finish(state: ScanState) -> Scan:
  ScanState{mode, reversed, line} = state
  match mode:
    case Neutral{}:
      Scan{List.reverse(&2, Part, reversed), True{}}
    case AfterAnnotation{}:
      Scan{List.reverse(&2, Part, reversed), True{}}
    case ListBody{}:
      Scan{List.reverse(&2, Part, reversed), True{}}
    case Opening{raw, start}:
      Scan{List.reverse(&2, Part, Con{RawPart{raw}, reversed}), True{}}
    case Candidate{raw, lines, start, formatted}:
      Scan{List.reverse(&2, Part, Con{CandidateError{raw, "annotation has no closing anchor", start}, reversed}), False{}}
    case _:
      Scan{List.reverse(&2, Part, Con{CandidateError{"", "unclosed Markdown context", line}, reversed}), False{}}

# The scan of a source is the scan of its lines.
def scan_lines(lines: List<&2, Source.Line>) -> Scan:
  finish(run(lines, ScanState{Neutral{}, Nil{}, 0n}))

def scan(source: String) -> Scan:
  scan_lines(Source.decode(source))

def part_raw(part: Part) -> String:
  match part:
    case RawPart{text}:
      text
    case AnnotationPart{id, text, fields, line}:
      text
    case CandidateError{text, message, line}:
      text

def render_go(parts: List<&2, Part>, acc: String) -> String:
  match parts:
    case Nil{}:
      acc
    case Con{h, t}:
      render_go(t, String.append(acc, part_raw(h)))

def render(parts: List<&2, Part>) -> String:
  render_go(parts, "")

def has_id_go(parts: List<&2, Part>, +id: String, found: Bool) -> Bool:
  match parts:
    case Nil{}:
      found
    case Con{AnnotationPart{key, text, fields, line}, rest}:
      has_id_go(rest, id, Bool.or(found, String.eq(key, id)))
    case Con{_, rest}:
      has_id_go(rest, id, found)

def has_id(parts: List<&2, Part>, id: String) -> Bool:
  has_id_go(parts, id, False{})

def errors_go(parts: List<&2, Part>, found: Bool) -> Bool:
  match parts:
    case Nil{}:
      found
    case Con{CandidateError{raw, message, line}, rest}:
      errors_go(rest, True{})
    case Con{AnnotationPart{+id, raw, fields, line}, +rest}:
      errors_go(rest, Bool.or(found, has_id(rest, id)))
    case Con{_, rest}:
      errors_go(rest, found)

# `errors_go` and `diagnostics_go` compare every annotation ID with every later
# one. They are the SPECIFICATION of duplicate detection and are no longer run:
# `errors` and `diagnostics` below are proved equal to them for every part list
# (LAWS.bend, `recognizer_errors_pairwise` / `recognizer_diagnostics_pairwise`).
def errors_pairwise(parts: List<&2, Part>) -> Bool:
  errors_go(parts, False{})

# A set of IDs as a character trie. `SeenEnd` says the characters walked to
# reach this node spell an ID in the set; `SeenChar` holds the IDs that go on
# with `char` (`down`) beside the other ways to go on (`next`). Looking an ID
# up or adding one costs at most its length times the alphabet in use (63 for
# valid block IDs), whatever the number of IDs in the set.
type Seen is Data:
  SeenNone{}
  SeenEnd{next: Seen}
  SeenChar{char: Char, down: Seen, next: Seen}

def seen_chain(key: String) -> Seen:
  match key:
    case SNil{}:
      SeenEnd{SeenNone{}}
    case SCon{h, t}:
      SeenChar{h, seen_chain(t), SeenNone{}}

# Whether the first node is the one a key goes on through. The caller asks
# before it recurses, so that a single definition can step both across (`next`)
# and down, and stops at the first match. `seen_meets` asks for a lookup and
# `seen_joins` for an insertion; they differ only in the order of the
# comparison, which lets the proof do without symmetry of `Char.is_eq`.
def seen_meets(seen: Seen, key: String) -> Bool:
  match seen key:
    case SeenChar{c, down, next} SCon{h, t}:
      Char.is_eq(c, h)
    case _ _:
      False{}

def seen_joins(seen: Seen, key: String) -> Bool:
  match seen key:
    case SeenChar{c, down, next} SCon{h, t}:
      Char.is_eq(h, c)
    case _ _:
      False{}

def seen_has_go(seen: Seen, key: String, same: Bool) -> Bool:
  match seen key same:
    case SeenNone{} _ _:
      False{}
    case SeenEnd{next} SNil{} _:
      True{}
    case SeenEnd{+next} SCon{+h, +t} _:
      seen_has_go(next, SCon{h, t}, seen_meets(next, SCon{h, t}))
    case SeenChar{c, down, +next} SNil{} _:
      seen_has_go(next, SNil{}, seen_meets(next, SNil{}))
    case SeenChar{c, +down, next} SCon{h, +t} True{}:
      seen_has_go(down, t, seen_meets(down, t))
    case SeenChar{c, down, +next} SCon{+h, +t} False{}:
      seen_has_go(next, SCon{h, t}, seen_meets(next, SCon{h, t}))

def seen_has(+seen: Seen, +key: String) -> Bool:
  seen_has_go(seen, key, seen_meets(seen, key))

def seen_add_go(seen: Seen, key: String, same: Bool) -> Seen:
  match seen key same:
    case SeenNone{} SNil{} _:
      SeenEnd{SeenNone{}}
    case SeenNone{} SCon{h, t} _:
      SeenChar{h, seen_chain(t), SeenNone{}}
    case SeenEnd{next} SNil{} _:
      SeenEnd{next}
    case SeenEnd{+next} SCon{+h, +t} _:
      SeenEnd{seen_add_go(next, SCon{h, t}, seen_joins(next, SCon{h, t}))}
    case SeenChar{c, down, next} SNil{} _:
      SeenEnd{SeenChar{c, down, next}}
    case SeenChar{c, +down, next} SCon{h, +t} True{}:
      SeenChar{c, seen_add_go(down, t, seen_joins(down, t)), next}
    case SeenChar{c, down, +next} SCon{+h, +t} False{}:
      SeenChar{c, down, seen_add_go(next, SCon{h, t}, seen_joins(next, SCon{h, t}))}

def seen_add(+seen: Seen, +key: String) -> Seen:
  seen_add_go(seen, key, seen_joins(seen, key))

# One pass from the last part to the first, carrying the IDs of the parts
# after the current one. An annotation is a duplicate when its ID is already
# in that set, which is `has_id(rest, id)` of `errors_go` without the rescan:
# the EARLIER block of a repeated ID is the one reported, as before.
def errors_seen(reversed: List<&2, Part>, +seen: Seen, found: Bool) -> Bool:
  match reversed:
    case Nil{}:
      found
    case Con{CandidateError{raw, message, line}, rest}:
      errors_seen(rest, seen, True{})
    case Con{AnnotationPart{+id, raw, fields, line}, rest}:
      errors_seen(rest, seen_add(seen, id), Bool.or(seen_has(seen, id), found))
    case Con{_, rest}:
      errors_seen(rest, seen, found)

def errors(parts: List<&2, Part>) -> Bool:
  errors_seen(List.reverse(&2, Part, parts), SeenNone{}, False{})

def safe(result: Scan) -> Bool:
  Scan{+parts, closed} = result
  Bool.and(closed, Bool.not(errors(parts)))

# Literal-ID deletion over freshly scanned tokens. Preceding RawPart whitespace
# is NEVER consumed. Mutation is refused if candidates/IDs are ambiguous.
def without_id_go(parts: List<&2, Part>, +id: String, acc: String) -> String:
  match parts:
    case Nil{}:
      acc
    case Con{+part, rest}:
      +skip = has_id([part], id)
      without_id_go(rest, id, String.append(acc, Bool.pick(String, skip, "", part_raw(part))))

def without_id(parts: List<&2, Part>, id: String) -> String:
  without_id_go(parts, id, "")

type Edit is Data:
  SourceEdit{source: String, error: Maybe<&2, String>}

def delete_good(parsed: Scan, id: String) -> Edit:
  Scan{parts, closed} = parsed
  SourceEdit{without_id(parts, id), None{}}

def delete_checked(+source: String, id: String, parsed: Scan, valid: Bool) -> Edit:
  match valid:
    case False{}:
      SourceEdit{source, Some{"unsafe annotation document"}}
    case True{}:
      delete_good(parsed, id)

def delete(+source: String, id: String) -> Edit:
  +parsed = scan(source)
  delete_checked(source, id, parsed, safe(parsed))

def output(edit: Edit) -> String:
  SourceEdit{source, error} = edit
  source

type Diagnostic is Data:
  Diagnostic{line: Nat, message: String}

def duplicate_diagnostic(id: String, line: Nat, rest: List<&2, Diagnostic>, duplicate: Bool) -> List<&2, Diagnostic>:
  match duplicate:
    case True{}:
      Con{Diagnostic{line, String.append("duplicate annotation ID: ", id)}, rest}
    case False{}:
      rest

def diagnostics_go(parts: List<&2, Part>, acc: List<&2, Diagnostic>) -> List<&2, Diagnostic>:
  match parts:
    case Nil{}:
      List.reverse(&2, Diagnostic, acc)
    case Con{CandidateError{raw, message, line}, rest}:
      diagnostics_go(rest, Con{Diagnostic{line, message}, acc})
    case Con{AnnotationPart{+id, raw, fields, line}, +rest}:
      diagnostics_go(rest, duplicate_diagnostic(id, line, acc, has_id(rest, id)))
    case Con{_, rest}:
      diagnostics_go(rest, acc)

def diagnostics_pairwise(parts: List<&2, Part>) -> List<&2, Diagnostic>:
  diagnostics_go(parts, Nil{})

def diagnostics_seen(reversed: List<&2, Part>, +seen: Seen, acc: List<&2, Diagnostic>) -> List<&2, Diagnostic>:
  match reversed:
    case Nil{}:
      acc
    case Con{CandidateError{raw, message, line}, rest}:
      diagnostics_seen(rest, seen, Con{Diagnostic{line, message}, acc})
    case Con{AnnotationPart{+id, raw, fields, line}, rest}:
      diagnostics_seen(rest, seen_add(seen, id), duplicate_diagnostic(id, line, acc, seen_has(seen, id)))
    case Con{_, rest}:
      diagnostics_seen(rest, seen, acc)

def diagnostics(parts: List<&2, Part>) -> List<&2, Diagnostic>:
  diagnostics_seen(List.reverse(&2, Part, parts), SeenNone{}, Nil{})

def lookup(parts: List<&2, Part>, +id: String) -> Maybe<&2, Part>:
  match parts:
    case Nil{}:
      None{}
    case Con{+head, rest}:
      Bool.pick(Maybe<&2, Part>, has_id([head], id), Some{head}, lookup(rest, id))

def replacement_part(+part: Part, id: String, replacement: String) -> String:
  +matches = has_id([part], id)
  Bool.pick(String, matches, replacement, part_raw(part))

def replace_id(parts: List<&2, Part>, +id: String, +replacement: String) -> String:
  match parts:
    case Nil{}:
      ""
    case Con{h, rest}:
      String.append(replacement_part(h, id, replacement), replace_id(rest, id, replacement))
