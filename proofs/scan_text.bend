import Base
import ./area.bend as Area

# The words a recogniser reads on a scanned page, before they are written into
# a searchable copy of the PDF. A recogniser is not believed as it stands: it
# may box a speck of dust, give corners in any order or past the page's edge,
# and read again what the page already has as text. The rules for what is kept
# live here rather than in the view code:
#   - a word is kept only if the recogniser is at least `floor` sure of it and
#     its box, held on the page, has some extent each way;
#   - a word that lies on text the page already has is left out, so nothing is
#     in the copy twice;
#   - each word is judged on its own, and the words kept stay in their order.
# Positions are the page units of `area.bend` (the reader uses 10000 each way).

# What a recogniser says of one word: which of its words it is, how sure it is
# of it (0 to 100), and two opposite corners of its box.
type Seen is Data:
  Seen{index: Nat, sure: Nat, ax: Nat, ay: Nat, bx: Nat, by: Nat}

# A word that is kept: which word, how sure, and where it is on its page.
type Kept is Data:
  Kept{index: Nat, sure: Nat, area: Area.Area}

def keep(index: Nat, sure: Nat, believed: Bool, found: Maybe<&2, Area.Area>, rest: List<&2, Kept>) -> List<&2, Kept>:
  match believed found:
    case True{} Some{area}:
      Con{Kept{index, sure, area}, rest}
    case True{} None{}:
      rest
    case False{} found:
      rest

# The words of `seen` that are believed and have a box on page `page` (pages
# count from 1), in their order.
def sift(+full: Nat, +floor: Nat, +page: Nat, seen: List<&2, Seen>) -> List<&2, Kept>:
  match seen:
    case Nil{}:
      Nil{}
    case Con{Seen{index, +sure, ax, ay, bx, by}, rest}:
      keep(index, sure, Nat.is_ge(sure, floor), Area.fit(full, 1n, page, ax, ay, bx, by), sift(full, floor, page, rest))

# What every kept word satisfies: the recogniser was sure enough of it, and its
# box may be drawn (`Area.valid`: on a page, some extent, nothing past the edge).
def sound(+full: Nat, +floor: Nat, words: List<&2, Kept>) -> Bool:
  match words:
    case Nil{}:
      True{}
    case Con{Kept{index, sure, +area}, rest}:
      Bool.and(Nat.is_ge(sure, floor), Bool.and(Area.valid(full, area), sound(full, floor, rest)))

# At most `most` words, the first ones: a page of print has hundreds of words,
# not hundreds of thousands, whatever a recogniser says.
def first(most: Nat, words: List<&2, Kept>) -> List<&2, Kept>:
  match most words:
    case 0n words:
      Nil{}
    case 1n+less Nil{}:
      Nil{}
    case 1n+less Con{word, rest}:
      Con{word, first(less, rest)}

def count(words: List<&2, Kept>) -> Nat:
  match words:
    case Nil{}:
      0n
    case Con{word, rest}:
      1n+count(rest)

# ── Text the page already has ───────────────────────────────────────────────
def twice(+n: Nat) -> Nat:
  Nat.add(n, n)

# Whether the middle of `span` lies within `over`, ends included. Everything
# is doubled, so no middle has to be halved.
def amid(over: Area.Span, span: Area.Span) -> Bool:
  match over span:
    case Area.Span{+from, reach} Area.Span{+start, +size}:
      Bool.and(Nat.is_ge(Nat.add(twice(start), size), twice(from)), Nat.is_ge(twice(Nat.add(from, reach)), Nat.add(twice(start), size)))

# Whether the middle of `word` lies on `box`.
def covers(box: Area.Area, word: Area.Area) -> Bool:
  match box word:
    case Area.Area{on, bx, by, bw, bh} Area.Area{page, x, y, w, h}:
      Bool.and(amid(Area.Span{bx, bw}, Area.Span{x, w}), amid(Area.Span{by, bh}, Area.Span{y, h}))

# Whether a word lies on none of the boxes of text the page already has.
def clear(boxes: List<&2, Area.Area>, +word: Area.Area) -> Bool:
  match boxes:
    case Nil{}:
      True{}
    case Con{box, rest}:
      Bool.and(Bool.not(covers(box, word)), clear(rest, word))

def held(ok: Bool, word: Kept, rest: List<&2, Kept>) -> List<&2, Kept>:
  match ok:
    case True{}:
      Con{word, rest}
    case False{}:
      rest

# The words that lie on none of `boxes`, in their order.
def apart(+boxes: List<&2, Area.Area>, words: List<&2, Kept>) -> List<&2, Kept>:
  match words:
    case Nil{}:
      Nil{}
    case Con{Kept{index, sure, +area}, rest}:
      held(clear(boxes, area), Kept{index, sure, area}, apart(boxes, rest))

def all_clear(+boxes: List<&2, Area.Area>, words: List<&2, Kept>) -> Bool:
  match words:
    case Nil{}:
      True{}
    case Con{Kept{index, sure, area}, rest}:
      Bool.and(clear(boxes, area), all_clear(boxes, rest))
