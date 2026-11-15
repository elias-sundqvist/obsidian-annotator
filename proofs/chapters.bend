import Base

# How the pieces of a book are gathered into chapters.
#
# A book that brings no chapters of its own (a FictionBook: one file of nested
# sections) is read, in its own order, as a row of pieces. A piece either
# opens a chapter (the text of a section that is a chapter), or waits (a
# heading with no text under it yet: it belongs with the chapter that
# follows), or follows (words set after a section inside a larger one: they
# belong with the chapter before them, unless a heading is already waiting,
# in which case they wait behind it). A heading with no chapter after it
# closes the last chapter.
#
# What is gathered is correct by its shape: a chapter is exactly one opening
# piece with the quiet pieces around it, so no chapter is only headings and
# every chapter has the one place its opening piece has. A book in which
# nothing opens is its pieces, loose. The law (LAWS.bend) says the rest:
# spread out again, the chapters are the row of pieces as it was, each piece
# once and in its place.
type Piece is Data:
  Opens{id: Nat}
  Waits{id: Nat}
  Follows{id: Nat}

# A piece that opens nothing.
type Quiet is Data:
  Waiting{id: Nat}
  Following{id: Nat}

type Chapter is Data:
  Chapter{lead: List<&2, Quiet>, open: Nat, tail: List<&2, Quiet>}

type Gathered is Data:
  Chapters{list: List<&2, Chapter>}
  Loose{pieces: List<&2, Quiet>}

# What has been read of the row from its end: the pieces that follow whatever
# comes before them, the pieces after those that wait for the next chapter,
# and the chapters from there on.
type Scan is Data:
  Scan{follows: List<&2, Quiet>, waits: List<&2, Quiet>, done: List<&2, Chapter>}

def add(xs: List<&2, Quiet>, ys: List<&2, Quiet>) -> List<&2, Quiet>:
  match xs:
    case Nil{}:
      ys
    case Con{head, rest}:
      Con{head, add(rest, ys)}

def join(xs: List<&2, Piece>, ys: List<&2, Piece>) -> List<&2, Piece>:
  match xs:
    case Nil{}:
      ys
    case Con{head, rest}:
      Con{head, join(rest, ys)}

def piece(quiet: Quiet) -> Piece:
  match quiet:
    case Waiting{id}:
      Waits{id}
    case Following{id}:
      Follows{id}

def pieces(quiets: List<&2, Quiet>) -> List<&2, Piece>:
  match quiets:
    case Nil{}:
      Nil{}
    case Con{head, rest}:
      Con{piece(head), pieces(rest)}

# An opening piece met before the chapters already found: it takes the pieces
# that follow it; the pieces waiting go to the chapter after it, or stay with
# it when there is none.
def opened(id: Nat, follows: List<&2, Quiet>, waits: List<&2, Quiet>, done: List<&2, Chapter>) -> Scan:
  match done:
    case Nil{}:
      Scan{Nil{}, Nil{}, Con{Chapter{Nil{}, id, add(follows, waits)}, Nil{}}}
    case Con{Chapter{lead, open, tail}, more}:
      Scan{Nil{}, Nil{}, Con{Chapter{Nil{}, id, follows}, Con{Chapter{add(waits, lead), open, tail}, more}}}

def step(piece: Piece, scan: Scan) -> Scan:
  match piece scan:
    case Opens{id} Scan{follows, waits, done}:
      opened(id, follows, waits, done)
    case Waits{id} Scan{follows, waits, done}:
      Scan{Nil{}, Con{Waiting{id}, add(follows, waits)}, done}
    case Follows{id} Scan{follows, waits, done}:
      Scan{Con{Following{id}, follows}, waits, done}

# The row read onto what has been read of the rows after it. A long book is
# read a stretch at a time, last stretch first (LAWS.bend: that is the same as
# reading it whole).
def scan_onto(row: List<&2, Piece>, start: Scan) -> Scan:
  match row:
    case Nil{}:
      start
    case Con{head, rest}:
      step(head, scan_onto(rest, start))

def scan(row: List<&2, Piece>) -> Scan:
  scan_onto(row, Scan{Nil{}, Nil{}, Nil{}})

# The pieces before the first opening piece belong to the first chapter.
def finish(scan: Scan) -> Gathered:
  match scan:
    case Scan{follows, waits, Nil{}}:
      Loose{add(follows, waits)}
    case Scan{follows, waits, Con{Chapter{lead, open, tail}, more}}:
      Chapters{Con{Chapter{add(follows, add(waits, lead)), open, tail}, more}}

def gather(row: List<&2, Piece>) -> Gathered:
  finish(scan(row))

# The chapters spread out again into a row of pieces.
def flat(chapters: List<&2, Chapter>) -> List<&2, Piece>:
  match chapters:
    case Nil{}:
      Nil{}
    case Con{Chapter{lead, open, tail}, more}:
      join(pieces(lead), Con{Opens{open}, join(pieces(tail), flat(more))})

def spread(gathered: Gathered) -> List<&2, Piece>:
  match gathered:
    case Chapters{list}:
      flat(list)
    case Loose{quiets}:
      pieces(quiets)

# How many pieces of a row open a chapter, and how many chapters were gathered.
def opens(row: List<&2, Piece>) -> Nat:
  match row:
    case Nil{}:
      0n
    case Con{Opens{id}, rest}:
      1n+opens(rest)
    case Con{Waits{id}, rest}:
      opens(rest)
    case Con{Follows{id}, rest}:
      opens(rest)

def count(gathered: Gathered) -> Nat:
  match gathered:
    case Chapters{list}:
      List.length(&2, Chapter, list)
    case Loose{quiets}:
      0n
