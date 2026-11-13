import Base
import ./codec.bend as Codec

def main() -> Maybe<&2, List<&2, String>>:
  Codec.unquote_lines(Codec.quote_lines(["", "%%COMMENT%%", "> nested quote", "spaces  ", "åäö 📝", "```annotation-json"]))
