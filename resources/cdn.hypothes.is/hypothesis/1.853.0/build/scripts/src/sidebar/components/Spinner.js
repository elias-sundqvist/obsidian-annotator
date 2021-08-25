/**
 * Loading indicator.
 */
export default function Spinner() {
  // The `Spinner__container` div only exists to center the Spinner within
  // the `<Spinner>` component element. Once consumers of this component
  // have been converted to Preact, we should be able to remove this.
  return (
    <div className="Spinner__container">
      {/* See `.Spinner` CSS definition for an explanation of the nested spans. */}
      <span className="Spinner">
        <span>
          <span />
        </span>
      </span>
    </div>
  );
}
