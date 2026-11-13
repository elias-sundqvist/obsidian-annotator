import Base

# How far through a book the reader is. A book is its chapters, each so many
# characters long; a place is a chapter and how far into it. The line at the
# foot of the page shows the place as a share of the whole book, and a share
# written down elsewhere (the note's progress) is turned back into a place.
# The two must agree, whatever the chapters are.
type Place is Data:
  Place{chapter: Nat, offset: Nat}

def total(lengths: List<&2, Nat>) -> Nat:
  match lengths:
    case Nil{}:
      0n
    case Con{length, rest}:
      Nat.add(length, total(rest))

# The characters that come before a place: every earlier chapter, and as far
# into this one as the place says (never past its end).
def before(lengths: List<&2, Nat>, place: Place) -> Nat:
  match lengths place:
    case Nil{} place:
      0n
    case Con{length, rest} Place{0n, offset}:
      Nat.min(offset, length)
    case Con{length, rest} Place{1n+chapter, offset}:
      Nat.add(length, before(rest, Place{chapter, offset}))

def later(place: Place) -> Place:
  Place{chapter, offset} = place
  Place{1n+chapter, offset}

def pick(far: Bool, on: Place, here: Place) -> Place:
  match far:
    case True{}:
      on
    case False{}:
      here

# The place of the character `at` characters into the book. A character past
# the end is the end of the last chapter; a chapter's first character belongs
# to that chapter, not to the end of the one before.
def place(lengths: List<&2, Nat>, +at: Nat) -> Place:
  match lengths:
    case Nil{}:
      Place{0n, 0n}
    case Con{length, Nil{}}:
      Place{0n, Nat.min(at, length)}
    case Con{+length, Con{next, more}}:
      pick(Nat.is_ge(at, length), later(place(Con{next, more}, Nat.sub(at, length))), Place{0n, at})

# Whether a place is a place in this book: a chapter the book has, and no
# further into it than the chapter is long.
def real(lengths: List<&2, Nat>, place: Place) -> Bool:
  match lengths place:
    case Nil{} place:
      False{}
    case Con{length, rest} Place{0n, offset}:
      Nat.is_ge(length, offset)
    case Con{length, rest} Place{1n+chapter, offset}:
      real(rest, Place{chapter, offset})
