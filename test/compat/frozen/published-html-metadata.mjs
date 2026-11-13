// .generated/published-client/src/annotator/util/url.js
function normalizeURI(uri, base = document.baseURI) {
  const absUrl = new URL(uri, base).href;
  return absUrl.toString().replace(/#.*/, "");
}

// .generated/published-client/src/annotator/integrations/html-metadata.js
var HTMLMetadata = class {
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
    const links = this._getLinks();
    for (let link of links) {
      if (link.rel === "canonical") {
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
    const metadata = {
      title: document.title,
      link: [],
      dc: this._getMetaTags("name", "dc."),
      eprints: this._getMetaTags("name", "eprints."),
      facebook: this._getMetaTags("property", "og:"),
      highwire: this._getMetaTags("name", "citation_"),
      prism: this._getMetaTags("name", "prism."),
      twitter: this._getMetaTags("name", "twitter:")
    };
    const favicon = this._getFavicon();
    if (favicon) {
      metadata.favicon = favicon;
    }
    metadata.title = this._getTitle(metadata);
    metadata.link = this._getLinks(metadata);
    const dcLink = metadata.link.find((link) => link.href.startsWith("urn:x-dc"));
    if (dcLink) {
      metadata.documentFingerprint = dcLink.href;
    }
    return metadata;
  }
  /**
   * Return an array of all the `content` values of `<meta>` tags on the page
   * where the value of the attribute begins with `<prefix>`.
   *
   * @param {string} attribute
   * @param {string} prefix - it is interpreted as a regex
   * @return {Record<string,string[]>}
   */
  _getMetaTags(attribute, prefix) {
    const tags = {};
    for (let meta of Array.from(this.document.querySelectorAll("meta"))) {
      const name = meta.getAttribute(attribute);
      const { content } = meta;
      if (name && content) {
        const match = name.match(RegExp(`^${prefix}(.+)$`, "i"));
        if (match) {
          const key = match[1].toLowerCase();
          if (tags[key]) {
            tags[key].push(content);
          } else {
            tags[key] = [content];
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
    const links = [{ href: this._getDocumentHref() }];
    const linkElements = Array.from(this.document.querySelectorAll("link"));
    for (let link of linkElements) {
      if (!["alternate", "canonical", "bookmark", "shortlink"].includes(link.rel)) {
        continue;
      }
      if (link.rel === "alternate") {
        if (link.type && link.type.match(/^application\/(rss|atom)\+xml/)) {
          continue;
        }
        if (link.hreflang) {
          continue;
        }
      }
      try {
        const href = this._absoluteUrl(link.href);
        links.push({ href, rel: link.rel, type: link.type });
      } catch (e) {
      }
    }
    for (let name of Object.keys(metadata.highwire)) {
      const values = metadata.highwire[name];
      if (name === "pdf_url") {
        for (let url of values) {
          try {
            links.push({
              href: this._absoluteUrl(url),
              type: "application/pdf"
            });
          } catch (e) {
          }
        }
      }
      if (name === "doi") {
        for (let doi of values) {
          if (doi.slice(0, 4) !== "doi:") {
            doi = `doi:${doi}`;
          }
          links.push({ href: doi });
        }
      }
    }
    for (let name of Object.keys(metadata.dc)) {
      const values = metadata.dc[name];
      if (name === "identifier") {
        for (let id of values) {
          if (id.slice(0, 4) === "doi:") {
            links.push({ href: id });
          }
        }
      }
    }
    const dcRelationValues = metadata.dc["relation.ispartof"];
    const dcIdentifierValues = metadata.dc.identifier;
    if (dcRelationValues && dcIdentifierValues) {
      const dcUrnRelationComponent = dcRelationValues[dcRelationValues.length - 1];
      const dcUrnIdentifierComponent = dcIdentifierValues[dcIdentifierValues.length - 1];
      const dcUrn = "urn:x-dc:" + encodeURIComponent(dcUrnRelationComponent) + "/" + encodeURIComponent(dcUrnIdentifierComponent);
      links.push({ href: dcUrn });
    }
    return links;
  }
  _getFavicon() {
    let favicon = null;
    for (let link of Array.from(this.document.querySelectorAll("link"))) {
      if (["shortcut icon", "icon"].includes(link.rel)) {
        try {
          favicon = this._absoluteUrl(link.href);
        } catch (e) {
        }
      }
    }
    return favicon;
  }
  /**
   * Convert a possibly relative URI to an absolute one. This will throw an
   * exception if the URL cannot be parsed.
   *
   * @param {string} url
   */
  _absoluteUrl(url) {
    return normalizeURI(url, this.document.baseURI);
  }
  // Get the true URI record when it's masked via a different protocol.
  // This happens when an href is set with a uri using the 'blob:' protocol
  // but the document can set a different uri through a <base> tag.
  _getDocumentHref() {
    const { href } = this.document.location;
    const allowedSchemes = ["http:", "https:", "file:"];
    const scheme = new URL(href).protocol;
    if (allowedSchemes.includes(scheme)) {
      return href;
    }
    if (this.document.baseURI && allowedSchemes.includes(new URL(this.document.baseURI).protocol)) {
      return this.document.baseURI;
    }
    return href;
  }
};
export {
  HTMLMetadata
};
