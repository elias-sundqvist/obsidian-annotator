import retry from 'retry';

/**
 * Options passed that control how the operation is retried.
 *
 * See https://github.com/tim-kos/node-retry#retrytimeoutsoptions
 *
 * @typedef RetryOptions
 * @prop {number} minTimeout
 */

/**
 * Retry a Promise-returning operation until it succeeds or
 * fails after a set number of attempts.
 *
 * @template T
 * @param {() => Promise<T>} callback - The operation to retry
 * @param {RetryOptions} [options]
 * @return {Promise<T>} - Result of first successful `callback` call (ie. that
 *   did not reject)
 */
export function retryPromiseOperation(callback, options) {
  return new Promise((resolve, reject) => {
    const operation = retry.operation(options);
    operation.attempt(async () => {
      try {
        const result = await callback();

        // After a successful call `retry` still needs to be invoked without
        // arguments to clear internal timeouts.
        operation.retry();

        resolve(result);
      } catch (err) {
        if (!operation.retry(err)) {
          reject(err);
        }
      }
    });
  });
}
