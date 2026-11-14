import Base

# What the citations panel decides, kept apart from how a PDF is read: which
# entries of a reference list a citation fits, which work a row names, which
# list a citation without a link belongs to, how a list's lines divide into
# entries, and what a reference note is called. Text is compared in
# TypeScript, which gives every normalised string (a label, a surname, a
# year, a DOI, a title, a file) a number: equal numbers, equal strings; 0 is
# "none". So everything here is numbers, truth values and lists.

# ── Fitting ─────────────────────────────────────────────────────────────────
# What an entry of a reference list can be matched by.
type Traits is Data:
  Traits{label: Nat, first: Nat, others: List<&2, Nat>, years: List<&2, Nat>}

type Entry is Data:
  Entry{id: Nat, key: Traits}

# One work a citation means: by its label in brackets, by a bare number that
# only a link makes a citation, or by first author, other authors and year.
type Item is Data:
  ByLabel{label: Nat}
  Bare{label: Nat}
  ByName{first: Nat, others: List<&2, Nat>, year: Nat}

def member(+x: Nat, xs: List<&2, Nat>) -> Bool:
  match xs:
    case Nil{}:
      False{}
    case Con{h, t}:
      Bool.or(Nat.is_eq(h, x), member(x, t))

def some(n: Nat) -> Bool:
  match n:
    case 0n:
      False{}
    case 1n+p:
      True{}

def all_in(xs: List<&2, Nat>, +ys: List<&2, Nat>) -> Bool:
  match xs:
    case Nil{}:
      True{}
    case Con{h, t}:
      Bool.and(member(h, ys), all_in(t, ys))

def fits(item: Item, key: Traits) -> Bool:
  match item key:
    case ByLabel{+label} Traits{own, first, others, years}:
      Bool.and(some(label), Nat.is_eq(own, label))
    case Bare{+label} Traits{own, first, others, years}:
      Bool.and(some(label), Nat.is_eq(own, label))
    case ByName{+name, named, year} Traits{own, +first, others, years}:
      Bool.and(some(name), Bool.and(Nat.is_eq(first, name), Bool.and(all_in(named, Con{first, others}), member(year, years))))

def key_of(entry: Entry) -> Traits:
  Entry{id, key} = entry
  key

def id_of(entry: Entry) -> Nat:
  Entry{id, key} = entry
  id

def keep(hit: Bool, entry: Entry, tail: List<&2, Entry>) -> List<&2, Entry>:
  match hit:
    case True{}:
      Con{entry, tail}
    case False{}:
      tail

def fitting(+item: Item, entries: List<&2, Entry>) -> List<&2, Entry>:
  match entries:
    case Nil{}:
      Nil{}
    case Con{+entry, rest}:
      keep(fits(item, key_of(entry)), entry, fitting(item, rest))

def rejected(+item: Item, entries: List<&2, Entry>) -> List<&2, Entry>:
  match entries:
    case Nil{}:
      Nil{}
    case Con{+entry, rest}:
      keep(Bool.not(fits(item, key_of(entry))), entry, rejected(item, rest))

def all_fit(+item: Item, entries: List<&2, Entry>) -> Bool:
  match entries:
    case Nil{}:
      True{}
    case Con{entry, rest}:
      Bool.and(fits(item, key_of(entry)), all_fit(item, rest))

def none_fit(+item: Item, entries: List<&2, Entry>) -> Bool:
  match entries:
    case Nil{}:
      True{}
    case Con{entry, rest}:
      Bool.and(Bool.not(fits(item, key_of(entry))), none_fit(item, rest))

def count(entries: List<&2, Entry>) -> Nat:
  match entries:
    case Nil{}:
      0n
    case Con{entry, rest}:
      1n+count(rest)

# ── The one rule ────────────────────────────────────────────────────────────
type Verdict is Data:
  Named{entry: Entry}
  Conflict{text: Entry, link: Nat}
  Several{entries: List<&2, Entry>}
  NotFound{}

