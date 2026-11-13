/**
 * Type definitions for objects returned from the Hypothesis API.
 *
 * The canonical reference is the API documentation at
 * https://h.readthedocs.io/en/latest/api-reference/
 */

/**
 * Metadata specifying how to call an API route.
 *
 * @typedef RouteMetadata
 * @prop {string} method - HTTP method
 * @prop {string} url - URL template
 * @prop {string} desc - Description of API route
 */

/**
 * A nested map of API route name to route metadata.
 *
 * @typedef {{ [key: string]: RouteMap|RouteMetadata }} RouteMap
 */

/**
 * Structure of the API index response (`/api`).
 *
 * @typedef IndexResponse
 * @prop {RouteMap} links
 */

/**
 * Structure of the Hypothesis links response (`/api/links`).
 *
 * This is a map of link name (eg. "account.settings") to URL. The URL may
 * include ":"-prefixed placeholders/variables.
 *
 * @typedef {Record<string, string>} LinksResponse
 */

/**
 * Selector which identifies a document region using the selected text plus
 * the surrounding context.
 *
 * @typedef TextQuoteSelector
 * @prop {'TextQuoteSelector'} type
 * @prop {string} exact
 * @prop {string} [prefix]
 * @prop {string} [suffix]
 */

/**
 * Selector which identifies a document region using UTF-16 character offsets
 * in the document body's `textContent`.
 *
 * @typedef TextPositionSelector
 * @prop {'TextPositionSelector'} type
 * @prop {number} start
 * @prop {number} end
 */

/**
 * Selector which identifies a document region using XPaths and character offsets.
 *
 * @typedef RangeSelector
 * @prop {'RangeSelector'} type
 * @prop {string} startContainer
 * @prop {string} endContainer
 * @prop {number} startOffset
 * @prop {number} endOffset
 */

/**
 * Serialized representation of a region of a document which an annotation
 * pertains to.
 *
 * @typedef {TextQuoteSelector | TextPositionSelector | RangeSelector} Selector
 */

/**
 * An entry in the `target` field of an annotation which identifies the document
 * and region of the document that it refers to.
 *
 * @typedef Target
 * @prop {string} source - URI of the document
 * @prop {Selector[]} [selector] - Region of the document
 */

/**
 * TODO - Fill out remaining properties
 *
 * @typedef Annotation
 * @prop {string} [id] -
 *   The server-assigned ID for the annotation. This is only set once the
 *   annotation has been saved to the backend.
 * @prop {string} $tag - A locally-generated unique identifier for annotations.
 *   This is set for all annotations, whether they have been saved to the backend
 *   or not.
 * @prop {string[]} [references]
 * @prop {string} created
 * @prop {boolean} [flagged]
 * @prop {string} group
 * @prop {string} updated
 * @prop {string[]} tags
 * @prop {string} text
 * @prop {string} uri
 * @prop {string} user
 * @prop {boolean} hidden
 *
 * @prop {object} document
 *   @prop {string} document.title
 *
 * @prop {object} permissions
 *   @prop {string[]} permissions.read
 *   @prop {string[]} permissions.update
 *   @prop {string[]} permissions.delete
 *
 * @prop {Target[]} target - Which document and region this annotation refers to.
 *   The Hypothesis API structure allows for multiple targets, but the current
 *   h server only allows for one target per annotation.
 *
 * @prop {object} [moderation]
 *   @prop {number} moderation.flagCount
 *
 * @prop {object} links
 *   @prop {string} [links.incontext] - A "bouncer" URL to the annotation in
 *     context on its target document
 *   @prop {string} [links.html] - An `h`-website URL to view the annotation
 *     by itself
 *
 * @prop {object} [user_info]
 *   @prop {string|null} user_info.display_name
 *
 * // Properties not present on API objects, but added by utilities in the client.
 * @prop {boolean} [$highlight]
 * @prop {boolean} [$orphan]
 * @prop {boolean} [$anchorTimeout]
 */

/**
 * An annotation which has been saved to the backend and assigned an ID.
 *
 * @typedef {Annotation & { id: string }} SavedAnnotation
 */

/**
 * @typedef Profile
 * @prop {string|null} userid
 * @prop {object} preferences
 *   @prop {boolean} [preferences.show_sidebar_tutorial]
 * @prop {Record<string, boolean>} features
 * @prop {object} [user_info]
 *   @prop {string|null} user_info.display_name
 *
 * @prop {unknown} [groups] - Deprecated.
 */

/**
 * TODO - Fill out remaining properties
 *
 * @typedef Organization
 * @prop {string} name
 * @prop {string} logo
 * @prop {string} id
 * @prop {boolean} [default]
 */

/**
 * @typedef GroupScopes
 * @prop {boolean} enforced
 * @prop {string[]} uri_patterns;
 */

/**
 * TODO - Fill out remaining properties
 *
 * @typedef Group
 * @prop {string} id - a.k.a. "pubid", unique per authority.
 * @prop {string} [groupid] - Fully-qualified ID with authority.
 *   Not all groups have a `groupid`.
 * @prop {'private'|'open'} type
 * @prop {Organization} organization - nb. This field is nullable in the API, but
 *   we assign a default organization on the client.
 * @prop {GroupScopes|null} scopes
 * @prop {object} links
 *   @prop {string} [links.html]
 *
 * // Properties not present on API objects, but added by utilities in the client.
 * @prop {string} logo
 * @prop {boolean} isMember
 * @prop {boolean} isScopedToUri
 * @prop {string} name
 * @prop {boolean} canLeave
 *
 */

/**
 * @typedef {NonNullable<Group["id"]|Group["groupid"]>} GroupIdentifier
 *
 * All Groups have an `id`, which is a server-assigned identifier. This is the
 * primary field used to identify a Group.
 *
 * In some cases, specifically LMS, it is necessary for an outside service to
 * be able to specify its own identifier. This gets stored in the `groupid`
 * field of a Group. Only some Groups have a `groupid`.
 *
 * Application logic operates on `id`s, but we may receive `groupid`s in some
 * cases from outside sevices, e.g. the `changeFocusModeUser` RPC method.
 */

/**
 * Query parameters for an `/api/search` API call.
 *
 * This type currently includes params that we've actually used.
 *
 * See https://h.readthedocs.io/en/latest/api-reference/#tag/annotations/paths/~1search/get
 * for the complete list and usage of each.
 *
 * @typedef SearchQuery
 * @prop {number} [limit]
 * @prop {string[]} [uri]
 * @prop {string} [group]
 * @prop {string} [order]
 * @prop {string} [references]
 * @prop {string} [search_after]
 * @prop {string} [sort]
 * @prop {boolean} [_separate_replies] - Unofficial param that causes replies
 *   to be returned in a separate `replies` field
 */

/**
 * Response to an `/api/search` API call.
 *
 * See https://h.readthedocs.io/en/latest/api-reference/#tag/annotations/paths/~1search/get
 *
 * @typedef SearchResponse
 * @prop {number} total
 * @prop {Annotation[]} rows
 * @prop {Annotation[]} [replies] - Unofficial property that is populated if
 *   `_separate_replies` query param was specified
 */

// Make TypeScript treat this file as a module.
export const unused = {};
