// ../../submodules/hypothesis-client-annotator-fork/src/annotator/util/url.js
function normalizeURI(uri, base = document.baseURI) {
  const absUrl = new URL(uri, base).href;
  return absUrl.toString().replace(/#.*/, "");
}

// ../../submodules/hypothesis-client-annotator-fork/src/annotator/integrations/pdf-metadata.js
function pdfViewerInitialized(app) {
  if (app.initializedPromise) {
    return app.initializedPromise;
  } else if (app.initialized) {
    return Promise.resolve();
  } else {
    return new Promise((resolve) => {
      const timeout = setInterval(() => {
        if (app.initialized) {
          clearTimeout(timeout);
          resolve();
        }
      }, 5);
    });
  }
}
var PDFMetadata = class {
  /**
   * Construct a `PDFMetadata` that returns URIs/metadata associated with a
   * given PDF viewer.
   *
   * @param {PDFViewerApplication} app - The `PDFViewerApplication` global from PDF.js
   */
  constructor(app) {
    this._loaded = pdfViewerInitialized(app).then(() => {
      if (app.downloadComplete) {
        return app;
      }
      return new Promise((resolve) => {
        const finish = () => {
          if (app.eventBus) {
            app.eventBus.off("documentload", finish);
            app.eventBus.off("documentloaded", finish);
          } else {
            window.removeEventListener("documentload", finish);
          }
          resolve(app);
        };
        if (app.eventBus) {
          app.eventBus.on("documentloaded", finish);
          app.eventBus.on("documentload", finish);
        } else {
          window.addEventListener("documentload", finish);
        }
      });
    });
  }
  /**
   * Return the URI of the PDF.
   *
   * If the PDF is currently loading, the returned promise resolves once loading
   * is complete.
   *
   * @return {Promise<string>}
   */
  getUri() {
    return this._loaded.then((app) => {
      let uri = getPDFURL(app);
      if (!uri) {
        uri = fingerprintToURN(getFingerprint(app));
      }
      return uri;
    });
  }
  /**
   * Returns metadata about the document.
   *
   * If the PDF is currently loading, the returned promise resolves once loading
   * is complete.
   *
   * @return {Promise<Metadata>}
   */
  async getMetadata() {
    const app = await this._loaded;
    const {
      info: documentInfo,
      contentDispositionFilename,
      metadata
    } = await app.pdfDocument.getMetadata();
    const documentFingerprint = getFingerprint(app);
    const url = getPDFURL(app);
    let title;
    if (metadata?.has("dc:title") && metadata.get("dc:title") !== "Untitled") {
      title = /** @type {string} */
      metadata.get("dc:title");
    } else if (documentInfo?.Title) {
      title = documentInfo.Title;
    } else if (contentDispositionFilename) {
      title = contentDispositionFilename;
    } else if (url) {
      title = filenameFromURL(url);
    } else {
      title = "";
    }
    const link = [{ href: fingerprintToURN(documentFingerprint) }];
    if (url) {
      link.push({ href: url });
    }
    return {
      title,
      link,
      documentFingerprint
    };
  }
};
function getFingerprint(app) {
  if (Array.isArray(app.pdfDocument.fingerprints)) {
    return app.pdfDocument.fingerprints[0];
  } else {
    return (
      /** @type {string} */
      app.pdfDocument.fingerprint
    );
  }
}
function fingerprintToURN(fingerprint) {
  return `urn:x-pdf:${fingerprint}`;
}
function getPDFURL(app) {
  if (!app.url) {
    return null;
  }
  const url = normalizeURI(app.url);
  if (url.indexOf("file://") !== 0) {
    return url;
  }
  return null;
}
function filenameFromURL(url) {
  const parsed = new URL(url);
  const pathSegments = parsed.pathname.split("/");
  return pathSegments[pathSegments.length - 1];
}
export {
  PDFMetadata
};
