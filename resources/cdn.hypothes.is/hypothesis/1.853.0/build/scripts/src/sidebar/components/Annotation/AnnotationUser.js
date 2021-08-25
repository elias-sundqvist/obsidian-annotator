/**
 * @typedef {import("../../../types/api").Annotation} Annotation
 */

/**
 * @typedef AnnotationUserProps
 * @prop {string} [authorLink]
 * @prop {string} displayName
 */

/**
 * Display information about an annotation's user. Link to the user's
 * activity if it is a first-party user or `settings.usernameUrl` is present.
 *
 * @param {AnnotationUserProps} props
 */
function AnnotationUser({ authorLink, displayName }) {
  if (authorLink) {
    return (
      <div className="AnnotationUser">
        <a
          className="AnnotationUser__link"
          href={authorLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          <h3 className="AnnotationUser__user-name">{displayName}</h3>
        </a>
      </div>
    );
  }

  return (
    <div className="AnnotationUser">
      <h3 className="AnnotationUser__user-name">{displayName}</h3>
    </div>
  );
}

export default AnnotationUser;
