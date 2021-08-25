[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/elias-sundqvist/obsidian-annotator?style=for-the-badge&sort=semver)](https://github.com/elias-sundqvist/obsidian-annotator/releases/latest)
![GitHub All Releases](https://img.shields.io/github/downloads/elias-sundqvist/obsidian-annotator/total?style=for-the-badge)
# Obsidian Annotator

This is a plugin for Obsidian (https://obsidian.md). It allows you to open and annotate PDF and EPUB files. 

The plugin is based on https://web.hypothes.is/, but modified to store the annotations in a local markdown file instead of on the internet. 

## Demonstration
![](images/annotator%20demo.gif)

## Getting Started 

Add the property `annotation-target` to the frontmatter of your obsidian note, with a value corresponding to the location of the EPUB/PDF file.
The location can either be a file in the vault (such as `Pdfs/mypdf.pdf`)), or online (such as `https://arxiv.org/pdf/2104.13478.pdf`)

Then you can, in the open note pane, select "more options" (the three dots in the top right), and a new option "annotate" should be available. 

The plugin automatically tries to determine whether the file is an `epub` or `pdf` based on the file path, but in case this doesn't work, 
you can also add the property `annotation-target-type` and specify whether it is `epub` or `pdf` manually.

If you have [dataview](https://github.com/blacksmithgu/obsidian-dataview) installed, then you can also specify the annotation target with a dataview attribute. In this case, obsidian-style links can be used instead of a plain-text path. 

### Annotating

Annotation is self-explanatory. Select text with your mouse to get started. 

In the future, it would be nice to add colored highlights and image/region highlights. These features will have to be added to hypothes.is first, however.
See these relevant issues: https://github.com/hypothesis/product-backlog/issues/198,  https://github.com/hypothesis/product-backlog/issues/669

### The annotations in markdown

To return to the regular obsidian markdown editing mode, you can select `more options` → `Open as MD`.
Each annotation has an associated quote block with a block reference. Be careful with modifying these blocks. 
Minor edits to PREFIX, HIGHLIGHT, and POSTFIX are typically ok. But if the edits are too major, hypothesis may no longer be able to identify the corresponding text. 

The COMMENT region can be freely edited. (but ensure that it is still part of the quote block.)

The TAGS region should consist of a comma-separated list of hypothesis tags. 

### Dark Mode

The plugin has built-in dark mode support. To toggle dark mode, select `more options` → `Toggle Dark Mode` while annotating.
You can also tweak the dark mode behavior in the settings tab for the plugin. 

### Linking to annotations

An obsidian link to an annotation block-reference will, when clicked, open the corresponding file and scroll to the associated highlight. 
If the file is already open in a pane, then the link will cause the existing pane to scroll instead.  

## Contributing

Feel free to contribute.

You can create an [issue](https://github.com/elias-sundqvist/obsidian-annotator/issues) to report a bug, suggest an improvement for this plugin, ask a question, etc.

You can make a [pull request](https://github.com/elias-sundqvist/obsidian-annotator/pulls) to contribute to this plugin development.


## Changelog

### 0.0.1 (2021-05-04) *First Release*
* Basic functionality of the plugin implemented

## License

> Note: The files under the `resources` folder are scraped from the web. Each website has its licence file attached in the associated folder.

[Obsidian Annotator](https://github.com/elias-sundqvist/obsidian-annotator) is licensed under the GNU AGPLv3 license. Refer to [LICENSE](https://github.com/elias-sundqvist/obsidian-annotator/blob/master/LICENSE.TXT) for more information.

