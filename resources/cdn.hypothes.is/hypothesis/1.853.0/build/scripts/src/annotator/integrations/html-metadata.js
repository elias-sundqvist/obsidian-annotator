/*
 ** Adapted from:
 ** https://github.com/openannotation/annotator/blob/v1.2.x/src/plugin/document.coffee
 **
 ** Annotator v1.2.10
 ** https://github.com/openannotation/annotator
 **
 ** Copyright 2015, the Annotator project contributors.
 ** Dual licensed under the MIT and GPLv3 licenses.
 ** https://github.com/openannotation/annotator/blob/master/LICENSE
 */

/**
 * nb. The `DocumentMetadata` type is renamed to avoid a conflict with the
 * `DocumentMetadata` class below.
 *
 * @typedef {import('../../types/annotator').DocumentMetadata} Metadata
 */

import { normalizeURI } from '../util/url';

/**
 * @typedef Link
 * @prop {string} link.href
 * @prop {string} [link.rel]
 * @prop {string} [link.type]
 */

/**
 * Extension of the `Metadata` type with non-optional fields for `dc`, `eprints` etc.
 *
 * @typedef HTMLDocumentMetadata
 * @prop {string} title
 * @prop {Link[]} link
 * @prop {Object.<string, string[]>} dc
 * @prop {Object.<string, string[]>} eprints
 * @prop {Object.<string, string[]>} facebook
 * @prop {Object.<string, string[]>} highwire
 * @prop {Object.<string, string[]>} prism
 * @prop {Object.<string, string[]>} twitter
 * @prop {string} [favicon]
 * @prop {string} [documentFingerprint]
 */

/**
 * HTMLMetadata reads metadata/links from the current HTML document.
 */
export class HTMLMetadata {
  /**
   * @param {object} [options]
   *   @param {Document} [options.document]
   */
  constructor(options = {}) {
    this.document = options.document || document;
  }

  /**
   * Returns the primary URI for the document being annotated
   *
   * @return {string}
   */
  uri() {
    let uri = decodeURIComponent(this._getDocumentHref());

    // Use the `link[rel=canonical]` element's href as the URL if present.
    const links = this._getLinks();
    for (let link of links) {
      if (link.rel === 'canonical') {
        uri = link.href;
      }
    }

    return uri;
  }

  /**
   * Return metadata for the current page.
   *
   * @return {HTMLDocumentMetadata}
   */
  getDocumentMetadata() {
    /** @type {HTMLDocumentMetadata} */
    const metadata = {
      title: document.title,
      link: [],

      dc: this._getMetaTags('dc', 'name', '.'),
      eprints: this._getMetaTags('eprints', 'name', '.'),
      facebook: this._getMetaTags('og', 'property', ':'),
      highwire: this._getMetaTags('citation', 'name', '_'),
      prism: this._getMetaTags('prism', 'name', '.'),
      twitter: this._getMetaTags('twitter', 'name', ':'),
    };

    const favicon = this._getFavicon();
    if (favicon) {
      metadata.favicon = favicon;
    }

    metadata.title = this._getTitle(metadata);
    metadata.link = this._getLinks(metadata);

    const dcLink = metadata.link.find(link => link.href.startsWith('urn:x-dc'));
    if (dcLink) {
      metadata.documentFingerprint = dcLink.href;
    }

    return metadata;
  }

  /**
   * Return an array of all the `content` values of `<meta>` tags on the page
   * where the attribute named `attribute` begins with `<prefix><delimiter>`.
   *
   * @param {string} prefix
   * @param {string} attribute
   * @param {string} delimiter
   * @return {Object.<string,string[]>}
   */
  _getMetaTags(prefix, attribute, delimiter) {
    /** @type {Object.<string,string[]>} */
    const tags = {};
    for (let meta of Array.from(this.document.querySelectorAll('meta'))) {
      const name = meta.getAttribute(attribute);
      const { content } = meta;
      if (name) {
        const match = name.match(RegExp(`^${prefix}${delimiter}(.+)$`, 'i'));
        if (match) {
          const n = match[1];
          if (tags[n]) {
            tags[n].push(content);
          } else {
            tags[n] = [content];
          }
        }
      }
    }
    return tags;
  }

  /** @param {HTMLDocumentMetadata} metadata */
  _getTitle(metadata) {
    if (metadata.highwire.title) {
      return metadata.highwire.title[0];
    } else if (metadata.eprints.title) {
      return metadata.eprints.title[0];
    } else if (metadata.prism.title) {
      return metadata.prism.title[0];
    } else if (metadata.facebook.title) {
      return metadata.facebook.title[0];
    } else if (metadata.twitter.title) {
      return metadata.twitter.title[0];
    } else if (metadata.dc.title) {
      return metadata.dc.title[0];
    } else {
      return this.document.title;
    }
  }