def found(hit: Bool, entry: Entry, later: Maybe<&2, Entry>) -> Maybe<&2, Entry>:
  match hit:
    case True{}:
      Some{entry}
    case False{}:
      later

# The first entry with this id.
def find(+id: Nat, entries: List<&2, Entry>) -> Maybe<&2, Entry>:
  match entries:
    case Nil{}:
      None{}
    case Con{+entry, rest}:
      found(Nat.is_eq(id_of(entry), id), entry, find(id, rest))

def one_linked(same: Bool, entry: Entry, link: Nat) -> Verdict:
  match same:
    case True{}:
      Named{entry}
    case False{}:
      Conflict{entry, link}

# One entry fits: it is named, unless a link lands on another.
def one(+entry: Entry, link: Maybe<&2, Nat>) -> Verdict:
  match link:
    case None{}:
      Named{entry}
    case Some{+k}:
      one_linked(Nat.is_eq(id_of(entry), k), entry, k)

def several_found(landed: Maybe<&2, Entry>, entries: List<&2, Entry>) -> Verdict:
  match landed:
    case Some{entry}:
      Named{entry}
    case None{}:
      Several{entries}

# Several fit: only a trusted link that lands on one of them picks.
def several(+entries: List<&2, Entry>, link: Maybe<&2, Nat>, trusted: Bool) -> Verdict:
  match link trusted:
    case Some{k} True{}:
      several_found(find(k, entries), entries)
    case Some{k} False{}:
      Several{entries}
    case None{} _:
      Several{entries}

def plain(fit: List<&2, Entry>, link: Maybe<&2, Nat>, trusted: Bool) -> Verdict:
  match fit:
    case Nil{}:
      NotFound{}
    case Con{entry, Nil{}}:
      one(entry, link)
    case Con{entry, Con{next, rest}}:
      several(Con{entry, Con{next, rest}}, link, trusted)

def bare_linked(same: Bool, entry: Entry) -> Verdict:
  match same:
    case True{}:
      Named{entry}
    case False{}:
      NotFound{}

# A bare number is a citation only by its link: it names the entry with its
# label only if the link lands on that entry.
def bare(fit: List<&2, Entry>, link: Maybe<&2, Nat>) -> Verdict:
  match fit link:
    case Con{+entry, Nil{}} Some{k}:
      bare_linked(Nat.is_eq(id_of(entry), k), entry)
    case Con{entry, Nil{}} None{}:
      NotFound{}
    case Con{entry, Con{next, rest}} _:
      NotFound{}
    case Nil{} _:
      NotFound{}

def is_bare(item: Item) -> Bool:
  match item:
    case Bare{label}:
      True{}
    case ByLabel{label}:
      False{}
    case ByName{first, others, year}:
      False{}

def decide_from(alone: Bool, fit: List<&2, Entry>, link: Maybe<&2, Nat>, trusted: Bool) -> Verdict:
  match alone:
    case True{}:
      bare(fit, link)
    case False{}:
      plain(fit, link, trusted)

def decide(+item: Item, entries: List<&2, Entry>, link: Maybe<&2, Nat>, trusted: Bool) -> Verdict:
  decide_from(is_bare(item), fitting(item, entries), link, trusted)

# What a verdict shows fits the item it was given for.
def verdict_fits(+item: Item, verdict: Verdict) -> Bool:
  match verdict:
    case Named{entry}:
      fits(item, key_of(entry))
    case Conflict{entry, link}:
      fits(item, key_of(entry))
    case Several{entries}:
      all_fit(item, entries)
    case NotFound{}:
      True{}

# With a link, whatever is named is the entry the link lands on.
def named_at(link: Nat, verdict: Verdict) -> Bool:
  match verdict:
    case Named{entry}:
      Nat.is_eq(id_of(entry), link)
    case Conflict{entry, other}:
      True{}
    case Several{entries}:
      True{}
    case NotFound{}:
      True{}

