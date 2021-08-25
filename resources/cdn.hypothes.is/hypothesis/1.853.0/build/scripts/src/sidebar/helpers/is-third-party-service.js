/**
 * @typedef {import('../../types/config').MergedConfig} MergedConfig
 */

import { serviceConfig } from '../config/service-config';

/**
 * Return `true` if the first configured service is a "third-party" service.
 *
 * Return `true` if the first custom annotation service configured in the
 * services array in the host page is a third-party service, `false` otherwise.
 *
 * If no custom annotation services are configured then return `false`.
 *
 * @param {MergedConfig} settings
 * @return {boolean}
 */
export function isThirdPartyService(settings) {
  const service = serviceConfig(settings);

  if (service?.authority) {
    return service.authority !== settings.authDomain;
  }
  return false;
}
