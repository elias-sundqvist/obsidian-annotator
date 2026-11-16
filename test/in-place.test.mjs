// Sources read where they are (docs/dev/EXTERNAL_SOURCES_DESIGN.md): the keys
// they are known by, the one check every write goes through, the download
// cache's place and names, what a device keeps, and how a copy is named.
// Obsidian 1.15.1's own code was read for the form of its keys: `file:` and
// the resolved absolute path with `/` separators, not percent-encoded.
import test from 'node:test';
import assert from 'node:assert/strict';

const {
    externalKey,
    isExternalKey,
    externalPath,
    sameExternal,
    vaultWritable,
    cacheRoot,
    cacheFileName,
    cachePath,
    inCache,
    placeDevice,
    allowedHere,
    libraryOf,
    copyOrigin,
    copyName,
    COPY_ENDINGS
} = await import('./.generated/readers/in-place.js');
const { remoteFilename } = await import('./.generated/readers/remote-source.js');

test('an outside file is keyed as Obsidian keys a TExternalFile', () => {
    assert.equal(externalKey('/Users/me/Zotero/storage/IKUUN4F6/Attention is all you need.pdf'), 'file:/Users/me/Zotero/storage/IKUUN4F6/Attention is all you need.pdf');
    // Windows: forward slashes, the drive letter as Node resolves it; never a doubled separator.
    assert.equal(externalKey('C:\\Users\\me\\Calibre Library\\Jane Doe\\A Book (7)\\A Book.epub'), 'file:C:/Users/me/Calibre Library/Jane Doe/A Book (7)/A Book.epub');
    assert.equal(externalKey('c:/x//y.pdf'), 'file:C:/x/y.pdf');
    assert.equal(externalPath('file:/Users/me/a b.pdf'), '/Users/me/a b.pdf');
    // Its key and 0.3's address for copies are never taken for each other.
    for (const key of ['file:/Users/me/a.pdf', 'file:C:/x.pdf', 'file:c:/x.pdf']) assert.equal(isExternalKey(key), true, key);
    for (const key of ['file:///Users/me/a.pdf', 'file://server/a.pdf', 'Papers/a.pdf', '/Users/a.pdf', 'remote:file:///a.pdf', 'web:https://x']) assert.equal(isExternalKey(key), false, key);
    // A Mac's or Windows' disk takes names differing in case for one name; Linux' does not.
    assert.equal(sameExternal('file:/Users/Me/A.pdf', 'file:/users/me/a.pdf', true), true);
    assert.equal(sameExternal('file:/Users/Me/A.pdf', 'file:/users/me/a.pdf', false), false);
});

test('nothing outside the vault passes the check every write goes through', () => {
    for (const path of ['Papers/a.pdf', 'Annotator sources/abc.pdf', 'a.md', 'file notes/a.md', 'C/a.pdf', 'Notes/x (annotated).pdf']) assert.equal(vaultWritable(path), true, path);
    for (const path of ['file:/Users/me/a.pdf', 'file:///Users/me/a.pdf', 'FILE:C:/a.pdf', '/Users/me/a.md', '\\\\server\\a.md', 'C:\\a.md', 'c:/a.md', '../outside.md', 'Papers/../../outside.md', 'a\0.md', 'app://local/a.pdf', '']) assert.equal(vaultWritable(path), false, JSON.stringify(path));
    // A file that can say where it really is (Obsidian's TExternalFile) is never written, whatever its path says.
    assert.equal(vaultWritable({ path: 'Papers/a.pdf', getRealPath: () => '/x/a.pdf' }), false);
    assert.equal(vaultWritable({ path: 'Papers/a.pdf' }), true);
});

