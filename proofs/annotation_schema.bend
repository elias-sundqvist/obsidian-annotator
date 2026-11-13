import Base
import ./annotation_types.bend as T

# Result failures are explicit. No known field is silently coerced to its type.
# The value of the first member with this name. `member_exact` is the
# definition: it compares the key with every member, because `Bool.pick` has
# both of its answers computed. `member` stops at the member it finds; the
# caller asks about the next member before stepping to it, so one definition
# can do both. LAWS.bend proves the two equal (`schema_member_exact`).
def member_exact(fields: List<&2, T.Member>, +key: String) -> T.Field<T.Json>:
  match fields:
    case Nil{}:
      T.AbsentField{}
    case Con{T.Member{+name, value}, rest}:
      Bool.pick(T.Field<T.Json>, String.eq(name, key), T.PresentField{value}, member_exact(rest, key))

def head_named(fields: List<&2, T.Member>, key: String) -> Bool:
  match fields:
    case Nil{}:
      False{}
    case Con{T.Member{name, value}, rest}:
      String.eq(name, key)

def member_go(fields: List<&2, T.Member>, +key: String, found: Bool) -> T.Field<T.Json>:
  match fields found:
    case Nil{} _:
      T.AbsentField{}
    case Con{T.Member{name, value}, rest} True{}:
      T.PresentField{value}
    case Con{head, +rest} False{}:
      member_go(rest, key, head_named(rest, key))

def member(+fields: List<&2, T.Member>, +key: String) -> T.Field<T.Json>:
  member_go(fields, key, head_named(fields, key))

def has(fields: List<&2, T.Member>, +key: String) -> Bool:
  match fields:
    case Nil{}:
      False{}
    case Con{T.Member{name, value}, rest}:
      Bool.or(String.eq(name, key), has(rest, key))

def unique(fields: List<&2, T.Member>) -> Bool:
  match fields:
    case Nil{}:
      True{}
    case Con{T.Member{name, value}, +rest}:
      Bool.and(Bool.not(has(rest, name)), unique(rest))

def object_checked(fields: List<&2, T.Member>, valid: Bool) -> Result<&2, &2, String, List<&2, T.Member>>:
  match valid:
    case True{}:
      Done{fields}
    case False{}:
      Fail{"duplicate object key"}

def members_from_pairs(pairs: List<&2, T.JsonPair<T.Json>>) -> List<&2, T.Member>:
  match pairs:
    case Nil{}:
      Nil{}
    case Con{T.JsonPair{key, value}, rest}:
      Con{T.Member{key, value}, members_from_pairs(rest)}

def pairs_object(pairs: List<&2, T.JsonPair<T.Json>>) -> Result<&2, &2, String, List<&2, T.Member>>:
  +fields = members_from_pairs(pairs)
  object_checked(fields, unique(fields))

def object(value: T.Json) -> Result<&2, &2, String, List<&2, T.Member>>:
  match value:
    case T.JObject{pairs}:
      pairs_object(pairs)
    case _:
      Fail{"expected object"}

def text(value: T.Json) -> Result<&2, &2, String, String>:
  match value:
    case T.JString{s}:
      Done{s}
    case _:
      Fail{"expected string"}

def number(value: T.Json) -> Result<&2, &2, String, T.JsonNumber>:
  match value:
    case T.JNumber{n}:
      Done{n}
    case _:
      Fail{"expected number"}

def boolean(value: T.Json) -> Result<&2, &2, String, Bool>:
  match value:
    case T.JBool{b}:
      Done{b}
    case _:
      Fail{"expected boolean"}

def items(~A: Data, ~decode: T.Json -> Result<&2, &2, String, A>, values: List<&2, T.Json>) -> Result<&2, &2, String, List<&2, A>>:
  match values:
    case Nil{}:
      Done{Nil{}}
    case Con{h, rest}:
      do Result<&2, &2, String, List<&2, A>>:
        head : A <- decode(h)
        tail : List<&2, A> <- items(~A, ~decode, rest)
        return Con{head, tail}

