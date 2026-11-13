import Base

# Lossless physical-line syntax for the ENTIRE Markdown source. The consumed
# line-break character is retained, never reconstructed or normalized. CR stays
# in the body before LF, so LF, CRLF, mixed endings and EOF are all exact.
type Line is Data:
  Line{body: String, ending: Maybe<&2, Char>}

def ending_text(ending: Maybe<&2, Char>) -> String:
  match ending:
    case None{}:
      SNil{}
    case Some{char}:
      SCon{char, SNil{}}

def encode(lines: List<&2, Line>) -> String:
  match lines:
    case Nil{}:
      SNil{}
    case Con{Line{body, ending}, rest}:
      String.append(body, String.append(ending_text(ending), encode(rest)))

# Both branches keep the actual input character. Classification controls only
# grouping; correctness never assumes that a guessed character equals LF.
def push(lines: List<&2, Line>, char: Char, newline: Bool) -> List<&2, Line>:
  match lines newline:
    case Nil{} False{}:
      [Line{SCon{char, SNil{}}, None{}}]
    case Nil{} True{}:
      [Line{SNil{}, Some{char}}]
    case Con{Line{body, ending}, rest} False{}:
      Con{Line{SCon{char, body}, ending}, rest}
    case Con{line, rest} True{}:
      Con{Line{SNil{}, Some{char}}, Con{line, rest}}

# Process the source backwards with an explicit accumulator. This has the same
# lossless grammar as right recursion, but avoids JavaScript call-stack growth.
def decode_go(source: String, lines: List<&2, Line>) -> List<&2, Line>:
  match source:
    case SNil{}:
      lines
    case SCon{+char, rest}:
      decode_go(rest, push(lines, char, Char.is_eq(char, '\n')))

# The specification of the line grammar: the source read backwards, each
# character pushed onto the lines after it.
def decode_exact(source: String) -> List<&2, Line>:
  decode_go(String.reverse(source), Nil{})

def lines_end(body: String, reversed: List<&2, Line>) -> List<&2, Line>:
  match body:
    case SNil{}:
      reversed
    case SCon{h, t}:
      Con{Line{SCon{h, t}, None{}}, reversed}

def head_newline(source: String) -> Bool:
  match source:
    case SCon{h, t}:
      Char.is_eq(h, '\n')
    case SNil{}:
      False{}

# One forward pass: `body` is the line being read, `reversed` the lines before
# it, `newline` whether the next character ends the line. It does not reverse
# the source first; LAWS.bend proves it equal to `decode_exact`.
def lines_go(source: String, body: String, reversed: List<&2, Line>, newline: Bool) -> List<&2, Line>:
  match source newline:
    case SNil{} _:
      List.reverse(&2, Line, lines_end(body, reversed))
    case SCon{char, +rest} True{}:
      lines_go(rest, SNil{}, Con{Line{body, Some{char}}, reversed}, head_newline(rest))
    case SCon{char, +rest} False{}:
      lines_go(rest, String.append(body, SCon{char, SNil{}}), reversed, head_newline(rest))

def decode(+source: String) -> List<&2, Line>:
  lines_go(source, SNil{}, Nil{}, head_newline(source))

# Whether the last character is a line feed; `last` says whether the previous
# one was. A text that ends in a line feed decodes to whole lines, so what is
# appended to it decodes on its own (`document_decode_append`).
def ends_nl(text: String, last: Bool) -> Bool:
  match text:
    case SNil{}:
      last
    case SCon{h, t}:
      ends_nl(t, Char.is_eq(h, '\n'))
