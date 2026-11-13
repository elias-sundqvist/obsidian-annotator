import Base
import ./boundary.bend as Boundary
import ./video_document.bend as Recognizer
import ./evidence.bend as Evidence

# A transient proof certificate, NOT a stored receipt. Nothing is added to the
# Markdown format, and delete knows only the current source and literal ID.
# Each field is the equation `String.eq(..) == True`, which costs one string
# comparison to produce; `string_same` in PROOF.bend proves that it means the
# two strings are equal, and the laws about a creation state that equality.
type Creation<-original: String, -id: String> is Data:
  CreationRefused{message: String}
  CreationReady{source: String, proof: {String.eq(Recognizer.output(Recognizer.delete(source, id)), Boundary.normalize(original)) == True{} : Bool}, stable: {String.eq(Boundary.normalize(source), source) == True{} : Bool}}

def certify_stable(+original: String, +id: String, candidate: String, proof: {String.eq(Recognizer.output(Recognizer.delete(candidate, id)), Boundary.normalize(original)) == True{} : Bool}, stable: Maybe<&2, {String.eq(Boundary.normalize(candidate), candidate) == True{} : Bool}>) -> Creation<original, id>:
  match stable:
    case None{}:
      CreationRefused{"created video annotation does not own complete separators"}
    case Some{e}:
      CreationReady{candidate, proof, e}

def certify(+original: String, +id: String, +candidate: String, proof: Maybe<&2, {String.eq(Recognizer.output(Recognizer.delete(candidate, id)), Boundary.normalize(original)) == True{} : Bool}>) -> Creation<original, id>:
  match proof:
    case None{}:
      CreationRefused{"created video annotation did not reparse/delete to the boundary-normalized source"}
    case Some{e}:
      certify_stable(original, id, candidate, e, Evidence.same(Boundary.normalize(candidate), candidate))

def check_candidate(+original: String, +id: String, +candidate: String, safe: Bool) -> Creation<original, id>:
  match safe:
    case False{}:
      CreationRefused{"created video annotation is malformed, ambiguous, or in an unsafe context"}
    case True{}:
      certify(original, id, candidate, Evidence.same(Recognizer.output(Recognizer.delete(candidate, id)), Boundary.normalize(original)))

def create_allowed(+original: String, +id: String, body: String, allowed: Bool) -> Creation<original, id>:
  match allowed:
    case False{}:
      CreationRefused{"unsafe document, duplicate ID, or invalid ID"}
    case True{}:
      +candidate = String.append(Boundary.normalize(original), String.append("\n", String.append(body, String.append("\n^", String.append(id, "\n\n")))))
      check_candidate(original, id, candidate, Recognizer.safe(Recognizer.scan(candidate)))

def allowed(+id: String, parsed: Recognizer.Scan) -> Bool:
  Recognizer.Scan{+parts, +closed} = parsed
  Bool.and(Recognizer.id_valid(id), Bool.and(closed, Bool.and(Bool.not(Recognizer.errors(parts)), Bool.not(Recognizer.has_id(parts, id)))))

def create(+original: String, +id: String, body: String) -> Creation<original, id>:
  create_allowed(original, id, body, allowed(id, Recognizer.scan(original)))

def succeeded(-original: String, -id: String, result: Creation<original, id>) -> Bool:
  match result:
    case CreationRefused{message}:
      False{}
    case CreationReady{source, proof, stable}:
      True{}

# F is an actual source-level create followed by a NEW scan during delete.
# Refusal is a total unchanged-source operation, not a partial undefined value.
def cycle_result(+original: String, +id: String, result: Creation<original, id>) -> String:
  match result:
    case CreationRefused{message}:
      original
    case CreationReady{source, proof, stable}:
      Recognizer.output(Recognizer.delete(source, id))

def cycle(+original: String, +id: String, body: String) -> String:
  cycle_result(original, id, create(original, id, body))

def result_source(+original: String, +id: String, result: Creation<original, id>) -> String:
  match result:
    case CreationRefused{message}:
      original
    case CreationReady{source, proof, stable}:
      source
