import { generateHexString } from './random';

/** Generate a random ID to associate RPC requests and responses. */
function generateId() {
  return generateHexString(10);
}

/**
 * Return a Promise that rejects with an error after `delay` ms.
 */
function createTimeout(delay, message) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), delay);
  });
}

/**
 * Make a JSON-RPC call to a server in another frame using `postMessage`.
 *
 * @param {Window} frame - Frame to send call to
 * @param {string} origin - Origin filter for `window.postMessage` call
 * @param {string} method - Name of the JSON-RPC method
 * @param {any[]} params - Parameters of the JSON-RPC method
 * @param {number} [timeout] - Maximum time to wait in ms
 * @param {Window} [window_] - Test seam.
 * @param {string} [id] - Test seam.
 * @return {Promise<any>} - A Promise for the response to the call
 */
export function call(
  frame,
  origin,
  method,
  params = [],
  timeout = 2000,
  window_ = window,
  id = generateId()
) {
  // Send RPC request.
  const request = {
    jsonrpc: '2.0',
    method,
    params,
    id,
  };

  try {
    frame.postMessage(request, origin);
  } catch (err) {
    return Promise.reject(err);
  }

  // Await response or timeout.
  let listener;
  const response = new Promise((resolve, reject) => {
    listener = event => {
      if (event.origin !== origin) {
        // Not from the frame that we sent the request to.
        return;
      }

      if (
        !(event.data instanceof Object) ||
        event.data.jsonrpc !== '2.0' ||
        event.data.id !== id
      ) {
        // Not a valid JSON-RPC response.
        return;
      }

      const { error, result } = event.data;
      if (error !== undefined) {
        reject(error);
      } else if (result !== undefined) {
        resolve(result);
      } else {
        reject(new Error('RPC reply had no result or error'));
      }
    };
    window_.addEventListener('message', listener);
  });

  const responseOrTimeout = [response];
  if (timeout) {
    responseOrTimeout.push(
      createTimeout(timeout, `Request to ${origin} timed out`)
    );
  }

  // Cleanup and return.
  // FIXME: If we added a `Promise.finally` polyfill we could simplify this.
  return Promise.race(responseOrTimeout)
    .then(result => {
      window_.removeEventListener('message', listener);
      return result;
    })
    .catch(err => {
      window_.removeEventListener('message', listener);
      throw err;
    });
}
