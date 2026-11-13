import Base
import ./codec.bend as Quote

# A lossless syntax record. JSON and visible fields stay opaque at this layer.
# Each String is one logical line; comments can contain arbitrarily many lines.
type Block is Data:
  Block{json: String, display: String, link: String, comment: List<&2, String>, tags: String}

def append(xs: List<&2, String>, ys: List<&2, String>) -> List<&2, String>:
  match xs:
    case Nil{}:
      ys
    case Con{h, t}:
      Con{h, append(t, ys)}

def reverse(xs: List<&2, String>) -> List<&2, String>:
  match xs:
    case Nil{}:
      Nil{}
    case Con{h, t}:
      append(reverse(t), [h])

# Read the suffix from the end, so marker-like lines inside comments are data.
def read_suffix(json: String, display: String, link: String, reversed: List<&2, String>) -> Maybe<&2, Block>:
  match reversed:
    case Con{tags, Con{"%%TAGS%%", comment}}:
      Some{Block{json, display, link, reverse(comment), tags}}
    case _:
      None{}

def encode_body(block: Block) -> List<&2, String>:
  Block{json, display, link, comment, tags} = block
  append(["%%", "```annotation-json", json, "```", "%%", display, link, "%%COMMENT%%"], reverse(tags <> "%%TAGS%%" <> reverse(comment)))

def decode_body(lines: List<&2, String>) -> Maybe<&2, Block>:
  match lines:
    case "%%" <> "```annotation-json" <> json <> "```" <> "%%" <> display <> link <> "%%COMMENT%%" <> rest:
      read_suffix(json, display, link, reverse(rest))
    case _:
      None{}

def decode_unquoted(lines: Maybe<&2, List<&2, String>>) -> Maybe<&2, Block>:
  match lines:
    case None{}:
      None{}
    case Some{xs}:
      decode_body(xs)

def encode(block: Block) -> List<&2, String>:
  Quote.quote_lines(encode_body(block))

def decode(lines: List<&2, String>) -> Maybe<&2, Block>:
  decode_unquoted(Quote.unquote_lines(lines))

# Lift the codec through Maybe: a rejected input stays rejected, rather than
# being converted to an empty/default annotation during another cycle.
def reencode(result: Maybe<&2, Block>) -> Maybe<&2, List<&2, String>>:
  match result:
    case None{}:
      None{}
    case Some{block}:
      Some{encode(block)}

def decode_encoded(result: Maybe<&2, List<&2, String>>) -> Maybe<&2, Block>:
  match result:
    case None{}:
      None{}
    case Some{lines}:
      decode(lines)
