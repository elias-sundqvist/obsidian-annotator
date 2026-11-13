import Base
import ./annotation_types.bend as T

# Build JSON values from typed fields; the existing raw syntax remains separate.
def pairs(fields: List<&2, T.Member>) -> List<&2, T.JsonPair<T.Json>>:
  match fields:
    case Nil{}:
      Nil{}
    case Con{T.Member{key, value}, rest}:
      Con{T.JsonPair{key, value}, pairs(rest)}

def object(fields: List<&2, T.Member>) -> T.Json:
  T.JObject{pairs(fields)}

def append(xs: List<&2, T.Member>, ys: List<&2, T.Member>) -> List<&2, T.Member>:
  List.append(&2, T.Member, xs, ys)

def text(value: String) -> T.Json:
  T.JString{value}

def number(value: T.JsonNumber) -> T.Json:
  T.JNumber{value}

def boolean(value: Bool) -> T.Json:
  T.JBool{value}

def texts(values: List<&2, String>) -> List<&2, T.Json>:
  match values:
    case Nil{}:
      Nil{}
    case Con{h, t}:
      Con{T.JString{h}, texts(t)}

def strings(values: List<&2, String>) -> T.Json:
  T.JArray{texts(values)}

def field(~A: Data, ~encode: A -> T.Json, key: String, value: T.Field<A>, tail: List<&2, T.Member>) -> List<&2, T.Member>:
  match value:
    case T.AbsentField{}:
      tail
    case T.PresentField{data}:
      Con{T.Member{key, encode(data)}, tail}

def nullable(~A: Data, ~encode: A -> T.Json, value: T.Nullable<A>) -> T.Json:
  match value:
    case T.NullField{}:
      T.JNull{}
    case T.NonNullField{data}:
      encode(data)

def nullable_text(value: T.Nullable<String>) -> T.Json:
  nullable(~String, ~text, value)

def offset(value: T.Utf16Offset) -> T.Json:
  T.Utf16Offset{n} = value
  T.JNumber{n}

def selector(value: T.Selector) -> T.Json:
  match value:
    case T.QuoteSelector{exact, prefix, suffix, extra}:
      object(Con{T.Member{"type", T.JString{"TextQuoteSelector"}}, Con{T.Member{"exact", T.JString{exact}}, field(~String, ~text, "prefix", prefix, field(~String, ~text, "suffix", suffix, extra))}})
    case T.PositionSelector{start, end, extra}:
      object(Con{T.Member{"type", T.JString{"TextPositionSelector"}}, Con{T.Member{"start", offset(start)}, Con{T.Member{"end", offset(end)}, extra}}})
    case T.DomRangeSelector{sc, so, ec, eo, extra}:
      object(Con{T.Member{"type", T.JString{"RangeSelector"}}, Con{T.Member{"startContainer", T.JString{sc}}, Con{T.Member{"startOffset", offset(so)}, Con{T.Member{"endContainer", T.JString{ec}}, Con{T.Member{"endOffset", offset(eo)}, extra}}}}})
    case T.ExtensionSelector{kind, members}:
      object(members)

def selector_items(values: List<&2, T.Selector>) -> List<&2, T.Json>:
  match values:
    case Nil{}:
      Nil{}
    case Con{h, rest}:
      Con{selector(h), selector_items(rest)}

def selectors(values: List<&2, T.Selector>) -> T.Json:
  T.JArray{selector_items(values)}

def target(value: T.Target) -> T.Json:
  T.Target{source, selected, extra} = value
  object(Con{T.Member{"source", T.JString{source}}, field(~List<&2, T.Selector>, ~selectors, "selector", selected, extra)})

def target_items(values: List<&2, T.Target>) -> List<&2, T.Json>:
  match values:
    case Nil{}:
      Nil{}
    case Con{h, rest}:
      Con{target(h), target_items(rest)}

def targets(values: List<&2, T.Target>) -> T.Json:
  T.JArray{target_items(values)}

def title(value: T.Title) -> T.Json:
  match value:
    case T.TitleText{s}:
      T.JString{s}
    case T.TitleList{values}:
      strings(values)

def document_link(value: T.DocumentLink) -> T.Json:
  T.DocumentLink{href, rel, mediaType, extra} = value
  object(Con{T.Member{"href", T.JString{href}}, field(~String, ~text, "rel", rel, field(~String, ~text, "type", mediaType, extra))})

def link_items(values: List<&2, T.DocumentLink>) -> List<&2, T.Json>:
  match values:
    case Nil{}:
      Nil{}
    case Con{h, rest}:
      Con{document_link(h), link_items(rest)}

