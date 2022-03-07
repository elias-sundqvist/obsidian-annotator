// The below code is a bundled and tweaked version of node-fetch (https://www.npmjs.com/package/node-fetch)
/* eslint-disable */
// @ts-nocheck

export default requireFunc => {
    const http = requireFunc('node:http');
    const https = requireFunc('node:https');
    const zlib = requireFunc('node:zlib');
    const Stream = requireFunc('node:stream');
    const node_buffer = requireFunc('node:buffer');
    const node_util = requireFunc('node:util');
    const node_url = requireFunc('node:url');
    const node_net = requireFunc('node:net');
    requireFunc('node:fs');
    requireFunc('node:path');
    requireFunc('node-domexception');

    function _interopDefaultLegacy(e) {
        return e && typeof e === 'object' && 'default' in e ? e : { default: e };
    }

    const http__default = _interopDefaultLegacy(http);
    const https__default = _interopDefaultLegacy(https);
    const zlib__default = _interopDefaultLegacy(zlib);
    const Stream__default = _interopDefaultLegacy(Stream);

    function dataUriToBuffer(uri) {
        if (!/^data:/i.test(uri)) {
            throw new TypeError('`uri` does not appear to be a Data URI (must begin with "data:")');
        }
        uri = uri.replace(/\r?\n/g, '');
        const firstComma = uri.indexOf(',');
        if (firstComma === -1 || firstComma <= 4) {
            throw new TypeError('malformed data: URI');
        }
        const meta = uri.substring(5, firstComma).split(';');
        let charset = '';
        let base64 = false;
        const type = meta[0] || 'text/plain';
        let typeFull = type;
        for (let i = 1; i < meta.length; i++) {
            if (meta[i] === 'base64') {
                base64 = true;
            } else {
                typeFull += `;${meta[i]}`;
                if (meta[i].indexOf('charset=') === 0) {
                    charset = meta[i].substring(8);
                }
            }
        }
        if (!meta[0] && !charset.length) {
            typeFull += ';charset=US-ASCII';
            charset = 'US-ASCII';
        }
        const encoding = base64 ? 'base64' : 'ascii';
        const data = unescape(uri.substring(firstComma + 1));
        const buffer = Buffer.from(data, encoding);
        buffer.type = type;
        buffer.typeFull = typeFull;
        buffer.charset = charset;
        return buffer;
    }

    /* c8 ignore start */
    // 64 KiB (same size chrome slice theirs blob into Uint8array's)
    const POOL_SIZE$1 = 65536;

    if (!globalThis.ReadableStream) {
        // `node:stream/web` got introduced in v16.5.0 as experimental
        // and it's preferred over the polyfilled version. So we also
        // suppress the warning that gets emitted by NodeJS for using it.
        try {
            const process = requireFunc('node:process');
            const { emitWarning } = process;
            try {
                process.emitWarning = () => {};
                Object.assign(globalThis, requireFunc('node:stream/web'));
                process.emitWarning = emitWarning;
            } catch (error) {
                process.emitWarning = emitWarning;
                throw error;
            }
        } catch (error) {
            // fallback to polyfill implementation
            Object.assign(globalThis, requireFunc('web-streams-polyfill/dist/ponyfill.es2018.js'));
        }
    }

    try {
        // Don't use node: prefix for this, require+node: is not supported until node v14.14
        // Only `import()` can use prefix in 12.20 and later
        const { Blob } = requireFunc('buffer');
        if (Blob && !Blob.prototype.stream) {
            Blob.prototype.stream = function name(params) {
                let position = 0;
                const blob = this;

                return new ReadableStream({
                    type: 'bytes',
                    async pull(ctrl) {
                        const chunk = blob.slice(position, Math.min(blob.size, position + POOL_SIZE$1));
                        const buffer = await chunk.arrayBuffer();
                        position += buffer.byteLength;
                        ctrl.enqueue(new Uint8Array(buffer));

                        if (position === blob.size) {
                            ctrl.close();
                        }
                    }
                });
            };
        }
    } catch (error) {}
    /* c8 ignore end */

    const POOL_SIZE = 65536;
    async function* toIterator(parts, clone = true) {
        for (const part of parts) {
            if ('stream' in part) {
                yield* part.stream();
            } else if (ArrayBuffer.isView(part)) {
                if (clone) {
                    let position = part.byteOffset;
                    const end = part.byteOffset + part.byteLength;
                    while (position !== end) {
                        const size = Math.min(end - position, POOL_SIZE);
                        const chunk = part.buffer.slice(position, position + size);
                        position += chunk.byteLength;
                        yield new Uint8Array(chunk);
                    }
                } else {
                    yield part;
                }
            } else {
                let position = 0,
                    b = part;
                while (position !== b.size) {
                    const chunk = b.slice(position, Math.min(b.size, position + POOL_SIZE));
                    const buffer = await chunk.arrayBuffer();
                    position += buffer.byteLength;
                    yield new Uint8Array(buffer);
                }
            }
        }
    }
    const _Blob = class Blob {
        #parts = [];
        #type = '';
        #size = 0;
        #endings = 'transparent';
        constructor(blobParts = [], options = {}) {
            if (typeof blobParts !== 'object' || blobParts === null) {
                throw new TypeError(
                    "Failed to construct 'Blob': The provided value cannot be converted to a sequence."
                );
            }
            if (typeof blobParts[Symbol.iterator] !== 'function') {
                throw new TypeError("Failed to construct 'Blob': The object must have a callable @@iterator property.");
            }
            if (typeof options !== 'object' && typeof options !== 'function') {
                throw new TypeError("Failed to construct 'Blob': parameter 2 cannot convert to dictionary.");
            }
            if (options === null) options = {};
            const encoder = new TextEncoder();
            for (const element of blobParts) {
                let part;
                if (ArrayBuffer.isView(element)) {
                    part = new Uint8Array(
                        element.buffer.slice(element.byteOffset, element.byteOffset + element.byteLength)
                    );
                } else if (element instanceof ArrayBuffer) {
                    part = new Uint8Array(element.slice(0));
                } else if (element instanceof Blob) {
                    part = element;
                } else {
                    part = encoder.encode(`${element}`);
                }
                this.#size += ArrayBuffer.isView(part) ? part.byteLength : part.size;
                this.#parts.push(part);
            }
            this.#endings = `${options.endings === undefined ? 'transparent' : options.endings}`;
            const type = options.type === undefined ? '' : String(options.type);
            this.#type = /^[\x20-\x7E]*$/.test(type) ? type : '';
        }
        get size() {
            return this.#size;
        }
        get type() {
            return this.#type;
        }
        async text() {
            const decoder = new TextDecoder();
            let str = '';
            for await (const part of toIterator(this.#parts, false)) {
                str += decoder.decode(part, { stream: true });
            }
            str += decoder.decode();
            return str;
        }
        async arrayBuffer() {
            const data = new Uint8Array(this.size);
            let offset = 0;
            for await (const chunk of toIterator(this.#parts, false)) {
                data.set(chunk, offset);
                offset += chunk.length;
            }
            return data.buffer;
        }
        stream() {
            const it = toIterator(this.#parts, true);
            return new globalThis.ReadableStream({
                type: 'bytes',
                async pull(ctrl) {
                    const chunk = await it.next();
                    chunk.done ? ctrl.close() : ctrl.enqueue(chunk.value);
                },
                async cancel() {
                    await it.return();
                }
            });
        }
        slice(start = 0, end = this.size, type = '') {
            const { size } = this;
            let relativeStart = start < 0 ? Math.max(size + start, 0) : Math.min(start, size);
            let relativeEnd = end < 0 ? Math.max(size + end, 0) : Math.min(end, size);
            const span = Math.max(relativeEnd - relativeStart, 0);
            const parts = this.#parts;
            const blobParts = [];
            let added = 0;
            for (const part of parts) {
                if (added >= span) {
                    break;
                }
                const size = ArrayBuffer.isView(part) ? part.byteLength : part.size;
                if (relativeStart && size <= relativeStart) {
                    relativeStart -= size;
                    relativeEnd -= size;
                } else {
                    let chunk;
                    if (ArrayBuffer.isView(part)) {
                        chunk = part.subarray(relativeStart, Math.min(size, relativeEnd));
                        added += chunk.byteLength;
                    } else {
                        chunk = part.slice(relativeStart, Math.min(size, relativeEnd));
                        added += chunk.size;
                    }
                    relativeEnd -= size;
                    blobParts.push(chunk);
                    relativeStart = 0;
                }
            }
            const blob = new Blob([], { type: String(type).toLowerCase() });
            blob.#size = span;
            blob.#parts = blobParts;
            return blob;
        }
        get [Symbol.toStringTag]() {
            return 'Blob';
        }
        static [Symbol.hasInstance](object) {
            return (
                object &&
                typeof object === 'object' &&
                typeof object.constructor === 'function' &&
                (typeof object.stream === 'function' || typeof object.arrayBuffer === 'function') &&
                /^(Blob|File)$/.test(object[Symbol.toStringTag])
            );
        }
    };
    Object.defineProperties(_Blob.prototype, {
        size: { enumerable: true },
        type: { enumerable: true },
        slice: { enumerable: true }
    });
    const Blob = _Blob;
    const Blob$1 = Blob;

    const _File = class File extends Blob$1 {
        #lastModified = 0;
        #name = '';
        constructor(fileBits, fileName, options = {}) {
            if (arguments.length < 2) {
                throw new TypeError(
                    `Failed to construct 'File': 2 arguments required, but only ${arguments.length} present.`
                );
            }
            super(fileBits, options);
            if (options === null) options = {};
            const lastModified = options.lastModified === undefined ? Date.now() : Number(options.lastModified);
            if (!Number.isNaN(lastModified)) {
                this.#lastModified = lastModified;
            }
            this.#name = String(fileName);
        }
        get name() {
            return this.#name;
        }
        get lastModified() {
            return this.#lastModified;
        }
        get [Symbol.toStringTag]() {
            return 'File';
        }
        static [Symbol.hasInstance](object) {
            return !!object && object instanceof Blob$1 && /^(File)$/.test(object[Symbol.toStringTag]);
        }
    };
    const File = _File;

    let { toStringTag: t, iterator: i, hasInstance: h } = Symbol,
        r = Math.random,
        m = 'append,set,get,getAll,delete,keys,values,entries,forEach,constructor'.split(','),
        f$1 = (a, b, c) => (
            (a += ''),
            /^(Blob|File)$/.test(b && b[t])
                ? [
                      ((c = c !== void 0 ? c + '' : b[t] == 'File' ? b.name : 'blob'), a),
                      b.name !== c || b[t] == 'blob' ? new File([b], c, b) : b
                  ]
                : [a, b + '']
        ),
        e = (c, f) =>
            (f ? c : c.replace(/\r?\n|\r/g, '\r\n')).replace(/\n/g, '%0A').replace(/\r/g, '%0D').replace(/"/g, '%22'),
        x = (n, a, e) => {
            if (a.length < e) {
                throw new TypeError(
                    `Failed to execute '${n}' on 'FormData': ${e} arguments required, but only ${a.length} present.`
                );
            }
        };
    const FormData = class FormData {
        #d = [];
        constructor(...a) {
            if (a.length)
                throw new TypeError(`Failed to construct 'FormData': parameter 1 is not of type 'HTMLFormElement'.`);
        }
        get [t]() {
            return 'FormData';
        }
        [i]() {
            return this.entries();
        }
        static [h](o) {
            return o && typeof o === 'object' && o[t] === 'FormData' && !m.some(m => typeof o[m] != 'function');
        }
        append(...a) {
            x('append', arguments, 2);
            this.#d.push(f$1(...a));
        }
        delete(a) {
            x('delete', arguments, 1);
            a += '';
            this.#d = this.#d.filter(([b]) => b !== a);
        }
        get(a) {
            x('get', arguments, 1);
            a += '';
            for (let b = this.#d, l = b.length, c = 0; c < l; c++) if (b[c][0] === a) return b[c][1];
            return null;
        }
        getAll(a, b) {
            x('getAll', arguments, 1);
            b = [];
            a += '';
            this.#d.forEach(c => c[0] === a && b.push(c[1]));
            return b;
        }
        has(a) {
            x('has', arguments, 1);
            a += '';
            return this.#d.some(b => b[0] === a);
        }
        forEach(a, b) {
            x('forEach', arguments, 1);
            for (const [c, d] of this) a.call(b, d, c, this);
        }
        set(...a) {
            x('set', arguments, 2);
            let b = [],
                c = !0;
            a = f$1(...a);
            this.#d.forEach(d => {
                d[0] === a[0] ? c && (c = !b.push(a)) : b.push(d);
            });
            c && b.push(a);
            this.#d = b;
        }
        *entries() {
            yield* this.#d;
        }
        *keys() {
            for (const [a] of this) yield a;
        }
        *values() {
            for (const [, a] of this) yield a;
        }
    };
    function formDataToBlob(F, B = Blob$1) {
        const b = `${r()}${r()}`.replace(/\./g, '').slice(-28).padStart(32, '-'),
            c = [],
            p = `--${b}\r\nContent-Disposition: form-data; name="`;
        F.forEach((v, n) =>
            typeof v == 'string'
                ? c.push(p + e(n) + `"\r\n\r\n${v.replace(/\r(?!\n)|(?<!\r)\n/g, '\r\n')}\r\n`)
                : c.push(
                      p +
                          e(n) +
                          `"; filename="${e(v.name, 1)}"\r\nContent-Type: ${
                              v.type || 'application/octet-stream'
                          }\r\n\r\n`,
                      v,
                      '\r\n'
                  )
        );
        c.push(`--${b}--`);
        return new B(c, { type: 'multipart/form-data; boundary=' + b });
    }

    class FetchBaseError extends Error {
        constructor(message, type) {
            super(message);
            Error.captureStackTrace(this, this.constructor);
            this.type = type;
        }
        get name() {
            return this.constructor.name;
        }
        get [Symbol.toStringTag]() {
            return this.constructor.name;
        }
    }

    class FetchError extends FetchBaseError {
        constructor(message, type, systemError) {
            super(message, type);
            if (systemError) {
                this.code = this.errno = systemError.code;
                this.erroredSysCall = systemError.syscall;
            }
        }
    }

    const NAME = Symbol.toStringTag;
    const isURLSearchParameters = object => {
        return (
            typeof object === 'object' &&
            typeof object.append === 'function' &&
            typeof object.delete === 'function' &&
            typeof object.get === 'function' &&
            typeof object.getAll === 'function' &&
            typeof object.has === 'function' &&
            typeof object.set === 'function' &&
            typeof object.sort === 'function' &&
            object[NAME] === 'URLSearchParams'
        );
    };
    const isBlob = object => {
        return (
            object &&
            typeof object === 'object' &&
            typeof object.arrayBuffer === 'function' &&
            typeof object.type === 'string' &&
            typeof object.stream === 'function' &&
            typeof object.constructor === 'function' &&
            /^(Blob|File)$/.test(object[NAME])
        );
    };
    const isAbortSignal = object => {
        return typeof object === 'object' && (object[NAME] === 'AbortSignal' || object[NAME] === 'EventTarget');
    };
    const isDomainOrSubdomain = (destination, original) => {
        const orig = new URL(original).hostname;
        const dest = new URL(destination).hostname;
        return orig === dest || orig.endsWith(`.${dest}`);
    };

    const pipeline = node_util.promisify(Stream__default['default'].pipeline);
    const INTERNALS$2 = Symbol('Body internals');
    class Body {
        constructor(body, { size = 0 } = {}) {
            let boundary = null;
            if (body === null) {
                body = null;
            } else if (isURLSearchParameters(body)) {
                body = node_buffer.Buffer.from(body.toString());
            } else if (isBlob(body));
            else if (node_buffer.Buffer.isBuffer(body));
            else if (node_util.types.isAnyArrayBuffer(body)) {
                body = node_buffer.Buffer.from(body);
            } else if (ArrayBuffer.isView(body)) {
                body = node_buffer.Buffer.from(body.buffer, body.byteOffset, body.byteLength);
            } else if (body instanceof Stream__default['default']);
            else if (body instanceof FormData) {
                body = formDataToBlob(body);
                boundary = body.type.split('=')[1];
            } else {
                body = node_buffer.Buffer.from(String(body));
            }
            let stream = body;
            if (node_buffer.Buffer.isBuffer(body)) {
                stream = Stream__default['default'].Readable.from(body);
            } else if (isBlob(body)) {
                stream = Stream__default['default'].Readable.from(body.stream());
            }
            this[INTERNALS$2] = {
                body,
                stream,
                boundary,
                disturbed: false,
                error: null
            };
            this.size = size;
            if (body instanceof Stream__default['default']) {
                body.on('error', error_ => {
                    const error =
                        error_ instanceof FetchBaseError
                            ? error_
                            : new FetchError(
                                  `Invalid response body while trying to fetch ${this.url}: ${error_.message}`,
                                  'system',
                                  error_
                              );
                    this[INTERNALS$2].error = error;
                });
            }
        }
        get body() {
            return this[INTERNALS$2].stream;
        }
        get bodyUsed() {
            return this[INTERNALS$2].disturbed;
        }
        async arrayBuffer() {
            const { buffer, byteOffset, byteLength } = await consumeBody(this);
            return buffer.slice(byteOffset, byteOffset + byteLength);
        }
        async formData() {
            const ct = this.headers.get('content-type');
            if (ct.startsWith('application/x-www-form-urlencoded')) {
                const formData = new FormData();
                const parameters = new URLSearchParams(await this.text());
                for (const [name, value] of parameters) {
                    formData.append(name, value);
                }
                return formData;
            }
            const { toFormData } = await Promise.resolve().then(function () {
                return multipartParser;
            });
            return toFormData(this.body, ct);
        }
        async blob() {
            const ct =
                (this.headers && this.headers.get('content-type')) ||
                (this[INTERNALS$2].body && this[INTERNALS$2].body.type) ||
                '';
            const buf = await this.arrayBuffer();
            return new Blob$1([buf], {
                type: ct
            });
        }
        async json() {
            const buffer = await consumeBody(this);
            return JSON.parse(buffer.toString());
        }
        async text() {
            const buffer = await consumeBody(this);
            return buffer.toString();
        }
        buffer() {
            return consumeBody(this);
        }
    }
    Body.prototype.buffer = node_util.deprecate(
        Body.prototype.buffer,
        "Please use 'response.arrayBuffer()' instead of 'response.buffer()'",
        'node-fetch#buffer'
    );
    Object.defineProperties(Body.prototype, {
        body: { enumerable: true },
        bodyUsed: { enumerable: true },
        arrayBuffer: { enumerable: true },
        blob: { enumerable: true },
        json: { enumerable: true },
        text: { enumerable: true },
        data: {
            get: node_util.deprecate(
                () => {},
                "data doesn't exist, use json(), text(), arrayBuffer(), or body instead",
                'https://github.com/node-fetch/node-fetch/issues/1000 (response)'
            )
        }
    });
    async function consumeBody(data) {
        if (data[INTERNALS$2].disturbed) {
            throw new TypeError(`body used already for: ${data.url}`);
        }
        data[INTERNALS$2].disturbed = true;
        if (data[INTERNALS$2].error) {
            throw data[INTERNALS$2].error;
        }
        const { body } = data;
        if (body === null) {
            return node_buffer.Buffer.alloc(0);
        }
        if (!(body instanceof Stream__default['default'])) {
            return node_buffer.Buffer.alloc(0);
        }
        const accum = [];
        let accumBytes = 0;
        try {
            for await (const chunk of body) {
                if (data.size > 0 && accumBytes + chunk.length > data.size) {
                    const error = new FetchError(`content size at ${data.url} over limit: ${data.size}`, 'max-size');
                    body.destroy(error);
                    throw error;
                }
                accumBytes += chunk.length;
                accum.push(chunk);
            }
        } catch (error) {
            const error_ =
                error instanceof FetchBaseError
                    ? error
                    : new FetchError(
                          `Invalid response body while trying to fetch ${data.url}: ${error.message}`,
                          'system',
                          error
                      );
            throw error_;
        }
        if (body.readableEnded === true || body._readableState.ended === true) {
            try {
                if (accum.every(c => typeof c === 'string')) {
                    return node_buffer.Buffer.from(accum.join(''));
                }
                return node_buffer.Buffer.concat(accum, accumBytes);
            } catch (error) {
                throw new FetchError(
                    `Could not create Buffer from response body for ${data.url}: ${error.message}`,
                    'system',
                    error
                );
            }
        } else {
            throw new FetchError(`Premature close of server response while trying to fetch ${data.url}`);
        }
    }
    const clone = (instance, highWaterMark) => {
        let p1;
        let p2;
        let { body } = instance[INTERNALS$2];
        if (instance.bodyUsed) {
            throw new Error('cannot clone body after it is used');
        }
        if (body instanceof Stream__default['default'] && typeof body.getBoundary !== 'function') {
            p1 = new Stream.PassThrough({ highWaterMark });
            p2 = new Stream.PassThrough({ highWaterMark });
            body.pipe(p1);
            body.pipe(p2);
            instance[INTERNALS$2].stream = p1;
            body = p2;
        }
        return body;
    };
    const getNonSpecFormDataBoundary = node_util.deprecate(
        body => body.getBoundary(),
        "form-data doesn't follow the spec and requires special treatment. Use alternative package",
        'https://github.com/node-fetch/node-fetch/issues/1167'
    );
    const extractContentType = (body, request) => {
        if (body === null) {
            return null;
        }
        if (typeof body === 'string') {
            return 'text/plain;charset=UTF-8';
        }
        if (isURLSearchParameters(body)) {
            return 'application/x-www-form-urlencoded;charset=UTF-8';
        }
        if (isBlob(body)) {
            return body.type || null;
        }
        if (node_buffer.Buffer.isBuffer(body) || node_util.types.isAnyArrayBuffer(body) || ArrayBuffer.isView(body)) {
            return null;
        }
        if (body instanceof FormData) {
            return `multipart/form-data; boundary=${request[INTERNALS$2].boundary}`;
        }
        if (body && typeof body.getBoundary === 'function') {
            return `multipart/form-data;boundary=${getNonSpecFormDataBoundary(body)}`;
        }
        if (body instanceof Stream__default['default']) {
            return null;
        }
        return 'text/plain;charset=UTF-8';
    };
    const getTotalBytes = request => {
        const { body } = request[INTERNALS$2];
        if (body === null) {
            return 0;
        }
        if (isBlob(body)) {
            return body.size;
        }
        if (node_buffer.Buffer.isBuffer(body)) {
            return body.length;
        }
        if (body && typeof body.getLengthSync === 'function') {
            return body.hasKnownLength && body.hasKnownLength() ? body.getLengthSync() : null;
        }
        return null;
    };
    const writeToStream = async (dest, { body }) => {
        if (body === null) {
            dest.end();
        } else {
            await pipeline(body, dest);
        }
    };

    const validateHeaderName =
        typeof http__default['default'].validateHeaderName === 'function'
            ? http__default['default'].validateHeaderName
            : name => {
                  if (!/^[\^`\-\w!#$%&'*+.|~]+$/.test(name)) {
                      const error = new TypeError(`Header name must be a valid HTTP token [${name}]`);
                      Object.defineProperty(error, 'code', { value: 'ERR_INVALID_HTTP_TOKEN' });
                      throw error;
                  }
              };
    const validateHeaderValue =
        typeof http__default['default'].validateHeaderValue === 'function'
            ? http__default['default'].validateHeaderValue
            : (name, value) => {
                  if (/[^\t\u0020-\u007E\u0080-\u00FF]/.test(value)) {
                      const error = new TypeError(`Invalid character in header content ["${name}"]`);
                      Object.defineProperty(error, 'code', { value: 'ERR_INVALID_CHAR' });
                      throw error;
                  }
              };
    class Headers extends URLSearchParams {
        constructor(init) {
            let result = [];
            if (init instanceof Headers) {
                const raw = init.raw();
                for (const [name, values] of Object.entries(raw)) {
                    result.push(...values.map(value => [name, value]));
                }
            } else if (init == null);
            else if (typeof init === 'object' && !node_util.types.isBoxedPrimitive(init)) {
                const method = init[Symbol.iterator];
                if (method == null) {
                    result.push(...Object.entries(init));
                } else {
                    if (typeof method !== 'function') {
                        throw new TypeError('Header pairs must be iterable');
                    }
                    result = [...init]
                        .map(pair => {
                            if (typeof pair !== 'object' || node_util.types.isBoxedPrimitive(pair)) {
                                throw new TypeError('Each header pair must be an iterable object');
                            }
                            return [...pair];
                        })
                        .map(pair => {
                            if (pair.length !== 2) {
                                throw new TypeError('Each header pair must be a name/value tuple');
                            }
                            return [...pair];
                        });
                }
            } else {
                throw new TypeError(
                    "Failed to construct 'Headers': The provided value is not of type '(sequence<sequence<ByteString>> or record<ByteString, ByteString>)"
                );
            }
            result =
                result.length > 0
                    ? result.map(([name, value]) => {
                          validateHeaderName(name);
                          validateHeaderValue(name, String(value));
                          return [String(name).toLowerCase(), String(value)];
                      })
                    : undefined;
            super(result);
            return new Proxy(this, {
                get(target, p, receiver) {
                    switch (p) {
                        case 'append':
                        case 'set':
                            return (name, value) => {
                                validateHeaderName(name);
                                validateHeaderValue(name, String(value));
                                return URLSearchParams.prototype[p].call(
                                    target,
                                    String(name).toLowerCase(),
                                    String(value)
                                );
                            };
                        case 'delete':
                        case 'has':
                        case 'getAll':
                            return name => {
                                validateHeaderName(name);
                                return URLSearchParams.prototype[p].call(target, String(name).toLowerCase());
                            };
                        case 'keys':
                            return () => {
                                target.sort();
                                return new Set(URLSearchParams.prototype.keys.call(target)).keys();
                            };
                        default:
                            return Reflect.get(target, p, receiver);
                    }
                }
            });
        }
        get [Symbol.toStringTag]() {
            return this.constructor.name;
        }
        toString() {
            return Object.prototype.toString.call(this);
        }
        get(name) {
            const values = this.getAll(name);
            if (values.length === 0) {
                return null;
            }
            let value = values.join(', ');
            if (/^content-encoding$/i.test(name)) {
                value = value.toLowerCase();
            }
            return value;
        }
        forEach(callback, thisArg = undefined) {
            for (const name of this.keys()) {
                Reflect.apply(callback, thisArg, [this.get(name), name, this]);
            }
        }
        *values() {
            for (const name of this.keys()) {
                yield this.get(name);
            }
        }
        *entries() {
            for (const name of this.keys()) {
                yield [name, this.get(name)];
            }
        }
        [Symbol.iterator]() {
            return this.entries();
        }
        raw() {
            return [...this.keys()].reduce((result, key) => {
                result[key] = this.getAll(key);
                return result;
            }, {});
        }
        [Symbol.for('nodejs.util.inspect.custom')]() {
            return [...this.keys()].reduce((result, key) => {
                const values = this.getAll(key);
                if (key === 'host') {
                    result[key] = values[0];
                } else {
                    result[key] = values.length > 1 ? values : values[0];
                }
                return result;
            }, {});
        }
    }
    Object.defineProperties(
        Headers.prototype,
        ['get', 'entries', 'forEach', 'values'].reduce((result, property) => {
            result[property] = { enumerable: true };
            return result;
        }, {})
    );
    function fromRawHeaders(headers = []) {
        return new Headers(
            headers
                .reduce((result, value, index, array) => {
                    if (index % 2 === 0) {
                        result.push(array.slice(index, index + 2));
                    }
                    return result;
                }, [])
                .filter(([name, value]) => {
                    try {
                        validateHeaderName(name);
                        validateHeaderValue(name, String(value));
                        return true;
                    } catch {
                        return false;
                    }
                })
        );
    }

    const redirectStatus = new Set([301, 302, 303, 307, 308]);
    const isRedirect = code => {
        return redirectStatus.has(code);
    };

    const INTERNALS$1 = Symbol('Response internals');
    class Response extends Body {
        constructor(body = null, options = {}) {
            super(body, options);
            const status = options.status != null ? options.status : 200;
            const headers = new Headers(options.headers);
            if (body !== null && !headers.has('Content-Type')) {
                const contentType = extractContentType(body, this);
                if (contentType) {
                    headers.append('Content-Type', contentType);
                }
            }
            this[INTERNALS$1] = {
                type: 'default',
                url: options.url,
                status,
                statusText: options.statusText || '',
                headers,
                counter: options.counter,
                highWaterMark: options.highWaterMark
            };
        }
        get type() {
            return this[INTERNALS$1].type;
        }
        get url() {
            return this[INTERNALS$1].url || '';
        }
        get status() {
            return this[INTERNALS$1].status;
        }
        get ok() {
            return this[INTERNALS$1].status >= 200 && this[INTERNALS$1].status < 300;
        }
        get redirected() {
            return this[INTERNALS$1].counter > 0;
        }
        get statusText() {
            return this[INTERNALS$1].statusText;
        }
        get headers() {
            return this[INTERNALS$1].headers;
        }
        get highWaterMark() {
            return this[INTERNALS$1].highWaterMark;
        }
        clone() {
            return new Response(clone(this, this.highWaterMark), {
                type: this.type,
                url: this.url,
                status: this.status,
                statusText: this.statusText,
                headers: this.headers,
                ok: this.ok,
                redirected: this.redirected,
                size: this.size,
                highWaterMark: this.highWaterMark
            });
        }
        static redirect(url, status = 302) {
            if (!isRedirect(status)) {
                throw new RangeError('Failed to execute "redirect" on "response": Invalid status code');
            }
            return new Response(null, {
                headers: {
                    location: new URL(url).toString()
                },
                status
            });
        }
        static error() {
            const response = new Response(null, { status: 0, statusText: '' });
            response[INTERNALS$1].type = 'error';
            return response;
        }
        get [Symbol.toStringTag]() {
            return 'Response';
        }
    }
    Object.defineProperties(Response.prototype, {
        type: { enumerable: true },
        url: { enumerable: true },
        status: { enumerable: true },
        ok: { enumerable: true },
        redirected: { enumerable: true },
        statusText: { enumerable: true },
        headers: { enumerable: true },
        clone: { enumerable: true }
    });

    const getSearch = parsedURL => {
        if (parsedURL.search) {
            return parsedURL.search;
        }
        const lastOffset = parsedURL.href.length - 1;
        const hash = parsedURL.hash || (parsedURL.href[lastOffset] === '#' ? '#' : '');
        return parsedURL.href[lastOffset - hash.length] === '?' ? '?' : '';
    };

    function stripURLForUseAsAReferrer(url, originOnly = false) {
        if (url == null) {
            return 'no-referrer';
        }
        url = new URL(url);
        if (/^(about|blob|data):$/.test(url.protocol)) {
            return 'no-referrer';
        }
        url.username = '';
        url.password = '';
        url.hash = '';
        if (originOnly) {
            url.pathname = '';
            url.search = '';
        }
        return url;
    }
    const ReferrerPolicy = new Set([
        '',
        'no-referrer',
        'no-referrer-when-downgrade',
        'same-origin',
        'origin',
        'strict-origin',
        'origin-when-cross-origin',
        'strict-origin-when-cross-origin',
        'unsafe-url'
    ]);
    const DEFAULT_REFERRER_POLICY = 'strict-origin-when-cross-origin';
    function validateReferrerPolicy(referrerPolicy) {
        if (!ReferrerPolicy.has(referrerPolicy)) {
            throw new TypeError(`Invalid referrerPolicy: ${referrerPolicy}`);
        }
        return referrerPolicy;
    }
    function isOriginPotentiallyTrustworthy(url) {
        if (/^(http|ws)s:$/.test(url.protocol)) {
            return true;
        }
        const hostIp = url.host.replace(/(^\[)|(]$)/g, '');
        const hostIPVersion = node_net.isIP(hostIp);
        if (hostIPVersion === 4 && /^127\./.test(hostIp)) {
            return true;
        }
        if (hostIPVersion === 6 && /^(((0+:){7})|(::(0+:){0,6}))0*1$/.test(hostIp)) {
            return true;
        }
        if (/^(.+\.)*localhost$/.test(url.host)) {
            return false;
        }
        if (url.protocol === 'file:') {
            return true;
        }
        return false;
    }
    function isUrlPotentiallyTrustworthy(url) {
        if (/^about:(blank|srcdoc)$/.test(url)) {
            return true;
        }
        if (url.protocol === 'data:') {
            return true;
        }
        if (/^(blob|filesystem):$/.test(url.protocol)) {
            return true;
        }
        return isOriginPotentiallyTrustworthy(url);
    }
    function determineRequestsReferrer(request, { referrerURLCallback, referrerOriginCallback } = {}) {
        if (request.referrer === 'no-referrer' || request.referrerPolicy === '') {
            return null;
        }
        const policy = request.referrerPolicy;
        if (request.referrer === 'about:client') {
            return 'no-referrer';
        }
        const referrerSource = request.referrer;
        let referrerURL = stripURLForUseAsAReferrer(referrerSource);
        let referrerOrigin = stripURLForUseAsAReferrer(referrerSource, true);
        if (referrerURL.toString().length > 4096) {
            referrerURL = referrerOrigin;
        }
        if (referrerURLCallback) {
            referrerURL = referrerURLCallback(referrerURL);
        }
        if (referrerOriginCallback) {
            referrerOrigin = referrerOriginCallback(referrerOrigin);
        }
        const currentURL = new URL(request.url);
        switch (policy) {
            case 'no-referrer':
                return 'no-referrer';
            case 'origin':
                return referrerOrigin;
            case 'unsafe-url':
                return referrerURL;
            case 'strict-origin':
                if (isUrlPotentiallyTrustworthy(referrerURL) && !isUrlPotentiallyTrustworthy(currentURL)) {
                    return 'no-referrer';
                }
                return referrerOrigin.toString();
            case 'strict-origin-when-cross-origin':
                if (referrerURL.origin === currentURL.origin) {
                    return referrerURL;
                }
                if (isUrlPotentiallyTrustworthy(referrerURL) && !isUrlPotentiallyTrustworthy(currentURL)) {
                    return 'no-referrer';
                }
                return referrerOrigin;
            case 'same-origin':
                if (referrerURL.origin === currentURL.origin) {
                    return referrerURL;
                }
                return 'no-referrer';
            case 'origin-when-cross-origin':
                if (referrerURL.origin === currentURL.origin) {
                    return referrerURL;
                }
                return referrerOrigin;
            case 'no-referrer-when-downgrade':
                if (isUrlPotentiallyTrustworthy(referrerURL) && !isUrlPotentiallyTrustworthy(currentURL)) {
                    return 'no-referrer';
                }
                return referrerURL;
            default:
                throw new TypeError(`Invalid referrerPolicy: ${policy}`);
        }
    }
    function parseReferrerPolicyFromHeader(headers) {
        const policyTokens = (headers.get('referrer-policy') || '').split(/[,\s]+/);
        let policy = '';
        for (const token of policyTokens) {
            if (token && ReferrerPolicy.has(token)) {
                policy = token;
            }
        }
        return policy;
    }

    const INTERNALS = Symbol('Request internals');
    const isRequest = object => {
        return typeof object === 'object' && typeof object[INTERNALS] === 'object';
    };
    const doBadDataWarn = node_util.deprecate(
        () => {},
        '.data is not a valid RequestInit property, use .body instead',
        'https://github.com/node-fetch/node-fetch/issues/1000 (request)'
    );
    class Request extends Body {
        constructor(input, init = {}) {
            let parsedURL;
            if (isRequest(input)) {
                parsedURL = new URL(input.url);
            } else {
                parsedURL = new URL(input);
                input = {};
            }
            if (parsedURL.username !== '' || parsedURL.password !== '') {
                throw new TypeError(`${parsedURL} is an url with embedded credentails.`);
            }
            let method = init.method || input.method || 'GET';
            method = method.toUpperCase();
            if ('data' in init) {
                doBadDataWarn();
            }
            if (
                (init.body != null || (isRequest(input) && input.body !== null)) &&
                (method === 'GET' || method === 'HEAD')
            ) {
                throw new TypeError('Request with GET/HEAD method cannot have body');
            }
            const inputBody = init.body ? init.body : isRequest(input) && input.body !== null ? clone(input) : null;
            super(inputBody, {
                size: init.size || input.size || 0
            });
            const headers = new Headers(init.headers || input.headers || {});
            if (inputBody !== null && !headers.has('Content-Type')) {
                const contentType = extractContentType(inputBody, this);
                if (contentType) {
                    headers.set('Content-Type', contentType);
                }
            }
            let signal = isRequest(input) ? input.signal : null;
            if ('signal' in init) {
                signal = init.signal;
            }
            if (signal != null && !isAbortSignal(signal)) {
                throw new TypeError('Expected signal to be an instanceof AbortSignal or EventTarget');
            }
            let referrer = init.referrer == null ? input.referrer : init.referrer;
            if (referrer === '') {
                referrer = 'no-referrer';
            } else if (referrer) {
                const parsedReferrer = new URL(referrer);
                referrer = /^about:(\/\/)?client$/.test(parsedReferrer) ? 'client' : parsedReferrer;
            } else {
                referrer = undefined;
            }
            this[INTERNALS] = {
                method,
                redirect: init.redirect || input.redirect || 'follow',
                headers,
                parsedURL,
                signal,
                referrer
            };
            this.follow = init.follow === undefined ? (input.follow === undefined ? 20 : input.follow) : init.follow;
            this.compress =
                init.compress === undefined ? (input.compress === undefined ? true : input.compress) : init.compress;
            this.counter = init.counter || input.counter || 0;
            this.agent = init.agent || input.agent;
            this.highWaterMark = init.highWaterMark || input.highWaterMark || 16384;
            this.insecureHTTPParser = init.insecureHTTPParser || input.insecureHTTPParser || false;
            this.referrerPolicy = init.referrerPolicy || input.referrerPolicy || '';
        }
        get method() {
            return this[INTERNALS].method;
        }
        get url() {
            return node_url.format(this[INTERNALS].parsedURL);
        }
        get headers() {
            return this[INTERNALS].headers;
        }
        get redirect() {
            return this[INTERNALS].redirect;
        }
        get signal() {
            return this[INTERNALS].signal;
        }
        get referrer() {
            if (this[INTERNALS].referrer === 'no-referrer') {
                return '';
            }
            if (this[INTERNALS].referrer === 'client') {
                return 'about:client';
            }
            if (this[INTERNALS].referrer) {
                return this[INTERNALS].referrer.toString();
            }
            return undefined;
        }
        get referrerPolicy() {
            return this[INTERNALS].referrerPolicy;
        }
        set referrerPolicy(referrerPolicy) {
            this[INTERNALS].referrerPolicy = validateReferrerPolicy(referrerPolicy);
        }
        clone() {
            return new Request(this);
        }
        get [Symbol.toStringTag]() {
            return 'Request';
        }
    }
    Object.defineProperties(Request.prototype, {
        method: { enumerable: true },
        url: { enumerable: true },
        headers: { enumerable: true },
        redirect: { enumerable: true },
        clone: { enumerable: true },
        signal: { enumerable: true },
        referrer: { enumerable: true },
        referrerPolicy: { enumerable: true }
    });
    const getNodeRequestOptions = request => {
        const { parsedURL } = request[INTERNALS];
        const headers = new Headers(request[INTERNALS].headers);
        if (!headers.has('Accept')) {
            headers.set('Accept', '*/*');
        }
        let contentLengthValue = null;
        if (request.body === null && /^(post|put)$/i.test(request.method)) {
            contentLengthValue = '0';
        }
        if (request.body !== null) {
            const totalBytes = getTotalBytes(request);
            if (typeof totalBytes === 'number' && !Number.isNaN(totalBytes)) {
                contentLengthValue = String(totalBytes);
            }
        }
        if (contentLengthValue) {
            headers.set('Content-Length', contentLengthValue);
        }
        if (request.referrerPolicy === '') {
            request.referrerPolicy = DEFAULT_REFERRER_POLICY;
        }
        if (request.referrer && request.referrer !== 'no-referrer') {
            request[INTERNALS].referrer = determineRequestsReferrer(request);
        } else {
            request[INTERNALS].referrer = 'no-referrer';
        }
        if (request[INTERNALS].referrer instanceof URL) {
            headers.set('Referer', request.referrer);
        }
        if (!headers.has('User-Agent')) {
            headers.set('User-Agent', 'node-fetch');
        }
        if (request.compress && !headers.has('Accept-Encoding')) {
            headers.set('Accept-Encoding', 'gzip,deflate,br');
        }
        let { agent } = request;
        if (typeof agent === 'function') {
            agent = agent(parsedURL);
        }
        if (!headers.has('Connection') && !agent) {
            headers.set('Connection', 'close');
        }
        const search = getSearch(parsedURL);
        const options = {
            path: parsedURL.pathname + search,
            method: request.method,
            headers: headers[Symbol.for('nodejs.util.inspect.custom')](),
            insecureHTTPParser: request.insecureHTTPParser,
            agent
        };
        return {
            parsedURL,
            options
        };
    };

    class AbortError extends FetchBaseError {
        constructor(message, type = 'aborted') {
            super(message, type);
        }
    }

    const supportedSchemas = new Set(['data:', 'http:', 'https:']);
    async function fetch(url, options_) {
        return new Promise((resolve, reject) => {
            const request = new Request(url, options_);
            const { parsedURL, options } = getNodeRequestOptions(request);
            if (!supportedSchemas.has(parsedURL.protocol)) {
                throw new TypeError(
                    `node-fetch cannot load ${url}. URL scheme "${parsedURL.protocol.replace(
                        /:$/,
                        ''
                    )}" is not supported.`
                );
            }
            if (parsedURL.protocol === 'data:') {
                const data = dataUriToBuffer(request.url);
                const response = new Response(data, { headers: { 'Content-Type': data.typeFull } });
                resolve(response);
                return;
            }
            const send = (parsedURL.protocol === 'https:' ? https__default['default'] : http__default['default'])
                .request;
            const { signal } = request;
            let response = null;
            const abort = () => {
                const error = new AbortError('The operation was aborted.');
                reject(error);
                if (request.body && request.body instanceof Stream__default['default'].Readable) {
                    request.body.destroy(error);
                }
                if (!response || !response.body) {
                    return;
                }
                response.body.emit('error', error);
            };
            if (signal && signal.aborted) {
                abort();
                return;
            }
            const abortAndFinalize = () => {
                abort();
                finalize();
            };
            const request_ = send(parsedURL.toString(), options);
            if (signal) {
                signal.addEventListener('abort', abortAndFinalize);
            }
            const finalize = () => {
                request_.abort();
                if (signal) {
                    signal.removeEventListener('abort', abortAndFinalize);
                }
            };
            request_.on('error', error => {
                reject(new FetchError(`request to ${request.url} failed, reason: ${error.message}`, 'system', error));
                finalize();
            });
            fixResponseChunkedTransferBadEnding(request_, error => {
                response.body.destroy(error);
            });
            if (process.version < 'v14') {
                request_.on('socket', s => {
                    let endedWithEventsCount;
                    s.prependListener('end', () => {
                        endedWithEventsCount = s._eventsCount;
                    });
                    s.prependListener('close', hadError => {
                        if (response && endedWithEventsCount < s._eventsCount && !hadError) {
                            const error = new Error('Premature close');
                            error.code = 'ERR_STREAM_PREMATURE_CLOSE';
                            response.body.emit('error', error);
                        }
                    });
                });
            }
            request_.on('response', response_ => {
                request_.setTimeout(0);
                const headers = fromRawHeaders(response_.rawHeaders);
                if (isRedirect(response_.statusCode)) {
                    const location = headers.get('Location');
                    let locationURL = null;
                    try {
                        locationURL = location === null ? null : new URL(location, request.url);
                    } catch {
                        if (request.redirect !== 'manual') {
                            reject(
                                new FetchError(
                                    `uri requested responds with an invalid redirect URL: ${location}`,
                                    'invalid-redirect'
                                )
                            );
                            finalize();
                            return;
                        }
                    }
                    switch (request.redirect) {
                        case 'error':
                            reject(
                                new FetchError(
                                    `uri requested responds with a redirect, redirect mode is set to error: ${request.url}`,
                                    'no-redirect'
                                )
                            );
                            finalize();
                            return;
                        case 'manual':
                            break;
                        case 'follow': {
                            if (locationURL === null) {
                                break;
                            }
                            if (request.counter >= request.follow) {
                                reject(new FetchError(`maximum redirect reached at: ${request.url}`, 'max-redirect'));
                                finalize();
                                return;
                            }
                            const requestOptions = {
                                headers: new Headers(request.headers),
                                follow: request.follow,
                                counter: request.counter + 1,
                                agent: request.agent,
                                compress: request.compress,
                                method: request.method,
                                body: clone(request),
                                signal: request.signal,
                                size: request.size,
                                referrer: request.referrer,
                                referrerPolicy: request.referrerPolicy
                            };
                            if (!isDomainOrSubdomain(request.url, locationURL)) {
                                for (const name of ['authorization', 'www-authenticate', 'cookie', 'cookie2']) {
                                    requestOptions.headers.delete(name);
                                }
                            }
                            if (
                                response_.statusCode !== 303 &&
                                request.body &&
                                options_.body instanceof Stream__default['default'].Readable
                            ) {
                                reject(
                                    new FetchError(
                                        'Cannot follow redirect with body being a readable stream',
                                        'unsupported-redirect'
                                    )
                                );
                                finalize();
                                return;
                            }
                            if (
                                response_.statusCode === 303 ||
                                ((response_.statusCode === 301 || response_.statusCode === 302) &&
                                    request.method === 'POST')
                            ) {
                                requestOptions.method = 'GET';
                                requestOptions.body = undefined;
                                requestOptions.headers.delete('content-length');
                            }
                            const responseReferrerPolicy = parseReferrerPolicyFromHeader(headers);
                            if (responseReferrerPolicy) {
                                requestOptions.referrerPolicy = responseReferrerPolicy;
                            }
                            resolve(fetch(new Request(locationURL, requestOptions)));
                            finalize();
                            return;
                        }
                        default:
                            return reject(
                                new TypeError(
                                    `Redirect option '${request.redirect}' is not a valid value of RequestRedirect`
                                )
                            );
                    }
                }
                if (signal) {
                    response_.once('end', () => {
                        signal.removeEventListener('abort', abortAndFinalize);
                    });
                }
                let body = Stream.pipeline(response_, new Stream.PassThrough(), error => {
                    if (error) {
                        reject(error);
                    }
                });
                if (process.version < 'v12.10') {
                    response_.on('aborted', abortAndFinalize);
                }
                const responseOptions = {
                    url: request.url,
                    status: response_.statusCode,
                    statusText: response_.statusMessage,
                    headers,
                    size: request.size,
                    counter: request.counter,
                    highWaterMark: request.highWaterMark
                };
                const codings = headers.get('Content-Encoding');
                if (
                    !request.compress ||
                    request.method === 'HEAD' ||
                    codings === null ||
                    response_.statusCode === 204 ||
                    response_.statusCode === 304
                ) {
                    response = new Response(body, responseOptions);
                    resolve(response);
                    return;
                }
                const zlibOptions = {
                    flush: zlib__default['default'].Z_SYNC_FLUSH,
                    finishFlush: zlib__default['default'].Z_SYNC_FLUSH
                };
                if (codings === 'gzip' || codings === 'x-gzip') {
                    body = Stream.pipeline(body, zlib__default['default'].createGunzip(zlibOptions), error => {
                        if (error) {
                            reject(error);
                        }
                    });
                    response = new Response(body, responseOptions);
                    resolve(response);
                    return;
                }
                if (codings === 'deflate' || codings === 'x-deflate') {
                    const raw = Stream.pipeline(response_, new Stream.PassThrough(), error => {
                        if (error) {
                            reject(error);
                        }
                    });
                    raw.once('data', chunk => {
                        if ((chunk[0] & 0x0f) === 0x08) {
                            body = Stream.pipeline(body, zlib__default['default'].createInflate(), error => {
                                if (error) {
                                    reject(error);
                                }
                            });
                        } else {
                            body = Stream.pipeline(body, zlib__default['default'].createInflateRaw(), error => {
                                if (error) {
                                    reject(error);
                                }
                            });
                        }
                        response = new Response(body, responseOptions);
                        resolve(response);
                    });
                    raw.once('end', () => {
                        if (!response) {
                            response = new Response(body, responseOptions);
                            resolve(response);
                        }
                    });
                    return;
                }
                if (codings === 'br') {
                    body = Stream.pipeline(body, zlib__default['default'].createBrotliDecompress(), error => {
                        if (error) {
                            reject(error);
                        }
                    });
                    response = new Response(body, responseOptions);
                    resolve(response);
                    return;
                }
                response = new Response(body, responseOptions);
                resolve(response);
            });
            writeToStream(request_, request).catch(reject);
        });
    }
    function fixResponseChunkedTransferBadEnding(request, errorCallback) {
        const LAST_CHUNK = node_buffer.Buffer.from('0\r\n\r\n');
        let isChunkedTransfer = false;
        let properLastChunkReceived = false;
        let previousChunk;
        request.on('response', response => {
            const { headers } = response;
            isChunkedTransfer = headers['transfer-encoding'] === 'chunked' && !headers['content-length'];
        });
        request.on('socket', socket => {
            const onSocketClose = () => {
                if (isChunkedTransfer && !properLastChunkReceived) {
                    const error = new Error('Premature close');
                    error.code = 'ERR_STREAM_PREMATURE_CLOSE';
                    errorCallback(error);
                }
            };
            socket.prependListener('close', onSocketClose);
            request.on('abort', () => {
                socket.removeListener('close', onSocketClose);
            });
            socket.on('data', buf => {
                properLastChunkReceived = node_buffer.Buffer.compare(buf.slice(-5), LAST_CHUNK) === 0;
                if (!properLastChunkReceived && previousChunk) {
                    properLastChunkReceived =
                        node_buffer.Buffer.compare(previousChunk.slice(-3), LAST_CHUNK.slice(0, 3)) === 0 &&
                        node_buffer.Buffer.compare(buf.slice(-2), LAST_CHUNK.slice(3)) === 0;
                }
                previousChunk = buf;
            });
        });
    }

    let s = 0;
    const S = {
        START_BOUNDARY: s++,
        HEADER_FIELD_START: s++,
        HEADER_FIELD: s++,
        HEADER_VALUE_START: s++,
        HEADER_VALUE: s++,
        HEADER_VALUE_ALMOST_DONE: s++,
        HEADERS_ALMOST_DONE: s++,
        PART_DATA_START: s++,
        PART_DATA: s++,
        END: s++
    };
    let f = 1;
    const F = {
        PART_BOUNDARY: f,
        LAST_BOUNDARY: (f *= 2)
    };
    const LF = 10;
    const CR = 13;
    const SPACE = 32;
    const HYPHEN = 45;
    const COLON = 58;
    const A = 97;
    const Z = 122;
    const lower = c => c | 0x20;
    const noop = () => {};
    class MultipartParser {
        constructor(boundary) {
            this.index = 0;
            this.flags = 0;
            this.onHeaderEnd = noop;
            this.onHeaderField = noop;
            this.onHeadersEnd = noop;
            this.onHeaderValue = noop;
            this.onPartBegin = noop;
            this.onPartData = noop;
            this.onPartEnd = noop;
            this.boundaryChars = {};
            boundary = '\r\n--' + boundary;
            const ui8a = new Uint8Array(boundary.length);
            for (let i = 0; i < boundary.length; i++) {
                ui8a[i] = boundary.charCodeAt(i);
                this.boundaryChars[ui8a[i]] = true;
            }
            this.boundary = ui8a;
            this.lookbehind = new Uint8Array(this.boundary.length + 8);
            this.state = S.START_BOUNDARY;
        }
        write(data) {
            let i = 0;
            const length_ = data.length;
            let previousIndex = this.index;
            let { lookbehind, boundary, boundaryChars, index, state, flags } = this;
            const boundaryLength = this.boundary.length;
            const boundaryEnd = boundaryLength - 1;
            const bufferLength = data.length;
            let c;
            let cl;
            const mark = name => {
                this[name + 'Mark'] = i;
            };
            const clear = name => {
                delete this[name + 'Mark'];
            };
            const callback = (callbackSymbol, start, end, ui8a) => {
                if (start === undefined || start !== end) {
                    this[callbackSymbol](ui8a && ui8a.subarray(start, end));
                }
            };
            const dataCallback = (name, clear) => {
                const markSymbol = name + 'Mark';
                if (!(markSymbol in this)) {
                    return;
                }
                if (clear) {
                    callback(name, this[markSymbol], i, data);
                    delete this[markSymbol];
                } else {
                    callback(name, this[markSymbol], data.length, data);
                    this[markSymbol] = 0;
                }
            };
            for (i = 0; i < length_; i++) {
                c = data[i];
                switch (state) {
                    case S.START_BOUNDARY:
                        if (index === boundary.length - 2) {
                            if (c === HYPHEN) {
                                flags |= F.LAST_BOUNDARY;
                            } else if (c !== CR) {
                                return;
                            }
                            index++;
                            break;
                        } else if (index - 1 === boundary.length - 2) {
                            if (flags & F.LAST_BOUNDARY && c === HYPHEN) {
                                state = S.END;
                                flags = 0;
                            } else if (!(flags & F.LAST_BOUNDARY) && c === LF) {
                                index = 0;
                                callback('onPartBegin');
                                state = S.HEADER_FIELD_START;
                            } else {
                                return;
                            }
                            break;
                        }
                        if (c !== boundary[index + 2]) {
                            index = -2;
                        }
                        if (c === boundary[index + 2]) {
                            index++;
                        }
                        break;
                    case S.HEADER_FIELD_START:
                        state = S.HEADER_FIELD;
                        mark('onHeaderField');
                        index = 0;
                    case S.HEADER_FIELD:
                        if (c === CR) {
                            clear('onHeaderField');
                            state = S.HEADERS_ALMOST_DONE;
                            break;
                        }
                        index++;
                        if (c === HYPHEN) {
                            break;
                        }
                        if (c === COLON) {
                            if (index === 1) {
                                return;
                            }
                            dataCallback('onHeaderField', true);
                            state = S.HEADER_VALUE_START;
                            break;
                        }
                        cl = lower(c);
                        if (cl < A || cl > Z) {
                            return;
                        }
                        break;
                    case S.HEADER_VALUE_START:
                        if (c === SPACE) {
                            break;
                        }
                        mark('onHeaderValue');
                        state = S.HEADER_VALUE;
                    case S.HEADER_VALUE:
                        if (c === CR) {
                            dataCallback('onHeaderValue', true);
                            callback('onHeaderEnd');
                            state = S.HEADER_VALUE_ALMOST_DONE;
                        }
                        break;
                    case S.HEADER_VALUE_ALMOST_DONE:
                        if (c !== LF) {
                            return;
                        }
                        state = S.HEADER_FIELD_START;
                        break;
                    case S.HEADERS_ALMOST_DONE:
                        if (c !== LF) {
                            return;
                        }
                        callback('onHeadersEnd');
                        state = S.PART_DATA_START;
                        break;
                    case S.PART_DATA_START:
                        state = S.PART_DATA;
                        mark('onPartData');
                    case S.PART_DATA:
                        previousIndex = index;
                        if (index === 0) {
                            i += boundaryEnd;
                            while (i < bufferLength && !(data[i] in boundaryChars)) {
                                i += boundaryLength;
                            }
                            i -= boundaryEnd;
                            c = data[i];
                        }
                        if (index < boundary.length) {
                            if (boundary[index] === c) {
                                if (index === 0) {
                                    dataCallback('onPartData', true);
                                }
                                index++;
                            } else {
                                index = 0;
                            }
                        } else if (index === boundary.length) {
                            index++;
                            if (c === CR) {
                                flags |= F.PART_BOUNDARY;
                            } else if (c === HYPHEN) {
                                flags |= F.LAST_BOUNDARY;
                            } else {
                                index = 0;
                            }
                        } else if (index - 1 === boundary.length) {
                            if (flags & F.PART_BOUNDARY) {
                                index = 0;
                                if (c === LF) {
                                    flags &= ~F.PART_BOUNDARY;
                                    callback('onPartEnd');
                                    callback('onPartBegin');
                                    state = S.HEADER_FIELD_START;
                                    break;
                                }
                            } else if (flags & F.LAST_BOUNDARY) {
                                if (c === HYPHEN) {
                                    callback('onPartEnd');
                                    state = S.END;
                                    flags = 0;
                                } else {
                                    index = 0;
                                }
                            } else {
                                index = 0;
                            }
                        }
                        if (index > 0) {
                            lookbehind[index - 1] = c;
                        } else if (previousIndex > 0) {
                            const _lookbehind = new Uint8Array(
                                lookbehind.buffer,
                                lookbehind.byteOffset,
                                lookbehind.byteLength
                            );
                            callback('onPartData', 0, previousIndex, _lookbehind);
                            previousIndex = 0;
                            mark('onPartData');
                            i--;
                        }
                        break;
                    case S.END:
                        break;
                    default:
                        throw new Error(`Unexpected state entered: ${state}`);
                }
            }
            dataCallback('onHeaderField');
            dataCallback('onHeaderValue');
            dataCallback('onPartData');
            this.index = index;
            this.state = state;
            this.flags = flags;
        }
        end() {
            if (
                (this.state === S.HEADER_FIELD_START && this.index === 0) ||
                (this.state === S.PART_DATA && this.index === this.boundary.length)
            ) {
                this.onPartEnd();
            } else if (this.state !== S.END) {
                throw new Error('MultipartParser.end(): stream ended unexpectedly');
            }
        }
    }
    function _fileName(headerValue) {
        const m = headerValue.match(/\bfilename=("(.*?)"|([^()<>@,;:\\"/[\]?={}\s\t]+))($|;\s)/i);
        if (!m) {
            return;
        }
        const match = m[2] || m[3] || '';
        let filename = match.slice(match.lastIndexOf('\\') + 1);
        filename = filename.replace(/%22/g, '"');
        filename = filename.replace(/&#(\d{4});/g, (m, code) => {
            return String.fromCharCode(code);
        });
        return filename;
    }
    async function toFormData(Body, ct) {
        if (!/multipart/i.test(ct)) {
            throw new TypeError('Failed to fetch');
        }
        const m = ct.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
        if (!m) {
            throw new TypeError('no or bad content-type header, no multipart boundary');
        }
        const parser = new MultipartParser(m[1] || m[2]);
        let headerField;
        let headerValue;
        let entryValue;
        let entryName;
        let contentType;
        let filename;
        const entryChunks = [];
        const formData = new FormData();
        const onPartData = ui8a => {
            entryValue += decoder.decode(ui8a, { stream: true });
        };
        const appendToFile = ui8a => {
            entryChunks.push(ui8a);
        };
        const appendFileToFormData = () => {
            const file = new File(entryChunks, filename, { type: contentType });
            formData.append(entryName, file);
        };
        const appendEntryToFormData = () => {
            formData.append(entryName, entryValue);
        };
        const decoder = new TextDecoder('utf-8');
        decoder.decode();
        parser.onPartBegin = function () {
            parser.onPartData = onPartData;
            parser.onPartEnd = appendEntryToFormData;
            headerField = '';
            headerValue = '';
            entryValue = '';
            entryName = '';
            contentType = '';
            filename = null;
            entryChunks.length = 0;
        };
        parser.onHeaderField = function (ui8a) {
            headerField += decoder.decode(ui8a, { stream: true });
        };
        parser.onHeaderValue = function (ui8a) {
            headerValue += decoder.decode(ui8a, { stream: true });
        };
        parser.onHeaderEnd = function () {
            headerValue += decoder.decode();
            headerField = headerField.toLowerCase();
            if (headerField === 'content-disposition') {
                const m = headerValue.match(/\bname=("([^"]*)"|([^()<>@,;:\\"/[\]?={}\s\t]+))/i);
                if (m) {
                    entryName = m[2] || m[3] || '';
                }
                filename = _fileName(headerValue);
                if (filename) {
                    parser.onPartData = appendToFile;
                    parser.onPartEnd = appendFileToFormData;
                }
            } else if (headerField === 'content-type') {
                contentType = headerValue;
            }
            headerValue = '';
            headerField = '';
        };
        for await (const chunk of Body) {
            parser.write(chunk);
        }
        parser.end();
        return formData;
    }

    const multipartParser = Object.freeze({
        __proto__: null,
        toFormData: toFormData
    });

    return fetch;
};