# ── Whether a page's links may decide ───────────────────────────────────────
def trusted(agree: Nat, disagree: Nat) -> Bool:
  match agree disagree:
    case 2n+more 0n:
      True{}
    case 2n+more 1n+against:
      False{}
    case 1n 0n:
      False{}
    case 1n 1n+against:
      False{}
    case 0n _:
      False{}

# ── Which list a citation without a link belongs to ─────────────────────────
type Span is Data:
  Span{start: Nat, end: Nat}

def choose(passes: Bool, after: Bool, span: Span, later: Maybe<&2, Span>) -> Maybe<&2, Span>:
  match passes after:
    case True{} _:
      later
    case False{} True{}:
      Some{span}
    case False{} False{}:
      None{}

# `before` is where the list before ended.
def walk(lists: List<&2, Span>, +page: Nat, before: Nat) -> Maybe<&2, Span>:
  match lists:
    case Nil{}:
      None{}
    case Con{Span{+start, +end}, rest}:
      choose(Nat.is_lt(start, page), Nat.is_gt(page, before), Span{start, end}, walk(rest, page, end))

def list_for(page: Nat, lists: List<&2, Span>) -> Maybe<&2, Span>:
  match lists:
    case Nil{}:
      None{}
    case Con{only, Nil{}}:
      Some{only}
    case Con{first, Con{second, rest}}:
      walk(Con{first, Con{second, rest}}, page, 0n)

def begins_after(+page: Nat, chosen: Maybe<&2, Span>) -> Bool:
  match chosen:
    case None{}:
      True{}
    case Some{Span{start, end}}:
      Nat.is_ge(start, page)

def candidate(after: Bool, span: Span) -> Maybe<&2, Span>:
  match after:
    case True{}:
      Some{span}
    case False{}:
      None{}

# What a label or a name comes to without a link.
def alone(fit: List<&2, Entry>) -> Verdict:
  match fit:
    case Nil{}:
      NotFound{}
    case Con{entry, Nil{}}:
      Named{entry}
    case Con{entry, Con{next, rest}}:
      Several{Con{entry, Con{next, rest}}}

# ── Dividing a list's lines into entries ────────────────────────────────────
# A line either begins an entry or continues what is before it. The lines
# before the first beginning are the lead: they belong to no entry.
type Line is Data:
  Line{start: Bool, id: Nat}

type Split is Data:
  Split{lead: List<&2, Line>, entries: List<&2, List<&2, Line>>}

def place(start: Bool, id: Nat, later: Split) -> Split:
  match start later:
    case True{} Split{lead, entries}:
      Split{Nil{}, Con{Con{Line{True{}, id}, lead}, entries}}
    case False{} Split{lead, entries}:
      Split{Con{Line{False{}, id}, lead}, entries}

def split(lines: List<&2, Line>) -> Split:
  match lines:
    case Nil{}:
      Split{Nil{}, Nil{}}
    case Con{Line{start, id}, rest}:
      place(start, id, split(rest))

def lines_append(xs: List<&2, Line>, ys: List<&2, Line>) -> List<&2, Line>:
  match xs:
    case Nil{}:
      ys
    case Con{h, t}:
      Con{h, lines_append(t, ys)}

def lines_concat(entries: List<&2, List<&2, Line>>) -> List<&2, Line>:
  match entries:
    case Nil{}:
      Nil{}
    case Con{entry, rest}:
      lines_append(entry, lines_concat(rest))

# The lines of a division, in order: its lead, then each entry.
def joined(parts: Split) -> List<&2, Line>:
  Split{lead, entries} = parts
  lines_append(lead, lines_concat(entries))

def no_starts(lines: List<&2, Line>) -> Bool:
  match lines:
    case Nil{}:
      True{}
    case Con{Line{start, id}, rest}:
      Bool.and(Bool.not(start), no_starts(rest))

