// What a PDF says about itself, as properties for its note.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pdfDetails, addDetails } from './.generated/readers/pdf-details.js';

test('a PDF\'s title, authors, year and DOI are read from its document information and its XMP; what a program wrote in place of a title is left out', () => {
    const info = { Title: 'Attention Is All You Need', Author: 'Ashish Vaswani; Noam Shazeer and Niki Parmar', Subject: 'Sequence transduction, doi:10.48550/arXiv.1706.03762.', Keywords: 'attention, transformers; translation', CreationDate: "D:20170612120000+02'00'" };
    assert.deepEqual(pdfDetails(info), { title: 'Attention Is All You Need', authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar'], subject: 'Sequence transduction, doi:10.48550/arXiv.1706.03762.', keywords: ['attention', 'transformers', 'translation'], year: 2017, doi: '10.48550/arXiv.1706.03762' });
    // XMP is what a publisher fills in; it is preferred where it says something.
    const xmp = { 'dc:title': 'A Better Title', 'dc:creator': ['Ada Lovelace', 'Charles Babbage'], 'prism:doi': '10.1000/xyz123', 'prism:publicationdate': '1843-09-01' };
    assert.deepEqual(pdfDetails({ Title: 'draft_final_v3.docx', Author: 'ada' }, name => xmp[name]), { title: 'A Better Title', authors: ['Ada Lovelace', 'Charles Babbage'], year: 1843, doi: '10.1000/xyz123' });
    // Names: a list with commas is several people, "Surname, Given" is one; the same name twice is one.
    assert.deepEqual(pdfDetails({ Author: 'Ashish Vaswani, Noam Shazeer, Niki Parmar' }).authors, ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar']);
    assert.deepEqual(pdfDetails({ Author: 'Vaswani, Ashish' }).authors, ['Vaswani, Ashish']); assert.deepEqual(pdfDetails({ Author: 'A. Author & B. Author; A. Author' }).authors, ['A. Author', 'B. Author']);
    // Titles a program made up are not titles.
    for (const junk of ['Microsoft Word - thesis', 'paper.dvi', 'untitled', 'Document1', 'main.tex', 'x']) assert.equal(pdfDetails({ Title: junk }).title, undefined, junk);
    // Nothing recorded, nothing said; odd input does not throw.
    assert.deepEqual(pdfDetails(null), {}); assert.deepEqual(pdfDetails({ Title: 7, Author: null, CreationDate: 'yesterday' }), {}); assert.deepEqual(pdfDetails({}, () => { throw new Error('no packet'); }), {});
    assert.equal(pdfDetails({ CreationDate: 'D:19991231' }).year, 1999); assert.equal(pdfDetails({ Keywords: 'see https://doi.org/10.1145/3292500.3330701, and more' }).doi, '10.1145/3292500.3330701');
});
test('details become properties of the note without touching what the note already says', () => {
    const details = { title: 'Attention Is All You Need', authors: ['Ashish Vaswani', 'Noam Shazeer'], year: 2017, doi: '10.48550/arXiv.1706.03762', keywords: ['attention'] };
    const empty = { 'annotation-target': 'paper.pdf' };
    assert.deepEqual(addDetails(empty, details), ['title', 'author', 'year', 'doi', 'keywords']);
    assert.deepEqual(empty, { 'annotation-target': 'paper.pdf', title: 'Attention Is All You Need', author: ['Ashish Vaswani', 'Noam Shazeer'], year: 2017, doi: '10.48550/arXiv.1706.03762', keywords: ['attention'] });
    // The reader's own title and year stay; an empty property is filled; a second run adds nothing.
    const mine = { title: 'My name for it', year: 2018, author: '', doi: null };
    assert.deepEqual(addDetails(mine, details), ['author', 'doi', 'keywords']); assert.equal(mine.title, 'My name for it'); assert.equal(mine.year, 2018); assert.deepEqual(mine.author, ['Ashish Vaswani', 'Noam Shazeer']);
    assert.deepEqual(addDetails(mine, details), []); assert.deepEqual(addDetails({}, {}), []);
});
