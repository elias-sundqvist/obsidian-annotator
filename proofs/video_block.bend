import Base
import ./codec.bend as Quote
import ./video_header.bend as Header

# Timestamp records have a distinct schema. Numeric interpretation belongs to
# the provider boundary: this grammar keeps the original timestamp lexeme.
type Fields is Data:
  Fields{title: String, timestamp: String, comment: List<&2, String>}

def header(fields: Fields) -> String:
  Fields{title, timestamp, comment} = fields
  String.append(" **", String.append(title, String.append("** %%TIMESTAMP: ", String.append(timestamp, "%%"))))

def encode(+fields: Fields) -> List<&2, String>:
  Fields{title, timestamp, comment} = fields
  Quote.quote_lines(Con{header(Fields{title, timestamp, Nil{}}), comment})

def from_header(parsed: Maybe<&2, Header.Syntax>, comment: List<&2, String>) -> Maybe<&2, Fields>:
  match parsed:
    case None{}:
      None{}
    case Some{Header.Syntax{prefix, title, between, timestamp, suffix}}:
      Some{Fields{title, timestamp, comment}}

def unquoted(lines: List<&2, String>) -> Maybe<&2, Fields>:
  match lines:
    case Nil{}:
      None{}
    case Con{first, comment}:
      from_header(Header.parse(SCon{'>', first}), comment)

def decoded(lines: Maybe<&2, List<&2, String>>) -> Maybe<&2, Fields>:
  match lines:
    case None{}:
      None{}
    case Some{body}:
      unquoted(body)

# Block-body grammar only: document context, anchors and separator ownership
# are intentionally not inferred by this function.
def decode(lines: List<&2, String>) -> Maybe<&2, Fields>:
  decoded(Quote.unquote_lines(lines))

def get_title(fields: Fields) -> String:
  Fields{value, timestamp, comment} = fields
  value

def get_time(fields: Fields) -> String:
  Fields{title, value, comment} = fields
  value

def get_comment(fields: Fields) -> List<&2, String>:
  Fields{title, timestamp, value} = fields
  value

def with_comment(fields: Fields, value: List<&2, String>) -> Fields:
  Fields{title, timestamp, old} = fields
  Fields{title, timestamp, value}

def with_title(fields: Fields, value: String) -> Fields:
  Fields{old, timestamp, comment} = fields
  Fields{value, timestamp, comment}

# Published comment lines use regex dot without the dotAll flag.
def comment_line_valid(text: String) -> Bool:
  Header.dot_go(text, True{})
