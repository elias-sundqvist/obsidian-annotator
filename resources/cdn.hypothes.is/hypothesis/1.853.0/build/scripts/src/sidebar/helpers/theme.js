const supportedThemeProperties = {
  accentColor: 'color',
  appBackgroundColor: 'backgroundColor',
  ctaBackgroundColor: 'backgroundColor',
  ctaTextColor: 'color',
  selectionFontFamily: 'fontFamily',
  annotationFontFamily: 'fontFamily',
};

/**
 * Name of a theme element which can be configured.
 *
 * @typedef {keyof supportedThemeProperties} ThemeProperty
 */

/**
 * Subset of the config from the host page which includes theme configuration.
 *
 * @typedef Settings
 * @prop {Object.<ThemeProperty,string>} [branding]
 */

/**
 * Return a React `style` object suitable for use as the value of the `style`
 * attr in a React element, with styling rules for the requested set of
 * `themeProperties`.
 *
 * `supportedThemeProperties` defines a whitelist of properties that may be
 * set by a partner's configuration for theme customization. For a given theme
 * property's styling to be present in the returned style object, all of the
 * following must be true:
 *
 * - The theme property is present in the `supportedThemeProperties` whitelist
 * - `settings.branding` (derived from client configuration) has an entry
 *    for this theme property
 *
 * See https://reactjs.org/docs/dom-elements.html#style
 *
 * @param {ThemeProperty[]} themeProperties -
 *   Which of the supported theme properties should have applied rules in the `style`
 *   object
 * @param {Settings} settings
 * @return {Object.<string,string>} - Object that can be passed as the `style` prop
 *
 * @example
 * let themeProperties = ['accentColor', 'ctaTextColor', 'foo'];
 * let settings = { branding: {
 *     accentColor: '#ffc',
 *     selectionFontFamily: 'Times New Roman'
 *   }
 * };
 * // Only two of the `themeProperties` are whitelisted and
 * // only one of those has a value in the `settings` object, so:
 * applyTheme(themeProperties, settings); // -> { color: '#ffc '}
 */
export function applyTheme(themeProperties, settings) {
  /** @type {Object.<string,string>} */
  const style = {};
  if (!settings.branding) {
    return style;
  }

  themeProperties.forEach(themeProp => {
    const propertyName = supportedThemeProperties[themeProp];
    const propertyValue = settings.branding[themeProp];
    if (propertyName && propertyValue) {
      style[propertyName] = propertyValue;
    }
  });

  return style;
}
