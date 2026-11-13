import Base
import ./evidence.bend as Evidence

# Header fields and their literal surrounding spelling are independent. Prefix
# includes >, whitespace and **; between includes **, whitespace, marker and an
# optional first ASCII space; suffix includes %% and trailing whitespace.
type Syntax is Data:
  Syntax{prefix: String, title: String, between: String, timestamp: String, suffix: String}

def render(header: Syntax) -> String:
  Syntax{prefix, title, between, timestamp, suffix} = header
  String.append(prefix, String.append(title, String.append(between, String.append(timestamp, suffix))))

# ECMAScript \s, not Base's ASCII-only Char.is_space. A physical-line parser
# never consumes LF here; explicit dot checks retain the published exclusions.
def whitespace(char: Char) -> Bool:
  +n = Char.to_u32(char)
  Bool.or(Bool.and(U32.is_ge(n, 9), U32.is_le(n, 13)), Bool.or(U32.is_eq(n, 32), Bool.or(U32.is_eq(n, 160), Bool.or(U32.is_eq(n, 5760), Bool.or(Bool.and(U32.is_ge(n, 8192), U32.is_le(n, 8202)), Bool.or(U32.is_eq(n, 8232), Bool.or(U32.is_eq(n, 8233), Bool.or(U32.is_eq(n, 8239), Bool.or(U32.is_eq(n, 8287), Bool.or(U32.is_eq(n, 12288), U32.is_eq(n, 65279)))))))))))

def count_choose(count: Nat, next: Unit -> Nat, space: Bool) -> Nat:
  match space:
    case True{}:
      next(Unit{})
    case False{}:
      count

def spaces(text: String, +count: Nat) -> Nat:
  match text:
    case SNil{}:
      count
    case SCon{h, rest}:
      count_choose(count, unit => spaces(rest, 1n+count), whitespace(h))

def dot_go(text: String, valid: Bool) -> Bool:
  match text:
    case SNil{}:
      valid
    case SCon{+h, rest}:
      +n = Char.to_u32(h)
      dot_go(rest, Bool.and(valid, Bool.not(Bool.or(U32.is_eq(n, 10), Bool.or(U32.is_eq(n, 13), Bool.or(U32.is_eq(n, 8232), U32.is_eq(n, 8233)))))))

def finish_fields(prefix: String, +title: String, between: String, +timestamp: String, suffix: String, good: Bool) -> Maybe<&2, Syntax>:
  match good:
    case True{}:
      Some{Syntax{prefix, title, between, timestamp, suffix}}
    case False{}:
      None{}

def time_value(prefix: String, +title: String, between: String, +value: String, suffix: String, +space: Nat) -> Maybe<&2, Syntax>:
  +timestamp = String.drop(value, space)
  finish_fields(prefix, title, String.append(between, String.take(value, space)), timestamp, suffix, Bool.and(dot_go(title, True{}), dot_go(timestamp, True{})))

def time_closed(prefix: String, title: String, between: String, +core: String, trailing: String, closed: Bool) -> Maybe<&2, Syntax>:
  match closed:
    case True{}:
      +value = String.take(core, Nat.sub(String.length(core), 2n))
      time_value(prefix, title, between, value, String.append("%%", trailing), Bool.pick(Nat, String.starts_with(value, " "), 1n, 0n))
    case False{}:
      None{}

def time_parse(prefix: String, title: String, between: String, +rest: String) -> Maybe<&2, Syntax>:
  +size = Nat.sub(String.length(rest), spaces(String.reverse(rest), 0n))
  +core = String.take(rest, size)
  time_closed(prefix, title, between, core, String.drop(rest, size), String.ends_with(core, "%%"))

def marker_checked(prefix: String, title: String, gap: String, rest: String, good: Bool) -> Maybe<&2, Syntax>:
  match good:
    case True{}:
      time_parse(prefix, title, String.append("**", String.append(gap, "%%TIMESTAMP:")), String.drop(rest, String.length("%%TIMESTAMP:")))
    case False{}:
      None{}

