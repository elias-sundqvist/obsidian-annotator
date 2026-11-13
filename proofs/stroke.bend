import Base

# A line drawn by hand on a page. Its points are whole numbers of the page's
# own units (the reader uses tenths of a point), across and down from the
# top-left corner. `at` is the point's place in what the hand gave, so that
# whatever else came with it (how hard the pen pressed) can be found again.
#
# The rules live here rather than in the drawing code: no point of a line
# is ever off the page; a line is thinned only by leaving points out, never
# by moving or adding one, and it still starts where the hand started and
# ends where the hand ended; and the box around a line holds every point.
type Point is Data:
  Point{x: Nat, y: Nat, at: Nat}

type Box is Data:
  Box{left: Nat, top: Nat, right: Nat, bottom: Nat}

# ── On the page ─────────────────────────────────────────────────────────────
def held(+wide: Nat, +tall: Nat, point: Point) -> Point:
  Point{x, y, at} = point
  Point{Nat.min(x, wide), Nat.min(y, tall), at}

def on_page(+wide: Nat, +tall: Nat, point: Point) -> Bool:
  Point{x, y, at} = point
  Bool.and(Nat.is_ge(wide, x), Nat.is_ge(tall, y))

# ── Thinning ────────────────────────────────────────────────────────────────
# How far apart two numbers are.
def gap(+a: Nat, +b: Nat) -> Nat:
  Nat.add(Nat.sub(a, b), Nat.sub(b, a))

# How far the hand moved between two points: across plus down.
def apart(a: Point, b: Point) -> Nat:
  match a b:
    case Point{ax, ay, aat} Point{bx, by, bat}:
      Nat.add(gap(ax, bx), gap(ay, by))

# The same place on the page.
def same(a: Point, b: Point) -> Bool:
  match a b:
    case Point{ax, ay, aat} Point{bx, by, bat}:
      Bool.and(Nat.is_eq(ax, bx), Nat.is_eq(ay, by))

def keep(hit: Bool, point: Point, tail: List<&2, Point>) -> List<&2, Point>:
  match hit:
    case True{}:
      Con{point, tail}
    case False{}:
      tail

# What is kept of the rest of a line after `last`, the point kept before it:
# a point at least `least` away from the last one kept, and the hand's final
# point however close, unless it is where the line already is.
def choose(far: Bool, point: Point, last: Point) -> Point:
  match far:
    case True{}:
      point
    case False{}:
      last

def thin_from(+least: Nat, rest: List<&2, Point>, +last: Point) -> List<&2, Point>:
  match rest:
    case Nil{}:
      Nil{}
    case Con{point, Nil{}}:
      keep(Bool.not(same(last, point)), point, Nil{})
    case Con{+point, Con{next, more}}:
      +far = Nat.is_ge(apart(last, point), least)
      keep(far, point, thin_from(least, Con{next, more}, choose(far, point, last)))

# A line with the points left out that are closer than `least` to the one
# kept before them. The first point is always kept.
def thin(+least: Nat, points: List<&2, Point>) -> List<&2, Point>:
  match points:
    case Nil{}:
      Nil{}
    case Con{+point, rest}:
      Con{point, thin_from(least, rest, point)}

# The same thinning for a line of any length. `thin` says what thinning is, one
# point at a time, and is what the laws are about; a long line would exhaust
# the machine's stack that way. This goes along the line once, gathering what
# is kept back to front, and turns it round at the end. It gives exactly what
# `thin` gives (law stroke_thin_fast_same) and is what the reader runs.
def thin_go(+least: Nat, rest: List<&2, Point>, +last: Point, kept: List<&2, Point>) -> List<&2, Point>:
  match rest:
    case Nil{}:
      kept
    case Con{point, Nil{}}:
      keep(Bool.not(same(last, point)), point, kept)
    case Con{+point, Con{next, more}}:
      +far = Nat.is_ge(apart(last, point), least)
      thin_go(least, Con{next, more}, choose(far, point, last), keep(far, point, kept))

def thin_fast(+least: Nat, points: List<&2, Point>) -> List<&2, Point>:
  match points:
    case Nil{}:
      Nil{}
    case Con{+point, rest}:
      List.reverse(&2, Point, thin_go(least, rest, point, Con{point, Nil{}}))

# ── What the laws are stated with ───────────────────────────────────────────
def equal(a: Point, b: Point) -> Bool:
  match a b:
    case Point{ax, ay, aat} Point{bx, by, bat}:
      Bool.and(Nat.is_eq(ax, bx), Bool.and(Nat.is_eq(ay, by), Nat.is_eq(aat, bat)))

# Whether `part` is `whole` with some points left out: the same points, in
# the same order. (The whole comes first: it is what gets shorter.)
def left_out(whole: List<&2, Point>, part: List<&2, Point>) -> Bool:
  match whole part:
    case whole Nil{}:
      True{}
    case Nil{} Con{point, rest}:
      False{}
    case Con{other, +others} Con{+point, +rest}:
      Bool.or(Bool.and(equal(point, other), left_out(others, rest)), left_out(others, Con{point, rest}))

# The last point of a line that starts at `first`.
def last(rest: List<&2, Point>, first: Point) -> Point:
  match rest:
    case Nil{}:
      first
    case Con{point, more}:
      last(more, point)

# Where a line starts and where it ends; `other` only for a line with no points.
def start(points: List<&2, Point>, other: Point) -> Point:
  match points:
    case Nil{}:
      other
    case Con{point, rest}:
      point

def end(points: List<&2, Point>, other: Point) -> Point:
  match points:
    case Nil{}:
      other
    case Con{point, rest}:
      last(rest, point)

# ── The box around a line ───────────────────────────────────────────────────
def around(point: Point) -> Box:
  Point{+x, +y, at} = point
  Box{x, y, x, y}

def widen(box: Box, point: Point) -> Box:
  match box point:
    case Box{left, top, right, bottom} Point{+x, +y, at}:
      Box{Nat.min(left, x), Nat.min(top, y), Nat.max(right, x), Nat.max(bottom, y)}

def box_from(rest: List<&2, Point>, box: Box) -> Box:
  match rest:
    case Nil{}:
      box
    case Con{point, more}:
      box_from(more, widen(box, point))

# The smallest box that holds every point of a line that starts at `first`.
def box(+first: Point, rest: List<&2, Point>) -> Box:
  box_from(rest, around(first))

def holds(box: Box, point: Point) -> Bool:
  match box point:
    case Box{left, top, right, bottom} Point{+x, +y, at}:
      Bool.and(Bool.and(Nat.is_ge(x, left), Nat.is_ge(right, x)), Bool.and(Nat.is_ge(y, top), Nat.is_ge(bottom, y)))

def holds_all(+box: Box, points: List<&2, Point>) -> Bool:
  match points:
    case Nil{}:
      True{}
    case Con{point, more}:
      Bool.and(holds(box, point), holds_all(box, more))