def document_links(values: List<&2, T.DocumentLink>) -> T.Json:
  T.JArray{link_items(values)}

def metadata_items(values: List<&2, T.MetadataEntry>) -> List<&2, T.Member>:
  match values:
    case Nil{}:
      Nil{}
    case Con{T.MetadataEntry{key, values}, rest}:
      Con{T.Member{key, strings(values)}, metadata_items(rest)}

def metadata(values: List<&2, T.MetadataEntry>) -> T.Json:
  object(metadata_items(values))

def web(value: T.WebMetadata, tail: List<&2, T.Member>) -> List<&2, T.Member>:
  T.WebMetadata{dc, eprints, facebook, highwire, prism, twitter} = value
  field(~List<&2, T.MetadataEntry>, ~metadata, "dc", dc, field(~List<&2, T.MetadataEntry>, ~metadata, "eprints", eprints, field(~List<&2, T.MetadataEntry>, ~metadata, "facebook", facebook, field(~List<&2, T.MetadataEntry>, ~metadata, "highwire", highwire, field(~List<&2, T.MetadataEntry>, ~metadata, "prism", prism, field(~List<&2, T.MetadataEntry>, ~metadata, "twitter", twitter, tail))))))

def document(value: T.DocumentMetadata) -> T.Json:
  T.DocumentMetadata{heading, docLinks, fingerprint, favicon, namespaces, extra} = value
  object(field(~T.Title, ~title, "title", heading, field(~List<&2, T.DocumentLink>, ~document_links, "link", docLinks, field(~String, ~text, "documentFingerprint", fingerprint, field(~String, ~text, "favicon", favicon, web(namespaces, extra))))))

def permissions(value: T.Permissions) -> T.Json:
  T.Permissions{readers, editors, deleters, extra} = value
  object(field(~List<&2, String>, ~strings, "read", readers, field(~List<&2, String>, ~strings, "update", editors, field(~List<&2, String>, ~strings, "delete", deleters, extra))))

def user_info(value: T.UserInfo) -> T.Json:
  T.UserInfo{display, extra} = value
  object(field(~T.Nullable<String>, ~nullable_text, "display_name", display, extra))

def nullable_user_info(value: T.Nullable<T.UserInfo>) -> T.Json:
  nullable(~T.UserInfo, ~user_info, value)

def links(value: T.Links) -> T.Json:
  T.Links{html, context, json, extra} = value
  object(field(~String, ~text, "html", html, field(~String, ~text, "incontext", context, field(~String, ~text, "json", json, extra))))

def moderation(value: T.Moderation) -> T.Json:
  T.Moderation{count, extra} = value
  object(field(~T.JsonNumber, ~number, "flagCount", count, extra))

def identity(value: T.Identity, tail: List<&2, T.Member>) -> List<&2, T.Member>:
  T.Identity{id, group, user, perms, info} = value
  field(~String, ~text, "id", id, field(~String, ~text, "group", group, field(~String, ~text, "user", user, field(~T.Permissions, ~permissions, "permissions", perms, field(~T.Nullable<T.UserInfo>, ~nullable_user_info, "user_info", info, tail)))))

def content(value: T.Content, tail: List<&2, T.Member>) -> List<&2, T.Member>:
  T.Content{comment, tags, selected, refs} = value
  field(~String, ~text, "text", comment, field(~List<&2, String>, ~strings, "tags", tags, field(~List<&2, T.Target>, ~targets, "target", selected, field(~List<&2, String>, ~strings, "references", refs, tail))))

def audit(value: T.Audit, tail: List<&2, T.Member>) -> List<&2, T.Member>:
  T.Audit{created, updated, uri} = value
  field(~String, ~text, "created", created, field(~String, ~text, "updated", updated, field(~String, ~text, "uri", uri, tail)))

def visibility(value: T.Visibility, tail: List<&2, T.Member>) -> List<&2, T.Member>:
  T.Visibility{hidden, flagged, mod} = value
  field(~Bool, ~boolean, "hidden", hidden, field(~Bool, ~boolean, "flagged", flagged, field(~T.Moderation, ~moderation, "moderation", mod, tail)))

def annotation(value: T.AnnotationFields) -> T.Json:
  T.AnnotationFields{ident, data, doc, times, flags, urls, extra} = value
  object(identity(ident, content(data, field(~T.DocumentMetadata, ~document, "document", doc, audit(times, visibility(flags, field(~T.Links, ~links, "links", urls, extra)))))))
