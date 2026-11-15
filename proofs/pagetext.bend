import Base
import ./annotation_types.bend as T

# A text box: an area whose note is also shown on the page, at one of three
# sizes. It is stored as one top-level JSON member beside the area's own,
# `"pageText": "<size>"`. Absent, or a value that is not a string: the note
# is not shown on the page. A string this version does not know reads as the
# middle size, so a later size does not hide a box here. Writing the member,
# or taking it away, touches that one member and nothing else, exactly as an
# ink is written (ink.bend).
type Size is Data:
  Small{}
  Medium{}
  Large{}

def key(size: Size) -> String:
  match size:
    case Small{}:
      "small"
    case Medium{}:
      "medium"
    case Large{}:
      "large"

def parse(+text: String) -> Size:
  Bool.pick(Size, String.eq(text, "small"), Small{}, Bool.pick(Size, String.eq(text, "large"), Large{}, Medium{}))

# The stored member.
def is_page_text(pair: T.JsonPair<T.Json>) -> Bool:
  T.JsonPair{name, value} = pair
  String.eq(name, "pageText")

def text_pair(size: Size) -> T.JsonPair<T.Json>:
  T.JsonPair{"pageText", T.JString{key(size)}}

def value_size(value: T.Json) -> Maybe<&2, Size>:
  match value:
    case T.JString{text}:
      Some{parse(text)}
    case _:
      None{}

def pair_size(pair: T.JsonPair<T.Json>) -> Maybe<&2, Size>:
  T.JsonPair{name, value} = pair
  value_size(value)

def choose(hit: Bool, pair: T.JsonPair<T.Json>, later: Maybe<&2, Size>) -> Maybe<&2, Size>:
  match hit:
    case True{}:
      pair_size(pair)
    case False{}:
      later

# The first `pageText` member decides, exactly as a JSON object lookup would.
def get(members: List<&2, T.JsonPair<T.Json>>) -> Maybe<&2, Size>:
  match members:
    case Nil{}:
      None{}
    case Con{+pair, rest}:
      choose(is_page_text(pair), pair, get(rest))

def place(hit: Bool, pair: T.JsonPair<T.Json>, size: Size, rest: List<&2, T.JsonPair<T.Json>>, updated: List<&2, T.JsonPair<T.Json>>) -> List<&2, T.JsonPair<T.Json>>:
  match hit:
    case True{}:
      Con{text_pair(size), rest}
    case False{}:
      Con{pair, updated}

# Replace the deciding member in place, or append one. Every other member
# keeps its key, value and position.
def set(members: List<&2, T.JsonPair<T.Json>>, +size: Size) -> List<&2, T.JsonPair<T.Json>>:
  match members:
    case Nil{}:
      Con{text_pair(size), Nil{}}
    case Con{+pair, +rest}:
      place(is_page_text(pair), pair, size, rest, set(rest, size))

def keep(hit: Bool, pair: T.JsonPair<T.Json>, tail: List<&2, T.JsonPair<T.Json>>) -> List<&2, T.JsonPair<T.Json>>:
  match hit:
    case True{}:
      tail
    case False{}:
      Con{pair, tail}

# Everything a write of the member must leave alone.
def others(members: List<&2, T.JsonPair<T.Json>>) -> List<&2, T.JsonPair<T.Json>>:
  match members:
    case Nil{}:
      Nil{}
    case Con{+pair, rest}:
      keep(is_page_text(pair), pair, others(rest))

# The note no longer shown on the page: every `pageText` member goes, the
# duplicates too, and nothing else does.
def clear(members: List<&2, T.JsonPair<T.Json>>) -> List<&2, T.JsonPair<T.Json>>:
  match members:
    case Nil{}:
      Nil{}
    case Con{+pair, rest}:
      keep(is_page_text(pair), pair, clear(rest))

# Host boundary: plain strings in, plain strings out. "" means not shown.
def shown_key(found: Maybe<&2, Size>) -> String:
  match found:
    case None{}:
      ""
    case Some{size}:
      key(size)

def normal(+text: String) -> String:
  key(parse(text))

def stored(members: List<&2, T.JsonPair<T.Json>>) -> String:
  shown_key(get(members))

def show(members: List<&2, T.JsonPair<T.Json>>, +text: String) -> List<&2, T.JsonPair<T.Json>>:
  set(members, parse(text))

def hide(members: List<&2, T.JsonPair<T.Json>>) -> List<&2, T.JsonPair<T.Json>>:
  clear(members)
