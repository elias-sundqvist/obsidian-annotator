import Base
import ./boundary.bend as Boundary
import ./recognizer.bend as Recognizer
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
      CreationRefused{"created annotation does not own a complete trailing blank-line separator"}
    case Some{e}:
      CreationReady{candidate, proof, e}

def certify(+original: String, +id: String, +candidate: String, proof: Maybe<&2, {String.eq(Recognizer.output(Recognizer.delete(candidate, id)), Boundary.normalize(original)) == True{} : Bool}>) -> Creation<original, id>:
  match proof:
    case None{}:
      CreationRefused{"created annotation did not reparse/delete to the boundary-normalized source"}
    case Some{e}:
      certify_stable(original, id, candidate, e, Evidence.same(Boundary.normalize(candidate), candidate))

# The comparison is made on the text in hand; `same` says that text is what
# the delete returns. The equation is carried over inside the answer, so
# whether there is an answer is decided by the comparison alone.
def deleted_proof(-original: String, -id: String, -candidate: String, -text: String, same: {Recognizer.SourceEdit{text, None{}} == Recognizer.delete(candidate, id) : Recognizer.Edit}, e: {String.eq(text, Boundary.normalize(original)) == True{} : Bool}) -> {String.eq(Recognizer.output(Recognizer.delete(candidate, id)), Boundary.normalize(original)) == True{} : Bool}:
  %same : {String.eq(Recognizer.output(_), Boundary.normalize(original)) == True{} : Bool}
  e

def deleted_same(-original: String, -id: String, -candidate: String, -text: String, same: {Recognizer.SourceEdit{text, None{}} == Recognizer.delete(candidate, id) : Recognizer.Edit}, found: Maybe<&2, {String.eq(text, Boundary.normalize(original)) == True{} : Bool}>) -> Maybe<&2, {String.eq(Recognizer.output(Recognizer.delete(candidate, id)), Boundary.normalize(original)) == True{} : Bool}>:
  match found:
    case None{}:
      None{}
    case Some{e}:
      Some{deleted_proof(original, id, candidate, text, same, e)}

def check_deleted(+original: String, -id: String, -candidate: String, +text: String, same: {Recognizer.SourceEdit{text, None{}} == Recognizer.delete(candidate, id) : Recognizer.Edit}) -> Maybe<&2, {String.eq(Recognizer.output(Recognizer.delete(candidate, id)), Boundary.normalize(original)) == True{} : Bool}>:
  deleted_same(original, id, candidate, text, same, Evidence.same(text, Boundary.normalize(original)))

# The candidate is deleted from once. `Recognizer.delete` scans it and refuses
# an unsafe document with an error, so that one scan both checks the candidate
# and yields the text the certificate compares; `same` ties the value in hand
# to the delete the certificate speaks of.
def check_candidate(+original: String, +id: String, +candidate: String, deleted: Recognizer.Edit, same: {deleted == Recognizer.delete(candidate, id) : Recognizer.Edit}) -> Creation<original, id>:
  match deleted:
    case Recognizer.SourceEdit{text, Some{refusal}}:
      CreationRefused{"created annotation is malformed, ambiguous, or in an unsafe context"}
    case Recognizer.SourceEdit{text, None{}}:
      certify(original, id, candidate, check_deleted(original, id, candidate, text, same))


def create_allowed(+original: String, +id: String, body: String, allowed: Bool) -> Creation<original, id>:
  match allowed:
    case False{}:
      CreationRefused{"unsafe document, duplicate ID, or invalid ID"}
    case True{}:
      +candidate = String.append(Boundary.normalize(original), String.append(body, String.append("\n^", String.append(id, "\n\n"))))
      check_candidate(original, id, candidate, Recognizer.delete(candidate, id), {==})

def allowed(+id: String, parsed: Recognizer.Scan) -> Bool:
  Recognizer.Scan{+parts, +closed} = parsed
  Bool.and(Recognizer.identifier_nonempty(id), Bool.and(closed, Bool.and(Bool.not(Recognizer.errors(parts)), Bool.not(Recognizer.has_id(parts, id)))))

def create(+original: String, +id: String, body: String) -> Creation<original, id>:
  create_allowed(original, id, body, allowed(id, Recognizer.scan(original)))

# The source a creation made, if it made one.
def created(-original: String, -id: String, result: Creation<original, id>) -> Maybe<&2, String>:
  match result:
    case CreationRefused{message}:
      None{}
    case CreationReady{source, proof, stable}:
      Some{source}

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
