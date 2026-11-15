// Zotero, Calibre and DEVONthink links as a note's source. A link names a
// file those programs keep, not where it is; the file is found by looking in
// the program's folder. Checked here on folders laid out as Zotero 10 and
// Calibre 9 lay theirs out (both were looked at for real), without either
// program. DEVONthink is asked instead, through osascript; here a stand-in
// answers as DEVONthink 4.4.2 answered when it was asked for real.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { appLink, zoteroFile, calibreFile, devonthinkFile, devonthinkArgs, DEVONTHINK_SCRIPT, followedLinks } = await import('./.generated/readers/app-links.js');
const list = async folder => (await readdir(folder, { withFileTypes: true })).map(entry => ({ name: entry.name, folder: entry.isDirectory() }));
const tree = files => { const root = mkdtempSync(join(tmpdir(), 'annotator-links-')); for (const file of files) { const path = join(root, file); mkdirSync(join(path, '..'), { recursive: true }); writeFileSync(path, 'x'); } return root; };

test('which targets are links to a file Zotero, Calibre or DEVONthink keeps', () => {
    // Zotero: the link to an attachment, in a personal or a group library, with or without a page or an annotation.
    for (const raw of ['zotero://open-pdf/library/items/IKUUN4F6', 'zotero://open-pdf/library/items/ikuun4f6?page=3', 'zotero://open-pdf/groups/123456/items/IKUUN4F6?page=3&annotation=ABCD1234', 'zotero://select/library/items/IKUUN4F6', '  zotero://open-pdf/library/items/IKUUN4F6  '])
        assert.deepEqual(appLink(raw), { app: 'zotero', key: 'IKUUN4F6' }, raw);
    // Calibre: a library and a book's number; a format only where the link is to the viewer.
    assert.deepEqual(appLink('calibre://show-book/My_Test_Library/42'), { app: 'calibre', library: 'My_Test_Library', id: 42, format: null });
    assert.deepEqual(appLink('calibre://book-details/_/7'), { app: 'calibre', library: '_', id: 7, format: null });
    assert.deepEqual(appLink('calibre://view-book/_hex_-4D79/3/EPUB?open_at=epubcfi(/6/4)'), { app: 'calibre', library: '_hex_-4D79', id: 3, format: 'epub' });
    assert.deepEqual(appLink('calibre://show-book/Lib/42?virtual_library=Some%20Name'), { app: 'calibre', library: 'Lib', id: 42, format: null });
    // DEVONthink: an item link, with or without a page or other query; its UUID as DEVONthink writes it, in capitals.
    for (const raw of ['x-devonthink-item://22427A1B-F90C-482B-A7B1-6368992BCF35', 'x-devonthink-item://22427a1b-f90c-482b-a7b1-6368992bcf35', 'x-devonthink-item://22427A1B-F90C-482B-A7B1-6368992BCF35?page=2', 'x-devonthink-item://22427A1B-F90C-482B-A7B1-6368992BCF35?page=2&start=10&length=5&search=a%20b', 'x-devonthink-item://22427A1B-F90C-482B-A7B1-6368992BCF35/?reveal=1', ' x-devonthink-item://22427A1B-F90C-482B-A7B1-6368992BCF35 '])
        assert.deepEqual(appLink(raw), { app: 'devonthink', uuid: '22427A1B-F90C-482B-A7B1-6368992BCF35' }, raw);
    // Not such links: other addresses, other things those programs link to, and keys or numbers that are not ones.
    for (const raw of ['', 'Papers/a.pdf', 'https://example.org/a.pdf', 'file:///a.pdf', 'zotero://select/library/collections/ABCD1234', 'zotero://open-pdf/library/items/SHORT', 'zotero://open-pdf/library/items/../../../etc', 'zotero://open-pdf/library/items/IKUUN4F6X', 'calibre://switch-library/Lib', 'calibre://search/Lib?q=x', 'calibre://show-book/Lib/abc', 'calibre://show-book/Lib/../7', 'calibre://show-note/Lib/authors/id_3', 'x-devonthink-item://ABC', 'x-devonthink-item://22427A1B-F90C-482B-A7B1-6368992BCF3', 'x-devonthink-item://22427A1B-F90C-482B-A7B1-6368992BCF35X', 'x-devonthink-item://22427A1B"F90C-482B-A7B1-6368992BCF35', "x-devonthink-item://22427A1B-F90C-482B-A7B1-6368992BCF3'", 'x-devonthink-item://22427A1BF90C482BA7B16368992BCF35', 'x-devonthink-item://../22427A1B-F90C-482B-A7B1-6368992BCF35', 'x-devonthink-item://22427A1B-F90C-482B-A7B1-6368992BCF35/../x', 'x-devonthink-smartgroup://22427A1B-F90C-482B-A7B1-6368992BCF35', 'x-devonthink://search?query=a'])
        assert.equal(appLink(raw), null, raw);
});

