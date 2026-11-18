/**
 * Titles from a property ("Show titles from this property"): where Annotator names an annotation note or its source,
 * it can say what a property of the note says instead of the file's name. Only what is shown changes: no file is
 * renamed and no note is written.
 */

/** The property the reader named, as it may be used: one line, without the colon it may have been typed with. Empty for none. */
export function titlePropertyName(value: unknown): string {
    if (typeof value !== 'string') return '';
    const name = value.trim().replace(/:+$/, '').trim();
    return !name || name.length > 100 || /[\r\n]/.test(name) ? '' : name;
}

const LIMIT = 200;

/** A link's words as a note shows them: `[[Paper|Its title]]` is "Its title", `[[Folder/Paper.md#Part]]` "Paper", `[words](address)` "words". */
function linkWords(text: string): string {
    return text
        .replace(/!?\[\[([^\]]*)\]\]/g, (_whole, inner: string) => {
            const bar = inner.indexOf('|');
            if (bar >= 0) return inner.slice(bar + 1);
            const path = inner.replace(/[#^].*$/, '');
            return (path.split('/').pop() || '').replace(/\.md$/i, '') || inner.replace(/^[#^]+/, '');
        })
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1');
}

/** One value as words: a string (its links as their words) or a number (YAML reads `title: 1984` as one). */
function words(value: unknown): string {
    const text =
        typeof value === 'string'
            ? linkWords(value)
            : typeof value === 'number' && Number.isFinite(value)
              ? String(value)
              : '';
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length > LIMIT ? `${clean.slice(0, LIMIT - 1).trimEnd()}…` : clean;
}

/**
 * What the named property of a note says, as a title: the first entry of a list that says something, a link as the
 * words it shows, white space made single. Empty when the property is not named, is missing, or says nothing that is
 * words: the caller then names the note as it always has. A property is looked for by its name, and failing that by
 * its name in any case, as Obsidian treats property names.
 */
export function titleFromProperty(frontmatter: Record<string, unknown> | null | undefined, name: string): string {
    if (!name || !frontmatter || typeof frontmatter !== 'object') return '';
    let value: unknown = Object.prototype.hasOwnProperty.call(frontmatter, name) ? frontmatter[name] : undefined;
    if (value === undefined) {
        const lower = name.toLowerCase(),
            key = Object.keys(frontmatter).find(each => each.toLowerCase() === lower);
        value = key === undefined ? undefined : frontmatter[key];
    }
    if (Array.isArray(value)) {
        for (const entry of value) {
            const said = words(entry);
            if (said) return said;
        }
        return '';
    }
    return words(value);
}

/**
 * A view of the reader's own says its name in its header as it now is. Obsidian writes the header's title only when a
 * file is loaded or renamed. A header title that can be typed in renames the file, and is never written here.
 */
export function retitleHeader(view: { getDisplayText(): string }) {
    const header = (view as { titleEl?: HTMLElement }).titleEl,
        said = view.getDisplayText();
    if (!header || header.isContentEditable || header.getAttribute('contenteditable') === 'true') return;
    if (header.textContent !== said) header.textContent = said;
}

interface TitledLeaf {
    getDisplayText(): string;
}
/**
 * Obsidian names a tab, its tooltip and the window by the leaf's `getDisplayText`, and its own views' editable
 * titles (the field that renames the file) by the view's. Wrapping the leaf's gives a source's tab its title while
 * the field that renames the file keeps the file's name: a title shown there would rename the file to it when the
 * field was left. Returns the way to take the wrapping off again.
 */
export function installLeafTitles<L extends TitledLeaf>(prototype: L, titleOf: (leaf: L) => string): () => void {
    const original = prototype.getDisplayText;
    if (typeof original !== 'function') return () => {};
    let enabled = true;
    const wrapped = function (this: L) {
        let title = '';
        if (enabled)
            try {
                title = titleOf(this);
            } catch {
                title = '';
            }
        return title || original.call(this);
    };
    prototype.getDisplayText = wrapped;
    return () => {
        enabled = false;
        if (prototype.getDisplayText === wrapped) prototype.getDisplayText = original;
    };
}
