import Base
import ./storage.bend as Store

# The unique-ID resolver supplies a physical segment index. This core is total
# even for out-of-bounds indexes and raw slots. It does not assume IDs are unique.
type Command is Data:
  Create{id: String, lines: List<&2, String>}
  Read{}
  Update{lines: List<&2, String>}
  Delete{}

type Error is Data:
  Missing{}
  NotAnnotation{}

# Receipts contain only the affected segment/index, never a document snapshot.
type Receipt is Data:
  Created{index: Nat}
  Updated{index: Nat, original: Store.Segment}
  Deleted{index: Nat, original: Store.Segment}
  Unchanged{}

type Outcome is Data:
  Rejected{document: List<&2, Store.Segment>, error: Error}
  Applied{document: List<&2, Store.Segment>, receipt: Receipt, observed: Maybe<&2, Store.Segment>}

def insert_at(index: Nat, xs: List<&2, Store.Segment>, segment: Store.Segment) -> List<&2, Store.Segment>:
  match index:
    case 0n:
      Con{segment, xs}
    case 1n+p:
      match xs:
        case Nil{}:
          Nil{}
        case Con{h, t}:
          Con{h, insert_at(p, t, segment)}

def remove_at(xs: List<&2, Store.Segment>, index: Nat) -> List<&2, Store.Segment>:
  match xs index:
    case Nil{} _:
      Nil{}
    case Con{h, t} 0n:
      t
    case Con{h, t} 1n+p:
      Con{h, remove_at(t, p)}

def restore_at(xs: List<&2, Store.Segment>, index: Nat, original: Store.Segment) -> List<&2, Store.Segment>:
  match xs index:
    case Nil{} _:
      Nil{}
    case Con{h, t} 0n:
      Con{original, t}
    case Con{h, t} 1n+p:
      Con{h, restore_at(t, p, original)}

def undo(document: List<&2, Store.Segment>, receipt: Receipt) -> List<&2, Store.Segment>:
  match receipt:
    case Created{index}:
      remove_at(document, index)
    case Updated{index, original}:
      restore_at(document, index, original)
    case Deleted{index, original}:
      insert_at(index, document, original)
    case Unchanged{}:
      document

def shift(receipt: Receipt) -> Receipt:
  match receipt:
    case Created{index}:
      Created{1n+index}
    case Updated{index, original}:
      Updated{1n+index, original}
    case Deleted{index, original}:
      Deleted{1n+index, original}
    case Unchanged{}:
      Unchanged{}

def lift(head: Store.Segment, outcome: Outcome) -> Outcome:
  match outcome:
    case Rejected{document, error}:
      Rejected{Con{head, document}, error}
    case Applied{document, receipt, observed}:
      Applied{Con{head, document}, shift(receipt), observed}

# Each focused branch explicitly preserves the suffix and records the old bytes.
def at_head(head: Store.Segment, tail: List<&2, Store.Segment>, command: Command) -> Outcome:
  match head command:
    case Store.Raw{text} Create{id, lines}:
      Applied{Con{Store.Annotation{id, lines}, Con{Store.Raw{text}, tail}}, Created{0n}, None{}}
    case Store.Annotation{oldid, old} Create{id, lines}:
      Applied{Con{Store.Annotation{id, lines}, Con{Store.Annotation{oldid, old}, tail}}, Created{0n}, None{}}
    case Store.Raw{text} Read{}:
      Rejected{Con{Store.Raw{text}, tail}, NotAnnotation{}}
    case Store.Raw{text} Update{lines}:
      Rejected{Con{Store.Raw{text}, tail}, NotAnnotation{}}
    case Store.Raw{text} Delete{}:
      Rejected{Con{Store.Raw{text}, tail}, NotAnnotation{}}
    case Store.Annotation{+id, +old} Read{}:
      Applied{Con{Store.Annotation{id, old}, tail}, Unchanged{}, Some{Store.Annotation{id, old}}}
    case Store.Annotation{+id, +old} Update{lines}:
      Applied{Con{Store.Annotation{id, lines}, tail}, Updated{0n, Store.Annotation{id, old}}, Some{Store.Annotation{id, old}}}
    case Store.Annotation{id, old} Delete{}:
      Applied{tail, Deleted{0n, Store.Annotation{id, old}}, None{}}

