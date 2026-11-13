import Base

# A region marked on a page: a figure, a table, an equation. Each direction of
# the page is measured in whole units from 0 to `full` (the reader uses 10000,
# hundredths of a percent), so a region means the same at every zoom. One
# direction of a region is a `Span`: where it starts and how far it runs.
#
# The rules live here rather than in the view code: the two ends of a drag may
# come in either order and from outside the page; a region never leaves the
# page, however it is dragged, moved or resized; and a region too small to
# mean anything is no region.
type Span is Data:
  Span{start: Nat, size: Nat}

type Area is Data:
  Area{page: Nat, x: Nat, y: Nat, w: Nat, h: Nat}

def start(span: Span) -> Nat:
  Span{start, size} = span
  start

def size(span: Span) -> Nat:
  Span{start, size} = span
  size

# Where the span ends.
def far(span: Span) -> Nat:
  Span{start, size} = span
  Nat.add(start, size)

def within(full: Nat, span: Span) -> Bool:
  Nat.is_ge(full, far(span))

# The span between two points, whichever comes first.
def between(+a: Nat, +b: Nat) -> Span:
  Span{Nat.min(a, b), Nat.sub(Nat.max(a, b), Nat.min(a, b))}

# The span between two ends of a drag, each held on the page first.
def span(+full: Nat, a: Nat, b: Nat) -> Span:
  between(Nat.min(a, full), Nat.min(b, full))

# Moving keeps the size and stops at the page's edge.
def later(+full: Nat, +span: Span, by: Nat) -> Span:
  Span{start, size} = span
  Span{Nat.min(Nat.add(start, by), Nat.sub(full, size)), size}

def earlier(span: Span, by: Nat) -> Span:
  Span{start, size} = span
  Span{Nat.sub(start, by), size}

# Resizing keeps the start. Growing stops at the page's edge; shrinking stops
# at `least` and never makes a span larger than it was.
def grow(+full: Nat, +span: Span, by: Nat) -> Span:
  Span{start, size} = span
  Span{start, Nat.min(Nat.add(size, by), Nat.sub(full, start))}

def shrink(least: Nat, +span: Span, by: Nat) -> Span:
  Span{start, size} = span
  Span{start, Nat.min(size, Nat.max(Nat.sub(size, by), least))}

def roomy(least: Nat, span: Span) -> Bool:
  Nat.is_ge(size(span), least)

def make(page: Nat, across: Span, down: Span, ok: Bool) -> Maybe<&2, Area>:
  match across down ok:
    case Span{x, w} Span{y, h} True{}:
      Some{Area{page, x, y, w, h}}
    case Span{x, w} Span{y, h} False{}:
      None{}

def accepts(+least: Nat, page: Nat, across: Span, down: Span) -> Bool:
  Bool.and(Nat.is_ge(page, 1n), Bool.and(roomy(least, across), roomy(least, down)))

def frame(+least: Nat, +page: Nat, +across: Span, +down: Span) -> Maybe<&2, Area>:
  make(page, across, down, accepts(least, page, across, down))

# The region between two corners of a drag on page `page` (pages count from
# 1), or nothing when it is smaller than `least` in either direction.
def fit(+full: Nat, +least: Nat, +page: Nat, ax: Nat, ay: Nat, bx: Nat, by: Nat) -> Maybe<&2, Area>:
  frame(least, page, span(full, ax, bx), span(full, ay, by))

# What a stored region must satisfy to be drawn: a page, some extent each way,
# and nothing past the page's edge.
def valid(+full: Nat, +area: Area) -> Bool:
  Area{page, x, y, w, h} = area
  Bool.and(Nat.is_ge(page, 1n), Bool.and(Nat.is_ge(w, 1n), Bool.and(Nat.is_ge(h, 1n), Bool.and(within(full, Span{x, w}), within(full, Span{y, h})))))

def sound(+full: Nat, found: Maybe<&2, Area>) -> Bool:
  match found:
    case None{}:
      True{}
    case Some{area}:
      valid(full, area)

# ── A stored region moved or resized from the keyboard ──────────────────────
# Left/Right/Up/Down move a region. For a resize the same four name the edge
# that travels: Right widens, Left narrows, Down makes taller, Up shorter.
type Way is Data:
  Left{}
  Right{}
  Up{}
  Down{}

type Point is Data:
  Point{across: Nat, down: Nat}

# Where a region starts, and how far it runs each way.
def corner(area: Area) -> Point:
  Area{page, x, y, w, h} = area
  Point{x, y}

def extent(area: Area) -> Point:
  Area{page, x, y, w, h} = area
  Point{w, h}

def moved(+full: Nat, +area: Area, way: Way, by: Nat) -> Area:
  match area way:
    case Area{page, x, y, w, h} Left{}:
      Area{page, start(earlier(Span{x, w}, by)), y, w, h}
    case Area{page, x, y, w, h} Right{}:
      Area{page, start(later(full, Span{x, w}, by)), y, w, h}
    case Area{page, x, y, w, h} Up{}:
      Area{page, x, start(earlier(Span{y, h}, by)), w, h}
    case Area{page, x, y, w, h} Down{}:
      Area{page, x, start(later(full, Span{y, h}, by)), w, h}

def resized(+full: Nat, +least: Nat, +area: Area, way: Way, by: Nat) -> Area:
  match area way:
    case Area{page, x, y, w, h} Left{}:
      Area{page, x, y, size(shrink(least, Span{x, w}, by)), h}
    case Area{page, x, y, w, h} Right{}:
      Area{page, x, y, size(grow(full, Span{x, w}, by)), h}
    case Area{page, x, y, w, h} Up{}:
      Area{page, x, y, w, size(shrink(least, Span{y, h}, by))}
    case Area{page, x, y, w, h} Down{}:
      Area{page, x, y, w, size(grow(full, Span{y, h}, by))}

def pick(ok: Bool, old: Area, new: Area) -> Area:
  match ok:
    case True{}:
      new
    case False{}:
      old

# The change is taken only if what it gives may be stored; otherwise the
# region stays as it was.
def guard(+full: Nat, old: Area, +new: Area) -> Area:
  pick(valid(full, new), old, new)

def move(+full: Nat, +area: Area, way: Way, by: Nat) -> Area:
  guard(full, area, moved(full, area, way, by))

def resize(+full: Nat, +least: Nat, +area: Area, way: Way, by: Nat) -> Area:
  guard(full, area, resized(full, least, area, way, by))
