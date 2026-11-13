import Base

# The bridge resolves a unique annotation ID to a segment index. Raw segments
# include all non-annotation bytes. Bend never edits those or annotation IDs.
type Segment is Data:
  Raw{text: String}
  Annotation{id: String, lines: List<&2, String>}

type Outline is Data:
  Prose{text: String}
  AnnotationKey{id: String}

def replace(segment: Segment, lines: List<&2, String>) -> Segment:
  match segment:
    case Raw{text}:
      Raw{text}
    case Annotation{id, old}:
      Annotation{id, lines}

def edit_at(segments: List<&2, Segment>, index: Nat, lines: List<&2, String>) -> List<&2, Segment>:
  match segments index:
    case Nil{} _:
      Nil{}
    case Con{h, t} 0n:
      Con{replace(h, lines), t}
    case Con{h, t} 1n+p:
      Con{h, edit_at(t, p, lines)}

def outline_segment(segment: Segment) -> Outline:
  match segment:
    case Raw{text}:
      Prose{text}
    case Annotation{id, lines}:
      AnnotationKey{id}

def outline(segments: List<&2, Segment>) -> List<&2, Outline>:
  match segments:
    case Nil{}:
      Nil{}
    case Con{h, t}:
      Con{outline_segment(h), outline(t)}

def append_segments(xs: List<&2, Segment>, ys: List<&2, Segment>) -> List<&2, Segment>:
  match xs:
    case Nil{}:
      ys
    case Con{h, t}:
      Con{h, append_segments(t, ys)}

def length(xs: List<&2, Segment>) -> Nat:
  match xs:
    case Nil{}:
      0n
    case Con{h, t}:
      1n+length(t)
