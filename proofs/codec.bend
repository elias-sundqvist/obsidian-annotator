import Base

# The existing writer prefixes every Markdown line with >.
# Work on lines first; newline splitting/joining is a separate boundary.
def quote_line(line: String) -> String:
  SCon{'>', line}

def unquote_line(line: String) -> Maybe<&2, String>:
  match line:
    case SNil{}:
      None{}
    case SCon{'>', rest}:
      Some{rest}
    case SCon{_, rest}:
      None{}

def quote_lines(lines: List<&2, String>) -> List<&2, String>:
  match lines:
    case Nil{}:
      Nil{}
    case Con{line, rest}:
      Con{quote_line(line), quote_lines(rest)}

def prepend_result(line: Maybe<&2, String>, rest: Maybe<&2, List<&2, String>>) -> Maybe<&2, List<&2, String>>:
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
      prepend_result(unquote_line(line), unquote_lines(rest))
