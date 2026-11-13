import Base

# Structural reference reversal used only in the proofs. Executable decoding
# uses Base's tail-recursive String.reverse, related to this by a checked law.
def reverse(text: String) -> String:
  match text:
    case SNil{}:
      SNil{}
    case SCon{char, rest}:
      String.append(reverse(rest), SCon{char, SNil{}})