def closing_checked(prefix: String, reversed: String, +text: String, good: Bool) -> Maybe<&2, Syntax>:
  match good:
    case True{}:
      +after = String.drop(text, 2n)
      +size = spaces(after, 0n)
      +rest = String.drop(after, size)
      marker_checked(prefix, String.reverse(reversed), String.take(after, size), rest, String.starts_with(rest, "%%TIMESTAMP:"))
    case False{}:
      None{}

def prefer(previous: Maybe<&2, Syntax>, candidate: Maybe<&2, Syntax>) -> Maybe<&2, Syntax>:
  match candidate:
    case Some{header}:
      Some{header}
    case None{}:
      previous

def search(text: String, +reversed: String, +prefix: String, result: Maybe<&2, Syntax>) -> Maybe<&2, Syntax>:
  match text:
    case SNil{}:
      result
    case SCon{+h, +rest}:
      search(rest, SCon{h, reversed}, prefix, prefer(result, closing_checked(prefix, reversed, SCon{h, rest}, String.starts_with(SCon{h, rest}, "**"))))

def opening_checked(prefix: String, text: String, good: Bool) -> Maybe<&2, Syntax>:
  match good:
    case True{}:
      search(String.drop(text, 2n), "", prefix, None{})
    case False{}:
      None{}

def raw_parse(line: String) -> Maybe<&2, Syntax>:
  match line:
    case SCon{'>', +rest}:
      +count = spaces(rest, 0n)
      +text = String.drop(rest, count)
      opening_checked(String.append(">", String.append(String.take(rest, count), "**")), text, String.starts_with(text, "**"))
    case _:
      None{}

# Recognition returns a proof that its lexical decomposition re-emits exactly
# the input. The certificate is erased at compilation, not stored in Markdown.
type Recognition<-source: String> is Data:
  Rejected{}
  Recognized{syntax: Syntax, proof: {render(syntax) == source : String}}

def certify(-source: String, header: Syntax, proof: Maybe<&2, {render(header) == source : String}>) -> Recognition<source>:
  match proof:
    case Some{e}:
      Recognized{header, e}
    case None{}:
      Rejected{}

def checked(+source: String, parsed: Maybe<&2, Syntax>) -> Recognition<source>:
  match parsed:
    case None{}:
      Rejected{}
    case Some{+header}:
      certify(source, header, Evidence.string(render(header), source))

def recognize(+source: String) -> Recognition<source>:
  checked(source, raw_parse(source))

def projected(-source: String, result: Recognition<source>) -> Maybe<&2, Syntax>:
  match result:
    case Rejected{}:
      None{}
    case Recognized{syntax, proof}:
      Some{syntax}

def parse(+source: String) -> Maybe<&2, Syntax>:
  projected(source, recognize(source))

def with_title(header: Syntax, value: String) -> Syntax:
  Syntax{prefix, old, between, timestamp, suffix} = header
  Syntax{prefix, value, between, timestamp, suffix}

def with_time(header: Syntax, value: String) -> Syntax:
  Syntax{prefix, title, between, old, suffix} = header
  Syntax{prefix, title, between, value, suffix}

def rewritten(parsed: Maybe<&2, Syntax>, title: String, timestamp: String) -> Maybe<&2, String>:
  match parsed:
    case None{}:
      None{}
    case Some{header}:
      Some{render(with_time(with_title(header, title), timestamp))}

def rewrite(source: String, title: String, timestamp: String) -> Maybe<&2, String>:
  rewritten(parse(source), title, timestamp)

def get_title(header: Syntax) -> String:
  Syntax{prefix, title, between, timestamp, suffix} = header
  title

def get_time(header: Syntax) -> String:
  Syntax{prefix, title, between, timestamp, suffix} = header
  timestamp

type Layout is Data:
  Layout{prefix: String, between: String, suffix: String}

def layout(header: Syntax) -> Layout:
  Syntax{prefix, title, between, timestamp, suffix} = header
  Layout{prefix, between, suffix}

def reemitted(+source: String, result: Recognition<source>) -> String:
  match result:
    case Rejected{}:
      source
    case Recognized{syntax, proof}:
      render(syntax)
