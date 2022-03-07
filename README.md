[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/elias-sundqvist/obsidian-annotator?style=for-the-badge&sort=semver)](https://github.com/elias-sundqvist/obsidian-annotator/releases/latest)
![GitHub All Releases](https://img.shields.io/github/downloads/elias-sundqvist/obsidian-annotator/total?style=for-the-badge)
# Obsidian Annotator

This is a plugin for Obsidian (https://obsidian.md). It allows you to open and annotate PDF and EPUB files. 

The plugin is based on https://web.hypothes.is/, but modified to store the annotations in a local markdown file instead of on the internet. 

## Demonstration
![annotator demo](https://user-images.githubusercontent.com/9102856/131702952-1aa76baa-a279-474c-978d-cec95a683485.gif)

**Warning!** In the above gif I use **Dataview** syntax to specify the annotation-target.
If you do not have the dataview plugin installed, you must instead write the annotation-target in the **frontmatter**, like this:
```md
---
annotation-target: https://arxiv.org/pdf/2104.13478.pdf
---
```

## Getting Started 

Add the property `annotation-target` to the frontmatter of your obsidian note, with a value corresponding to the location of the EPUB/PDF file.
The location can either be a file in the vault (such as `Pdfs/mypdf.pdf`), or online (such as `https://arxiv.org/pdf/2104.13478.pdf`)

Then you can, in the open note pane, select "more options" (the three dots in the top right), and a new option "annotate" should be available. 

The plugin automatically tries to determine whether the file is an `epub` or `pdf` based on the file path, but in case this doesn't work, 
you can also add the property `annotation-target-type` and specify whether it is `epub` or `pdf` manually.

If you have [dataview](https://github.com/blacksmithgu/obsidian-dataview) installed, then you can also specify the annotation target with a dataview attribute. In this case, obsidian-style links can be used instead of a plain-text path. 

> WARNING! Don't rename an original pdf or epub file! The plugin is going to lose the connection between annotations and file in that case.

### Annotating

Annotation is self-explanatory. Select text with your mouse to get started. 

In the future, it would be nice to add colored highlights and image/region highlights. These features will have to be added to hypothes.is first, however.
See these relevant issues: https://github.com/hypothesis/product-backlog/issues/198,  https://github.com/hypothesis/product-backlog/issues/669

### The annotations in markdown

To return to the regular obsidian markdown editing mode, you can select `more options` → `Open as MD`.
Each annotation has an associated quote block with a block reference. Be careful with modifying these blocks. 
Minor edits to PREFIX, HIGHLIGHT, and POSTFIX are typically ok. But if the edits are too major, hypothesis may no longer be able to identify the corresponding text. 

The COMMENT region can be freely edited. (but ensure that it is still part of the quote block.)

The TAGS region should consist of a comma-separated list of obsidian tags. (like `#tag1, #tag2, #tag3`) 

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

### 0.2.1 (2022-03-06) **[BRAT](https://github.com/TfTHacker/obsidian42-brat) release** *Basic web and video annotation* 
* `annotation-target-type` can now take on the values `web` and `video`. 
  * With `web` the annotation target can (in theory) be any website. Some work better than others. Link navigation does not work. 
  * With `video`, only youtube links are supported. In order to use this feature, a link to a zip file with the annotator.tv resources must be provided in the plugin settings. It cannot be bundled with the plugin since that would most likely violate copyright. 
    * You can ask someone for a link, or generate it yourself by making an account at annotate.tv, signing in, going to https://annotate.tv/videos/620d5a42b9ab630009bf3e31#, and downloading the website using the [Save All Resources](https://chrome.google.com/webstore/detail/save-all-resources/abpdnfjocnmdomablahdcfnoggeeiedb?hl=en) chrome extension, uploading it to google drive, and [generating a direct link](https://sites.google.com/site/gdocs2direct/). 
  * Other improvements:
    * Some behind-the-scenes changes have been made so that the hypothes.is version can be more easily upgraded in the future. 

### 0.2.0 (2022-01-26) **[BRAT](https://github.com/TfTHacker/obsidian42-brat) release** *Improved markdown rendering, epub reader* 
* Markdown in the hypothesis sidebar should now fully support the regular obsidian syntax. (including links, embeds, custom codeblocks etc.)
* Several Epub improvements, Thanks to @aladmit for these!
  * New option added for font size scaling (See PR #127)
  * New "epub reader mode" setting added. Infinite scrolling is now supported! (See PR #114)
  * Reduced page padding so that maximum available space is used. (See PR #126)
  
### 0.1.9 (2022-01-17) *Minor fix* 
* Removed sentry logging, again, (See issue #97)

### 0.1.8 (2022-01-16) *Minor fixes, added default annotation mode setting* 
* Fixed issue with pane loading on startup
* Fixed some issues with epub highlighting
* Added setting to choose default annotation mode, Thanks to @aladmit for the PR! (See PR #113)
 
### 0.1.7 (2022-01-14) **[BRAT](https://github.com/TfTHacker/obsidian42-brat) release** *chinese file name support* 
* Fixed issue with chinese file names, as discussed in issue #53
 
### 0.1.6 (2022-01-12) **[BRAT](https://github.com/TfTHacker/obsidian42-brat) release** *Live Preview Drag and Drop fix + chinese character support* 
* Drag and drop should now work in live preview (See issue #103)
* Upgraded pdf.js to a newer version.
  * Improved character support. (Japanese and Chinese letters should now work), (See issue #53)
* Removed sentry logging (See issue #97)
 

### 0.1.5 (2021-12-19) *Quick fix*
* Apparently the previous update broke some of the old annotations for some people (See issue #95). This version hopefully fixes that.   

### 0.1.4 (2021-12-18) *Fix Issue With Ipad + Windows/Android compatibility.*
* See issue #70, Thanks to @jonasmerlin for the fix! 
 
### 0.1.3 (2021-09-12) *Basic CORS support for desktop*
* Added a basic workaround for CORS issues. This should make more links possible to view. (See issue #15)
  * Note that this workaround only works on the desktop version of obsidian.
 
### 0.1.2 (2021-09-11) *Quick Fix*
* Fixed critical bug that prevented any annotations from being saved. (See issue #61)

### 0.1.1 (2021-09-10) *Drag & Drop Fixes, Open links in new pane, Multi-Line Comments Fix*
* Drag and drop has been improved. The drop handlers are now unloaded when the plugin is unloaded. The issues regarding interferrence with other Drag and Drop functionality are hopefully also resolved.  (See Issue #50)
* Using an array format for the annotation target should now work. This improves compatibility with MetaEdit (See Issue #51)
* Holding <kbd>ctrl</kbd> and clicking links (or clicking with the mouse-wheel) now opens annotations in a new pane. (See Issue #54)
* Issue with multi-line comments should be resolved. (See Issue #47)
* A new command (`Toggle Annotation/Markdown mode) has been added. This can be bound to a hotkey in obsidian, enabling more efficient switching between the two modes. (See issue #39)
* Other things
  * A basic unit-test for annotation loading has also been added. More tests will be added as issues arise. This will guarantee that the plugin becomes increasingly stable over time.

### 0.1.0 (2021-09-03) *Added annotation highlight drag and drop*
* By holding the <kbd>shift</kbd> key you can now drag highlights from the epub/pdf into a separate Obsidian note, and a link to the highlight will be inserted. 
  ![highlight drag and drop](https://user-images.githubusercontent.com/9102856/132098957-e6850c9f-77a0-4fd5-91ac-e7095cfbea9d.gif)

### 0.0.9 (2021-09-03) *Quick fix for annotation id bug*
* See #37

### 0.0.8 (2021-09-03) *Added Pre/Postfix setting toggles, Fixed scrolling issue, More size reductions.*
* The plugin is now available in the community plugins list! 
* The Pre- and Postfix parts of the annotation markdown can now be disabled in the settings. (See #30)
* Clicking a PDF annotation link now causes an immediate jump to the annotation. No more glitchy scrolling. (See #21)
* Potential fix to the memory leak mentioned in #28 added.
* Added core-js. Will hopefully mean that the plugin works with older versions of node (see #34)
* Disabled global WebSocket override. Should resolve issues with Obsidian Sync (see #36)
* Further size reductions of the plugin
  * React is now built in 'production' mode.
  * All the embedded resources now use the highest zip compression ratio.

### 0.0.7 (2021-09-01) *Added Custom Default Path setting, Page notes fix, Slight JSON size reduction, etc.*
* Added a new setting called `Custom Default Path`. See [this comment on #19](https://github.com/elias-sundqvist/obsidian-annotator/issues/19#issuecomment-909549603) for more info. 
* Top-level values in the annotation JSON will now be ommited if their values are "unsurprising". See #24
* Fixed page notes breaking the loading of annotations.
* Made the `Post to...` button always say `Post to Only Me` to reduce privacy confusion. 
* Further reduced plugin size
  * Switched from base64 to full unicode encoding
  * Added minimization of resources before zip generation
  * Added minimization of final rollup output
* Minor fixes
  * Removed warning about websocket userid mismatch
  * Added possible fix to #13

### 0.0.6 (2021-08-30) *`file:` protocol support, various url fixes, privacy improvements, minor fixes*
* Fixed so that no initial http request is made to the hypothes.is servers. 
* Hypothes.is performance trackers removed. 
* No more error messages from the websocket api. 
* The stored annotations no longer reference the sample pdf url, since that confused some users. (See issue #7)
* Initial support for `file:` protocol links added. (Has not been tested much yet.)
* The placeholder staus bar text has been removed (See issue #17)

### 0.0.5 (2021-08-26) *Fixed EPUB bug, minor file restructuring*
* The files necessary for the epub reader were `.gitignore`d, which prevented it from working in the previous releases.  (See issue #6)
* The code files has been moved to the `src` directiory so that the repo looks a bit less messy. 

### 0.0.4 (2021-08-26) *Chinese File name support*
* Added support for chinese file names. (See issue #4)

### 0.0.3 (2021-08-26) *Plugin Size Reduction*
* Removed some unnecessary files to reduce plugin size.

### 0.0.2 (2021-08-26) *Minor fixes*
* Removed logging, 
* Simplified link handling
* viewer height is now 100% instead of fixed to 1000px. 

### 0.0.1 (2021-08-25) *First Release*
* Basic functionality of the plugin implemented

## License

> Note: The files under the `resources` folder are scraped from the web. Each website has its licence file attached in the associated folder.

[Obsidian Annotator](https://github.com/elias-sundqvist/obsidian-annotator) is licensed under the GNU AGPLv3 license. Refer to [LICENSE](https://github.com/elias-sundqvist/obsidian-annotator/blob/master/LICENSE.TXT) for more information.


## Support

If you want to support me and my work, you can [sponsor me on Github](https://github.com/sponsors/elias-sundqvist) (preferred method) or donate something on [**Paypal**](https://www.paypal.com/donate/?hosted_button_id=C5MBC9YBWTYEC).