# An entry begins with a beginning line and holds no other.
def entry_ok(entry: List<&2, Line>) -> Bool:
  match entry:
    case Nil{}:
      False{}
    case Con{Line{start, id}, rest}:
      Bool.and(start, no_starts(rest))

def entries_ok(entries: List<&2, List<&2, Line>>) -> Bool:
  match entries:
    case Nil{}:
      True{}
    case Con{entry, rest}:
      Bool.and(entry_ok(entry), entries_ok(rest))

def well_divided(parts: Split) -> Bool:
  Split{lead, entries} = parts
  Bool.and(no_starts(lead), entries_ok(entries))

# ── The sources a reference note says it is cited by ────────────────────────
def append(xs: List<&2, Nat>, ys: List<&2, Nat>) -> List<&2, Nat>:
  match xs:
    case Nil{}:
      ys
    case Con{h, t}:
      Con{h, append(t, ys)}

# What adding a source adds: nothing if it is there, else the source.
def added(present: Bool, source: Nat) -> List<&2, Nat>:
  match present:
    case True{}:
      Nil{}
    case False{}:
      [source]

def add_checked(present: Bool, source: Nat, list: List<&2, Nat>) -> List<&2, Nat>:
  match present:
    case True{}:
      list
    case False{}:
      append(list, [source])

def add_source(+source: Nat, +list: List<&2, Nat>) -> List<&2, Nat>:
  add_checked(member(source, list), source, list)

# ── Whether a note is the note of a cited work ──────────────────────────────
# `cut` marks a DOI that may be incomplete; `long` a title long enough to
# tell works apart.
type Work is Data:
  Work{doi: Nat, cut: Bool, title: Nat, long: Bool, year: Nat, first: Nat}

def both(+a: Nat, b: Nat) -> Bool:
  Bool.and(some(a), Nat.is_eq(a, b))

def by_doi(a: Work, b: Work) -> Bool:
  match a b:
    case Work{doi, cut, title, long, year, first} Work{doi2, cut2, title2, long2, year2, first2}:
      Bool.and(Bool.not(cut), Bool.and(Bool.not(cut2), both(doi, doi2)))

def by_all(a: Work, b: Work) -> Bool:
  match a b:
    case Work{doi, cut, title, long, year, first} Work{doi2, cut2, title2, long2, year2, first2}:
      Bool.and(long, Bool.and(long2, Bool.and(both(title, title2), Bool.and(both(year, year2), both(first, first2)))))

def same_work(+a: Work, +b: Work) -> Bool:
  Bool.or(by_doi(a, b), by_all(a, b))

# ── Ranges ──────────────────────────────────────────────────────────────────
# `n` numbers going up by one from `a`.
def count_up(n: Nat, +a: Nat) -> List<&2, Nat>:
  match n:
    case 0n:
      Nil{}
    case 1n+p:
      Con{a, count_up(p, 1n+a)}

def within(ok: Bool, numbers: List<&2, Nat>) -> List<&2, Nat>:
  match ok:
    case True{}:
      numbers
    case False{}:
      Nil{}

# The numbers a…b, when a is not after b and the range is no wider than 50.
def expand(+a: Nat, +b: Nat) -> List<&2, Nat>:
  within(Bool.and(Nat.is_le(a, b), Nat.is_le(Nat.sub(b, a), 50n)), count_up(1n+Nat.sub(b, a), a))

def length(xs: List<&2, Nat>) -> Nat:
  match xs:
    case Nil{}:
      0n
    case Con{h, t}:
      1n+length(t)

def ascending_from(xs: List<&2, Nat>, +a: Nat) -> Bool:
  match xs:
    case Nil{}:
      True{}
    case Con{h, t}:
      Bool.and(Nat.is_eq(h, a), ascending_from(t, 1n+a))

def starts(lines: List<&2, Line>) -> Nat:
  match lines:
    case Nil{}:
      0n
    case Con{Line{True{}, id}, rest}:
      1n+starts(rest)
    case Con{Line{False{}, id}, rest}:
      starts(rest)

