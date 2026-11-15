// Host boundary over the checked gathering of a book's pieces into chapters (chapters.bend). Pure; no I/O.
// What belongs to which chapter is decided by the Bend definitions whose laws are proved in PROOF.bend; this
// file only names the pieces by their position in the row and reads the answer back.
import Chapters from './chapters.bend';
import { list, array } from './lists.mjs';

const KIND = { opens: 'Opens', waits: 'Waits', follows: 'Follows' };
// The definitions read a row one call inside the last, so a long row is given to them a stretch at a time, the last
// stretch first and each earlier one onto what has been read (the law chapters_stretches: that reads what reading the
// whole row reads). What is carried from one stretch to the next is the Bend value itself, never one made here.
const STRETCH = 1000;

/**
 * Gather a row of pieces into chapters. `kinds` says of each piece, in the book's order, whether it `opens` a
 * chapter, `waits` for the next one or `follows` the one before. The answer names pieces by their position in the
 * row: `chapters`, each `{ lead, open, tail }` (the pieces before its opening piece, that piece, the pieces after),
 * and `loose`, every piece of a row in which nothing opens. Null for anything that is not such a row.
 */
export function gatherChapters(kinds) {
    if (!Array.isArray(kinds) || kinds.some(kind => !Object.prototype.hasOwnProperty.call(KIND, kind))) return null;
    let scan = Chapters.scan(list([]));
    for (let end = kinds.length; end > 0; end -= STRETCH) {
        const start = Math.max(0, end - STRETCH);
        scan = Chapters.scan_onto(list(kinds.slice(start, end).map((kind, index) => ({ $: KIND[kind], id: start + index }))), scan);
    }
    const gathered = Chapters.finish(scan), ids = quiets => array(quiets).map(quiet => quiet.id);
    return gathered.$ === 'Chapters'
        ? { chapters: array(gathered.list).map(chapter => ({ lead: ids(chapter.lead), open: chapter.open, tail: ids(chapter.tail) })), loose: [] }
        : { chapters: [], loose: ids(gathered.pieces) };
}
