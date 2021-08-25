/**
 * Create the JSON-serializable subset of annotator configuration that should
 * be passed to the sidebar application.
 *
 * @param {Record<string, any>} config
 */
export function createSidebarConfig(config) {
  const sidebarConfig = { ...config };

  // Some config settings are not JSON-stringifiable (e.g. JavaScript
  // functions) and will be omitted when the config is JSON-stringified.
  // Add a JSON-stringifiable option for each of these so that the sidebar can
  // at least know whether the callback functions were provided or not.
  if (sidebarConfig.services?.length > 0) {
    const service = sidebarConfig.services[0];
    if (service.onLoginRequest) {
      service.onLoginRequestProvided = true;
    }
    if (service.onLogoutRequest) {
      service.onLogoutRequestProvided = true;
    }
    if (service.onSignupRequest) {
      service.onSignupRequestProvided = true;
    }
    if (service.onProfileRequest) {
      service.onProfileRequestProvided = true;
    }
    if (service.onHelpRequest) {
      service.onHelpRequestProvided = true;
    }
  }

  // Remove several annotator-only properties.
  //
  // nb. We don't currently strip all the annotator-only properties here.
  // That's OK because validation / filtering happens in the sidebar app itself.
  // It just results in unnecessary content in the sidebar iframe's URL string.
  ['notebookAppUrl', 'sidebarAppUrl'].forEach(key => delete sidebarConfig[key]);

  return sidebarConfig;
}