def entry_count(parts: Split) -> Nat:
  Split{lead, entries} = parts
  List.length(&2, List<&2, Line>, entries)

# ── The inside of one bracket ───────────────────────────────────────────────
# TypeScript finds a bracket and cuts what is inside it into tokens: a
# number, a letter label, a dash, a separator, or anything else.
type Token is Data:
  Num{n: Nat}
  Lab{n: Nat}
  Dash{}
  Sep{}
  Bad{}

type Piece is Data:
  One{n: Nat}
  Label{n: Nat}
  Range{from: Nat, to: Nat}

# What was read: at least one piece.
type Parsed is Data:
  Parsed{first: Piece, rest: List<&2, Piece>}

# Where the reading is: before a piece, after one, or after a number's dash.
type State is Data:
  Want{}
  Got{piece: Piece}
  Open{from: Nat}

def add(piece: Piece, later: Maybe<&2, Parsed>) -> Maybe<&2, Parsed>:
  match later:
    case None{}:
      None{}
    case Some{Parsed{first, rest}}:
      Some{Parsed{piece, Con{first, rest}}}

# piece (separator piece)*, where a piece is a number, a label, or two
# numbers with a dash between. Anything else refuses the whole.
def go(tokens: List<&2, Token>, state: State) -> Maybe<&2, Parsed>:
  match tokens state:
    case Nil{} Got{piece}:
      Some{Parsed{piece, Nil{}}}
    case Con{Num{n}, rest} Want{}:
      go(rest, Got{One{n}})
    case Con{Lab{n}, rest} Want{}:
      go(rest, Got{Label{n}})
    case Con{Sep{}, rest} Got{piece}:
      add(piece, go(rest, Want{}))
    case Con{Dash{}, rest} Got{One{from}}:
      go(rest, Open{from})
    case Con{Num{to}, rest} Open{from}:
      go(rest, Got{Range{from, to}})
    case _ _:
      None{}

def parse(tokens: List<&2, Token>) -> Maybe<&2, Parsed>:
  go(tokens, Want{})

def show_onto(piece: Piece, tail: List<&2, Token>) -> List<&2, Token>:
  match piece:
    case One{n}:
      Con{Num{n}, tail}
    case Label{n}:
      Con{Lab{n}, tail}
    case Range{from, to}:
      Con{Num{from}, Con{Dash{}, Con{Num{to}, tail}}}

def after(rest: List<&2, Piece>) -> List<&2, Token>:
  match rest:
    case Nil{}:
      Nil{}
    case Con{piece, more}:
      Con{Sep{}, show_onto(piece, after(more))}

# The tokens that pieces are written as.
def unparse(first: Piece, rest: List<&2, Piece>) -> List<&2, Token>:
  show_onto(first, after(rest))

def shown(parsed: Maybe<&2, Parsed>) -> Maybe<&2, List<&2, Token>>:
  match parsed:
    case None{}:
      None{}
    case Some{Parsed{first, rest}}:
      Some{unparse(first, rest)}

def kept(parsed: Maybe<&2, Parsed>, tokens: List<&2, Token>) -> Maybe<&2, List<&2, Token>>:
  match parsed:
    case None{}:
      None{}
    case Some{read}:
      Some{tokens}

def filled(numbers: List<&2, Nat>) -> Maybe<&2, List<&2, Nat>>:
  match numbers:
    case Nil{}:
      None{}
    case Con{h, t}:
      Some{Con{h, t}}

def labels_of(piece: Piece) -> Maybe<&2, List<&2, Nat>>:
  match piece:
    case One{n}:
      Some{[n]}
    case Label{n}:
      Some{[n]}
    case Range{+from, +to}:
      filled(expand(from, to))

def labels_join(here: Maybe<&2, List<&2, Nat>>, later: Maybe<&2, List<&2, Nat>>) -> Maybe<&2, List<&2, Nat>>:
  match here later:
    case Some{xs} Some{ys}:
      Some{append(xs, ys)}
    case _ _:
      None{}

