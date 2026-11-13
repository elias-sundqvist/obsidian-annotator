/* eslint-disable @typescript-eslint/no-explicit-any -- This function runs inside a web page, on that page's own
   objects and on selectors that crossed from the host as JSON; the host checks everything it reports back. */
// Executed ONLY inside Obsidian's existing isolated Web viewer guest. Keep this
// function self-contained: never pass comments, tags, vault paths or host APIs.
export function guestAgent(command: {
    owner: string;
    type: string;
    annotations?: { id: string; selectors: any[]; figure?: { path: string; src: string } }[];
    visible?: boolean;
    /** Picture mode: the reader is choosing a picture of the page to keep with a note. */ figures?: boolean;
    /** The last picture offer the host has taken. */ figureSeen?: number;
    intentVersion?: number;
    menu?: boolean;
    /** An annotation to bring into view once its highlight is restored. */ reveal?: string;
}) {
    const global = window as any,
        key = '__obsidianAnnotatorRangeAgentV1';
    let existing = global[key],
        checkpoint: any = null;
    if (command.type === 'dispose') {
        if (existing?.owner === command.owner) {
            existing.destroy();
            delete global[key];
        }
        return null;
    }
    if (existing?.owner === command.owner && existing.root !== document.body) {
        if (!document.body) return { owner: command.owner, error: 'Page body is not ready.' };
        // A same-URL SPA can replace body without navigating the guest frame.
        // Preserve only public records/visibility and monotonic counters.
        checkpoint = existing.checkpoint?.();
        existing.destroy();
        delete global[key];
        existing = null;
    }
    if (existing?.owner !== command.owner) {
        existing?.destroy?.();
        const owner = command.owner,
            root = document.body;
        if (!root) return { owner, error: 'Page body is not ready.' };
        let selection: any = null,
            selectionError: string | null = null,
            rows: { id: string; selectors: any[]; color?: string; figure?: { path: string; src: string } }[] =
                checkpoint?.rows || [],
            statuses: Record<string, string> = Object.create(null),
            style: CSSStyleSheet | null = null,
            ranges: { id: string; range: Range }[] = [];
        const highlightName = 'obsidian-annotator-' + owner.replace(/[^a-zA-Z0-9-]/g, '');
        let visible = checkpoint?.visible !== false,
            menu: HTMLElement | null = null,
            intent: { action: 'annotate' | 'highlight'; version: number } | null = null,
            intentVersion = checkpoint?.intentVersion || 0;
        let intentSelection: any = null;
        const quiet = command.menu === false;
        let frame = 0,
            epoch = checkpoint ? checkpoint.epoch + 1 : 0,
            clicked: string | null = null,
            clickedIds: string[] = [],
            clickVersion = checkpoint?.clickVersion || 0;
        // Kept local because this function is serialized into an isolated guest.
        function editingContext(target: EventTarget | null): boolean {
            const element =
                (target as Node | null)?.nodeType === 1 ? (target as Element) : (target as Node | null)?.parentElement;
            if (!element) return false;
            if (element.closest('input,textarea,select')) return true;
            for (let node: Element | null = element; node; node = node.parentElement) {
                const value = node.getAttribute('contenteditable')?.toLowerCase();
                if (value === 'false') return false;
                if (value === '' || value === 'true' || value === 'plaintext-only') return true;
            }
            return element.ownerDocument.designMode?.toLowerCase() === 'on';
        }
        const currentUrl = () => {
            const url = new URL(location.href);
            url.hash = '';
            return url.href;
        };
        const index = () => {
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT),
                nodes: { node: Text; start: number; end: number }[] = [];
            let text = '',
                next: Node | null,
                count = 0;
            while ((next = walker.nextNode())) {
                if (next.parentElement?.closest('[data-obsidian-annotator-ui]')) continue;
                const start = text.length;
                if (++count > 100000 || text.length + (next.textContent?.length || 0) > 2 * 1024 * 1024)
                    throw Error('Page text exceeds live-reader limits; save a reading copy.');
                text += next.textContent || '';
                nodes.push({ node: next as Text, start, end: text.length });
            }
            return { text, nodes };
        };
        const revision = () => {
            const text = index().text;
            let hash = 2166136261;
            for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
            return `${currentUrl()}:${epoch}:${text.length}:${hash >>> 0}`;
        };
        const xpath = (element: Element) => {
            let result = '',
                node: Element | null = element;
            while (node && node !== root) {
                let at = 1,
                    previous = node.previousElementSibling;
                while (previous) {
                    if (previous.localName === node.localName) at++;
                    previous = previous.previousElementSibling;
                }
                result = `/${node.localName}[${at}]` + result;
                node = node.parentElement;
            }
            if (node !== root) throw Error('Selection outside page');
            return result || '/';
        };
        const point = (node: Node, offset: number) => {
            const parent = node.nodeType === 3 ? node.parentElement! : (node as Element),
                before = document.createRange();
            before.selectNodeContents(parent);
            before.setEnd(node, offset);
            return { container: xpath(parent), offset: before.toString().length };
        };
        const capture = () => {
            selectionError = null;
            const reject = (message: string) => {
                selection = null;
                selectionError = message;
                hideMenu();
                return null;
            };
            const selected = getSelection(),
                focused = document.activeElement;
            if (focused?.matches('iframe,frame,object,embed'))
                return reject(
                    'Text inside an embedded frame is unavailable here. Open its source page in the Web viewer to annotate it.'
                );
            // Chromium can rescope shadow endpoints to a collapsed outer range while
            // Selection.toString still exposes the selected shadow text.
            if (
                (selected?.isCollapsed && selected.toString().length > 0) ||
                (selected?.anchorNode && selected.anchorNode.getRootNode() !== document) ||
                (selected?.focusNode && selected.focusNode.getRootNode() !== document)
            )
                return reject(
                    'Text inside a shadow-root component cannot be annotated in this reader yet. Select regular page text.'
                );
            if (
                focused?.closest('input,textarea,select') ||
                ((!selected || selected.isCollapsed) && editingContext(focused))
            ) {
                selection = null;
                return null;
            }
            if (!selected || selected.isCollapsed) return selection;
            if (selected.rangeCount !== 1) return reject('Select one continuous passage in the webpage.');
            const range = selected.getRangeAt(0);
            if (
                !root.contains(range.commonAncestorContainer) ||
                range.startContainer.parentElement?.closest('[data-obsidian-annotator-ui]')
            )
                return reject('Select text in the webpage body.');
            if (editingContext(range.startContainer) || editingContext(range.endContainer)) {
                selection = null;
                return null;
            }
            const exact = range.toString();
            if (!exact.trim() || exact.length > 20000)
                return reject('Select a non-empty passage of at most 20,000 characters.');
            const before = document.createRange();
            before.selectNodeContents(root);
            before.setEnd(range.startContainer, range.startOffset);
            const start = before.toString().length,
                end = start + exact.length,
                text = index().text,
                a = point(range.startContainer, range.startOffset),
                b = point(range.endContainer, range.endOffset);
            selection = {
                exact,
                revision: revision(),
                source: currentUrl(),
                selectors: [
                    {
                        type: 'RangeSelector',
                        startContainer: a.container,
                        startOffset: a.offset,
                        endContainer: b.container,
                        endOffset: b.offset
                    },
                    { type: 'TextPositionSelector', start, end },
                    {
                        type: 'TextQuoteSelector',
                        exact,
                        prefix: text.slice(Math.max(0, start - 32), start),
                        suffix: text.slice(end, end + 32)
                    }
                ]
            };
            return selection;
        };
        const normalizeText = (text: string) =>
            text.normalize('NFKC').replace(/[\s\u00ad\u200b-\u200f\u202a-\u202e\u2066-\u2069]/gu, '');
        const resolve = (selectors: any[]) => {
            const data = index(),
                quote = selectors.find(s => s.type === 'TextQuoteSelector'),
                position = selectors.find(s => s.type === 'TextPositionSelector');
            if (!quote || typeof quote.exact !== 'string' || !quote.exact) throw Error('No supported quote');
            const valid = (start: number, end: number) =>
                normalizeText(data.text.slice(start, end)) === normalizeText(quote.exact) &&
                (!quote.prefix || normalizeText(data.text.slice(0, start)).endsWith(normalizeText(quote.prefix))) &&
                (!quote.suffix || normalizeText(data.text.slice(end)).startsWith(normalizeText(quote.suffix)));
            let start = -1,
                end = -1;
            if (
                Number.isSafeInteger(position?.start) &&
                Number.isSafeInteger(position?.end) &&
                valid(position.start, position.end)
            ) {
                start = position.start;
                end = position.end;
            } else {
                let normalized = '',
                    offset = 0;
                const starts: number[] = [],
                    ends: number[] = [];
                for (const char of data.text) {
                    const value = normalizeText(char);
                    for (let i = 0; i < value.length; i++) {
                        starts.push(offset);
                        ends.push(offset + char.length);
                    }
                    normalized += value;
                    offset += char.length;
                }
                const needle = normalizeText(quote.exact),
                    candidates: { start: number; end: number }[] = [];
                if (!needle) throw Error('Empty quote');
                for (let at = normalized.indexOf(needle); at >= 0; at = normalized.indexOf(needle, at + 1)) {
                    const a = starts[at],
                        b = ends[at + needle.length - 1];
                    if (valid(a, b)) candidates.push({ start: a, end: b });
                }
                if (candidates.length !== 1) throw Error(candidates.length ? 'Ambiguous quote' : 'Quote not found');
                start = candidates[0].start;
                end = candidates[0].end;
            }
            const a = data.nodes.find(n => start >= n.start && start < n.end),
                b = data.nodes.find(n => end > n.start && end <= n.end);
            if (!a || !b) throw Error('No text range');
            const range = document.createRange();
            range.setStart(a.node, start - a.start);
            range.setEnd(b.node, end - b.start);
            return range;
        };
        let styleRules = '',
            highlightRules = '',
            frameRules = '',
            inkNames: string[] = [];
        // Pictures. A picture kept with a note is framed; in picture mode the reader chooses one to keep. The page's
        // own elements are not changed for it, except that pictures can take the keyboard while the mode lasts.
        const FIGURE_PATH = /^body(?: > [A-Za-z][A-Za-z0-9._-]{0,63}:nth-child\(\d{1,5}\)){1,160}$/;
        let figureMode = false,
            figureChoice: { version: number; element: Element } | null = null,
            figureVersion: number = checkpoint?.figureVersion || 0,
            figureLeft: number = checkpoint?.figureLeft || 0;
        let framed: { id: string; element: Element }[] = [],
            reachable: Element[] = [];
        const pictures = () =>
            Array.from(root.querySelectorAll('img')).filter(img => !img.closest('[data-obsidian-annotator-ui]'));
        /** The path of child steps from the body to an element, or null where it is too deep or oddly named to be kept. */
        const pathOf = (element: Element) => {
            const steps: string[] = [];
            for (let node: Element | null = element; node !== root; node = node.parentElement) {
                const parent: Element | null = node?.parentElement ?? null;
                if (!node || !parent) return null;
                steps.unshift(
                    `${node.localName}:nth-child(${Array.prototype.indexOf.call(parent.children, node) + 1})`
                );
            }
            const path = ['body', ...steps].join(' > ');
            return root.localName === 'body' && path.length <= 8192 && FIGURE_PATH.test(path) ? path : null;
        };
        const atPath = (path: string) => {
            if (typeof path !== 'string' || path.length > 8192 || !FIGURE_PATH.test(path) || root.localName !== 'body')
                return null;
            let node: Element = root;
            for (const step of path.split(' > ').slice(1)) {
                const open = step.lastIndexOf(':nth-child('),
                    child: Element | undefined = node.children[Number(step.slice(open + 11, -1)) - 1];
                if (!child || child.localName !== step.slice(0, open)) return null;
                node = child;
            }
            return node;
        };
        /** What a picture shows: its address, or for one written into the page (or held only in memory) a short hash of that. */
        const shows = (element: Element) => {
            const value = (element as HTMLImageElement).currentSrc || (element as HTMLImageElement).src || '';
            if (!value) return '';
            if (/^https?:/i.test(value) && value.length <= 2048) {
                try {
                    return new URL(value).href;
                } catch {
                    return '';
                }
            }
            let hash = 2166136261;
            for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
            return `inline:${(hash >>> 0).toString(16).padStart(8, '0')}`;
        };
        /** What the page says about a picture: its description, then its caption. */
        const about = (element: Element) => {
            const said = element.getAttribute('alt') || element.getAttribute('aria-label') || '',
                caption = element.closest('figure')?.querySelector('figcaption')?.textContent || '';
            return [said, caption]
                .map(text => text.replace(/\s+/g, ' ').trim())
                .filter((text, index, all) => text && all.indexOf(text) === index)
                .join(' · ')
                .slice(0, 600);
        };
        const applyStyle = () => {
            const mode = figureMode
                ? 'img { outline: 2px dashed rgba(120,120,120,.9) !important; outline-offset: 2px !important; cursor: copy !important; } img:hover, img:focus { outline: 3px solid Highlight !important; }'
                : '';
            const rules = highlightRules + frameRules + mode;
            if (rules === styleRules && style) return;
            if (!style) {
                if (!rules) return;
                style = new CSSStyleSheet();
                document.adoptedStyleSheets = [...document.adoptedStyleSheets, style];
            }
            style.replaceSync(rules);
            styleRules = rules;
        };
        const setFigureMode = (on: boolean) => {
            if (on === figureMode) return;
            figureMode = on;
            if (on) {
                for (const img of pictures())
                    if (!img.hasAttribute('tabindex')) {
                        img.setAttribute('tabindex', '0');
                        reachable.push(img);
                    }
            } else {
                for (const img of reachable) img.removeAttribute('tabindex');
                reachable = [];
                figureChoice = null;
            }
            applyStyle();
        };
        const chooseFigure = (event: Event) => {
            if (!figureMode) return;
            const key = event.type === 'keydown' ? (event as KeyboardEvent).key : '';
            if (key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                figureLeft++;
                return;
            }
            if (event.type === 'keydown' && key !== 'Enter' && key !== ' ') return;
            const img = (event.target as Element | null)?.closest?.('img');
            if (!img || img.closest('[data-obsidian-annotator-ui]')) return;
            // The choice is the reader's click; the page's own handlers for it (a link, a lightbox) do not run.
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            const box = img.getBoundingClientRect();
            if (box.width < 16 || box.height < 16) return;
            img.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
            figureChoice = { version: ++figureVersion, element: img };
        };
        const paint = () => {
            frame = 0;
            statuses = Object.create(null);
            ranges = [];
            framed = [];
            const inkOf = (row: { color?: string }) =>
                typeof row.color === 'string' && /^\d{1,3}, ?\d{1,3}, ?\d{1,3}$/.test(row.color)
                    ? row.color.replace(/ /g, '')
                    : '';
            // A kept picture is where its path says while it shows the same thing there; moved, it is found by what it
            // shows when exactly one picture of the page shows that; it is never guessed.
            const frames: string[] = [];
            for (const row of rows)
                if (row.figure)
                    try {
                        const { path, src } = row.figure;
                        if (typeof src !== 'string' || !src) throw Error('Unsupported picture');
                        let element = atPath(path),
                            how = 'Verified picture';
                        if (!element || element.localName !== 'img' || shows(element) !== src) {
                            const same = pictures().filter(img => shows(img) === src);
                            if (same.length !== 1) throw Error(same.length ? 'Ambiguous picture' : 'Picture not found');
                            element = same[0];
                            how = 'Found by what it shows';
                        }
                        framed.push({ id: row.id, element });
                        statuses[row.id] = `Picture restored · ${how}`;
                        const now = pathOf(element);
                        if (now && visible)
                            frames.push(
                                `${now.replace(/\./g, '\\.')} { outline: 3px solid rgba(${inkOf(row) || '255,214,0'},.9) !important; outline-offset: 2px !important; cursor: pointer; }`
                            );
                    } catch (error) {
                        statuses[row.id] = String(error);
                    }
            frameRules = frames.join('');
            const registry = global.CSS?.highlights;
            if (!registry || !global.Highlight) {
                for (const row of rows)
                    if (!row.figure) statuses[row.id] = 'This Web viewer does not support native text highlights.';
                highlightRules = '';
                applyStyle();
                return;
            }
            // Inks arrive as "r, g, b" from the host's theme; anything else paints in the default ink.
            const inked: Record<string, Range[]> = Object.create(null),
                plain: Range[] = [];
            for (const row of rows)
                if (!row.figure)
                    try {
                        const range = resolve(row.selectors);
                        ranges.push({ id: row.id, range });
                        const color = inkOf(row);
                        if (color) (inked[color] ||= []).push(range);
                        else plain.push(range);
                        statuses[row.id] = 'Highlight restored';
                    } catch (error) {
                        statuses[row.id] = String(error);
                    }
            const colors = Object.keys(inked).sort(),
                names = colors.map((_color, index) => `${highlightName}-ink${index}`);
            const rules =
                `::highlight(${highlightName}) { background-color: rgba(255,214,0,.35); }` +
                colors
                    .map((color, index) => `::highlight(${names[index]}) { background-color: rgba(${color},.38); }`)
                    .join('');
            highlightRules = rules;
            applyStyle();
            // The browser paints the actual text ranges in the text's own layer.
            // Scrolling, clipping, transforms and reflow need no JS rectangles.
            registry.set(highlightName, new global.Highlight(...(visible ? plain : [])));
            for (const name of inkNames) if (!names.includes(name)) registry.delete(name);
            colors.forEach((color, index) =>
                registry.set(names[index], new global.Highlight(...(visible ? inked[color] : [])))
            );
            inkNames = names;
        };
        const openHighlight = (event: MouseEvent) => {
            if (
                figureMode ||
                !visible ||
                editingContext(event.target) ||
                (event.target as Element).closest?.('[data-obsidian-annotator-ui]') ||
                event.button !== 0 ||
                event.ctrlKey ||
                event.metaKey ||
                event.altKey ||
                event.shiftKey ||
                !getSelection()?.isCollapsed
            )
                return;
            // Hit-test only on clicks, never on scroll. Normal text selection and
            // unrelated page controls keep their existing behavior.
            const hit = document.elementFromPoint?.(event.clientX, event.clientY);
            const hits: string[] = [];
            // A kept picture is hit by the click's own target: it is an element, not a range of text.
            for (const item of framed)
                if (item.element === event.target || item.element.contains(event.target as Node)) hits.push(item.id);
            for (const item of ranges) {
                if (hit && !item.range.intersectsNode(hit)) continue;
                if (
                    !Array.from(item.range.getClientRects()).some(
                        rect =>
                            event.clientX >= rect.left &&
                            event.clientX < rect.right &&
                            event.clientY >= rect.top &&
                            event.clientY < rect.bottom
                    )
                )
                    continue;
                hits.push(item.id);
            }
            if (hits.length) {
                event.preventDefault();
                event.stopPropagation();
                clickedIds = [...new Set(hits)];
                clicked = clickedIds[0];
                clickVersion++;
            }
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(paint);
        };
        const hideMenu = () => {
            menu?.remove();
            menu = null;
        };
        const choose = (action: 'annotate' | 'highlight') => {
            if (document.activeElement?.matches('iframe,frame,object,embed')) {
                capture();
                hideMenu();
                return;
            }
            if (!selection) return;
            intentSelection = selection;
            intent = { action, version: ++intentVersion };
            hideMenu();
            getSelection()?.removeAllRanges();
        };
        const selected = (event: Event) => {
            if ((event.target as Element).closest?.('[data-obsidian-annotator-ui]')) return;
            if (editingContext(event.target)) {
                selection = null;
                hideMenu();
                return;
            }
            const selected = getSelection();
            if (!selected?.rangeCount || selected.isCollapsed) {
                if (selected?.toString().length) capture();
                else if (quiet) selection = null;
                hideMenu();
                return;
            }
            const value = capture();
            if (!value) {
                hideMenu();
                return;
            }
            // The host can ask for no toolbar here: this page's scripts share this world, so a choice made in it proves nothing.
            // The selection is still reported; the host offers the actions in its own chrome.
            if (quiet) {
                hideMenu();
                return;
            }
            const rect = selected.getRangeAt(0).getBoundingClientRect();
            hideMenu();
            menu = document.createElement('div');
            menu.dataset.obsidianAnnotatorUi = owner;
            menu.setAttribute('role', 'toolbar');
            menu.setAttribute('aria-label', 'Annotation actions');
            Object.assign(menu.style, {
                position: 'fixed',
                zIndex: '2147483000',
                display: 'flex',
                gap: '4px',
                padding: '5px',
                background: '#fff',
                color: '#222',
                border: '1px solid #bbb',
                borderRadius: '5px',
                boxShadow: '0 2px 10px #0003',
                font: '14px system-ui'
            });
            for (const [action, label] of [
                ['annotate', 'Annotate (a)'],
                ['highlight', 'Highlight (h)']
            ] as const) {
                const button = document.createElement('button');
                button.textContent = label;
                button.setAttribute('aria-label', label);
                Object.assign(button.style, {
                    background: 'transparent',
                    color: 'inherit',
                    border: '0',
                    padding: '8px 12px',
                    font: 'inherit',
                    cursor: 'pointer',
                    borderRadius: '3px'
                });
                button.onpointerdown = event => {
                    event.preventDefault();
                    event.stopPropagation();
                };
                button.onclick = event => {
                    event.preventDefault();
                    event.stopPropagation();
                    choose(action);
                };
                menu.appendChild(button);
            }
            root.appendChild(menu);
            menu.style.left = `${Math.max(8, Math.min(rect.left + rect.width / 2 - menu.offsetWidth / 2, innerWidth - menu.offsetWidth - 8))}px`;
            menu.style.top = `${Math.max(8, rect.top > menu.offsetHeight + 12 ? rect.top - menu.offsetHeight - 8 : rect.bottom + 8)}px`;
        };
        const outside = (event: Event) => {
            if (!menu?.contains(event.target as Node)) hideMenu();
        };
        const keyAction = (event: KeyboardEvent) => {
            if (
                !menu ||
                event.isComposing ||
                event.keyCode === 229 ||
                event.ctrlKey ||
                event.metaKey ||
                event.altKey ||
                editingContext(event.target)
            )
                return;
            if (event.key === 'Escape') hideMenu();
            else if (['a', 'h'].includes(event.key.toLowerCase())) {
                event.preventDefault();
                event.stopPropagation();
                choose(event.key.toLowerCase() === 'a' ? 'annotate' : 'highlight');
            }
        };
        const observer = new MutationObserver(records => {
            if (
                records.every(
                    record =>
                        (record.target as Element).closest?.('[data-obsidian-annotator-ui]') ||
                        ([...record.addedNodes, ...record.removedNodes].length &&
                            [...record.addedNodes, ...record.removedNodes].every(node =>
                                (node as Element).hasAttribute?.('data-obsidian-annotator-ui')
                            ))
                )
            )
                return;
            epoch++;
            clicked = null;
            clickedIds = [];
            ranges = [];
            framed = [];
            if (figureChoice && !figureChoice.element.isConnected) figureChoice = null;
            hideMenu();
            schedule();
        });
        observer.observe(root, { childList: true, subtree: true, characterData: true });
        addEventListener('click', chooseFigure, true);
        addEventListener('keydown', chooseFigure, true);
        addEventListener('pointerup', selected);
        addEventListener('keyup', selected);
        addEventListener('click', openHighlight, true);
        addEventListener('pointerdown', outside, true);
        addEventListener('keydown', keyAction, true);
        addEventListener('scroll', hideMenu, true);
        global[key] = {
            owner,
            root,
            checkpoint: () => ({ rows, visible, epoch, intentVersion, clickVersion, figureVersion, figureLeft }),
            destroy() {
                setFigureMode(false);
                removeEventListener('click', chooseFigure, true);
                removeEventListener('keydown', chooseFigure, true);
                observer.disconnect();
                removeEventListener('pointerup', selected);
                removeEventListener('keyup', selected);
                removeEventListener('pointerdown', outside, true);
                removeEventListener('keydown', keyAction, true);
                removeEventListener('scroll', hideMenu, true);
                hideMenu();
                removeEventListener('click', openHighlight, true);
                if (frame) cancelAnimationFrame(frame);
                global.CSS?.highlights?.delete(highlightName);
                for (const name of inkNames) global.CSS?.highlights?.delete(name);
                if (style) document.adoptedStyleSheets = document.adoptedStyleSheets.filter(sheet => sheet !== style);
                ranges = [];
            },
            run(action: typeof command) {
                if (action.type === 'paint') {
                    visible = action.visible !== false;
                    rows = (action.annotations || []).slice(0, 2000);
                    schedule();
                }
                if (typeof action.figures === 'boolean') setFigureMode(action.figures);
                if (
                    figureChoice &&
                    Number.isSafeInteger(action.figureSeen) &&
                    action.figureSeen! >= figureChoice.version
                )
                    figureChoice = null;
                const selected =
                    action.type === 'capture-intent'
                        ? Number.isSafeInteger(action.intentVersion) && action.intentVersion === intent?.version
                            ? intentSelection
                            : null
                        : action.type === 'capture'
                          ? capture()
                          : selection;
                // The reader asked to be taken to an annotation: once its passage has been found on the page, the page is scrolled to it.
                let revealed = '';
                if (typeof action.reveal === 'string' && action.reveal) {
                    const hit = ranges.find(item => item.id === action.reveal);
                    const seen = (box: DOMRect | undefined) =>
                        !!box && box.width > 0 && box.height > 0 && box.top >= 24 && box.bottom <= innerHeight - 24;
                    if (hit) {
                        const node = hit.range.startContainer,
                            at = node.nodeType === 1 ? (node as Element) : node.parentElement;
                        if (!seen(hit.range.getBoundingClientRect?.())) at?.scrollIntoView?.({ block: 'center' });
                        revealed = action.reveal;
                    } else {
                        const picture = framed.find(item => item.id === action.reveal);
                        if (picture) {
                            if (!seen(picture.element.getBoundingClientRect?.()))
                                picture.element.scrollIntoView?.({ block: 'center' });
                            revealed = action.reveal;
                        }
                    }
                }
                // A chosen picture is offered with where it is on screen now, so that the host can take what the reader saw.
                let figure: {
                    version: number;
                    path: string | null;
                    src: string;
                    words: string;
                    rect: { x: number; y: number; width: number; height: number };
                    viewport: { width: number; height: number };
                } | null = null;
                if (figureChoice?.element.isConnected) {
                    const element = figureChoice.element,
                        box = element.getBoundingClientRect();
                    figure = {
                        version: figureChoice.version,
                        path: pathOf(element),
                        src: shows(element),
                        words: about(element),
                        rect: { x: box.left, y: box.top, width: box.width, height: box.height },
                        viewport: { width: innerWidth, height: innerHeight }
                    };
                }
                return {
                    owner,
                    url: currentUrl(),
                    revision: revision(),
                    title: document.title.slice(0, 1000),
                    selection: selected,
                    selectionError,
                    statuses,
                    clicked,
                    clickedIds,
                    clickVersion,
                    intent,
                    revealed,
                    figure,
                    figureLeft,
                    figures: figureMode
                };
            }
        };
        if (checkpoint) schedule();
    }
    return global[key].run(command);
}
