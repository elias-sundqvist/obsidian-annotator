export default function createXMLHttpRequest() {
    function MyXMLHttpRequest() {
        this.object = new window.XMLHttpRequest();
        const fakeRequest = this;
        this.object.onabort = function (ev) {
            if (typeof fakeRequest.onabort === 'function') {
                fakeRequest.onabort(ev);
            }
        };
        this.object.onerror = function (ev) {
            if (typeof fakeRequest.onerror === 'function') {
                fakeRequest.onerror(ev);
            }
        };
        this.object.onload = function (ev) {
            if (typeof fakeRequest.onload === 'function') {
                fakeRequest.onload(ev);
            }
        };
        this.object.onloadend = function (ev) {
            if (typeof fakeRequest.onloadend === 'function') {
                fakeRequest.onloadend(ev);
            }
        };
        this.object.onloadstart = function (ev) {
            if (typeof fakeRequest.onloadstart === 'function') {
                fakeRequest.onloadstart(ev);
            }
        };
        this.object.onprogress = function (ev) {
            if (typeof fakeRequest.onprogress === 'function') {
                fakeRequest.onprogress(ev);
            }
        };
        this.object.ontimeout = function (ev) {
            if (typeof fakeRequest.ontimeout === 'function') {
                fakeRequest.ontimeout(ev);
            }
        };
        this.object.onreadystatechange = function (ev) {
            fakeRequest.readyState = fakeRequest.object.readyState;
            fakeRequest.status = fakeRequest.object.status;
            fakeRequest.statusText = fakeRequest.object.statusText;
            fakeRequest.response = fakeRequest.object.response;
            if (fakeRequest.responseType === '') {
                fakeRequest.responseText = fakeRequest.object.responseText;
                fakeRequest.responseXML = fakeRequest.object.responseXML;
            }
            fakeRequest.responseURL = fakeRequest.object.responseURL;
            if (typeof fakeRequest.onreadystatechange === 'function') {
                fakeRequest.onreadystatechange(ev);
            }
        };
        this.onabort = null;
        this.onerror = null;
        this.onload = null;
        this.onloadend = null;
        this.onloadstart = null;
        this.onprogress = null;
        this.onreadystatechange = null;
        this.ontimeout = null;

        this.readyState = XMLHttpRequest.UNSENT;
        this.responseHeaders = {};
        this.response = '';
        this.responseText = '';
        this.responseType = '';
        this.responseURL = '';
        this.responseXML = '';
        this.status = 0;
        this.statusText = '';
        this.timeout = 0;
        this.upload = null;
        this.withCredentials = false;
    }
    MyXMLHttpRequest.prototype = {
        method: '',
        url: '',

        addEventListener: function (ev, f) {
            switch (ev) {
                case 'load':
                    return (this.onload = f);
                case 'error':
                    return (this.onerror = f);
                default:
                //console.warn("No handler for event", {ev, f})
            }
        },

        open: function (method, url, async, user, password) {
            this.method = method;
            this.url = url;
            this.object.responseType = this.responseType;
            this.object.open(
                method,
                url,
                typeof async === 'boolean' ? async : true,
                typeof user === 'undefined' ? null : user,
                typeof password === 'undefined' ? null : password
            );
        },

        send: function (data) {
            this.object.responseType = this.responseType;
            let matched = false;
            const request = this;
            MyXMLHttpRequest.handlers.forEach(function (item) {
                if (
                    (typeof item.url === 'string' && item.url === request.url) ||
                    (item.url instanceof RegExp && item.url.test(request.url))
                ) {
                    if (typeof item.method !== 'string' || item.method.toUpperCase() === request.method.toUpperCase()) {
                        matched = true;
                        const handleResponse = async function () {
                            if (typeof request.onloadstart === 'function') {
                                request.onloadstart();
                            }
                            // prepare arguments
                            let args = [];
                            if (item.url instanceof RegExp) {
                                // get the matches from the regular expression
                                args = item.url.exec(request.url);
                                args.push(data);
                            } else {
                                args = [request.url, data];
                            }
                            // set response headers
                            let responseHeaders = null;
                            if (typeof item.headers === 'function') {
                                responseHeaders = await item.headers.apply(null, args);
                            } else if (typeof item.headers === 'object') {
                                responseHeaders = item.headers;
                            }
                            if (responseHeaders && typeof responseHeaders === 'object') {
                                for (const name in responseHeaders) {
                                    if (responseHeaders.hasOwnProperty(name)) {
                                        request.responseHeaders[name.toLowerCase()] = responseHeaders[name];
                                    }
                                }
                            }
                            request.status = item.status;
                            request.statusText = item.statusText;
                            request.readyState = XMLHttpRequest.HEADERS_RECEIVED;
                            if (typeof request.onreadystatechange === 'function') {
                                request.onreadystatechange();
                            }
                            request.readyState = XMLHttpRequest.LOADING;
                            if (typeof request.onreadystatechange === 'function') {
                                request.onreadystatechange();
                            }
                            if (typeof item.response === 'string' || typeof item.response === 'function') {
                                let response = '';
                                if (typeof item.response === 'string') {
                                    response = item.response;
                                } else {
                                    response = await item.response.apply(null, [request, ...args]);
                                }
                                request.response = response;
                                if (request.responseType === '' || request.responseType === 'text') {
                                    request.responseText = request.response;
                                }
                                if (request.responseType === 'document') {
                                    request.responseXML = request.response;
                                }
                                request.readyState = XMLHttpRequest.DONE;
                                const progressEvent = {
                                    target: request
                                };
                                if (typeof request.onreadystatechange === 'function') {
                                    request.onreadystatechange(progressEvent);
                                }
                                if (typeof request.onload === 'function') {
                                    request.onload(progressEvent);
                                }
                                if (typeof request.onloadend === 'function') {
                                    request.onloadend(progressEvent);
                                }
                            } else if (typeof item.proxy === 'string' || typeof item.proxy === 'function') {
                                let url = '';
                                if (typeof item.proxy === 'string') {
                                    url = item.proxy;
                                } else {
                                    url = await item.proxy.apply(null, args);
                                }
                                if (typeof url === 'string' && url.length > 0) {
                                    const proxyRequest = new XMLHttpRequest();
                                    proxyRequest.onreadystatechange = function () {
                                        if (
                                            proxyRequest.readyState === XMLHttpRequest.DONE &&
                                            proxyRequest.status === 200
                                        ) {
                                            request.status = item.status;
                                            request.statusText = item.statusText;
                                            request.response = proxyRequest.response;
                                            request.readyState = XMLHttpRequest.DONE;
                                            if (request.responseType === '' || request.responseType === 'text') {
                                                request.responseText = proxyRequest.response;
                                            }
                                            if (request.responseType === 'document') {
                                                request.responseXML = proxyRequest.response;
                                            }
                                            request.readyState = XMLHttpRequest.DONE;
                                            if (typeof request.onreadystatechange === 'function') {
                                                request.onreadystatechange();
                                            }
                                            if (typeof request.onload === 'function') {
                                                request.onload();
                                            }
                                            if (typeof request.onloadend === 'function') {
                                                request.onloadend();
                                            }
                                        }
                                    };
                                    proxyRequest.open('GET', url);
                                    proxyRequest.send();
                                }
                            }
                        };

                        if (typeof item.responseTime === 'number') {
                            setTimeout(handleResponse, item.responseTime);
                        } else if (typeof item.responseTime === 'object' && item.responseTime.length === 2) {
                            setTimeout(
                                handleResponse,
                                Math.random() * (item.responseTime[1] - item.responseTime[0]) + item.responseTime[0]
                            );
                        } else {
                            handleResponse();
                        }
                    }
                }
            });
            if (!matched) {
                this.object.send(data);
            }
        },

        abort: function () {
            this.object.abort();
        },

        setRequestHeader: function (header, value) {
            this.object.setRequestHeader(header, value);
        },

        getResponseHeader: function (header) {
            if (this.responseHeaders.hasOwnProperty(header.toLowerCase())) {
                return this.responseHeaders[header.toLowerCase()];
            }
            return this.object.getResponseHeader(header);
        },

        getAllResponseHeaders: function () {
            return this.object.getAllResponseHeaders();
        },

        overrideMimeType: function (mimeType) {
            this.object.overrideMimeType(mimeType);
        }
    };

    MyXMLHttpRequest.prototype.constructor = MyXMLHttpRequest;
    MyXMLHttpRequest.handlers = [];
    MyXMLHttpRequest.addHandler = function (handler) {
        MyXMLHttpRequest.handlers.push(handler);
    };
    MyXMLHttpRequest.UNSENT = XMLHttpRequest.UNSENT;
    MyXMLHttpRequest.OPENED = XMLHttpRequest.OPENED;
    MyXMLHttpRequest.LOADING = XMLHttpRequest.LOADING;
    MyXMLHttpRequest.HEADERS_RECEIVED = XMLHttpRequest.HEADERS_RECEIVED;
    MyXMLHttpRequest.DONE = XMLHttpRequest.DONE;
    return MyXMLHttpRequest;
}
