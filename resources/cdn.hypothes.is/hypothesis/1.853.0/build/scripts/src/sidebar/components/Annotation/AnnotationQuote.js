import classnames from 'classnames';

import { isOrphan, quote } from '../../helpers/annotation-metadata';
import { withServices } from '../../service-context';
import { applyTheme } from '../../helpers/theme';

import Excerpt from '../Excerpt';

/**
 * @typedef {import('../../../types/api').Annotation} Annotation
 * @typedef {import('../../../types/config').MergedConfig} MergedConfig
 */

/**
 * @typedef AnnotationQuoteProps
 * @prop {Annotation} annotation
 * @prop {boolean} [isFocused] - Is this annotation currently focused?
 * @prop {MergedConfig} [settings] - Used for theming.
 */

/**
 * Display the selected text from the document associated with an annotation.
 *
 * @parm {AnnotationQuoteProps} props
 */
function AnnotationQuote({ annotation, isFocused, settings = {} }) {
  // The language for the quote may be different than the client's UI (set by
  // `<html lang="...">`).
  //
  // Use a blank string to indicate that it is unknown and it is up to the user
  // agent to pick a default or analyze the content and guess.
  //
  // For web documents we could do better here and gather language information
  // as part of the annotation anchoring process.
  const documentLanguage = '';

  return (
    <div
      className={classnames('AnnotationQuote', {
        'is-orphan': isOrphan(annotation),
      })}
    >
      <Excerpt
        collapsedHeight={35}
        inlineControls={true}
        overflowThreshold={20}
      >
        <blockquote
          className={classnames('AnnotationQuote__quote', {
            'is-focused': isFocused,
          })}
          dir="auto"
          lang={documentLanguage}
          style={applyTheme(['selectionFontFamily'], settings)}
        >
          {quote(annotation)}
        </blockquote>
      </Excerpt>
    </div>
  );
}

export default withServices(AnnotationQuote, ['settings']);
