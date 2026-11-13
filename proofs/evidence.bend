import Base

# Proof-producing equality. None is a refusal; Some carries checked equality.
# There is no assumed relationship between an unproved Boolean and equality.
def word_tail(-p: Nat, +bit: Bool, +a: Word(p), +b: Word(p), proof: Maybe<&2, {a == b : Word(p)}>) -> Maybe<&2, {WCon{bit, a} == WCon{bit, b} : Word(1n+p)}>:
  match proof:
    case None{}:
      None{}
    case Some{e}:
      Some{Equal.cong(Word(p), Word(1n+p), x => WCon{bit, x}, a, b, e)}

def word(n: Nat, a: Word(n), b: Word(n)) -> Maybe<&2, {a == b : Word(n)}>:
  match n:
    case 0n:
      match a b:
        case WNil{} WNil{}:
          Some{{==}}
    case 1n+p:
      match a b:
        case WCon{False{}, +at} WCon{False{}, +bt}:
          word_tail(p, False{}, at, bt, word(p, at, bt))
        case WCon{True{}, +at} WCon{True{}, +bt}:
          word_tail(p, True{}, at, bt, word(p, at, bt))
        case WCon{False{}, at} WCon{True{}, bt}:
          None{}
        case WCon{True{}, at} WCon{False{}, bt}:
          None{}

def char_words(+a: Word(32n), +b: Word(32n), proof: Maybe<&2, {a == b : Word(32n)}>) -> Maybe<&2, {Chr{U32{a}} == Chr{U32{b}} : Char}>:
  match proof:
    case None{}:
      None{}
    case Some{e}:
      Some{Equal.cong(Word(32n), Char, x => Chr{U32{x}}, a, b, e)}

def char(a: Char, b: Char) -> Maybe<&2, {a == b : Char}>:
  match a b:
    case Chr{U32{+wa}} Chr{U32{+wb}}:
      char_words(wa, wb, word(32n, wa, wb))

def string_parts(-ha: Char, -ta: String, -hb: Char, -tb: String, heads: Maybe<&2, {ha == hb : Char}>, tails: Maybe<&2, {ta == tb : String}>) -> Maybe<&2, {SCon{ha, ta} == SCon{hb, tb} : String}>:
  match heads tails:
    case Some{eh} Some{et}:
      Some{Equal.trans(String, SCon{ha, ta}, SCon{hb, ta}, SCon{hb, tb}, Equal.cong(Char, String, x => SCon{x, ta}, ha, hb, eh), Equal.cong(String, String, x => SCon{hb, x}, ta, tb, et))}
    case _ _:
      None{}

# Continuation form keeps both the comparison and proof assembly stack-safe in
# the JavaScript backend. Continuations tail-call the next proof step.
def continue_string(-oa: String, -ob: String, -ha: Char, -ta: String, -hb: Char, -tb: String, heads: Maybe<&2, {ha == hb : Char}>, next: Maybe<&2, {SCon{ha, ta} == SCon{hb, tb} : String}> -> Maybe<&2, {oa == ob : String}>) -> Maybe<&2, {ta == tb : String}> -> Maybe<&2, {oa == ob : String}>:
  tails => next(string_parts(ha, ta, hb, tb, heads, tails))

def string_go(-oa: String, -ob: String, a: String, b: String, next: Maybe<&2, {a == b : String}> -> Maybe<&2, {oa == ob : String}>) -> Maybe<&2, {oa == ob : String}>:
  match a b:
    case SNil{} SNil{}:
      next(Some{{==}})
    case SCon{+ha, +ta} SCon{+hb, +tb}:
      string_go(oa, ob, ta, tb, continue_string(oa, ob, ha, ta, hb, tb, char(ha, hb), next))
    case _ _:
      next(None{})

def string(+a: String, +b: String) -> Maybe<&2, {a == b : String}>:
  string_go(a, b, a, b, proof => proof)

# Equality decided by `String.eq`, returned with the equation that decision
# proves. PROOF.bend's `string_same` turns that equation into equality of the
# two strings, once, in the checker, so nothing walks the bits of a character
# while a note is being written. `string` above does walk them and stays for
# callers that want the equality itself.
def same_checked(-a: String, -b: String, equal: Bool, e: {String.eq(a, b) == equal : Bool}) -> Maybe<&2, {String.eq(a, b) == True{} : Bool}>:
  match equal:
    case False{}:
      None{}
    case True{}:
      Some{e}

def same(+a: String, +b: String) -> Maybe<&2, {String.eq(a, b) == True{} : Bool}>:
  same_checked(a, b, String.eq(a, b), {==})