def labels(rest: List<&2, Piece>, first: Piece) -> Maybe<&2, List<&2, Nat>>:
  match rest:
    case Nil{}:
      labels_of(first)
    case Con{next, more}:
      labels_join(labels_of(first), labels(more, next))

def items_of(parsed: Maybe<&2, Parsed>) -> Maybe<&2, List<&2, Nat>>:
  match parsed:
    case None{}:
      None{}
    case Some{Parsed{first, rest}}:
      labels(rest, first)

# The labels one bracket cites, ranges expanded, or a refusal of the whole.
def items(tokens: List<&2, Token>) -> Maybe<&2, List<&2, Nat>>:
  items_of(parse(tokens))

# ── What a numbered list's labels say ───────────────────────────────────────
type Seq is Data:
  Complete{}
  Missing{numbers: List<&2, Nat>}
  Wrong{}

# From one label to the next: up by one, over some numbers, or not up at all.
type Gap is Data:
  Step{}
  Skip{missing: List<&2, Nat>}
  Back{}

def gap_of(order: Cmp, +prev: Nat, next: Nat) -> Gap:
  match order:
    case EQ{}:
      Step{}
    case GT{}:
      Skip{count_up(Nat.sub(next, 1n+prev), 1n+prev)}
    case LT{}:
      Back{}

def gap(+prev: Nat, +next: Nat) -> Gap:
  gap_of(Nat.cmp(next, 1n+prev), prev, next)

def skip_onto(missing: List<&2, Nat>, later: Seq) -> Seq:
  match later:
    case Complete{}:
      Missing{missing}
    case Missing{more}:
      Missing{append(missing, more)}
    case Wrong{}:
      Wrong{}

def join_seq(here: Gap, later: Seq) -> Seq:
  match here:
    case Back{}:
      Wrong{}
    case Step{}:
      later
    case Skip{missing}:
      skip_onto(missing, later)

def from(rest: List<&2, Nat>, +prev: Nat) -> Seq:
  match rest:
    case Nil{}:
      Complete{}
    case Con{+next, more}:
      join_seq(gap(prev, next), from(more, next))

def sequence(labels: List<&2, Nat>) -> Seq:
  match labels:
    case Nil{}:
      Complete{}
    case Con{first, rest}:
      from(rest, first)

# ── The works of a page, in the order of their first citations ──────────────
type Row is Data:
  Row{id: Nat, count: Nat}

def counted(hit: Bool, count: Nat) -> Nat:
  match hit:
    case True{}:
      count
    case False{}:
      0n

# How often rows with this id have been counted.
def tally(+id: Nat, rows: List<&2, Row>) -> Nat:
  match rows:
    case Nil{}:
      0n
    case Con{Row{own, count}, rest}:
      Nat.add(counted(Nat.is_eq(own, id), count), tally(id, rest))

def drop_row(hit: Bool, row: Row, tail: List<&2, Row>) -> List<&2, Row>:
  match hit:
    case True{}:
      tail
    case False{}:
      Con{row, tail}

def without(+id: Nat, rows: List<&2, Row>) -> List<&2, Row>:
  match rows:
    case Nil{}:
      Nil{}
    case Con{Row{+own, count}, rest}:
      drop_row(Nat.is_eq(own, id), Row{own, count}, without(id, rest))

# One more citation of a work: its row goes first, with what it had counted.
def bump(+id: Nat, +rows: List<&2, Row>) -> List<&2, Row>:
  Con{Row{id, 1n+tally(id, rows)}, without(id, rows)}

def works(ids: List<&2, Nat>) -> List<&2, Row>:
  match ids:
    case Nil{}:
      Nil{}
    case Con{+id, rest}:
      bump(id, works(rest))

def row_ids(rows: List<&2, Row>) -> List<&2, Nat>:
  match rows:
    case Nil{}:
      Nil{}
    case Con{Row{id, count}, rest}:
      Con{id, row_ids(rest)}