def array(~A: Data, ~decode: T.Json -> Result<&2, &2, String, A>, value: T.Json) -> Result<&2, &2, String, List<&2, A>>:
  match value:
    case T.JArray{values}:
      items(~A, ~decode, values)
    case _:
      Fail{"expected array"}

def strings(value: T.Json) -> Result<&2, &2, String, List<&2, String>>:
  array(~String, ~text, value)

def optional_value(~A: Data, ~decode: T.Json -> Result<&2, &2, String, A>, value: T.Field<T.Json>) -> Result<&2, &2, String, T.Field<A>>:
  match value:
    case T.AbsentField{}:
      Done{T.AbsentField{}}
    case T.PresentField{json}:
      do Result<&2, &2, String, T.Field<A>>:
        decoded : A <- decode(json)
        return T.PresentField{decoded}

def at_field(-A: Data, key: String, result: Result<&2, &2, String, A>) -> Result<&2, &2, String, A>:
  match result:
    case Done{value}:
      Done{value}
    case Fail{error}:
      Fail{String.append(key, String.append(": ", error))}

def field(~A: Data, ~decode: T.Json -> Result<&2, &2, String, A>, fields: List<&2, T.Member>, +key: String) -> Result<&2, &2, String, T.Field<A>>:
  at_field(T.Field<A>, key, optional_value(~A, ~decode, member(fields, key)))

def required_value(~A: Data, ~decode: T.Json -> Result<&2, &2, String, A>, value: T.Field<T.Json>) -> Result<&2, &2, String, A>:
  match value:
    case T.AbsentField{}:
      Fail{"missing required field"}
    case T.PresentField{json}:
      decode(json)

def required(~A: Data, ~decode: T.Json -> Result<&2, &2, String, A>, fields: List<&2, T.Member>, +key: String) -> Result<&2, &2, String, A>:
  at_field(A, key, required_value(~A, ~decode, member(fields, key)))

def nullable(~A: Data, ~decode: T.Json -> Result<&2, &2, String, A>, value: T.Json) -> Result<&2, &2, String, T.Nullable<A>>:
  match value:
    case T.JNull{}:
      Done{T.NullField{}}
    case _:
      do Result<&2, &2, String, T.Nullable<A>>:
        decoded : A <- decode(value)
        return T.NonNullField{decoded}

def nullable_text(value: T.Json) -> Result<&2, &2, String, T.Nullable<String>>:
  nullable(~String, ~text, value)

# Whether a key is one of the known names. `known_exact` compares it with
# every name; `known` stops at the first that matches (`schema_known_exact`).
def known_exact(names: List<&2, String>, +key: String) -> Bool:
  match names:
    case Nil{}:
      False{}
    case Con{name, rest}:
      Bool.or(String.eq(name, key), known_exact(rest, key))

def head_is(names: List<&2, String>, key: String) -> Bool:
  match names:
    case Nil{}:
      False{}
    case Con{name, rest}:
      String.eq(name, key)

def known_go(names: List<&2, String>, +key: String, found: Bool) -> Bool:
  match names found:
    case Nil{} _:
      False{}
    case Con{name, rest} True{}:
      True{}
    case Con{name, +rest} False{}:
      known_go(rest, key, head_is(rest, key))

def known(+names: List<&2, String>, +key: String) -> Bool:
  known_go(names, key, head_is(names, key))

def keep_extension(head: T.Member, tail: List<&2, T.Member>, is_known: Bool) -> List<&2, T.Member>:
  match is_known:
    case True{}:
      tail
    case False{}:
      Con{head, tail}

def extensions(fields: List<&2, T.Member>, +names: List<&2, String>) -> List<&2, T.Member>:
  match fields:
    case Nil{}:
      Nil{}
    case Con{T.Member{+key, +value}, rest}:
      keep_extension(T.Member{key, value}, extensions(rest, names), known(names, key))

def offset(value: T.Json) -> Result<&2, &2, String, T.Utf16Offset>:
  do Result<&2, &2, String, T.Utf16Offset>:
    n : T.JsonNumber <- number(value)
    return T.Utf16Offset{n}