  /**
   * Get document URIs from `<link>` and `<meta>` elements on the page.
   *
   * @param {Pick<HTMLDocumentMetadata, 'highwire'|'dc'>} [metadata] -
   *   Dublin Core and Highwire metadata parsed from `<meta>` tags.
   * @return {Link[]}
   */
  _getLinks(metadata = { dc: {}, highwire: {} }) {
    /** @type {Link[]} */
    const links = [{ href: this._getDocumentHref() }];

    // Extract links from `<link>` tags with certain `rel` values.
    const linkElements = Array.from(this.document.querySelectorAll('link'));
    for (let link of linkElements) {
      if (
        !['alternate', 'canonical', 'bookmark', 'shortlink'].includes(link.rel)
      ) {
        continue;
      }

      if (link.rel === 'alternate') {
        // Ignore RSS feed links.
        if (link.type && link.type.match(/^application\/(rss|atom)\+xml/)) {
          continue;
        }
        // Ignore alternate languages.
        if (link.hreflang) {
          continue;
        }
      }

      try {
        const href = this._absoluteUrl(link.href);
        links.push({ href, rel: link.rel, type: link.type });
      } catch (e) {
        // Ignore URIs which cannot be parsed.
      }
    }

    // Look for links in scholar metadata
    for (let name of Object.keys(metadata.highwire)) {
      const values = metadata.highwire[name];
      if (name === 'pdf_url') {
        for (let url of values) {
          try {
            links.push({
              href: this._absoluteUrl(url),
              type: 'application/pdf',
            });
          } catch (e) {
            // Ignore URIs which cannot be parsed.
          }
        }
      }

      // Kind of a hack to express DOI identifiers as links but it's a
      // convenient place to look them up later, and somewhat sane since
      // they don't have a type.
      if (name === 'doi') {
        for (let doi of values) {
          if (doi.slice(0, 4) !== 'doi:') {
            doi = `doi:${doi}`;
          }
          links.push({ href: doi });
        }
      }
    }

    // Look for links in Dublin Core data
    for (let name of Object.keys(metadata.dc)) {
      const values = metadata.dc[name];
      if (name === 'identifier') {
        for (let id of values) {
          if (id.slice(0, 4) === 'doi:') {
            links.push({ href: id });
          }
        }
      }
    }

    // Look for a link to identify the resource in Dublin Core metadata
    const dcRelationValues = metadata.dc['relation.ispartof'];
    const dcIdentifierValues = metadata.dc.identifier;
    if (dcRelationValues && dcIdentifierValues) {
      const dcUrnRelationComponent =
        dcRelationValues[dcRelationValues.length - 1];
      const dcUrnIdentifierComponent =
        dcIdentifierValues[dcIdentifierValues.length - 1];
      const dcUrn =
        'urn:x-dc:' +
        encodeURIComponent(dcUrnRelationComponent) +
        '/' +
        encodeURIComponent(dcUrnIdentifierComponent);
      links.push({ href: dcUrn });
    }

    return links;
  }

  _getFavicon() {
    let favicon = null;
    for (let link of Array.from(this.document.querySelectorAll('link'))) {
      if (['shortcut icon', 'icon'].includes(link.rel)) {
        try {
          favicon = this._absoluteUrl(link.href);
        } catch (e) {
          // Ignore URIs which cannot be parsed.
        }
      }
    }
    return favicon;
  }

  /**
   * Convert a possibly relative URI to an absolute one. This will throw an
   * exception if the URL cannot be parsed.
   */
  _absoluteUrl(url) {
    return normalizeURI(url, this.document.baseURI);
  }

  // Get the true URI record when it's masked via a different protocol.
  // This happens when an href is set with a uri using the 'blob:' protocol
  // but the document can set a different uri through a <base> tag.
  _getDocumentHref() {
    const { href } = this.document.location;
    const allowedSchemes = ['http:', 'https:', 'file:'];

    // Use the current document location if it has a recognized scheme.
    const scheme = new URL(href).protocol;
    if (allowedSchemes.includes(scheme)) {
      return href;
    }

    // Otherwise, try using the location specified by the <base> element.
    if (
      this.document.baseURI &&
      allowedSchemes.includes(new URL(this.document.baseURI).protocol)
    ) {
      return this.document.baseURI;
    }

    // Fall back to returning the document URI, even though the scheme is not
    // in the allowed list.
    return href;
  }
}