test('downloads of web sources go to the system cache, one folder per address and bytes, under their own name', () => {
    assert.equal(cacheRoot({ platform: 'darwin', home: '/Users/me' }), '/Users/me/Library/Caches/Annotator for Obsidian');
    assert.equal(cacheRoot({ platform: 'linux', home: '/home/me/' }), '/home/me/.cache/annotator-for-obsidian');
    assert.equal(cacheRoot({ platform: 'linux', home: '/home/me', xdgCache: '/var/cache/me' }), '/var/cache/me/annotator-for-obsidian');
    assert.equal(cacheRoot({ platform: 'linux', home: '/home/me', xdgCache: 'relative' }), '/home/me/.cache/annotator-for-obsidian');
    assert.equal(cacheRoot({ platform: 'win32', home: 'C:\\Users\\me', localAppData: 'C:\\Users\\me\\AppData\\Local' }), 'C:\\Users\\me\\AppData\\Local\\Annotator for Obsidian\\Cache');
    assert.equal(cacheRoot({ platform: 'win32', home: 'C:\\Users\\me' }), 'C:\\Users\\me\\AppData\\Local\\Annotator for Obsidian\\Cache');
    assert.equal(cacheRoot({ platform: 'darwin', home: '' }), null);
    // The file keeps the name its address gives it, so the tab says what it is; made safe for every system.
    assert.equal(cacheFileName('https://arxiv.org/pdf/1706.03762', 'pdf'), '1706.03762.pdf');
    assert.equal(cacheFileName('https://example.org/papers/Attention%20is%20all%20you%20need.pdf?x=1', 'pdf'), 'Attention is all you need.pdf');
    assert.equal(cacheFileName('https://example.org/a%3A%2Fb%0A%22c%22.epub', 'epub'), 'a b c.epub');
    assert.equal(cacheFileName('https://example.org/', 'epub'), 'source.epub');
    assert.equal(cacheFileName('https://example.org/..%2E.pdf', 'pdf'), 'source.pdf');
    const a = 'a'.repeat(64), b = 'b'.repeat(64);
    assert.equal(cachePath('/Users/me/Library/Caches/Annotator for Obsidian/', a, b, 'Paper.pdf'), `/Users/me/Library/Caches/Annotator for Obsidian/${a}/${b}/Paper.pdf`);
    assert.equal(cachePath('C:\\Cache', a, b, 'Paper.pdf'), `C:\\Cache\\${a}\\${b}\\Paper.pdf`);
    for (const [url, bytes, name] of [['x', b, 'a.pdf'], [a, b, '../a.pdf'], [a, b, '.part'], [a, b, 'a/b.pdf'], [a, b, '']]) assert.throws(() => cachePath('/c', url, bytes, name));
    // Only such a place is ever written outside the vault.
    assert.equal(inCache('/c/root', `/c/root/${a}/${b}/Paper.pdf`), true);
    assert.equal(inCache('C:\\c', `C:\\c\\${a}\\${b}\\Paper.pdf`), true);
    for (const path of [`/c/root/${a}/Paper.pdf`, `/c/other/${a}/${b}/Paper.pdf`, `/c/root/${a}/${b}/.part-1`, `/c/root/${a}/${b}/x/Paper.pdf`, `/c/root/x/${b}/Paper.pdf`]) assert.equal(inCache('/c/root', path), false, path);
});

test('what a device allows is kept per file or per library, and only in a form it can be', () => {
    const kept = placeDevice({ allowed: ['file:/Users/me/a.pdf', 'folder:file:/Users/me/Zotero/storage/', 'file:///old.pdf', '/plain.pdf', 7], downloads: { 'https://x.org/a.pdf': '/c/a.pdf', 'javascript:x': '/c/b.pdf', 'https://x.org/b.pdf': 'relative.pdf' } });
    assert.deepEqual(kept, { allowed: ['file:/Users/me/a.pdf', 'folder:file:/Users/me/Zotero/storage/'], downloads: { 'https://x.org/a.pdf': '/c/a.pdf' }, names: {} });
    assert.deepEqual(placeDevice(null), { allowed: [], downloads: {}, names: {} });
    assert.equal(allowedHere(kept, 'file:/Users/me/a.pdf', false), true);
    assert.equal(allowedHere(kept, 'file:/Users/me/A.pdf', false), false);
    assert.equal(allowedHere(kept, 'file:/Users/me/A.pdf', true), true);
    assert.equal(allowedHere(kept, 'file:/Users/me/Zotero/storage/ABCD1234/Paper.pdf', false), true);
    assert.equal(allowedHere(kept, 'file:/Users/me/Zotero/other.pdf', false), false);
    // A file is in a library when it is under one of the folders the settings name; a folder's name alone is not enough.
    assert.equal(libraryOf('file:/Users/me/Zotero/storage/ABCD1234/P.pdf', ['/Users/me/Zotero/storage'], false), 'file:/Users/me/Zotero/storage/');
    assert.equal(libraryOf('file:/Users/me/Zotero/storage2/P.pdf', ['/Users/me/Zotero/storage'], false), null);
    assert.equal(libraryOf('file:C:/Books/Jane/B (1)/B.epub', ['', 'relative', 'C:\\Books\\'], true), 'file:C:/Books/');
});

test('a copy in the vault is named by the note\'s target as written, so any device finds it from the note', async () => {
    assert.equal(copyOrigin('  zotero://open-pdf/library/items/IKUUN4F6  '), 'zotero://open-pdf/library/items/IKUUN4F6');
    assert.equal(copyOrigin('https://example.org/a.pdf#page=2'), 'https://example.org/a.pdf');
    const zotero = await copyName('zotero://open-pdf/library/items/IKUUN4F6', 'pdf');
    assert.match(zotero, /^Annotator sources\/[0-9a-f]{64}\.pdf$/);
    assert.equal(await copyName('zotero://open-pdf/library/items/IKUUN4F6', 'pdf'), zotero);
    assert.notEqual(await copyName('zotero://open-pdf/library/items/IKUUN4F7', 'pdf'), zotero);
    // A web address's copy has the name 0.3 gave it, so copies made before are found by name as well.
    assert.equal(await copyName(copyOrigin('https://example.org/a.pdf'), 'pdf'), await remoteFilename('https://example.org/a.pdf', 'pdf'));
    assert.deepEqual(COPY_ENDINGS, ['pdf', 'epub', 'mobi', 'azw3', 'prc']);
    await assert.rejects(copyName('x', 'exe'));
});

