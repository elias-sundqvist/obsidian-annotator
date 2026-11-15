// HTTP Basic sign-in for a source kept behind a user name and password.
// Checked here: which server answers ask for Basic and what they call the
// place, the header made from a user name and password (UTF-8, RFC 7617),
// when a password would cross the network unencrypted, and that an address
// with a user name and password in it is refused with what to do instead.
import test from 'node:test';
import assert from 'node:assert/strict';

const { basicChallenge, basicAuthorization, sentInTheClear, signInOrigin } = await import('./.generated/readers/web-auth.js');
const { cachedSourceUrl } = await import('./.generated/readers/local-source.js');

test('which answers ask for Basic, and the place they name', () => {
    assert.deepEqual(basicChallenge('Basic realm="Calibre library"'), { realm: 'Calibre library' });
    assert.deepEqual(basicChallenge('basic realm=Books'), { realm: 'Books' }); assert.deepEqual(basicChallenge('Basic'), { realm: '' });
    assert.deepEqual(basicChallenge('Basic charset="UTF-8", realm="A \\"quoted\\" place"'), { realm: 'A "quoted" place' });
    // Among other schemes, wherever it stands; a realm of another scheme is not Basic's.
    assert.deepEqual(basicChallenge('Negotiate, Basic realm="Files"'), { realm: 'Files' }); assert.deepEqual(basicChallenge('Basic realm="One", Bearer realm="Two"'), { realm: 'One' });
    assert.deepEqual(basicChallenge('Bearer realm="Two", Basic realm="One"'), { realm: 'One' });
    // Not Basic: other schemes, a realm that only says "basic", nothing.
    for (const header of ['Bearer realm="x"', 'Digest realm="x", nonce="y"', 'Bearer realm="basic"', 'Basicx realm="x"', '', null, undefined]) assert.equal(basicChallenge(header), null, String(header));
    assert.equal(basicChallenge(`Basic realm="${'x'.repeat(500)}"`).realm.length, 200);
});

test('the header for a user name and password, as UTF-8', () => {
    // RFC 7617's own examples.
    assert.equal(basicAuthorization('Aladdin', 'open sesame'), 'Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==');
    assert.equal(basicAuthorization('test', '123£'), 'Basic dGVzdDoxMjPCow==');
    // Each length of the last group of bytes, and an empty password, agree with the platform's own encoding.
    for (const [user, password] of [['a', ''], ['ab', 'c'], ['abc', 'de'], ['räksmörgås', 'sésame 中文'], ['user', 'pass:with:colons']])
        assert.equal(basicAuthorization(user, password), `Basic ${Buffer.from(`${user}:${password}`, 'utf8').toString('base64')}`);
    // A colon in the user name, or control characters, cannot be sent this way.
    for (const [user, password] of [['a:b', 'c'], ['a\nb', 'c'], ['a', 'b\u0000'], ['a', 'b\u007f']]) assert.throws(() => basicAuthorization(user, password), /may not contain/);
});

test('where sign-ins are kept and when a password would go unencrypted', () => {
    assert.equal(signInOrigin('https://books.example.org:8443/download/5/pdf/5.pdf?x=1'), 'https://books.example.org:8443');
    assert.equal(sentInTheClear('https://books.example.org/a.pdf'), false); assert.equal(sentInTheClear('http://books.example.org/a.pdf'), true); assert.equal(sentInTheClear('http://192.168.1.4/a.pdf'), true);
    for (const local of ['http://localhost:8083/a.pdf', 'http://127.0.0.1/a.pdf', 'http://[::1]/a.pdf']) assert.equal(sentInTheClear(local), false, local);
    // An address with them in it is refused, saying what to do instead.
    assert.throws(() => cachedSourceUrl('https://user:secret@books.example.org/download/5003/pdf/5003.pdf'), /without a user name and password/);
    assert.throws(() => cachedSourceUrl('ftp://books.example.org/a.pdf'), /Unsupported source URL/);
});
