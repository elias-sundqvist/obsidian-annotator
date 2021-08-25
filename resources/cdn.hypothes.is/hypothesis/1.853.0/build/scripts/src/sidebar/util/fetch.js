/**
 * An error indicating a failed network request.
 *
 * Failures that this error can represent include:
 *
 *  - Failures to send an HTTP request
 *  - Requests that returned non-2xx responses
 *  - Failures to parse the response in the expected format (eg. JSON)
 */
export class FetchError extends Error {
  /**
   * @param {string} url - The URL that was requested. This may be different
   *   than the final URL of the response if a redirect happened.
   * @param {Response|null} response - The response to the `fetch` request or
   *   `null` if the fetch failed
   * @param {string} [reason] - Additional details about the error. This might
   *   include context of the network request or a server-provided error in
   *   the response.
   */
  constructor(url, response, reason = '') {
    let message = 'Network request failed';
    if (response) {
      message += ` (${response.status})`;
    }
    if (reason) {
      message += `: ${reason}`;
    }
    super(message);

    this.url = url;
    this.response = response;
    this.reason = reason;
  }
}

/**
 * Execute a network request and return the parsed JSON response.
 *
 * fetchJSON wraps the browser's `fetch` API to standardize error handling when
 * making network requests that return JSON responses.
 *
 * @param {string} url
 * @param {RequestInit} [init] - Parameters for `fetch` request
 * @return {Promise<any>} - Parsed JSON response or `null` if response status is 204 (No Content)
 * @throws {FetchError} if the request fails, returns a non-2xx status or a JSON
 *   response is expected but cannot be parsed
 */
export async function fetchJSON(url, init) {
  let response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    // If the request fails for any reason, wrap the result in a `FetchError`.
    // Different browsers use different error messages for `fetch` failures, so
    // wrapping the error allows downstream clients to handle this uniformly.
    throw new FetchError(url, null, err.message);
  }

  if (response.status === 204 /* No Content */) {
    return null;
  }

  // Attempt to parse a JSON response. This may fail even if the status code
  // indicates success.
  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new FetchError(url, response, 'Failed to parse response');
  }

  // If the HTTP status indicates failure, attempt to extract a server-provided
  // reason from the response, assuming certain conventions for the formatting
  // of error responses.
  if (!response.ok) {
    throw new FetchError(url, response, data?.reason);
  }

  return data;
}