# Known selector names are strict; only genuinely unknown kinds are extensions.
def selector_dispatch(+fields: List<&2, T.Member>, kind: String, is_quote: Bool, is_position: Bool, is_range: Bool) -> Result<&2, &2, String, T.Selector>:
  match is_quote is_position is_range:
    case True{} _ _:
      do Result<&2, &2, String, T.Selector>:
        exact : String <- required(~String, ~text, fields, "exact")
        prefix : T.Field<String> <- field(~String, ~text, fields, "prefix")
        suffix : T.Field<String> <- field(~String, ~text, fields, "suffix")
        return T.QuoteSelector{exact, prefix, suffix, extensions(fields, ["type", "exact", "prefix", "suffix"])}
    case False{} True{} _:
      do Result<&2, &2, String, T.Selector>:
        start : T.Utf16Offset <- required(~T.Utf16Offset, ~offset, fields, "start")
        end : T.Utf16Offset <- required(~T.Utf16Offset, ~offset, fields, "end")
        return T.PositionSelector{start, end, extensions(fields, ["type", "start", "end"])}
    case False{} False{} True{}:
      do Result<&2, &2, String, T.Selector>:
        sc : String <- required(~String, ~text, fields, "startContainer")
        so : T.Utf16Offset <- required(~T.Utf16Offset, ~offset, fields, "startOffset")
        ec : String <- required(~String, ~text, fields, "endContainer")
        eo : T.Utf16Offset <- required(~T.Utf16Offset, ~offset, fields, "endOffset")
        return T.DomRangeSelector{sc, so, ec, eo, extensions(fields, ["type", "startContainer", "startOffset", "endContainer", "endOffset"])}
    case False{} False{} False{}:
      Done{T.ExtensionSelector{kind, fields}}

# Avoid the pinned compiler's enormous literal-string pattern decision tree.
# This is the same strict dispatch; the existing selector laws are unchanged.
def selector_kind(+fields: List<&2, T.Member>, +kind: String) -> Result<&2, &2, String, T.Selector>:
  selector_dispatch(fields, kind, String.eq(kind, "TextQuoteSelector"), String.eq(kind, "TextPositionSelector"), String.eq(kind, "RangeSelector"))

def selector(value: T.Json) -> Result<&2, &2, String, T.Selector>:
  do Result<&2, &2, String, T.Selector>:
    +fields : List<&2, T.Member> <- object(value)
    kind : String <- required(~String, ~text, fields, "type")
    selector_kind(fields, kind)

def selectors(value: T.Json) -> Result<&2, &2, String, List<&2, T.Selector>>:
  array(~T.Selector, ~selector, value)

def target(value: T.Json) -> Result<&2, &2, String, T.Target>:
  do Result<&2, &2, String, T.Target>:
    +fields : List<&2, T.Member> <- object(value)
    source : String <- required(~String, ~text, fields, "source")
    selected : T.Field<List<&2, T.Selector>> <- field(~List<&2, T.Selector>, ~selectors, fields, "selector")
    return T.Target{source, selected, extensions(fields, ["source", "selector"])}

def targets(value: T.Json) -> Result<&2, &2, String, List<&2, T.Target>>:
  array(~T.Target, ~target, value)

def title(value: T.Json) -> Result<&2, &2, String, T.Title>:
  match value:
    case T.JString{s}:
      Done{T.TitleText{s}}
    case _:
      do Result<&2, &2, String, T.Title>:
        values : List<&2, String> <- strings(value)
        return T.TitleList{values}

def document_link(value: T.Json) -> Result<&2, &2, String, T.DocumentLink>:
  do Result<&2, &2, String, T.DocumentLink>:
    +fields : List<&2, T.Member> <- object(value)
    href : String <- required(~String, ~text, fields, "href")
    rel : T.Field<String> <- field(~String, ~text, fields, "rel")
    mediaType : T.Field<String> <- field(~String, ~text, fields, "type")
    return T.DocumentLink{href, rel, mediaType, extensions(fields, ["href", "rel", "type"])}