def at_end(command: Command) -> Outcome:
  match command:
    case Create{id, lines}:
      Applied{[Store.Annotation{id, lines}], Created{0n}, None{}}
    case Read{}:
      Rejected{Nil{}, Missing{}}
    case Update{lines}:
      Rejected{Nil{}, Missing{}}
    case Delete{}:
      Rejected{Nil{}, Missing{}}

def apply(document: List<&2, Store.Segment>, index: Nat, command: Command) -> Outcome:
  match document index:
    case Nil{} 0n:
      at_end(command)
    case Nil{} 1n+p:
      Rejected{Nil{}, Missing{}}
    case Con{h, t} 0n:
      at_head(h, t, command)
    case Con{h, t} 1n+p:
      lift(h, apply(t, p, command))

def document(outcome: Outcome) -> List<&2, Store.Segment>:
  match outcome:
    case Rejected{xs, error}:
      xs
    case Applied{xs, receipt, observed}:
      xs

def rollback(outcome: Outcome) -> List<&2, Store.Segment>:
  match outcome:
    case Rejected{xs, error}:
      xs
    case Applied{xs, receipt, observed}:
      undo(xs, receipt)

# A history keeps per-operation receipts in nested frames. Rolling it back is
# LIFO. No intervening external edit is allowed when consuming these receipts.
type Request is Data:
  Request{index: Nat, command: Command}

type History is Data:
  End{document: List<&2, Store.Segment>}
  Step{receipt: Maybe<&2, Receipt>, later: History}

def get_receipt(outcome: Outcome) -> Maybe<&2, Receipt>:
  match outcome:
    case Rejected{xs, error}:
      None{}
    case Applied{xs, receipt, observed}:
      Some{receipt}

def run(requests: List<&2, Request>, +initial: List<&2, Store.Segment>) -> History:
  match requests:
    case Nil{}:
      End{initial}
    case Con{Request{index, command}, rest}:
      +outcome = apply(initial, index, command)
      Step{get_receipt(outcome), run(rest, document(outcome))}

def final(history: History) -> List<&2, Store.Segment>:
  match history:
    case End{xs}:
      xs
    case Step{receipt, rest}:
      final(rest)

# Later rollback result is threaded into each undo; no snapshot short-cut.
def rollback_frame(receipt: Maybe<&2, Receipt>, current: List<&2, Store.Segment>) -> List<&2, Store.Segment>:
  match receipt:
    case None{}:
      current
    case Some{undo_receipt}:
      undo(current, undo_receipt)

def rollback_history(history: History) -> List<&2, Store.Segment>:
  match history:
    case End{xs}:
      xs
    case Step{receipt, rest}:
      rollback_frame(receipt, rollback_history(rest))

# Stored payloads are raw source chunks (including their original line endings).
def render_segment(segment: Store.Segment) -> String:
  match segment:
    case Store.Raw{text}:
      text
    case Store.Annotation{id, lines}:
      String.concat(lines)

def render(document: List<&2, Store.Segment>) -> String:
  match document:
    case Nil{}:
      SNil{}
    case Con{h, t}:
      String.append(render_segment(h), render(t))

def observed(outcome: Outcome) -> Maybe<&2, Store.Segment>:
  match outcome:
    case Rejected{xs, error}:
      None{}
    case Applied{xs, receipt, value}:
      value

def read_at(document: List<&2, Store.Segment>, index: Nat) -> Maybe<&2, Store.Segment>:
  observed(apply(document, index, Read{}))