def total(rows: List<&2, Row>) -> Nat:
  match rows:
    case Nil{}:
      0n
    case Con{Row{id, count}, rest}:
      Nat.add(count, total(rest))

def distinct(xs: List<&2, Nat>) -> Bool:
  match xs:
    case Nil{}:
      True{}
    case Con{+h, +t}:
      Bool.and(Bool.not(member(h, t)), distinct(t))

def drop_one(hit: Bool, x: Nat, tail: List<&2, Nat>) -> List<&2, Nat>:
  match hit:
    case True{}:
      tail
    case False{}:
      Con{x, tail}

def drop_all(+id: Nat, xs: List<&2, Nat>) -> List<&2, Nat>:
  match xs:
    case Nil{}:
      Nil{}
    case Con{+h, t}:
      drop_one(Nat.is_eq(h, id), h, drop_all(id, t))

# Each id once, where it first appears: the first, then the firsts of the
# rest without it.
def firsts(ids: List<&2, Nat>) -> List<&2, Nat>:
  match ids:
    case Nil{}:
      Nil{}
    case Con{+id, rest}:
      Con{id, drop_all(id, firsts(rest))}

def occurrences(+id: Nat, ids: List<&2, Nat>) -> Nat:
  match ids:
    case Nil{}:
      0n
    case Con{h, t}:
      Nat.add(counted(Nat.is_eq(h, id), 1n), occurrences(id, t))

# ── A reference note's name ─────────────────────────────────────────────────
# A name is made of the words it is given so that every system the vault may
# be on can hold it as a file, and Obsidian can link to it.
def is_control(c: Char) -> Bool:
  match c:
    case Chr{+x}:
      Bool.or(U32.is_lt(x, 32), U32.is_eq(x, 127))

# What a file name or a link cannot hold: \ / : * ? " < > | # ^ [ ] and
# control characters.
def forbidden(+c: Char) -> Bool:
  Bool.or(is_control(c), Bool.or(Char.is_eq(c, '\\'), Bool.or(Char.is_eq(c, '/'), Bool.or(Char.is_eq(c, ':'), Bool.or(Char.is_eq(c, '*'), Bool.or(Char.is_eq(c, '?'), Bool.or(Char.is_eq(c, '"'), Bool.or(Char.is_eq(c, '<'), Bool.or(Char.is_eq(c, '>'), Bool.or(Char.is_eq(c, '|'), Bool.or(Char.is_eq(c, '#'), Bool.or(Char.is_eq(c, '^'), Bool.or(Char.is_eq(c, '['), Char.is_eq(c, ']'))))))))))))))

def allowed(+c: Char) -> Bool:
  Bool.not(forbidden(c))

def all_allowed(text: String) -> Bool:
  match text:
    case SNil{}:
      True{}
    case SCon{c, rest}:
      Bool.and(allowed(c), all_allowed(rest))

def none_allowed(text: String) -> Bool:
  match text:
    case SNil{}:
      True{}
    case SCon{c, rest}:
      Bool.and(forbidden(c), none_allowed(rest))

# A space or a full stop: what a name may neither begin nor end with.
def edge(+c: Char) -> Bool:
  Bool.or(Char.is_eq(c, ' '), Char.is_eq(c, '.'))

def clean(+c: Char) -> Char:
  Bool.pick(Char, forbidden(c), ' ', c)

def cleaned(text: String) -> String:
  match text:
    case SNil{}:
      SNil{}
    case SCon{c, rest}:
      SCon{clean(c), cleaned(rest)}

def leads_space(text: String) -> Bool:
  match text:
    case SNil{}:
      False{}
    case SCon{c, rest}:
      Char.is_eq(c, ' ')

def squeeze_put(drop: Bool, c: Char, tail: String) -> String:
  match drop:
    case True{}:
      tail
    case False{}:
      SCon{c, tail}