def document_links(value: T.Json) -> Result<&2, &2, String, List<&2, T.DocumentLink>>:
  array(~T.DocumentLink, ~document_link, value)

def metadata_items(fields: List<&2, T.Member>) -> Result<&2, &2, String, List<&2, T.MetadataEntry>>:
  match fields:
    case Nil{}:
      Done{Nil{}}
    case Con{T.Member{key, value}, rest}:
      do Result<&2, &2, String, List<&2, T.MetadataEntry>>:
        texts : List<&2, String> <- strings(value)
        tail : List<&2, T.MetadataEntry> <- metadata_items(rest)
        return Con{T.MetadataEntry{key, texts}, tail}

def metadata(value: T.Json) -> Result<&2, &2, String, List<&2, T.MetadataEntry>>:
  do Result<&2, &2, String, List<&2, T.MetadataEntry>>:
    fields : List<&2, T.Member> <- object(value)
    metadata_items(fields)

def web(+fields: List<&2, T.Member>) -> Result<&2, &2, String, T.WebMetadata>:
  do Result<&2, &2, String, T.WebMetadata>:
    dc : T.Field<List<&2, T.MetadataEntry>> <- field(~List<&2, T.MetadataEntry>, ~metadata, fields, "dc")
    eprints : T.Field<List<&2, T.MetadataEntry>> <- field(~List<&2, T.MetadataEntry>, ~metadata, fields, "eprints")
    facebook : T.Field<List<&2, T.MetadataEntry>> <- field(~List<&2, T.MetadataEntry>, ~metadata, fields, "facebook")
    highwire : T.Field<List<&2, T.MetadataEntry>> <- field(~List<&2, T.MetadataEntry>, ~metadata, fields, "highwire")
    prism : T.Field<List<&2, T.MetadataEntry>> <- field(~List<&2, T.MetadataEntry>, ~metadata, fields, "prism")
    twitter : T.Field<List<&2, T.MetadataEntry>> <- field(~List<&2, T.MetadataEntry>, ~metadata, fields, "twitter")
    return T.WebMetadata{dc, eprints, facebook, highwire, prism, twitter}

def document(value: T.Json) -> Result<&2, &2, String, T.DocumentMetadata>:
  do Result<&2, &2, String, T.DocumentMetadata>:
    +fields : List<&2, T.Member> <- object(value)
    heading : T.Field<T.Title> <- field(~T.Title, ~title, fields, "title")
    links : T.Field<List<&2, T.DocumentLink>> <- field(~List<&2, T.DocumentLink>, ~document_links, fields, "link")
    fingerprint : T.Field<String> <- field(~String, ~text, fields, "documentFingerprint")
    favicon : T.Field<String> <- field(~String, ~text, fields, "favicon")
    namespaces : T.WebMetadata <- web(fields)
    return T.DocumentMetadata{heading, links, fingerprint, favicon, namespaces, extensions(fields, ["title", "link", "documentFingerprint", "favicon", "dc", "eprints", "facebook", "highwire", "prism", "twitter"])}

def permissions(value: T.Json) -> Result<&2, &2, String, T.Permissions>:
  do Result<&2, &2, String, T.Permissions>:
    +fields : List<&2, T.Member> <- object(value)
    readers : T.Field<List<&2, String>> <- field(~List<&2, String>, ~strings, fields, "read")
    editors : T.Field<List<&2, String>> <- field(~List<&2, String>, ~strings, fields, "update")
    deleters : T.Field<List<&2, String>> <- field(~List<&2, String>, ~strings, fields, "delete")
    return T.Permissions{readers, editors, deleters, extensions(fields, ["read", "update", "delete"])}

def user_info(value: T.Json) -> Result<&2, &2, String, T.UserInfo>:
  do Result<&2, &2, String, T.UserInfo>:
    +fields : List<&2, T.Member> <- object(value)
    display : T.Field<T.Nullable<String>> <- field(~T.Nullable<String>, ~nullable_text, fields, "display_name")
    return T.UserInfo{display, extensions(fields, ["display_name"])}

