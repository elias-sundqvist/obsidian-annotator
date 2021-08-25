/** @typedef {import("../../../types/api").Annotation} Annotation */

/**
 * @typedef AnnotationDocumentInfoProps
 * @prop {string} [domain] - The domain associated with the document
 * @prop {string} [link] - A link to the document (directly)
 * @prop {string} title - The document's title
 */

/**
 * Render some metadata about an annotation's document and link to it
 * if a link is available.
 *
 * @param {AnnotationDocumentInfoProps} props
 */
export default function AnnotationDocumentInfo({ domain, link, title }) {
  return (
    <div className="u-layout-row u-horizontal-rhythm">
      <div className="u-color-text--muted">
        on &quot;
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer">
            {title}
          </a>
        ) : (
          <span>{title}</span>
        )}
        &quot;
      </div>
      {domain && <span className="u-color-text--muted">({domain})</span>}
    </div>
  );
}
