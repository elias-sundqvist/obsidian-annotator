import { SvgIcon } from '@hypothesis/frontend-shared';

/**
 * A banner shown at the top of the PDF viewer if the PDF cannot be annotated
 * by Hypothesis.
 */
export default function WarningBanner() {
  return (
    <div className="WarningBanner WarningBanner--notice">
      <div className="WarningBanner__type">
        <SvgIcon name="caution" className="WarningBanner__icon" />
      </div>
      <div className="WarningBanner__message">
        <strong>This PDF does not contain selectable text:</strong>{' '}
        <a
          target="_blank"
          rel="noreferrer"
          href="https://web.hypothes.is/help/how-to-ocr-optimize-pdfs/"
        >
          Learn how to fix this
        </a>{' '}
        in order to annotate with Hypothesis.
      </div>
    </div>
  );
}
