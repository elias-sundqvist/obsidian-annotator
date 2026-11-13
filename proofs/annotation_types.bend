import Base

# Derived from pinned client 6e9f06ad6 and the local adapter, not h-server rules.
# JSON parsing remains an external boundary; numeric lexemes avoid silently
# truncating client Numbers to Bend Nat/U32/F32 or changing UTF-16 offset units.
type JsonNumber is Data:
  JsonNumber{literal: String}

type JsonPair<-A: Data> is Data:
  JsonPair{key: String, value: A}

type Json is Data:
  JNull{}
  JBool{value: Bool}
  JNumber{value: JsonNumber}
  JString{value: String}
  JArray{items: List<&2, Json>}
  JObject{members: List<&2, JsonPair<Json>>}

type Member is Data:
  Member{key: String, value: Json}

type Field<-A: Data> is Data:
  AbsentField{}
  PresentField{value: A}

type Nullable<-A: Data> is Data:
  NullField{}
  NonNullField{value: A}

type Utf16Offset is Data:
  Utf16Offset{number: JsonNumber}

type Selector is Data:
  QuoteSelector{exact: String, prefix: Field<String>, suffix: Field<String>, extensions: List<&2, Member>}
  PositionSelector{start: Utf16Offset, end: Utf16Offset, extensions: List<&2, Member>}
  DomRangeSelector{startContainer: String, startOffset: Utf16Offset, endContainer: String, endOffset: Utf16Offset, extensions: List<&2, Member>}
  ExtensionSelector{kind: String, members: List<&2, Member>}

type Target is Data:
  Target{source: String, selectors: Field<List<&2, Selector>>, extensions: List<&2, Member>}

type Title is Data:
  TitleText{value: String}
  TitleList{values: List<&2, String>}

type DocumentLink is Data:
  DocumentLink{href: String, rel: Field<String>, mediaType: Field<String>, extensions: List<&2, Member>}

type MetadataEntry is Data:
  MetadataEntry{key: String, values: List<&2, String>}

type WebMetadata is Data:
  WebMetadata{dc: Field<List<&2, MetadataEntry>>, eprints: Field<List<&2, MetadataEntry>>, facebook: Field<List<&2, MetadataEntry>>, highwire: Field<List<&2, MetadataEntry>>, prism: Field<List<&2, MetadataEntry>>, twitter: Field<List<&2, MetadataEntry>>}

type DocumentMetadata is Data:
  DocumentMetadata{title: Field<Title>, links: Field<List<&2, DocumentLink>>, fingerprint: Field<String>, favicon: Field<String>, web: WebMetadata, extensions: List<&2, Member>}

type Permissions is Data:
  Permissions{read: Field<List<&2, String>>, update: Field<List<&2, String>>, delete: Field<List<&2, String>>, extensions: List<&2, Member>}

type UserInfo is Data:
  UserInfo{displayName: Field<Nullable<String>>, extensions: List<&2, Member>}

type Links is Data:
  Links{html: Field<String>, incontext: Field<String>, json: Field<String>, extensions: List<&2, Member>}

type Moderation is Data:
  Moderation{flagCount: Field<JsonNumber>, extensions: List<&2, Member>}

type Identity is Data:
  Identity{id: Field<String>, group: Field<String>, user: Field<String>, permissions: Field<Permissions>, userInfo: Field<Nullable<UserInfo>>}

type Content is Data:
  Content{text: Field<String>, tags: Field<List<&2, String>>, targets: Field<List<&2, Target>>, references: Field<List<&2, String>>}

type Audit is Data:
  Audit{created: Field<String>, updated: Field<String>, uri: Field<String>}

type Visibility is Data:
  Visibility{hidden: Field<Bool>, flagged: Field<Bool>, moderation: Field<Moderation>}

type AnnotationFields is Data:
  AnnotationFields{identity: Identity, content: Content, document: Field<DocumentMetadata>, audit: Audit, visibility: Visibility, links: Field<Links>, extensions: List<&2, Member>}

# Distinct phases: client PATCH sends a whole object, not a JSON merge patch.
# The current adapter ignores pathId for non-DELETE writes; retain it explicitly.
type WriteRequest is Data:
  CreateRequest{input: AnnotationFields}
  UpdateRequest{pathId: String, input: AnnotationFields}

type StoredAnnotation is Data:
  StoredAnnotation{fields: AnnotationFields}

type WriteResponse is Data:
  WriteResponse{fields: AnnotationFields}

type LoadedAnnotation is Data:
  LoadedAnnotation{id: String, text: String, tags: List<&2, String>, targets: List<&2, Target>, group: String, user: String, permissions: Permissions, userInfo: Nullable<UserInfo>, hidden: Bool, flagged: Bool, links: Links, document: Field<DocumentMetadata>, audit: Audit, references: Field<List<&2, String>>, moderation: Field<Moderation>, extensions: List<&2, Member>}

type DeleteResponse is Data:
  DeleteResponse{id: String, deleted: Bool}

type SearchResponse is Data:
  SearchResponse{rows: List<&2, LoadedAnnotation>, total: Nat}

type VisibleQuote is Data:
  VisibleQuote{prefix: Field<String>, suffix: Field<String>}

type VisibleFields is Data:
  VisibleFields{comment: Field<String>, tags: Field<List<&2, String>>, quote: VisibleQuote}

type WritePlan is Data:
  WritePlan{id: String, response: WriteResponse, stored: StoredAnnotation}
