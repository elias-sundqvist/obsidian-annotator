/**
 * What is known about the citations of one open PDF: where its reference
 * lists are, their entries once read, and the citations of the pages looked
 * at. It belongs to that PDF's reader and is let go with it. Nothing here
 * runs until `page()` is first asked; then the PDF's links are read once,
 * reference lists are found, and each list is read when a page first needs
 * it. Every step that waits gives the interface's thread back.
 */
import {
    isListHeading,
    type Entry,
    type Link,
    type ListInput,
    type PageCitations,
    type RefList,
    type Run
} from './citations';

/** What the PDF's reader can be asked. */
export interface PdfSource {
    pages: number;
    /** A page's text, line by line, as the reader already holds it; null while it is still being read. */
    textLines(page: number): string[] | null;
    /** A page's text runs with their places, and the page's height. */
    runs(page: number): Promise<{ height: number; runs: Run[] }>;
    /** A page's links to places inside the PDF. */
    links(page: number): Promise<Link[]>;
}
/** The reading and deciding, done off the interface's thread. */
export interface CiteLogic {
    citeList(
        pages: { page: number; height: number; runs: Run[] }[],
        top: number | null,
        fromLabel: boolean
    ): Promise<RefList>;
    citePage(page: number, runs: Run[], links: Link[], lists: ListInput[]): Promise<PageCitations>;
}
export interface KnownList {
    start: number;
    /** The last page it may reach until it is read; then the last page it has. */
    end: number;
    top: number | null;
    /** Found by where links land, not by a heading. */
    byLinks: boolean;
    read?: RefList;
    linked: boolean;
    offsets: number[];
}
export interface PageView {
    page: number;
    citations: PageCitations;
    lists: KnownList[];
    /** If the page is itself part of a reference list: that list and its entries on this page. */
    own: { list: number; entries: Entry[] } | null;
}
export type Progress = (words: string) => void;
const pause = () => new Promise<void>(resolve => setTimeout(resolve, 0));
const MAX_LIST_PAGES = 60;

