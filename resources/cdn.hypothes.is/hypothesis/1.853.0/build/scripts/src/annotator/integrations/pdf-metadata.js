import { normalizeURI } from '../util/url';

/**
 * @typedef {import('../../types/pdfjs').PDFViewerApplication} PDFViewerApplication
 */

/**
 * @typedef Link
 * @prop {string} href
 */

/**
 * @typedef Metadata
 * @prop {string} title - The document title
 * @prop {Link[]} link - Array of URIs associated with this document
 * @prop {string} documentFingerprint - The fingerprint of this PDF. This is
 *   referred to as the "File Identifier" in the PDF spec. It may be a hash of
 *   part of the content if the PDF file does not have a File Identifier.
 */

/**
 * Wait for a PDFViewerApplication to be initialized.
 *
 * @param {PDFViewerApplication} app
 * @return {Promise<void>}
 */
function pdfViewerInitialized(app) {
  // `initializedPromise` was added in PDF.js v2.4.456.
  // See https://github.com/mozilla/pdf.js/pull/11607. In earlier versions the
  // `initialized` property can be queried.
  if (app.initializedPromise) {
    return app.initializedPromise;
  } else if (app.initialized) {
    return Promise.resolve();
  } else {
    // PDF.js < v2.4.456. The recommended approach is to listen for a `localized`
    // DOM event, but this assumes that PDF.js has been configured to publish
    // events to the DOM. Here we simply poll `app.initialized` because it is
    // easier.
    return new Promise(resolve => {
      const timeout = setInterval(() => {
        if (app.initialized) {
          clearTimeout(timeout);
          resolve();
        }
      }, 5);
    });
  }
}

/**
 * PDFMetadata extracts metadata about a loading/loaded PDF document from a
 * PDF.js PDFViewerApplication object.
 *
 * @example
 * // Invoke in a PDF.js viewer, before or after the PDF has finished loading.
 * const meta = new PDFMetadata(window.PDFViewerApplication)
 * meta.getUri().then(uri => {
 *    // Do something with the URL of the PDF.
 * })
 */
export class PDFMetadata {
  /**
   * Construct a `PDFMetadata` that returns URIs/metadata associated with a
   * given PDF viewer.
   *
   * @param {PDFViewerApplication} app - The `PDFViewerApplication` global from PDF.js
   */
  constructor(app) {
    /** @type {Promise<PDFViewerApplication>} */
    this._loaded = pdfViewerInitialized(app).then(() => {
      // Check if document has already loaded.
      if (app.downloadComplete) {
        return app;
      }

      return new Promise(resolve => {
        const finish = () => {
          if (app.eventBus) {
            app.eventBus.off('documentload', finish);
            app.eventBus.off('documentloaded', finish);
          } else {
            window.removeEventListener('documentload', finish);
          }
          resolve(app);
        };

        // Listen for "documentloaded" event which signals that the document
        // has been downloaded and the first page has been rendered.
        if (app.eventBus) {
          // PDF.js >= v1.6.210 dispatch events via an internal event bus.
          // PDF.js < v2.5.207 also dispatches events to the DOM.

          // `documentloaded` is the preferred event in PDF.js >= v2.0.943.
          // See https://github.com/mozilla/pdf.js/commit/7bc4bfcc8b7f52b14107f0a551becdf01643c5c2
          app.eventBus.on('documentloaded', finish);

          // `documentload` is dispatched by PDF.js < v2.1.266.
          app.eventBus.on('documentload', finish);
        } else {
          // PDF.js < v1.6.210 dispatches events only to the DOM.
          window.addEventListener('documentload', finish);
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
    return this._loaded.then(app => {
      let uri = getPDFURL(app);
      if (!uri) {
        uri = fingerprintToURN(app.pdfDocument.fingerprint);
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
      metadata,
    } = await app.pdfDocument.getMetadata();
    const documentFingerprint = app.pdfDocument.fingerprint;

    const url = getPDFURL(app);

    // Return the title metadata embedded in the PDF if available, otherwise
    // fall back to values from the `Content-Disposition` header or URL.
    //
    // PDFs contain two embedded metadata sources, the metadata stream and
    // the document info dictionary. Per the specification, the metadata stream
    // is preferred if available.
    //
    // This logic is similar to how PDF.js sets `document.title`.
    let title;
    if (metadata?.has('dc:title') && metadata.get('dc:title') !== 'Untitled') {
      title = /** @type {string} */ (metadata.get('dc:title'));
    } else if (documentInfo?.Title) {
      title = documentInfo.Title;
    } else if (contentDispositionFilename) {
      title = contentDispositionFilename;
    } else if (url) {
      title = filenameFromURL(url);
    } else {
      title = '';
    }

    const link = [{ href: fingerprintToURN(documentFingerprint) }];
    if (url) {
      link.push({ href: url });
    }

    return {
      title,
      link,
      documentFingerprint,
    };
  }
}

function fingerprintToURN(fingerprint) {
  return 'urn:x-pdf:' + String(fingerprint);
}

/**
 * @param {PDFViewerApplication} app
 * @return {string|null} - Valid URL string or `null`
 */
function getPDFURL(app) {
  if (!app.url) {
    return null;
  }

  const url = normalizeURI(app.url);

  // Local file:// URLs should not be saved in document metadata.
  // Entries in document.link should be URIs. In the case of
  // local files, omit the URL.
  if (url.indexOf('file://') !== 0) {
    return url;
  }

  return null;
}

/**
 * Return the last component of the path part of a URL.
 *
 * @param {string} url - A valid URL string
 * @return {string}
 */
function filenameFromURL(url) {
  const parsed = new URL(url);
  const pathSegments = parsed.pathname.split('/');
  return pathSegments[pathSegments.length - 1];
}
