/**
 * Copy the string `text` to the clipboard.
 *
 * In most browsers, this function can only be called in response to a user
 * gesture. For example in response to a "click" event.
 *
 * @throws {Error}
 *   This function may throw an exception if the browser rejects the attempt
 *   to copy text.
 * @param {string} text
 */
export function copyText(text) {
  const temp = document.createElement('textarea'); // use textarea instead of input to preserve line breaks
  temp.value = text;
  temp.setAttribute('data-testid', 'copy-text');
  // Recipe from https://stackoverflow.com/a/34046084/14463679
  temp.contentEditable = 'true';
  document.body.appendChild(temp);
  temp.focus();

  try {
    const range = document.createRange();
    const selection = /** @type {Selection} */ (document.getSelection());

    selection.removeAllRanges();
    range.selectNodeContents(temp);
    selection.addRange(range);
    temp.setSelectionRange(0, temp.value.length);
    document.execCommand('copy');
  } finally {
    temp.remove();
  }
}
