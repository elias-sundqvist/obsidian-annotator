import Base
import ./annotation_types.bend as T
import ./annotation_schema.bend as Schema

# The local adapter contract. No h-server principal/URL/date/range constraints.
def get(-A: Data, field: T.Field<A>, fallback: A) -> A:
  match field:
    case T.AbsentField{}:
      fallback
    case T.PresentField{value}:
      value

def prefer(-A: Data, overlay: T.Field<A>, original: T.Field<A>) -> T.Field<A>:
  match overlay:
    case T.AbsentField{}:
      original
    case T.PresentField{value}:
      T.PresentField{value}

def empty_links() -> T.Links:
  T.Links{T.AbsentField{}, T.AbsentField{}, T.AbsentField{}, Nil{}}

def local_permissions() -> T.Permissions:
  T.Permissions{T.PresentField{["Obsidian User"]}, T.PresentField{["Obsidian User"]}, T.PresentField{["Obsidian User"]}, Nil{}}

def local_user_info() -> T.Nullable<T.UserInfo>:
  T.NonNullField{T.UserInfo{T.PresentField{T.NonNullField{"Obsidian User"}}, Nil{}}}

def input(request: T.WriteRequest) -> T.AnnotationFields:
  match request:
    case T.CreateRequest{fields}:
      fields
    case T.UpdateRequest{path, fields}:
      fields

def id_field(value: T.Field<String>, fresh: String) -> String:
  match value:
    case T.AbsentField{}:
      fresh
    case T.PresentField{SNil{}}:
      fresh
    case T.PresentField{SCon{h, t}}:
      SCon{h, t}

def effective_id(fields: T.AnnotationFields, fresh: String) -> String:
  T.AnnotationFields{T.Identity{id, group, user, perms, info}, data, doc, audit, flags, links, extra} = fields
  id_field(id, fresh)

def normalize_write(fields: T.AnnotationFields, id: String) -> T.AnnotationFields:
  T.AnnotationFields{T.Identity{oldid, group, user, perms, info}, data, doc, audit, T.Visibility{hidden, flagged, mod}, links, extra} = fields
  T.AnnotationFields{T.Identity{T.PresentField{id}, group, user, perms, info}, data, doc, audit, T.Visibility{hidden, T.PresentField{False{}}, mod}, links, extra}

def strip_text(value: T.Field<String>) -> T.Field<String>:
  match value:
    case T.PresentField{SNil{}}:
      T.AbsentField{}
    case _:
      value

def strip_list(-A: Data, value: T.Field<List<&2, A>>) -> T.Field<List<&2, A>>:
  match value:
    case T.PresentField{Nil{}}:
      T.AbsentField{}
    case _:
      value

def strip_false(value: T.Field<Bool>) -> T.Field<Bool>:
  match value:
    case T.PresentField{False{}}:
      T.AbsentField{}
    case _:
      value

def strip_links(value: T.Field<T.Links>) -> T.Field<T.Links>:
  match value:
    case T.PresentField{T.Links{T.AbsentField{}, T.AbsentField{}, T.AbsentField{}, Nil{}}}:
      T.AbsentField{}
    case _:
      value

# stripDefaultValues omits ID/tags/default values and four identity properties. It
# does NOT remove references=[], empty document metadata, or unknown extensions.
def store(fields: T.AnnotationFields) -> T.StoredAnnotation:
  T.AnnotationFields{ident, T.Content{comment, tags, targets, refs}, doc, audit, T.Visibility{hidden, flagged, mod}, links, extra} = fields
  T.StoredAnnotation{T.AnnotationFields{T.Identity{T.AbsentField{}, T.AbsentField{}, T.AbsentField{}, T.AbsentField{}, T.AbsentField{}}, T.Content{strip_text(comment), T.AbsentField{}, strip_list(T.Target, targets), refs}, doc, audit, T.Visibility{strip_false(hidden), strip_false(flagged), mod}, strip_links(links), extra}}

def plan(+request: T.WriteRequest, fresh: String) -> T.WritePlan:
  +id = effective_id(input(request), fresh)
  +normalized = normalize_write(input(request), id)
  T.WritePlan{id, T.WriteResponse{normalized}, store(normalized)}

def write_tags(request: T.WriteRequest, present: T.Field<List<&2, String>>) -> Result<&2, &2, String, T.WriteRequest>:
  match present:
    case T.AbsentField{}:
      Fail{"write request requires tags array"}
    case T.PresentField{tags}:
      Done{request}

def validate_fields(request: T.WriteRequest, fields: T.AnnotationFields) -> Result<&2, &2, String, T.WriteRequest>:
  T.AnnotationFields{ident, T.Content{text, tags, targets, refs}, doc, audit, flags, links, extra} = fields
  write_tags(request, tags)

