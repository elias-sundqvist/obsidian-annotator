import Base
import ./annotation_types.bend as T

def content(value: T.AnnotationFields) -> T.Content:
  T.AnnotationFields{ident, data, doc, audit, visibility, links, extra} = value
  data

def document(value: T.AnnotationFields) -> T.Field<T.DocumentMetadata>:
  T.AnnotationFields{ident, data, doc, audit, visibility, links, extra} = value
  doc

def extensions(value: T.AnnotationFields) -> List<&2, T.Member>:
  T.AnnotationFields{ident, data, doc, audit, visibility, links, extra} = value
  extra

def identity(value: T.AnnotationFields) -> T.Identity:
  T.AnnotationFields{ident, data, doc, audit, visibility, links, extra} = value
  ident

def flagged(value: T.AnnotationFields) -> T.Field<Bool>:
  T.AnnotationFields{ident, data, doc, audit, T.Visibility{hidden, flag, mod}, links, extra} = value
  flag

def stored(value: T.StoredAnnotation) -> T.AnnotationFields:
  T.StoredAnnotation{fields} = value
  fields

def loaded_identity(value: T.LoadedAnnotation) -> T.Identity:
  T.LoadedAnnotation{id, text, tags, targets, group, user, perms, info, hidden, flag, links, doc, audit, refs, mod, extra} = value
  T.Identity{T.PresentField{id}, T.PresentField{group}, T.PresentField{user}, T.PresentField{perms}, T.PresentField{info}}

def loaded_extensions(value: T.LoadedAnnotation) -> List<&2, T.Member>:
  T.LoadedAnnotation{id, text, tags, targets, group, user, perms, info, hidden, flag, links, doc, audit, refs, mod, extra} = value
  extra

def quote_exact(value: T.Selector) -> T.Field<String>:
  match value:
    case T.QuoteSelector{exact, prefix, suffix, extra}:
      T.PresentField{exact}
    case _:
      T.AbsentField{}

def plan_id(value: T.WritePlan) -> String:
  T.WritePlan{id, response, saved} = value
  id
