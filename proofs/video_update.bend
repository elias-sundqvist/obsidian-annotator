import Base
import ./video_document.bend as Document
import ./evidence.bend as Evidence

# Every successful update carries checked whole-document equality after masking
# only the addressed video record. Certificates are transient, not stored data.
# The certificate is the equation `String.eq(..) == True`, one string comparison
# to produce; `string_same` in PROOF.bend proves it means the two are equal.
type Update<-original: String, -id: String> is Data:
  Refused{message: String}
  Updated{source: String, proof: {String.eq(Document.masked(source, id), Document.masked(original, id)) == True{} : Bool}}

def certify(+original: String, +id: String, candidate: String, proof: Maybe<&2, {String.eq(Document.masked(candidate, id), Document.masked(original, id)) == True{} : Bool}>) -> Update<original, id>:
  match proof:
    case Some{e}:
      Updated{candidate, e}
    case None{}:
      Refused{"updated video changed unrelated document bytes"}

def check(+original: String, +id: String, +candidate: String, good: Bool) -> Update<original, id>:
  match good:
    case True{}:
      certify(original, id, candidate, Evidence.same(Document.masked(candidate, id), Document.masked(original, id)))
    case False{}:
      Refused{"updated video does not reparse safely"}

def found(part: Maybe<&2, Document.Part>) -> Bool:
  match part:
    case Some{Document.Video{id, raw, fields, line}}:
      True{}
    case _:
      False{}

def replacement(+id: String, body: String, +old: String) -> String:
  String.append("\n", String.append(body, String.append("\n^", String.append(id, Bool.pick(String, String.ends_with(old, "\n\n"), "\n\n", "\n")))))

def candidate(+original: String, +id: String, body: String, parts: List<&2, Document.Part>, current: Maybe<&2, Document.Part>) -> Update<original, id>:
  match current:
    case Some{Document.Video{key, old, fields, line}}:
      +next = Document.replace_go(parts, id, replacement(id, body, old), "")
      +parsed = Document.scan(next)
      check(original, id, next, Bool.and(Document.safe(parsed), found(Document.lookup(Document.get_parts(parsed), id))))
    case _:
      Refused{"video annotation is missing"}

def compare(+original: String, +id: String, body: String, +parts: List<&2, Document.Part>, part: Document.Part, same: Bool) -> Update<original, id>:
  match same:
    case True{}:
      candidate(original, id, body, parts, Some{part})
    case False{}:
      Refused{"video annotation changed externally"}

def allowed(+original: String, +id: String, body: String, expected: String, +parts: List<&2, Document.Part>, current: Maybe<&2, Document.Part>, safe: Bool) -> Update<original, id>:
  match current safe:
    case Some{+part} True{}:
      compare(original, id, body, parts, part, String.eq(Document.part_raw(part), expected))
    case _ _:
      Refused{"unsafe document or missing video annotation"}

def update(+original: String, +id: String, body: String, expected: String) -> Update<original, id>:
  +parsed = Document.scan(original)
  +parts = Document.get_parts(parsed)
  allowed(original, id, body, expected, parts, Document.lookup(parts, id), Document.safe(parsed))

def output(+original: String, -id: String, result: Update<original, id>) -> String:
  match result:
    case Refused{message}:
      original
    case Updated{source, proof}:
      source

def succeeded(-original: String, -id: String, result: Update<original, id>) -> Bool:
  match result:
    case Refused{message}:
      False{}
    case Updated{source, proof}:
      True{}