test('a path Obsidian would read as another file is never a key: a backslash outside Windows, or a step out', async () => {
    const { safeExternalKey } = await import('./.generated/readers/in-place.js');
    const { localTarget } = await import('./.generated/readers/local-source.js');
    // On macOS and Linux a backslash is a letter of a name, but Obsidian takes it for a separator and then resolves the
    // steps out: `storage/..\..\..\me\Documents\secret.pdf` would open /Users/me/Documents/secret.pdf.
    for (const raw of ['/Users/me/Zotero/storage/..\\..\\..\\me\\Documents\\secret.pdf', '/Users/me/Zotero/storage/IKUUN4F6\\..\\..\\..\\secret.pdf', '/Users/me/Zotero/storage/a\\b.pdf', 'file:///Users/me/Zotero/storage/%2E%2E%5C%2E%2E%5Csecret.pdf', 'file:///Users/me/Zotero/storage/..%5Csecret.pdf']) {
        const local = localTarget(raw);
        assert.ok(local, raw);
        assert.throws(() => externalKey(local.path), /cannot be read where it is/, raw);
    }
    // Steps out written with slashes are taken away before (by localTarget), and Windows' backslashes are separators.
    assert.equal(externalKey(localTarget('/Users/me/Zotero/storage/../../a.pdf').path), 'file:/Users/me/a.pdf');
    assert.equal(externalKey(localTarget('C:\\Users\\me\\Zotero\\storage\\..\\..\\a.pdf').path), 'file:C:/Users/me/a.pdf');
    for (const key of ['file:/Users/me/a.pdf', 'file:C:/Users/me/a.pdf']) assert.equal(safeExternalKey(key), true, key);
    for (const key of ['file:/Users/me/../me/a.pdf', 'file:/Users/me/./a.pdf', 'file:/Users/me//a.pdf', 'file:/Users/me/a\\b.pdf', 'file:/Users/me/a\0.pdf', 'file:///Users/me/a.pdf', 'file:C:/x/../y.pdf']) assert.equal(safeExternalKey(key), false, key);
    // Such a key is never allowed, whatever was allowed before, in any case of its letters.
    const device = placeDevice({ allowed: ['folder:file:/Users/me/Zotero/storage/', 'folder:file:/Users/me/Zotero/storage/../../', 'file:/Users/me/../me/a.pdf'] });
    assert.deepEqual(device.allowed, ['folder:file:/Users/me/Zotero/storage/']);
    for (const fold of [false, true])
        for (const key of ['file:/Users/me/Zotero/storage/../../../me/Documents/secret.pdf', 'file:/users/me/zotero/storage/../../secret.pdf', 'file:/Users/me/Zotero/storage/./x/../../secret.pdf', 'file:/Users/me/Zotero/storage/a\\..\\..\\secret.pdf'])
            assert.equal(allowedHere(device, key, fold), false, key);
    assert.equal(libraryOf('file:/Users/me/Zotero/storage/../../me/secret.pdf', ['/Users/me/Zotero/storage'], false), null);
    // A library named in the settings with steps in it is the folder they lead to.
    assert.equal(libraryOf('file:/Users/me/Zotero/storage/X/P.pdf', ['/Users/me/Zotero/other/../storage/'], false), 'file:/Users/me/Zotero/storage/');
});

test('the name a copy is found by is worked out at once as well, the same as the copy is made under', async () => {
    const { copyNameNow } = await import('./.generated/readers/in-place.js');
    for (const origin of ['zotero://open-pdf/library/items/IKUUN4F6', '/Users/me/Papers/Ångström — 2017.pdf', 'https://example.org/a.pdf', '', 'x'.repeat(200)])
        for (const ending of ['pdf', 'epub', 'azw3']) assert.equal(copyNameNow(origin, ending), await copyName(origin, ending), origin);
    assert.throws(() => copyNameNow('x', 'exe'));
});

test('which origin a file read where it is answers to is kept on this device, so a restored book finds its place before the notes are read', () => {
    const kept = placeDevice({ names: { 'file:/Users/me/a.epub': 'calibre://show-book/Books/7', 'file:/Users/me/../x.epub': 'x', 'notakey': 'y', 'file:/Users/me/b.epub': 7 } });
    assert.deepEqual(kept.names, { 'file:/Users/me/a.epub': 'calibre://show-book/Books/7' });
    assert.deepEqual(placeDevice(null).names, {});
});
