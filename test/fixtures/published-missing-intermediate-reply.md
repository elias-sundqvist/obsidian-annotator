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
>{"text":"Native root comment QA.","target":[{"source":"http://localhost/?loc=chapter.xhtml","selector":[{"type":"RangeSelector","startContainer":"/h1[1]","startOffset":0,"endContainer":"/h1[1]","endOffset":27},{"type":"TextPositionSelector","start":0,"end":27},{"type":"TextQuoteSelector","exact":"Native fidelity field guide","prefix":"","suffix":"Equations and diagrams below use"}]}],"document":{"title":["Equations and vector artwork"],"link":[{"href":"http://localhost/?loc=chapter.xhtml"},{"href":"urn:x-dc:urn%3Aannotator%3Asynthetic-fidelity/one"},{"href":"urn:sha256:65861fd1cebfea4316161e2e3ae0f7584f67823766704f85055089d8c0fa987a"}],"documentFingerprint":"urn:x-dc:urn%3Aannotator%3Asynthetic-fidelity/one","dc":{"identifier":["one"],"relation.ispartof":["urn:annotator:synthetic-fidelity"]}},"created":"2026-11-02T07:40:00.000Z","updated":"2026-11-02T07:40:00.000Z","uri":"http://localhost/?loc=chapter.xhtml"}
>```
>%%
>*%%PREFIX%%%%HIGHLIGHT%% ==Native fidelity field guide== %%POSTFIX%%Equations and diagrams below use*
>%%LINK%%[[#^nativeparentqa|show annotation]]
>%%COMMENT%%
>Native root comment QA.
>%%TAGS%%
>#nested-parity
^nativeparentqa

>%%
>```annotation-json
>{"text":"Published nested edit QA.","target":[{"source":"http://localhost/?loc=chapter.xhtml"}],"references":["nativeparentqa","nativechildqa"],"document":{"title":["Equations and vector artwork"],"link":[{"href":"http://localhost/?loc=chapter.xhtml"},{"href":"urn:x-dc:urn%3Aannotator%3Asynthetic-fidelity/one"},{"href":"urn:sha256:65861fd1cebfea4316161e2e3ae0f7584f67823766704f85055089d8c0fa987a"}],"documentFingerprint":"urn:x-dc:urn%3Aannotator%3Asynthetic-fidelity/one","dc":{"identifier":["one"],"relation.ispartof":["urn:annotator:synthetic-fidelity"]}},"created":"2026-11-02T07:40:00.000Z","updated":"2026-11-02T07:40:00.000Z","uri":"http://localhost/?loc=chapter.xhtml"}
>```
>%%
>*%%PREFIX%%%%HIGHLIGHT%% ==== %%POSTFIX%%*
>%%LINK%%[[#^nativenestedqa|show annotation]]
>%%COMMENT%%
>Published nested edit QA.
>%%TAGS%%
>#nested-parity
^nativenestedqa


Unrelated trailing prose must survive all edits.
