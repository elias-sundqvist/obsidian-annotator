import { SvgIcon } from '@hypothesis/frontend-shared';

/**
 * @typedef ShareLinkProps
 * @prop {string} iconName - The name of the SVG icon to use for this link
 * @prop {string} label - Accessible label/tooltip for link
 * @prop {string} uri - URI for sharing this annotation
 */

/**
 * A single sharing link as a list item
 *
 * @param {ShareLinkProps} props
 */
function ShareLink({ label, iconName, uri }) {
  return (
    <li className="ShareLinks__link">
      <a
        aria-label={label}
        href={uri}
        title={label}
        target="_blank"
        rel="noopener noreferrer"
      >
        <SvgIcon name={iconName} className="ShareLinks__icon" />
      </a>
    </li>
  );
}

/**
 * @typedef ShareLinksProps
 * @prop {string} shareURI - The URL to share
 */

/**
 * A list of share links to social-media platforms.
 */
function ShareLinks({ shareURI }) {
  // This is the double-encoded format needed for other services (the entire
  // URI needs to be encoded because it's used as the value of querystring params)
  const encodedURI = encodeURIComponent(shareURI);

  return (
    <ul className="ShareLinks">
      <ShareLink
        iconName="twitter"
        label="Tweet share link"
        uri={`https://twitter.com/intent/tweet?url=${encodedURI}&hashtags=annotated`}
      />

      <ShareLink
        iconName="facebook"
        label="Share on Facebook"
        uri={`https://www.facebook.com/sharer/sharer.php?u=${encodedURI}`}
      />

      <ShareLink
        iconName="email"
        label="Share via email"
        uri={`mailto:?subject=${encodeURIComponent(
          "Let's Annotate"
        )}&body=${encodedURI}`}
      />
    </ul>
  );
}

export default ShareLinks;
