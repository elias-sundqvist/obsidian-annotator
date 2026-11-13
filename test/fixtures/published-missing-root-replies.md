---
annotation-target: Published Thread QA.epub
annotation-target-type: epub
---

Synthetic native-written thread for unchanged published UI.

>%%
>```annotation-json
>{"text":"Unrelated annotation retained.","uri":"https://example.invalid/unrelated","opaque":{"keep":"untouched"}}
>```
>%%
>*%%PREFIX%%%%HIGHLIGHT%% ==== %%POSTFIX%%*
>%%LINK%%[[#^unrelatedqa|show annotation]]
>%%COMMENT%%
>Unrelated annotation retained.
>%%TAGS%%
>
^unrelatedqa

>%%
>```annotation-json
>{"text":"Native reply QA.","target":[{"source":"http://localhost/?loc=chapter.xhtml"}],"references":["nativeparentqa"],"document":{"title":["Equations and vector artwork"],"link":[{"href":"http://localhost/?loc=chapter.xhtml"},{"href":"urn:x-dc:urn%3Aannotator%3Asynthetic-fidelity/one"},{"href":"urn:sha256:65861fd1cebfea4316161e2e3ae0f7584f67823766704f85055089d8c0fa987a"}],"documentFingerprint":"urn:x-dc:urn%3Aannotator%3Asynthetic-fidelity/one","dc":{"identifier":["one"],"relation.ispartof":["urn:annotator:synthetic-fidelity"]}},"created":"2026-11-02T07:40:00.000Z","updated":"2026-11-02T07:40:00.000Z","uri":"http://localhost/?loc=chapter.xhtml"}
>```
>%%
>*%%PREFIX%%%%HIGHLIGHT%% ==== %%POSTFIX%%*
>%%LINK%%[[#^nativechildqa|show annotation]]
>%%COMMENT%%
>Native reply QA.
>%%TAGS%%
>#nested-parity
^nativechildqa

>%%
>```annotation-json
>{"text":"Native nested reply QA.","target":[{"source":"http://localhost/?loc=chapter.xhtml"}],"references":["nativeparentqa","nativechildqa"],"document":{"title":["Equations and vector artwork"],"link":[{"href":"http://localhost/?loc=chapter.xhtml"},{"href":"urn:x-dc:urn%3Aannotator%3Asynthetic-fidelity/one"},{"href":"urn:sha256:65861fd1cebfea4316161e2e3ae0f7584f67823766704f85055089d8c0fa987a"}],"documentFingerprint":"urn:x-dc:urn%3Aannotator%3Asynthetic-fidelity/one","dc":{"identifier":["one"],"relation.ispartof":["urn:annotator:synthetic-fidelity"]}},"created":"2026-11-02T07:40:00.000Z","updated":"2026-11-02T07:40:00.000Z","uri":"http://localhost/?loc=chapter.xhtml"}
>```
>%%
>*%%PREFIX%%%%HIGHLIGHT%% ==== %%POSTFIX%%*
>%%LINK%%[[#^nativenestedqa|show annotation]]
>%%COMMENT%%
>Native nested reply QA.
>%%TAGS%%
>#nested-parity
^nativenestedqa


Unrelated trailing prose must survive all edits.

>%%
>```annotation-json
>{"text":"Native chapter two QA.","target":[{"source":"http://localhost/?loc=next.xhtml","selector":[{"type":"RangeSelector","startContainer":"/h1[1]","startOffset":0,"endContainer":"/h1[1]","endOffset":14},{"type":"TextPositionSelector","start":0,"end":14},{"type":"TextQuoteSelector","exact":"Second chapter","prefix":"","suffix":"Reading continues here after the"}]}],"document":{"title":["Second chapter"],"link":[{"href":"http://localhost/?loc=next.xhtml"},{"href":"urn:x-dc:urn%3Aannotator%3Asynthetic-fidelity/two"},{"href":"urn:sha256:65861fd1cebfea4316161e2e3ae0f7584f67823766704f85055089d8c0fa987a"}],"documentFingerprint":"urn:x-dc:urn%3Aannotator%3Asynthetic-fidelity/two","dc":{"identifier":["two"],"relation.ispartof":["urn:annotator:synthetic-fidelity"]}},"created":"2026-11-02T08:30:00.000Z","updated":"2026-11-02T08:30:00.000Z","uri":"http://localhost/?loc=next.xhtml"}
>```
>%%
>*%%PREFIX%%%%HIGHLIGHT%% ==Second chapter== %%POSTFIX%%Reading continues here after the*
>%%LINK%%[[#^nativesecondqa|show annotation]]
>%%COMMENT%%
>Native chapter two QA.
>%%TAGS%%
>#multichapter
^nativesecondqa

