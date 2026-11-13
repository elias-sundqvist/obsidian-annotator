import Base

# Markdown export. A quote or comment is arbitrary user text; it must never
# be able to end the block it is exported in or bleed into the next entry.
# Every body line is therefore quoted, and quoting is exactly reversible.
def quote_line(line: String) -> String:
  match line:
    case SNil{}:
      ">"
    case SCon{head, tail}:
      SCon{'>', SCon{' ', SCon{head, tail}}}

def unquote_line(line: String) -> Maybe<&2, String>:
  match line:
    case SCon{'>', SNil{}}:
      Some{""}
    case SCon{'>', SCon{' ', SCon{head, tail}}}:
      Some{SCon{head, tail}}
    case _:
      None{}

def quote_lines(lines: List<&2, String>) -> List<&2, String>:
  match lines:
    case Nil{}:
      Nil{}
    case Con{line, rest}:
      Con{quote_line(line), quote_lines(rest)}

def prepend(line: Maybe<&2, String>, rest: Maybe<&2, List<&2, String>>) -> Maybe<&2, List<&2, String>>:
  match line rest:
    case Some{x} Some{xs}:
      Some{Con{x, xs}}
    case _ _:
      None{}

def unquote_lines(lines: List<&2, String>) -> Maybe<&2, List<&2, String>>:
  match lines:
    case Nil{}:
      Some{Nil{}}
    case Con{line, rest}:
      prepend(unquote_line(line), unquote_lines(rest))

# Titles sit on a heading or callout line, so they are flattened to one line.
def is_break(+c: Char) -> Bool:
  Bool.or(Char.is_eq(c, '\n'), Char.is_eq(c, '\r'))

def flat(hit: Bool, c: Char) -> Char:
  match hit:
    case True{}:
      ' '
    case False{}:
      c

def single_line(text: String) -> String:
  match text:
    case SNil{}:
      SNil{}
    case SCon{+c, rest}:
      SCon{flat(is_break(c), c), single_line(rest)}

def has_break(text: String) -> Bool:
  match text:
    case SNil{}:
      False{}
    case SCon{c, rest}:
      Bool.or(is_break(c), has_break(rest))

# One exported annotation: its passage, then its note, as a callout or a
# plain block quote. `kind` is the callout type ("quote", "note"…); empty
# means a plain block quote with no title line.
type Note is Data:
  Note{title: String, quote: List<&2, String>, comment: List<&2, String>}

def join(quote: List<&2, String>, comment: List<&2, String>) -> List<&2, String>:
  match quote comment:
    case Nil{} comment:
      comment
    case Con{q, qs} Nil{}:
      Con{q, qs}
    case Con{q, qs} Con{c, cs}:
      List.append(&2, String, Con{q, qs}, Con{"", Con{c, cs}})

def body(note: Note) -> List<&2, String>:
  Note{title, quote, comment} = note
  join(quote, comment)

def title_of(note: Note) -> String:
  Note{title, quote, comment} = note
  single_line(title)

def heading(kind: String, title: String) -> String:
  String.append("> [!", String.append(single_line(kind), String.append("] ", title)))

def block(kind: String, +note: Note) -> List<&2, String>:
  match kind:
    case SNil{}:
      quote_lines(body(note))
    case SCon{head, tail}:
      Con{heading(SCon{head, tail}, title_of(note)), quote_lines(body(note))}

def block_body(kind: String, lines: List<&2, String>) -> List<&2, String>:
  match kind lines:
    case SNil{} lines:
      lines
    case SCon{head, tail} Nil{}:
      Nil{}
    case SCon{head, tail} Con{first, rest}:
      rest
