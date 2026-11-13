# Compatibility with notes made by earlier versions

`epub-identity.js` holds the rules by which a book's annotations are recognised
as belonging to it: the address forms and Dublin Core conventions that
Annotator 0.2 wrote into notes, including the quirks of the epub.js it used.
It was written for this plugin (first inside the project's fork of the
Hypothesis client, so that the old sidebar and the new reader shared one
policy, then copied here unchanged). It has no imports.

Nothing taken from the Hypothesis client is part of the plugin any more. The
client's own code is used only by tests, as frozen copies under
`test/compat/`, with its licence beside them.

`ENTITIES_LICENSE.txt` is the licence of the `entities` package, which the
plugin bundles; it is copied into the release.