test('a Zotero link is the PDF in the folder named by its key, under storage', async () => {
    const data = tree(['storage/IKUUN4F6/Gal et al. - Trace-based.pdf', 'storage/IKUUN4F6/.zotero-ft-cache', 'storage/IKUUN4F6/.zotero-reader-state', 'storage/BOOK0001/Book.epub', 'storage/BOTH0001/b.epub', 'storage/BOTH0001/a.pdf', 'storage/SNAP0001/page.html', 'zotero.sqlite']);
    try {
        assert.equal(await zoteroFile({ key: 'IKUUN4F6' }, data, list), join(data, 'storage', 'IKUUN4F6', 'Gal et al. - Trace-based.pdf'));
        assert.equal(await zoteroFile({ key: 'BOOK0001' }, data + '/', list), join(data, 'storage', 'BOOK0001', 'Book.epub'));
        assert.equal(await zoteroFile({ key: 'BOTH0001' }, data, list), join(data, 'storage', 'BOTH0001', 'a.pdf'), 'a PDF before an EPUB');
        await assert.rejects(zoteroFile({ key: 'SNAP0001' }, data, list), /holds no PDF or EPUB/);
        // A link to the item and not to its PDF has a key with no folder: the message says what to do.
        await assert.rejects(zoteroFile({ key: 'Y2KGGJ99' }, data, list), /has no attachment Y2KGGJ99.*copy the PDF's own link/s);
        await assert.rejects(zoteroFile({ key: 'IKUUN4F6' }, join(data, 'nowhere'), list), /name that folder in Annotator's settings/);
    } finally { rmSync(data, { recursive: true, force: true }); }
});

test('a Calibre link is the EPUB or PDF in the book folder that ends in its number, in the library it names, else its Kindle book', async () => {
    const root = tree(['My Test Library/metadata.db', 'My Test Library/.calnotes/notes.db', 'My Test Library/Unknown/Native Reader Field Guide (1)/Native Reader Field Guide - Unknown.epub', 'My Test Library/Unknown/Native Reader Field Guide (1)/metadata.opf', 'My Test Library/Unknown/Native PDF test (2)/Native PDF test - Unknown.pdf', 'My Test Library/Unknown/Native PDF test (2)/cover.jpg', 'My Test Library/Jane Doe/Both (12)/Both - Jane Doe.pdf', 'My Test Library/Jane Doe/Both (12)/Both - Jane Doe.epub', 'My Test Library/Jane Doe/Both (12)/Both - Jane Doe.mobi', 'My Test Library/Jane Doe/Kindle only (3)/Kindle only - Jane Doe.azw3', 'My Test Library/Jane Doe/Kindle only (3)/Kindle only - Jane Doe.mobi', 'My Test Library/Jane Doe/Old (4)/Old - Jane Doe.prc', 'My Test Library/Jane Doe/Old (4)/cover.jpg', 'My Test Library/Jane Doe/Nothing to read (5)/cover.jpg', 'My Test Library/Jane Doe/A title (1) again (21)/x.epub', 'Other_Lib/A/One (1)/one.pdf']);
    const mine = join(root, 'My Test Library'), other = join(root, 'Other_Lib'), at = (...parts) => join(mine, ...parts);
    const link = raw => appLink(raw);
    try {
        assert.equal(await calibreFile(link('calibre://show-book/My_Test_Library/1'), [mine], list), at('Unknown', 'Native Reader Field Guide (1)', 'Native Reader Field Guide - Unknown.epub'));
        assert.equal(await calibreFile(link('calibre://show-book/My_Test_Library/2'), [other, mine], list), at('Unknown', 'Native PDF test (2)', 'Native PDF test - Unknown.pdf'));
        // The number is the one at the end of the folder's name, not one inside it.
        assert.equal(await calibreFile(link('calibre://book-details/My_Test_Library/21'), [mine], list), at('Jane Doe', 'A title (1) again (21)', 'x.epub'));
        // An EPUB before a PDF, unless the link is to one of them; a link to a Kindle format means the book, and its EPUB is taken first.
        assert.equal(await calibreFile(link('calibre://show-book/My_Test_Library/12'), [mine], list), at('Jane Doe', 'Both (12)', 'Both - Jane Doe.epub'));
        assert.equal(await calibreFile(link('calibre://view-book/My_Test_Library/12/PDF'), [mine], list), at('Jane Doe', 'Both (12)', 'Both - Jane Doe.pdf'));
        assert.equal(await calibreFile(link('calibre://view-book/My_Test_Library/12/MOBI'), [mine], list), at('Jane Doe', 'Both (12)', 'Both - Jane Doe.epub'));
        // The library by its name with underscores for spaces, by its hex, percent-encoded, or "_" where one library is named.
        const hex = Buffer.from('My Test Library').toString('hex').toUpperCase();
        for (const name of [`_hex_-${hex}`, 'My%20Test%20Library', '_']) assert.equal(await calibreFile(link(`calibre://show-book/${name}/2`), [mine], list), at('Unknown', 'Native PDF test (2)', 'Native PDF test - Unknown.pdf'), name);
        assert.equal(await calibreFile(link('calibre://show-book/Other_Lib/1'), [mine, other + '/'], list), join(other, 'A', 'One (1)', 'one.pdf'));
        // What cannot be followed says why.
        await assert.rejects(calibreFile(link('calibre://show-book/_/2'), [mine, other], list), /several libraries are named/);
        await assert.rejects(calibreFile(link('calibre://show-book/Elsewhere/2'), [mine], list), /No Calibre library named in the settings is "Elsewhere"/);
        await assert.rejects(calibreFile(link('calibre://show-book/My_Test_Library/99'), [mine], list), /has no book 99/);
        // A book with no EPUB or PDF is its Kindle book: AZW3 before MOBI, unless the link names MOBI.
        assert.equal(await calibreFile(link('calibre://show-book/My_Test_Library/3'), [mine], list), at('Jane Doe', 'Kindle only (3)', 'Kindle only - Jane Doe.azw3'));
        assert.equal(await calibreFile(link('calibre://view-book/My_Test_Library/3/MOBI'), [mine], list), at('Jane Doe', 'Kindle only (3)', 'Kindle only - Jane Doe.mobi'));
        assert.equal(await calibreFile(link('calibre://view-book/My_Test_Library/3/EPUB'), [mine], list).catch(error => error.message), "Calibre's book 3 has no EPUB file.");
        assert.equal(await calibreFile(link('calibre://show-book/My_Test_Library/4'), [mine], list), at('Jane Doe', 'Old (4)', 'Old - Jane Doe.prc'));
        await assert.rejects(calibreFile(link('calibre://show-book/My_Test_Library/5'), [mine], list), /has no EPUB, PDF, MOBI or AZW3 file\. Convert it in Calibre first\./);
        await assert.rejects(calibreFile(link('calibre://show-book/My_Test_Library/2'), [], list), /Name your Calibre library's folder/);
        await assert.rejects(calibreFile(link('calibre://show-book/My_Test_Library/2'), ['  ', ''], list), /Name your Calibre library's folder/);
    } finally { rmSync(root, { recursive: true, force: true }); }
});

test('folders written the Windows way are joined the Windows way', async () => {
    const seen = [], fake = async folder => { seen.push(folder); return folder.endsWith('IKUUN4F6') ? [{ name: 'a.pdf', folder: false }] : []; };
    assert.equal(await zoteroFile({ key: 'IKUUN4F6' }, 'C:\\Users\\me\\Zotero', fake), 'C:\\Users\\me\\Zotero\\storage\\IKUUN4F6\\a.pdf');
    assert.deepEqual(seen, ['C:\\Users\\me\\Zotero\\storage\\IKUUN4F6']);
});

// A stand-in for osascript: answers as DEVONthink 4.4.2 answered for a test database (an imported PDF and EPUB,
// a Markdown note, an indexed PDF outside the database, a group), and records what it was run with.
const UUID = { pdf: '22427A1B-F90C-482B-A7B1-6368992BCF35', epub: '3367596F-652D-419A-A33E-48766FB987C6', note: '555CF1A1-A6D7-47BB-B966-A5DC3EFFF86E', indexed: 'FC97C304-899B-4635-82EB-849200C224FB', group: 'F0A932AB-54AD-46EF-9F82-728CFF43B00E', pending: '0A0A0A0A-0000-4000-8000-000000000001', missing: '00000000-0000-0000-0000-000000000000' };
const RECORDS = { [UUID.pdf]: { path: '/Users/me/Test.dtBase2/Files.noindex/pdf/8/Imported.pdf' }, [UUID.epub]: { path: '/Users/me/Test.dtBase2/Files.noindex/epub/a/Book.epub' }, [UUID.note]: { path: '/Users/me/Test.dtBase2/Files.noindex/md/9/Note.md' }, [UUID.indexed]: { path: '/Users/me/Papers/Indexed paper.PDF' }, [UUID.group]: { path: '' }, [UUID.pending]: { path: '/Users/me/Test.dtBase2/Files.noindex/pdf/1/Synced.pdf', pending: true } };
function devonthink(state = 'running', fail = null) {
    const runs = [];
    const run = async args => {
        runs.push(args);
        if (fail) return { status: 1, stdout: '', stderr: fail, timedOut: false };
        const [question, uuid] = args.slice(4);
        if (question === 'state') return { status: 0, stdout: JSON.stringify({ state }) + '\n', stderr: '', timedOut: false };
        const record = RECORDS[uuid];
        return { status: 0, stdout: JSON.stringify(record ? { state: 'found', path: record.path, pending: !!record.pending } : { state: 'missing' }) + '\n', stderr: '', timedOut: false };
    };
    return { run, runs };
}
const yes = async () => true;

test('a DEVONthink link is the file DEVONthink says its item has: in its database, or where an indexed item is', async () => {
    const { run, runs } = devonthink();
    assert.equal(await devonthinkFile(appLink(`x-devonthink-item://${UUID.pdf}?page=2`), run, yes), RECORDS[UUID.pdf].path);
    assert.equal(await devonthinkFile({ uuid: UUID.epub }, run, yes), RECORDS[UUID.epub].path);
    assert.equal(await devonthinkFile({ uuid: UUID.indexed }, run, yes), RECORDS[UUID.indexed].path, 'an indexed item: its file where it is, any case of extension');
    // Each question is one run of osascript with the script's text unchanged and the UUID as an argument of its own.
    assert.deepEqual(runs.slice(0, 2), [['-l', 'JavaScript', '-e', DEVONTHINK_SCRIPT, 'state', ''], ['-l', 'JavaScript', '-e', DEVONTHINK_SCRIPT, 'path', UUID.pdf]]);
    assert.deepEqual(devonthinkArgs('path', UUID.epub), ['-l', 'JavaScript', '-e', DEVONTHINK_SCRIPT, 'path', UUID.epub]);
    // The script asks DEVONthink 4 and 3 by their bundle identifiers, takes its argument from run's argv, and has no
    // place where text from the link is written into it.
    assert.match(DEVONTHINK_SCRIPT, /^function run\(argv\) \{/);
    for (const part of ["'com.devon-technologies.think'", "'com.devon-technologies.think3'", 'getRecordWithUuid(argv[1])', '.running()']) assert.ok(DEVONTHINK_SCRIPT.includes(part), part);
    assert.doesNotMatch(DEVONTHINK_SCRIPT, /\$\{|eval|doShellScript/);
});

test('what a DEVONthink link cannot be followed to says why, and what to do', async () => {
    const { run, runs } = devonthink();
    await assert.rejects(devonthinkFile({ uuid: UUID.missing }, run, yes), /No database open in DEVONthink has the item 00000000-0000-0000-0000-000000000000\. Open the database that holds it/);
    await assert.rejects(devonthinkFile({ uuid: UUID.note }, run, yes), /is not a PDF or EPUB \(its file is Note\.md\)/);
    await assert.rejects(devonthinkFile({ uuid: UUID.group }, run, yes), /has no file of its own \(a group/);
    await assert.rejects(devonthinkFile({ uuid: UUID.pending }, run, yes), /not yet downloaded this item's file from its sync location/);
    // A UUID that is not one is refused before anything is run, whatever reaches here.
    const before = runs.length;
    for (const uuid of ['22427a1b-f90c-482b-a7b1-6368992bcf35', `${UUID.pdf}" & do shell script "x`, `${UUID.pdf}\n`, '', '../x']) await assert.rejects(devonthinkFile({ uuid }, run, yes), /not a DEVONthink item link/, uuid);
    assert.equal(runs.length, before);
    // Not installed: said, and nothing more is asked.
    const absent = devonthink('absent');
    await assert.rejects(devonthinkFile({ uuid: UUID.pdf }, absent.run, yes), /DEVONthink is not installed on this Mac.*file's path instead/s);
    assert.deepEqual(absent.runs.map(args => args[4]), ['state']);
    // An answer that is not the script's, or a path that is not a whole one, is not taken.
    for (const stdout of ['', 'nonsense', '{"state":"found","path":"relative/a.pdf"}', '{"state":"found","path":7}', '{"state":"elsewhere"}'])
        await assert.rejects(devonthinkFile({ uuid: UUID.pdf }, async args => ({ status: 0, stdout: args[4] === 'state' ? '{"state":"running"}' : stdout, stderr: '', timedOut: false }), yes), /could not be read/, stdout);
    await assert.rejects(devonthinkFile({ uuid: UUID.pdf }, async () => ({ status: 0, stdout: '{"state":"sleeping"}', stderr: '', timedOut: false }), yes), /could not be read/);
});

test('DEVONthink is asked only after the reader says yes, and is told whether asking starts it', async () => {
    for (const state of ['running', 'stopped']) {
        const { run, runs } = devonthink(state), told = [];
        await assert.rejects(devonthinkFile({ uuid: UUID.pdf }, run, async running => { told.push(running); return false; }), /Not opened: DEVONthink was not asked/);
        assert.deepEqual(told, [state === 'running']);
        // Only whether it is there and running was asked, which starts nothing.
        assert.deepEqual(runs.map(args => args[4]), ['state']);
        assert.equal(await devonthinkFile({ uuid: UUID.pdf }, run, yes), RECORDS[UUID.pdf].path);
    }
});

test("macOS's refusal, a timeout and other failures of osascript are said in words", async () => {
    const said = async (stderr, timedOut = false) => {
        try { await devonthinkFile({ uuid: UUID.pdf }, async () => ({ status: timedOut ? null : 1, stdout: '', stderr, timedOut }), yes); } catch (error) { return error.message; }
        assert.fail('followed');
    };
    // As osascript writes it when the Automation permission is refused.
    assert.match(await said('execution error: Error: Error: Not authorized to send Apple events to DEVONthink. (-1743)\n'), /System Settings → Privacy & Security → Automation: under Obsidian, turn on DEVONthink/);
    assert.match(await said('execution error: Error: Error: AppleEvent timed out. (-1712)'), /did not answer in time/);
    assert.match(await said('', true), /did not answer in time/);
    assert.match(await said("execution error: Error: Error: Application isn't running. (-600)"), /quit before it answered/);
    assert.match(await said('execution error: Error: Error: Something else. (-10000)'), /could not be asked for the item's file \(Error: Error: Something else\. \(-10000\)\)/);
    await assert.rejects(devonthinkFile({ uuid: UUID.pdf }, async () => { throw Object.assign(new Error('spawn /usr/bin/osascript ENOENT'), { code: 'ENOENT' }); }, yes), /osascript could not be run.*ENOENT/);
});

test('the script itself is valid for osascript, and asking whether DEVONthink is there starts nothing', { skip: process.platform !== 'darwin' && 'osascript is a Mac program' }, async () => {
    const { execFileSync } = await import('node:child_process');
    const answer = JSON.parse(execFileSync('/usr/bin/osascript', devonthinkArgs('state'), { encoding: 'utf8', timeout: 30000 }));
    assert.ok(['absent', 'stopped', 'running'].includes(answer.state), JSON.stringify(answer));
});

test('the links kept between sessions are only links of these kinds to whole paths', () => {
    assert.deepEqual(followedLinks({ 'zotero://open-pdf/library/items/IKUUN4F6': '/Users/me/Zotero/storage/IKUUN4F6/a.pdf', 'calibre://show-book/Lib/2': 'C:\\Books\\A\\B (2)\\b.epub', 'https://example.org/a.pdf': '/tmp/a.pdf', 'zotero://open-pdf/library/items/ABCD1234': 'relative/a.pdf', 'calibre://show-book/Lib/3': 7 }), { 'zotero://open-pdf/library/items/IKUUN4F6': '/Users/me/Zotero/storage/IKUUN4F6/a.pdf', 'calibre://show-book/Lib/2': 'C:\\Books\\A\\B (2)\\b.epub' });
    assert.deepEqual(followedLinks({ [`x-devonthink-item://${UUID.pdf}?page=2`]: RECORDS[UUID.pdf].path, 'x-devonthink-item://ABC': '/tmp/a.pdf' }), { [`x-devonthink-item://${UUID.pdf}?page=2`]: RECORDS[UUID.pdf].path });
    for (const value of [null, undefined, 'text', [], 3]) assert.deepEqual(followedLinks(value), {});
});