def nullable_user_info(value: T.Json) -> Result<&2, &2, String, T.Nullable<T.UserInfo>>:
  nullable(~T.UserInfo, ~user_info, value)

def links(value: T.Json) -> Result<&2, &2, String, T.Links>:
  do Result<&2, &2, String, T.Links>:
    +fields : List<&2, T.Member> <- object(value)
    html : T.Field<String> <- field(~String, ~text, fields, "html")
    context : T.Field<String> <- field(~String, ~text, fields, "incontext")
    json : T.Field<String> <- field(~String, ~text, fields, "json")
    return T.Links{html, context, json, extensions(fields, ["html", "incontext", "json"])}

def moderation(value: T.Json) -> Result<&2, &2, String, T.Moderation>:
  do Result<&2, &2, String, T.Moderation>:
    +fields : List<&2, T.Member> <- object(value)
    count : T.Field<T.JsonNumber> <- field(~T.JsonNumber, ~number, fields, "flagCount")
    return T.Moderation{count, extensions(fields, ["flagCount"])}

def identity(+fields: List<&2, T.Member>) -> Result<&2, &2, String, T.Identity>:
  do Result<&2, &2, String, T.Identity>:
    id : T.Field<String> <- field(~String, ~text, fields, "id")
    group : T.Field<String> <- field(~String, ~text, fields, "group")
    user : T.Field<String> <- field(~String, ~text, fields, "user")
    perms : T.Field<T.Permissions> <- field(~T.Permissions, ~permissions, fields, "permissions")
    info : T.Field<T.Nullable<T.UserInfo>> <- field(~T.Nullable<T.UserInfo>, ~nullable_user_info, fields, "user_info")
    return T.Identity{id, group, user, perms, info}

def content(+fields: List<&2, T.Member>) -> Result<&2, &2, String, T.Content>:
  do Result<&2, &2, String, T.Content>:
    comment : T.Field<String> <- field(~String, ~text, fields, "text")
    tags : T.Field<List<&2, String>> <- field(~List<&2, String>, ~strings, fields, "tags")
    selected : T.Field<List<&2, T.Target>> <- field(~List<&2, T.Target>, ~targets, fields, "target")
    refs : T.Field<List<&2, String>> <- field(~List<&2, String>, ~strings, fields, "references")
    return T.Content{comment, tags, selected, refs}

def audit(+fields: List<&2, T.Member>) -> Result<&2, &2, String, T.Audit>:
  do Result<&2, &2, String, T.Audit>:
    created : T.Field<String> <- field(~String, ~text, fields, "created")
    updated : T.Field<String> <- field(~String, ~text, fields, "updated")
    uri : T.Field<String> <- field(~String, ~text, fields, "uri")
    return T.Audit{created, updated, uri}

def visibility(+fields: List<&2, T.Member>) -> Result<&2, &2, String, T.Visibility>:
  do Result<&2, &2, String, T.Visibility>:
    hidden : T.Field<Bool> <- field(~Bool, ~boolean, fields, "hidden")
    flagged : T.Field<Bool> <- field(~Bool, ~boolean, fields, "flagged")
    mod : T.Field<T.Moderation> <- field(~T.Moderation, ~moderation, fields, "moderation")
    return T.Visibility{hidden, flagged, mod}

def annotation(value: T.Json) -> Result<&2, &2, String, T.AnnotationFields>:
  do Result<&2, &2, String, T.AnnotationFields>:
    +fields : List<&2, T.Member> <- object(value)
    ident : T.Identity <- identity(fields)
    data : T.Content <- content(fields)
    doc : T.Field<T.DocumentMetadata> <- field(~T.DocumentMetadata, ~document, fields, "document")
    times : T.Audit <- audit(fields)
    flags : T.Visibility <- visibility(fields)
    urls : T.Field<T.Links> <- field(~T.Links, ~links, fields, "links")
    return T.AnnotationFields{ident, data, doc, times, flags, urls, extensions(fields, ["id", "group", "user", "permissions", "user_info", "text", "tags", "target", "references", "document", "created", "updated", "uri", "hidden", "flagged", "moderation", "links"])}
