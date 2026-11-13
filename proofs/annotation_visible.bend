import Base
import ./annotation_types.bend as T

# Logical Markdown fields only; raw source/spans remain with the recognizer.
type Cut is Data:
  Cut{before: String, after: String}

def cut_go(source: String, +marker: String, before: String, matched: Bool) -> Maybe<&2, Cut>:
  match source matched:
    case SNil{} True{}:
      Some{Cut{before, ""}}
    case SNil{} False{}:
      None{}
    case SCon{h, rest} True{}:
      Some{Cut{before, String.drop(SCon{h, rest}, String.length(marker))}}
    case SCon{h, +rest} False{}:
      cut_go(rest, marker, String.append(before, SCon{h, SNil{}}), String.starts_with(rest, marker))

def cut_exact(+source: String, +marker: String) -> Maybe<&2, Cut>:
  cut_go(source, marker, "", String.starts_with(source, marker))

def cut_found(+source: String, +marker: String, found: Bool) -> Maybe<&2, Cut>:
  match found:
    case False{}:
      None{}
    case True{}:
      cut_exact(source, marker)

# A text without the marker is not walked: `cut_exact` would find nothing.
# `String.contains` is the one string test the compiler runs natively.
def cut(+source: String, +marker: String) -> Maybe<&2, Cut>:
  cut_found(source, marker, String.contains(source, marker))

def after(result: Maybe<&2, Cut>) -> T.Field<String>:
  match result:
    case None{}:
      T.AbsentField{}
    case Some{Cut{before, tail}}:
      T.PresentField{tail}

def context_cut(result: Maybe<&2, Cut>) -> T.VisibleQuote:
  match result:
    case None{}:
      T.VisibleQuote{T.AbsentField{}, T.AbsentField{}}
    case Some{Cut{prefix, highlight}}:
      T.VisibleQuote{after(cut(prefix, "%%PREFIX%%")), after(cut(highlight, "%%POSTFIX%%"))}

# The display without its surrounding blanks and its first and last character.
def content_exact(display: String) -> String:
  trimmed = String.trim(display)
  String.reverse(String.drop(String.reverse(String.drop(trimmed, 1n)), 1n))

# The specification of the visible quote context: cut the display's content
# (`content_exact`) at the highlight marker, then cut each side at its marker.
def context_cut_exact(result: Maybe<&2, Cut>) -> T.VisibleQuote:
  match result:
    case None{}:
      T.VisibleQuote{T.AbsentField{}, T.AbsentField{}}
    case Some{Cut{prefix, highlight}}:
      T.VisibleQuote{after(cut_exact(prefix, "%%PREFIX%%")), after(cut_exact(highlight, "%%POSTFIX%%"))}

def context_exact(display: String) -> T.VisibleQuote:
  context_cut_exact(cut_exact(content_exact(display), "%%HIGHLIGHT%%"))

# Whether the text starts with one of the three markers. They all begin with
# `%`, so any other first character answers without comparing further. Only
# for a marker that begins with `%`.
def marks(text: String, marker: String) -> Bool:
  match text:
    case SCon{'%', t}:
      String.starts_with(SCon{'%', t}, marker)
    case _:
      False{}

# `cut_go` for one of the three markers, testing each position with `marks`.
def cut_mark_go(source: String, +marker: String, before: String, matched: Bool) -> Maybe<&2, Cut>:
  match source matched:
    case SNil{} True{}:
      Some{Cut{before, ""}}
    case SNil{} False{}:
      None{}
    case SCon{h, rest} True{}:
      Some{Cut{before, String.drop(SCon{h, rest}, String.length(marker))}}
    case SCon{h, +rest} False{}:
      cut_mark_go(rest, marker, String.append(before, SCon{h, SNil{}}), marks(rest, marker))

def cut_mark_found(+source: String, +marker: String, found: Bool) -> Maybe<&2, Cut>:
  match found:
    case False{}:
      None{}
    case True{}:
      cut_mark_go(source, marker, "", marks(source, marker))

def cut_mark(+source: String, +marker: String) -> Maybe<&2, Cut>:
  cut_mark_found(source, marker, String.contains(source, marker))

# What follows the first occurrence of a marker: the `after` of `cut`, found
# without building the text before it.
def rest_go(source: String, +marker: String, matched: Bool) -> Maybe<&2, String>:
  match source matched:
    case SNil{} True{}:
      Some{""}
    case SNil{} False{}:
      None{}
    case SCon{h, rest} True{}:
      Some{String.drop(SCon{h, rest}, String.length(marker))}
    case SCon{h, +rest} False{}:
      rest_go(rest, marker, marks(rest, marker))

