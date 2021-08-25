/**
 * @typedef AuthState
 * @prop {string|null} [userid]
 * @prop {string} [displayName]
 */

/**
 * An object representing document metadata.
 *
 * @typedef {Object} DocMetadata
 * @prop {string=} documentFingerprint - Optional PDF fingerprint for current document
 */

/**
 * An object representing document info.
 *
 * @typedef {Object} DocumentInfo
 * @prop {string=} [uri] - Current document URL
 * @prop {DocMetadata} [metadata] - Document metadata
 */

export default class VersionData {
  /**
   * @param {AuthState} userInfo
   * @param {DocumentInfo} documentInfo
   * @param {Window} window_ - test seam
   */
  constructor(userInfo, documentInfo, window_ = window) {
    const noValueString = 'N/A';
    const docMeta = documentInfo.metadata;

    let accountString = noValueString;
    if (userInfo.userid) {
      accountString = userInfo.userid;
      if (userInfo.displayName) {
        accountString = `${userInfo.displayName} (${accountString})`;
      }
    }

    this.version = '__VERSION__'; // replaced by versionify
    this.userAgent = window_.navigator.userAgent;
    this.url = documentInfo.uri || noValueString;
    this.fingerprint =
      docMeta && docMeta.documentFingerprint
        ? docMeta.documentFingerprint
        : noValueString;
    this.account = accountString;
    this.timestamp = new Date().toString();
  }

  /**
   * Return a single formatted string representing version data, suitable for
   * copying to the clipboard.
   *
   * @return {string} - Single, multiline string representing current version data
   */
  asFormattedString() {
    return `Version: ${this.version}
User Agent: ${this.userAgent}
URL: ${this.url}
Fingerprint: ${this.fingerprint}
Account: ${this.account}
Date: ${this.timestamp}
`;
  }

  /**
   * Return a single, encoded URL string of version data suitable for use in
   * a querystring (as the value of a single parameter)
   *
   * @return {string} - URI-encoded string
   */
  asEncodedURLString() {
    return encodeURIComponent(this.asFormattedString());
  }
}
