import Base
import ./annotation_types.bend as T

# Highlight inks. An annotation stores an ink as one JSON member,
# `"color": "<key>"`. Anything else (absent, misspelt, a non-string) reads as
# the default ink, so legacy annotations need no migration and unknown values
# never fail a load. Writing an ink touches that one member and nothing else.
type Ink is Data:
  Yellow{}
  Orange{}
  Pink{}
  Purple{}
  Blue{}
  Green{}

def key(ink: Ink) -> String:
  match ink:
    case Yellow{}:
      "yellow"
    case Orange{}:
      "orange"
    case Pink{}:
      "pink"
    case Purple{}:
      "purple"
    case Blue{}:
      "blue"
    case Green{}:
      "green"

def parse(+text: String) -> Ink:
  Bool.pick(Ink, String.eq(text, "orange"), Orange{}, Bool.pick(Ink, String.eq(text, "pink"), Pink{}, Bool.pick(Ink, String.eq(text, "purple"), Purple{}, Bool.pick(Ink, String.eq(text, "blue"), Blue{}, Bool.pick(Ink, String.eq(text, "green"), Green{}, Yellow{})))))

# Keyboard shortcuts 1-6 and the swatch order share this numbering.
def index(ink: Ink) -> Nat:
  match ink:
    case Yellow{}:
      1n
    case Orange{}:
      2n
    case Pink{}:
      3n
    case Purple{}:
      4n
    case Blue{}:
      5n
    case Green{}:
      6n

def at(n: Nat) -> Maybe<&2, Ink>:
  match n:
    case 1n:
      Some{Yellow{}}
    case 2n:
      Some{Orange{}}
    case 3n:
      Some{Pink{}}
    case 4n:
      Some{Purple{}}
    case 5n:
      Some{Blue{}}
    case 6n:
      Some{Green{}}
    case _:
      None{}

def same(a: Ink, b: Ink) -> Bool:
  Nat.is_eq(index(a), index(b))

# The stored member.
def is_color(pair: T.JsonPair<T.Json>) -> Bool:
  T.JsonPair{name, value} = pair
  String.eq(name, "color")

def color_pair(ink: Ink) -> T.JsonPair<T.Json>:
  T.JsonPair{"color", T.JString{key(ink)}}

def value_ink(value: T.Json) -> Ink:
  match value:
    case T.JString{text}:
      parse(text)
    case _:
      Yellow{}

def pair_ink(pair: T.JsonPair<T.Json>) -> Ink:
  T.JsonPair{name, value} = pair
  value_ink(value)

def choose(hit: Bool, pair: T.JsonPair<T.Json>, later: Ink) -> Ink:
  match hit:
    case True{}:
      pair_ink(pair)
    case False{}:
      later

# The first `color` member decides, exactly as a JSON object lookup would.
def get(members: List<&2, T.JsonPair<T.Json>>) -> Ink:
  match members:
    case Nil{}:
      Yellow{}
    case Con{+pair, rest}:
      choose(is_color(pair), pair, get(rest))

def place(hit: Bool, pair: T.JsonPair<T.Json>, ink: Ink, rest: List<&2, T.JsonPair<T.Json>>, updated: List<&2, T.JsonPair<T.Json>>) -> List<&2, T.JsonPair<T.Json>>:
  match hit:
    case True{}:
      Con{color_pair(ink), rest}
    case False{}:
      Con{pair, updated}

# Replace the deciding member in place, or append one. Every other member
# keeps its key, value and position.
def set(members: List<&2, T.JsonPair<T.Json>>, +ink: Ink) -> List<&2, T.JsonPair<T.Json>>:
  match members:
    case Nil{}:
      Con{color_pair(ink), Nil{}}
    case Con{+pair, +rest}:
      place(is_color(pair), pair, ink, rest, set(rest, ink))

def keep(hit: Bool, pair: T.JsonPair<T.Json>, tail: List<&2, T.JsonPair<T.Json>>) -> List<&2, T.JsonPair<T.Json>>:
  match hit:
    case True{}:
      tail
    case False{}:
      Con{pair, tail}

# Everything an ink write must leave alone.
def others(members: List<&2, T.JsonPair<T.Json>>) -> List<&2, T.JsonPair<T.Json>>:
  match members:
    case Nil{}:
      Nil{}
    case Con{+pair, rest}:
      keep(is_color(pair), pair, others(rest))

# Host boundary: plain strings and numbers in, plain strings out.
def normal(+text: String) -> String:
  key(parse(text))

def stored(members: List<&2, T.JsonPair<T.Json>>) -> String:
  key(get(members))

def recolor(members: List<&2, T.JsonPair<T.Json>>, +text: String) -> List<&2, T.JsonPair<T.Json>>:
  set(members, parse(text))

def shortcut_key(found: Maybe<&2, Ink>) -> String:
  match found:
    case None{}:
      ""
    case Some{ink}:
      key(ink)

def shortcut(n: Nat) -> String:
  shortcut_key(at(n))
