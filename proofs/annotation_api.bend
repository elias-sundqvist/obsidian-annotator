import Base
import ./annotation_types.bend as T
import ./annotation_schema.bend as Schema
import ./annotation_json.bend as Encode
import ./annotation_contract.bend as Contract
import ./annotation_visible.bend as Visible

# One compilation/import boundary for the typed semantic API.
def decode(value: T.Json) -> Result<&2, &2, String, T.AnnotationFields>:
  Schema.annotation(value)

def encode(value: T.AnnotationFields) -> T.Json:
  Encode.annotation(value)

def create(value: T.Json) -> Result<&2, &2, String, T.WriteRequest>:
  Contract.decode_create(value)

def update(path: String, value: T.Json) -> Result<&2, &2, String, T.WriteRequest>:
  Contract.decode_update(path, value)

def plan(value: T.WriteRequest, fresh: String) -> T.WritePlan:
  Contract.plan(value, fresh)

def load(anchor: String, value: T.StoredAnnotation, visible: T.VisibleFields) -> T.LoadedAnnotation:
  Contract.load(anchor, value, visible)

def loaded_fields(value: T.LoadedAnnotation) -> T.AnnotationFields:
  Contract.loaded_fields(value)

def visible_fields(display: String, comment: T.Field<String>, tags: T.Field<String>) -> T.VisibleFields:
  Visible.fields(display, comment, tags)

def visible_tags(value: T.Field<String>) -> T.Field<List<&2, String>>:
  Visible.tags(value)

# The compiler may qualify a nullary constructor's JS tag. Obtain its ABI from
# Bend rather than guessing an unqualified name in the JSON boundary adapter.
def json_null() -> T.Json:
  T.JNull{}
