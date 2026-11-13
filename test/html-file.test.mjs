// An HTML file in the vault as a source.
import test from 'node:test';
import assert from 'node:assert/strict';
import { savedFrom, htmlFileUrl, htmlCopyBase, HTML_FILE } from './.generated/readers/html-file.js';

test('a saved page says where it came from in one of the usual ways; a page that does not is given an address that can never be fetched', () => {
    assert.equal(savedFrom('<!DOCTYPE html>\n<!-- saved from url=(0042)https://example.org/articles/one?x=1&amp;y=2 -->\n<html>'), 'https://example.org/articles/one?x=1&y=2');
    assert.equal(savedFrom('<html><head><link rel="canonical" href="https://example.org/canonical"></head>'), 'https://example.org/canonical');
    assert.equal(savedFrom('<html><head><link href="https://example.org/other" rel=canonical></head>'), 'https://example.org/other');
    assert.equal(savedFrom('<head><meta property="og:url" content="https://example.org/og"></head>'), 'https://example.org/og');
    assert.equal(savedFrom('<head><base href="https://example.org/base/"></head>'), 'https://example.org/base/');
    // The browser's own note comes first; what is not a web address is not one.
    assert.equal(savedFrom('<!-- saved from url=(0020)https://a.example/x --><link rel="canonical" href="https://b.example/y">'), 'https://a.example/x');
    for (const none of ['<html><body>Plain</body></html>', '<link rel="canonical" href="/relative">', '<base href="file:///Users/me/page.html">', '<meta property="og:url" content="javascript:alert(1)">', '']) assert.equal(savedFrom(none), null, none);
    assert.equal(htmlFileUrl('<html></html>', 'Clippings/My page (1).html'), 'https://vault.invalid/Clippings/My%20page%20(1).html');
    assert.equal(htmlFileUrl('<link rel="canonical" href="https://example.org/c">', 'a.html'), 'https://example.org/c');
    assert.equal(htmlCopyBase('Clippings/My page.html'), 'Clippings/My page (reading copy)'); assert.equal(htmlCopyBase('a.b.xhtml'), 'a.b (reading copy)');
    for (const yes of ['html', 'HTM', 'xhtml']) assert.ok(HTML_FILE.test(yes)); for (const no of ['md', 'pdf', 'shtml', 'htmlx']) assert.equal(HTML_FILE.test(no), false, no);
});

test('a page is read in the encoding it is served in, marked with, or declares of itself; text that would come out broken is refused, and something that is not a page says what it is', async () => {
    const { htmlCharset, htmlText, notAPage } = await import('./.generated/readers/web-fetch.js');
    const utf8 = text => new TextEncoder().encode(text), bytes = (...list) => new Uint8Array(list);
    // 中文 in GBK, behind an ASCII head that says so: the case that used to come out as unreadable characters.
    const gbk = new Uint8Array([...utf8('<html><head><meta charset="gbk"><title>'), 0xd6, 0xd0, 0xce, 0xc4, ...utf8('</title></head><body>'), 0xd6, 0xd0, 0xce, 0xc4, ...utf8('</body></html>')]);
    assert.equal(htmlCharset(gbk, 'text/html'), 'gbk'); assert.match(htmlText(gbk.buffer, 'text/html'), /<title>中文<\/title>.*<body>中文<\/body>/);
    // The old form of the declaration, and the server's word over the page's own.
    assert.equal(htmlCharset(utf8('<meta http-equiv="Content-Type" content="text/html; charset=Shift_JIS">'), ''), 'shift_jis');
    assert.equal(htmlCharset(gbk, 'text/html; charset="UTF-8"'), 'utf-8');
    assert.equal(htmlCharset(bytes(0xef, 0xbb, 0xbf, 0x3c), 'text/html'), 'utf-8'); assert.equal(htmlCharset(bytes(0xff, 0xfe, 0x3c, 0), 'text/html'), 'utf-16le'); assert.equal(htmlCharset(bytes(0xfe, 0xff, 0, 0x3c), 'text/html'), 'utf-16be');
    assert.equal(htmlCharset(utf8('<html><body>plain</body></html>'), 'text/html'), 'utf-8');
    assert.equal(htmlText(utf8('<p>Zoë — “quoted” 📝</p>').buffer, 'text/html; charset=utf-8'), '<p>Zoë — “quoted” 📝</p>');
    // Served as UTF-8 but not UTF-8: no copy full of broken characters.
    assert.throws(() => htmlText(gbk.buffer, 'text/html; charset=utf-8'), /not valid UTF-8.*broken characters/);
    assert.throws(() => htmlText(utf8('<meta charset="klingon-8">').buffer, 'text/html'), /“klingon-8”, which cannot be read here/);
    // Not a page at all.
    assert.equal(notAPage(utf8('<!doctype html><p>An article</p>').buffer, 'text/html; charset=utf-8'), null); assert.equal(notAPage(utf8('<p>x</p>').buffer, ''), null); assert.equal(notAPage(utf8('<p>x</p>').buffer, 'application/xhtml+xml'), null);
    assert.match(notAPage(utf8('%PDF-1.7\n…').buffer, 'text/html'), /is a PDF, not a web page.*annotation-target-type to pdf/); assert.match(notAPage(utf8('whatever').buffer, 'application/pdf'), /is a PDF/);
    assert.match(notAPage(bytes(0x50, 0x4b, 3, 4).buffer, 'application/octet-stream'), /book or an archive.*epub/); assert.match(notAPage(utf8('{}').buffer, 'application/json; charset=utf-8'), /returned application\/json, not a web page/);
});
test('a file\'s address with a slash after its name is still that file', async () => {
    const { remoteKind } = await import('./.generated/readers/remote-source.js');
    assert.equal(remoteKind('https://docdrop.org/static/drop-pdf/Some-Paper-AbC12.pdf/'), 'pdf'); assert.equal(remoteKind('https://example.org/books/novel.EPUB//?x=1'), 'epub');
    assert.equal(remoteKind('https://example.org/pdf/'), null, 'a folder called pdf is not a PDF'); assert.equal(remoteKind('https://example.org/article/'), null);
});
