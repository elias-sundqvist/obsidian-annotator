// The citation tests' way to a fixture: a frozen report of the PDF library (see capture-citations-fixture.mjs)
// stands in for the open PDF, and the logic is the real one, compiled from the checked definitions.
import { readFileSync } from 'node:fs';
import { PdfCitations } from '../.generated/readers/pdf-citations.js';
import { logic } from '../.generated/readers/logic.js';

export const frozen = name => JSON.parse(readFileSync(new URL(`./fixtures/citations/${name}.json`, import.meta.url), 'utf8'));
/** A page's text line by line, as the reader holds it: the runs joined, cut where the library ends a line. */
export function textLines(runs) {
    const lines = [];
    let line = '';
    for (const run of runs) {
        line += run[0];
        if (run[5]) {
            lines.push(line);
            line = '';
        }
    }
    if (line) lines.push(line);
    return lines;
}
/**
 * The citations of a frozen PDF. `change` may alter a page before it is read (`{links: false}` leaves the PDF's
 * links out, so the words are all there is). `calls` counts what was asked of the PDF.
 */
export function open(dump, { links = true, alter } = {}) {
    const calls = { runs: [], links: [], list: 0, page: 0 };
    const page = number => (alter ? alter(number, structuredClone(dump.page[number])) : dump.page[number]);
    const source = {
        pages: dump.pages,
        textLines: number => textLines(page(number).runs),
        async runs(number) {
            calls.runs.push(number);
            const one = page(number);
            return { height: one.view[3] - one.view[1], runs: one.runs };
        },
        async links(number) {
            calls.links.push(number);
            return links ? page(number).links : [];
        }
    };
    const pdf = new PdfCitations(source, {
        async citeList(...args) {
            calls.list++;
            return logic.citeList(...args);
        },
        async citePage(...args) {
            calls.page++;
            return logic.citePage(...args);
        }
    });
    return { pdf, calls, source };
}
/** A page's rows in plain words: what a test compares. */
export async function rows(pdf, number) {
    const view = await pdf.page(number);
    return view.citations.rows.map(row => {
        const list = view.lists[row.list]?.read;
        return { kind: row.kind, how: row.how, marker: row.marker, count: row.count, works: row.entries.map(id => list.entries[id].text) };
    });
}