def rest_found(+source: String, +marker: String, found: Bool) -> Maybe<&2, String>:
  match found:
    case False{}:
      None{}
    case True{}:
      rest_go(source, marker, marks(source, marker))

def rest_after(+source: String, +marker: String) -> Maybe<&2, String>:
  rest_found(source, marker, String.contains(source, marker))

def present(text: Maybe<&2, String>) -> T.Field<String>:
  match text:
    case None{}:
      T.AbsentField{}
    case Some{value}:
      T.PresentField{value}

def head_space(text: String) -> Bool:
  match text:
    case SCon{h, t}:
      Char.is_space(h)
    case SNil{}:
      False{}

# Whether a text is only blanks; stops at the first character that is not.
def blank_go(text: String, space: Bool) -> Bool:
  match text space:
    case SNil{} _:
      True{}
    case SCon{h, +t} True{}:
      blank_go(t, head_space(t))
    case SCon{h, t} False{}:
      False{}

def blank(+text: String) -> Bool:
  blank_go(text, head_space(text))

# A text without its end blanks and its last character.
def before_last(text: String) -> String:
  String.reverse(String.drop(String.trim_start(String.reverse(text)), 1n))

# What follows a marker, as it stands in the display's content. The content
# stops one character before the display's end blanks, so a marker found in
# the untrimmed text is in the content exactly when something other than
# blanks follows it, and what follows it in the content is that text without
# its end blanks and last character. Only this last stretch is reversed.
def tail_checked(+tail: String, empty: Bool) -> Maybe<&2, String>:
  match empty:
    case True{}:
      None{}
    case False{}:
      Some{tail}

def tail_of(result: Maybe<&2, String>) -> Maybe<&2, String>:
  match result:
    case None{}:
      None{}
    case Some{+tail}:
      tail_checked(tail, blank(tail))

def suffix_of(tail: Maybe<&2, String>) -> T.Field<String>:
  match tail:
    case None{}:
      T.AbsentField{}
    case Some{text}:
      T.PresentField{before_last(text)}

def context_tail(prefix: String, tail: Maybe<&2, String>) -> T.VisibleQuote:
  match tail:
    case None{}:
      T.VisibleQuote{T.AbsentField{}, T.AbsentField{}}
    case Some{+highlight}:
      T.VisibleQuote{present(rest_after(prefix, "%%PREFIX%%")), suffix_of(tail_of(rest_after(highlight, "%%POSTFIX%%")))}

def context_found(result: Maybe<&2, Cut>) -> T.VisibleQuote:
  match result:
    case None{}:
      T.VisibleQuote{T.AbsentField{}, T.AbsentField{}}
    case Some{Cut{prefix, +tail}}:
      context_tail(prefix, tail_checked(tail, blank(tail)))

# The visible quote context without reversing the display: the markers are
# looked for from the display's start, and the display's end matters only for
# the text after the last marker. `typed.test.mjs` compares it with
# `context_exact` on generated displays, but nothing proves them equal, so it
# is NOT what runs: a fast path is turned on only once a law covers it.
def context_fast(display: String) -> T.VisibleQuote:
  context_found(cut_mark(String.drop(String.trim_start(display), 1n), "%%HIGHLIGHT%%"))

# What runs: the specification itself. Replace with `context_fast` when a law
# `context_fast(display) == context_exact(display)` for every display is proved.
def context(display: String) -> T.VisibleQuote:
  context_exact(display)

def tag_prepend(value: String, rest: List<&2, String>) -> List<&2, String>:
  match value:
    case SNil{}:
      rest
    case _:
      Con{value, rest}

def tag_items(values: List<&2, String>) -> List<&2, String>:
  match values:
    case Nil{}:
      Nil{}
    case Con{head, rest}:
      tag_prepend(String.drop(String.trim(head), 1n), tag_items(rest))

def tags(raw: T.Field<String>) -> T.Field<List<&2, String>>:
  match raw:
    case T.AbsentField{}:
      T.AbsentField{}
    case T.PresentField{text}:
      T.PresentField{tag_items(String.split(text, ','))}

def fields(display: String, comment: T.Field<String>, raw_tags: T.Field<String>) -> T.VisibleFields:
  T.VisibleFields{comment, tags(raw_tags), context(display)}