export class PdfCitations {
    private allLinks: Link[][] | null = null;
    lists: KnownList[] | null = null;
    private preparing: Promise<void> | null = null;
    private reading = new Map<number, Promise<void>>();
    private views = new Map<number, PageView>();
    private gone = false;
    /** Whether the PDF has any text at all (a scan has none). */
    hasText = true;
    constructor(
        private source: PdfSource,
        private logic: CiteLogic
    ) {}
    dispose() {
        this.gone = true;
        this.views.clear();
    }
    /** The links of every page and where the reference lists begin. Done once. */
    prepare(progress?: Progress): Promise<void> {
        return (this.preparing ||= (async () => {
            const links: Link[][] = [[]];
            for (let page = 1; page <= this.source.pages; page++) {
                if (this.gone) return;
                links.push(await this.source.links(page));
                if (page % 25 === 0) {
                    progress?.(`Reading the PDF’s links… ${page} of ${this.source.pages} pages`);
                    await pause();
                }
            }
            this.allLinks = links;
            const lists: KnownList[] = [];
            let words = 0;
            for (let page = 1; page <= this.source.pages; page++) {
                const lines = this.source.textLines(page);
                if (!lines) continue;
                for (const line of lines) {
                    words += line.trim().length;
                    if (isListHeading(line) && lists[lists.length - 1]?.start !== page)
                        lists.push({
                            start: page,
                            end: this.source.pages,
                            top: null,
                            byLinks: false,
                            linked: false,
                            offsets: []
                        });
                }
                if (page % 40 === 0) await pause();
            }
            this.hasText = words > 0;
            if (!lists.length) {
                // No heading: where links from several pages land, if anywhere.
                const from = new Map<number, Set<number>>();
                links.forEach((page, number) => {
                    for (const link of page)
                        if (link[4] !== number) from.set(link[4], (from.get(link[4]) || new Set()).add(number));
                });
                const landed = [...from.entries()]
                    .filter(([, pages]) => pages.size >= 3)
                    .sort((a, b) => b[1].size - a[1].size);
                if (landed.length) {
                    // The page most pages lead to, and the pages before it that are led to as well.
                    let start = landed[0][0];
                    while (landed.some(([page]) => page === start - 1)) start--;
                    lists.push({ start, end: this.source.pages, top: null, byLinks: true, linked: false, offsets: [] });
                }
            }
            lists.forEach((list, index) => {
                list.end = Math.min(
                    this.source.pages,
                    list.start + MAX_LIST_PAGES,
                    (lists[index + 1]?.start ?? this.source.pages + 1) - (lists[index + 1] ? 0 : 1)
                );
            });
            this.lists = lists;
        })());
    }
    /** Read one list: its pages one at a time until its end is seen. */
    private readList(index: number, progress?: Progress): Promise<void> {
        let reading = this.reading.get(index);
        if (!reading) {
            reading = (async () => {
                const list = this.lists![index],
                    last = list.end,
                    pages: { page: number; height: number; runs: Run[] }[] = [];
                let wanted = Math.min(last, list.start + 1),
                    read: RefList | null = null;
                for (;;) {
                    for (let page = list.start + pages.length; page <= wanted; page++) {
                        if (this.gone) return;
                        const got = await this.source.runs(page);
                        pages.push({ page, ...got });
                        progress?.(`Reading the reference list… ${pages.length} of ${last - list.start + 1} pages`);
                        await pause();
                    }
                    if (list.byLinks === false && pages.length && list.top === null) {
                        // The heading's own place on its page: lines above it are not the list.
                        list.top = headingTop(pages[0].runs);
                    }
                    read = await this.logic.citeList(pages, list.top, list.byLinks);
                    // One page past the end is read, so a running head can be told from an entry by its repeating.
                    if (this.gone || read.ended || wanted >= last) break;
                    wanted = Math.min(last, list.start + Math.max(3, pages.length * 2) - 1);
                }
                if (!read) return;
                list.read = read;
                list.end = read.entries.length ? read.end : list.start;
                if (list.byLinks && read.entries.length) list.top = read.entries[0].y + read.entries[0].h;
                // Whether the PDF links its citations into this list.
                let leading = 0;
                this.allLinks!.forEach((page, number) => {
                    if (number >= list.start && number <= list.end) return;
                    for (const link of page) if (link[4] >= list.start && link[4] <= list.end) leading++;
                });
                list.linked = leading >= 3;
            })();
            this.reading.set(index, reading);
        }
        return reading;
    }
    /** The citations of a page. */
    async page(number: number, progress?: Progress): Promise<PageView | null> {
        const kept = this.views.get(number);
        if (kept) return kept;
        await this.prepare(progress);
        if (this.gone || !this.lists || !this.allLinks) return null;
        const lists = this.lists,
            links = this.allLinks[number] || [];
        // The lists this page needs: those its links lead into, the one text without a link would mean, and its own.
        const needed = new Set<number>();
        const within = (page: number) => lists.findIndex(list => page >= list.start && page <= list.end);
        for (const link of links) {
            const index = within(link[4]);
            if (index >= 0) needed.add(index);
        }
        const before = lists.map((list, index) => ({ list, index })).filter(item => item.list.start >= number);
        if (before.length) needed.add(before[0].index);
        else if (lists.length) needed.add(lists.length - 1);
        if (lists.length === 1) needed.add(0);
        // A list is read whole before the next, so that a page of an earlier list is not taken for part of a later one.
        for (const index of [...needed].sort((a, b) => a - b)) {
            await this.readList(index, progress);
            if (this.gone) return null;
        }
        const { runs } = await this.source.runs(number);
        if (this.gone) return null;
        const inputs: ListInput[] = lists.map(list => ({
            start: list.start,
            end: list.read ? list.end : list.start,
            top: list.top,
            linked: list.linked,
            entries: list.read?.entries || [],
            labelled: !!list.read?.labelled,
            offsets: list.offsets.slice(-40)
        }));
        const citations = await this.logic.citePage(number, runs, links, inputs);
        if (this.gone) return null;
        for (const { list, values } of citations.offsets) lists[list].offsets.push(...values);
        const ownIndex = lists.findIndex(list => !!list.read && number >= list.start && number <= list.end);
        const view: PageView = {
            page: number,
            citations,
            lists,
            own:
                ownIndex >= 0
                    ? { list: ownIndex, entries: lists[ownIndex].read!.entries.filter(entry => entry.page === number) }
                    : null
        };
        this.views.set(number, view);
        // The last few pages are kept; a page is quick to read again.
        if (this.views.size > 8) this.views.delete(this.views.keys().next().value!);
        return view;
    }
}
/** The baseline of the heading of a reference list among a page's runs, or null. */
function headingTop(runs: readonly Run[]): number | null {
    let line = '',
        y: number | null = null,
        found: number | null = null;
    for (const [text, , top, , , eol] of runs) {
        if (text.trim()) {
            if (y === null) y = top;
            line += text;
        }
        if (eol) {
            if (y !== null && isListHeading(line)) found = y;
            line = '';
            y = null;
        }
    }
    if (y !== null && isListHeading(line)) found = y;
    return found;
}
