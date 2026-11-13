import Base
import ./ink.bend as Ink

# What the annotation list shows, decided here rather than in view code:
# which tab an entry belongs to, which entries a colour filter keeps, and
# where section headings ("Page 3", a chapter title) are placed.
type Entry is Data:
  Entry{id: String, section: String, ink: Ink.Ink, quoted: Bool}

type Row is Data:
  Header{section: String}
  Card{id: String}

def length(entries: List<&2, Entry>) -> Nat:
  match entries:
    case Nil{}:
      0n
    case Con{entry, rest}:
      1n+length(rest)

# Tabs. A passage highlight or annotation is `quoted`; a page note is not.
def annotations(entries: List<&2, Entry>) -> List<&2, Entry>:
  match entries:
    case Nil{}:
      Nil{}
    case Con{Entry{id, section, ink, True{}}, rest}:
      Con{Entry{id, section, ink, True{}}, annotations(rest)}
    case Con{Entry{id, section, ink, False{}}, rest}:
      annotations(rest)

def notes(entries: List<&2, Entry>) -> List<&2, Entry>:
  match entries:
    case Nil{}:
      Nil{}
    case Con{Entry{id, section, ink, True{}}, rest}:
      notes(rest)
    case Con{Entry{id, section, ink, False{}}, rest}:
      Con{Entry{id, section, ink, False{}}, notes(rest)}

# Colour filter. An empty filter is "no filter".
def has(filter: List<&2, Ink.Ink>, +ink: Ink.Ink) -> Bool:
  match filter:
    case Nil{}:
      False{}
    case Con{head, rest}:
      Bool.or(Ink.same(head, ink), has(rest, ink))

def ink_of(entry: Entry) -> Ink.Ink:
  Entry{id, section, ink, quoted} = entry
  ink

def keep(hit: Bool, entry: Entry, tail: List<&2, Entry>) -> List<&2, Entry>:
  match hit:
    case True{}:
      Con{entry, tail}
    case False{}:
      tail

def only(+filter: List<&2, Ink.Ink>, entries: List<&2, Entry>) -> List<&2, Entry>:
  match entries:
    case Nil{}:
      Nil{}
    case Con{+entry, rest}:
      keep(has(filter, ink_of(entry)), entry, only(filter, rest))

def visible(filter: List<&2, Ink.Ink>, entries: List<&2, Entry>) -> List<&2, Entry>:
  match filter:
    case Nil{}:
      entries
    case Con{head, rest}:
      only(Con{head, rest}, entries)

def all_have(+filter: List<&2, Ink.Ink>, entries: List<&2, Entry>) -> Bool:
  match entries:
    case Nil{}:
      True{}
    case Con{entry, rest}:
      Bool.and(has(filter, ink_of(entry)), all_have(filter, rest))

# Section headings. One heading opens the list and one more is placed
# wherever the section changes; cards keep their order.
def lead(changed: Bool, section: String, card: Row, tail: List<&2, Row>) -> List<&2, Row>:
  match changed:
    case True{}:
      Con{Header{section}, Con{card, tail}}
    case False{}:
      Con{card, tail}

def rows_from(entries: List<&2, Entry>, previous: String, first: Bool) -> List<&2, Row>:
  match entries:
    case Nil{}:
      Nil{}
    case Con{Entry{id, +section, ink, quoted}, rest}:
      lead(Bool.or(first, Bool.not(String.eq(section, previous))), section, Card{id}, rows_from(rest, section, False{}))

def rows(entries: List<&2, Entry>) -> List<&2, Row>:
  rows_from(entries, "", True{})

def cards(rows: List<&2, Row>) -> List<&2, String>:
  match rows:
    case Nil{}:
      Nil{}
    case Con{Header{section}, rest}:
      cards(rest)
    case Con{Card{id}, rest}:
      Con{id, cards(rest)}

def ids(entries: List<&2, Entry>) -> List<&2, String>:
  match entries:
    case Nil{}:
      Nil{}
    case Con{Entry{id, section, ink, quoted}, rest}:
      Con{id, ids(rest)}

def opens_with_header(rows: List<&2, Row>) -> Bool:
  match rows:
    case Con{Header{section}, rest}:
      True{}
    case _:
      False{}

# Host boundary: build entries and a filter from plain strings.
def entry(id: String, section: String, +color: String, quoted: Bool) -> Entry:
  Entry{id, section, Ink.parse(color), quoted}

def filter(colors: List<&2, String>) -> List<&2, Ink.Ink>:
  match colors:
    case Nil{}:
      Nil{}
    case Con{+color, rest}:
      Con{Ink.parse(color), filter(rest)}

def flat(entries: List<&2, Entry>) -> List<&2, Row>:
  match entries:
    case Nil{}:
      Nil{}
    case Con{Entry{id, section, ink, quoted}, rest}:
      Con{Card{id}, flat(rest)}

def listing(colors: List<&2, String>, entries: List<&2, Entry>, grouped: Bool) -> List<&2, Row>:
  match grouped:
    case True{}:
      rows(visible(filter(colors), entries))
    case False{}:
      flat(visible(filter(colors), entries))
