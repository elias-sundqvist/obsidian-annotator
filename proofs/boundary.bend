import Base

# Existing characters are immutable. Newly needed terminators use LF.
type State is Data:
  EmptySource{}
  TextLine{}
  SpaceLine{}
  AfterText{}
  AfterBlank{}

def space(state: State) -> State:
  match state:
    case TextLine{}:
      TextLine{}
    case _:
      SpaceLine{}

def newline(state: State) -> State:
  match state:
    case TextLine{}:
      AfterText{}
    case _:
      AfterBlank{}

def classify(+char: Char) -> Bool & Bool:
  (Char.is_eq(char, '\n'), Bool.or(Char.is_eq(char, ' '), Bool.or(Char.is_eq(char, '\t'), Char.is_eq(char, '\r'))))

def step_kind(state: State, kind: Bool & Bool) -> State:
  (lf, ws) = kind
  match lf ws:
    case True{} _:
      newline(state)
    case False{} True{}:
      space(state)
    case False{} False{}:
      TextLine{}

def step(state: State, char: Char) -> State:
  step_kind(state, classify(char))

def run(source: String, state: State) -> State:
  match source:
    case SNil{}:
      state
    case SCon{char, rest}:
      run(rest, step(state, char))

def suffix(state: State) -> String:
  match state:
    case EmptySource{}:
      ""
    case AfterBlank{}:
      ""
    case TextLine{}:
      "\n\n"
    case _:
      "\n"

def normalize(+source: String) -> String:
  String.append(source, suffix(run(source, EmptySource{})))