def squeeze_step(+c: Char, +tail: String) -> String:
  squeeze_put(Bool.and(Char.is_eq(c, ' '), leads_space(tail)), c, tail)

# Runs of spaces become one space.
def squeezed(text: String) -> String:
  match text:
    case SNil{}:
      SNil{}
    case SCon{c, rest}:
      squeeze_step(c, squeezed(rest))

def lstrip_pick(strip: Bool, c: Char, rest: String, stripped: String) -> String:
  match strip:
    case True{}:
      stripped
    case False{}:
      SCon{c, rest}

def lstrip(text: String) -> String:
  match text:
    case SNil{}:
      SNil{}
    case SCon{+c, +rest}:
      lstrip_pick(edge(c), c, rest, lstrip(rest))

def width_of(one: Bool, two: Bool, three: Bool) -> Nat:
  match one two three:
    case True{} _ _:
      1n
    case False{} True{} _:
      2n
    case False{} False{} True{}:
      3n
    case False{} False{} False{}:
      4n

# How many bytes a character takes in a file name (UTF-8).
def width(c: Char) -> Nat:
  match c:
    case Chr{+x}:
      width_of(U32.is_lt(x, 128), U32.is_lt(x, 2048), U32.is_lt(x, 65536))

def bytes(text: String) -> Nat:
  match text:
    case SNil{}:
      0n
    case SCon{c, rest}:
      Nat.add(width(c), bytes(rest))

def take_put(ok: Bool, c: Char, tail: String) -> String:
  match ok:
    case True{}:
      SCon{c, tail}
    case False{}:
      SNil{}

# As many whole characters from the start as the budget of bytes holds.
def take(text: String, +budget: Nat) -> String:
  match text:
    case SNil{}:
      SNil{}
    case SCon{+c, rest}:
      take_put(Nat.is_le(width(c), budget), c, take(rest, Nat.sub(budget, width(c))))

def rstrip_end(strip: Bool, c: Char) -> String:
  match strip:
    case True{}:
      SNil{}
    case False{}:
      SCon{c, SNil{}}

def rstrip_put(+c: Char, tail: String) -> String:
  match tail:
    case SNil{}:
      rstrip_end(edge(c), c)
    case SCon{d, more}:
      SCon{c, SCon{d, more}}

def rstrip(text: String) -> String:
  match text:
    case SNil{}:
      SNil{}
    case SCon{c, rest}:
      rstrip_put(c, rstrip(rest))

def long_step(dot: Bool, later: Bool) -> Bool:
  match dot:
    case True{}:
      False{}
    case False{}:
      later

# Whether at least `need` characters come before the first full stop. Names
# that systems keep for devices (CON, NUL, COM1 …) are shorter than five.
def long(text: String, need: Nat) -> Bool:
  match text need:
    case SNil{} 0n:
      True{}
    case SNil{} 1n+p:
      False{}
    case SCon{c, rest} 0n:
      True{}
    case SCon{c, rest} 1n+p:
      long_step(Char.is_eq(c, '.'), long(rest, p))

def prefixed(text: String) -> String:
  match text:
    case SNil{}:
      "Reference"
    case SCon{c, rest}:
      String.append("Reference ", SCon{c, rest})

def final(enough: Bool, text: String) -> String:
  match enough:
    case True{}:
      text
    case False{}:
      prefixed(text)

def named(+text: String) -> String:
  final(long(text, 5n), text)

def starts_ok(text: String) -> Bool:
  match text:
    case SNil{}:
      True{}
    case SCon{c, rest}:
      Bool.not(edge(c))

def ends_ok(text: String) -> Bool:
  match text:
    case SNil{}:
      True{}
    case SCon{c, SNil{}}:
      Bool.not(edge(c))
    case SCon{c, SCon{d, more}}:
      ends_ok(SCon{d, more})

def name(text: String) -> String:
  named(rstrip(take(lstrip(squeezed(cleaned(text))), 170n)))