def validate_write(+request: T.WriteRequest) -> Result<&2, &2, String, T.WriteRequest>:
  validate_fields(request, input(request))

# Only top-level $ keys are removed by the pinned client's HTTP serialization.
def internal_member(head: T.JsonPair<T.Json>, tail: List<&2, T.JsonPair<T.Json>>, internal: Bool) -> List<&2, T.JsonPair<T.Json>>:
  match internal:
    case True{}:
      tail
    case False{}:
      Con{head, tail}

def wire_members(fields: List<&2, T.JsonPair<T.Json>>) -> List<&2, T.JsonPair<T.Json>>:
  match fields:
    case Nil{}:
      Nil{}
    case Con{T.JsonPair{+key, value}, rest}:
      internal_member(T.JsonPair{key, value}, wire_members(rest), String.starts_with(key, "$"))

def wire(value: T.Json) -> T.Json:
  match value:
    case T.JObject{fields}:
      T.JObject{wire_members(fields)}
    case _:
      value

def decode_create(value: T.Json) -> Result<&2, &2, String, T.WriteRequest>:
  do Result<&2, &2, String, T.WriteRequest>:
    fields : T.AnnotationFields <- Schema.annotation(wire(value))
    validate_write(T.CreateRequest{fields})

def decode_update(path: String, value: T.Json) -> Result<&2, &2, String, T.WriteRequest>:
  do Result<&2, &2, String, T.WriteRequest>:
    fields : T.AnnotationFields <- Schema.annotation(wire(value))
    validate_write(T.UpdateRequest{path, fields})

def quote(selector: T.Selector, visible: T.VisibleQuote) -> T.Selector:
  match selector:
    case T.QuoteSelector{exact, prefix, suffix, extra}:
      T.VisibleQuote{pre, post} = visible
      T.QuoteSelector{exact, prefer(String, pre, prefix), prefer(String, post, suffix), extra}
    case _:
      selector

def quote_list(selectors: List<&2, T.Selector>, +visible: T.VisibleQuote) -> List<&2, T.Selector>:
  match selectors:
    case Nil{}:
      Nil{}
    case Con{head, rest}:
      Con{quote(head, visible), quote_list(rest, visible)}

def target_quote(target: T.Target, visible: T.VisibleQuote) -> T.Target:
  T.Target{source, selected, extra} = target
  match selected:
    case T.AbsentField{}:
      T.Target{source, T.AbsentField{}, extra}
    case T.PresentField{selectors}:
      T.Target{source, T.PresentField{quote_list(selectors, visible)}, extra}

def first_target(targets: List<&2, T.Target>, visible: T.VisibleQuote) -> List<&2, T.Target>:
  match targets:
    case Nil{}:
      Nil{}
    case Con{head, rest}:
      Con{target_quote(head, visible), rest}

# Missing visible fields use stored/default values. Present empty values clear
# the field. This is the experiment's already-declared optional-section policy;
# legacy regex code instead throws on absent tags and may emit undefined text.
def load(anchor: String, stored: T.StoredAnnotation, visible: T.VisibleFields) -> T.LoadedAnnotation:
  T.StoredAnnotation{T.AnnotationFields{T.Identity{id, oldgroup, user, perms, info}, T.Content{comment, tags, targets, refs}, doc, audit, T.Visibility{hidden, flagged, mod}, links, extra}} = stored
  T.VisibleFields{visible_comment, visible_tags, context} = visible
  T.LoadedAnnotation{get(String, id, anchor), get(String, prefer(String, visible_comment, comment), ""), get(List<&2, String>, prefer(List<&2, String>, visible_tags, tags), Nil{}), first_target(get(List<&2, T.Target>, targets, Nil{}), context), "__world__", get(String, user, "Obsidian User"), get(T.Permissions, perms, local_permissions()), get(T.Nullable<T.UserInfo>, info, local_user_info()), get(Bool, hidden, False{}), get(Bool, flagged, False{}), get(T.Links, links, empty_links()), doc, audit, refs, mod, extra}

def loaded_fields(value: T.LoadedAnnotation) -> T.AnnotationFields:
  T.LoadedAnnotation{id, text, tags, targets, group, user, perms, info, hidden, flagged, links, doc, audit, refs, mod, extra} = value
  T.AnnotationFields{T.Identity{T.PresentField{id}, T.PresentField{group}, T.PresentField{user}, T.PresentField{perms}, T.PresentField{info}}, T.Content{T.PresentField{text}, T.PresentField{tags}, T.PresentField{targets}, refs}, doc, audit, T.Visibility{T.PresentField{hidden}, T.PresentField{flagged}, mod}, T.PresentField{links}, extra}
