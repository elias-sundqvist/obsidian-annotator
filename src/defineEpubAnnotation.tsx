import * as genericAnnotation from 'defineGenericAnnotation';
import React from 'react';
import { EpubAnnotationProps } from './types';
import * as epubjs from 'epubjs';

export default ({ vault, plugin, resourceUrls }) => {
    const GenericAnnotationEpub = genericAnnotation.default({ vault, plugin, resourceUrls });
    const EpubAnnotation = ({ ...props }: EpubAnnotationProps) => {
        return (
            <GenericAnnotationEpub
                baseSrc="https://cdn.hypothes.is/demos/epub/epub.js/index.html"
                {...props}
                onload={async iframe => {
                    const bookUrl = genericAnnotation.getProxiedUrl(props.epub, props, resourceUrls, vault);
                    const viewerEl = iframe.contentDocument.getElementById("viewer");
                    const readingMode = ({
                      'scroll': { manager: "continuous", flow: "scrolled" },
                      'pagination': { manager: "default", flow: "paginated" }
                    });

                    (iframe.contentWindow as any).startEpubReader = function() {
                        const book = new epubjs.Book(bookUrl, {
                          canonical: function(path) {
                            return iframe.contentWindow.location.origin + iframe.contentWindow.location.pathname + "?loc=" + path;
                          }
                        });

                        book.renderTo(viewerEl, {
                            ...readingMode[plugin.settings.epubSettings.readingMode],
                            ignoreClass: "annotator-hl",
                            width: "100%",
                            height: "100%",
                            allowScriptedContent: true
                        });

                        //TODO: FIX fontSize settings. It doesn't work anymore :(
                        // Looks like book renders with font size from the settings and then the setting drops to default 100%
                        // book.rendition.themes.fontSize(`${plugin.settings.epubSettings.fontSize}%`);
                        (iframe.contentWindow as any).rendition = book.rendition; 

                        book.rendition.display();

                        configureNavigationEvents(iframe, book, plugin.settings.epubSettings.readingMode);
                        addBookMetaToUI(iframe, book);

                        // Hidden
                        var hiddenTitle = iframe.contentDocument.getElementById("hiddenTitle");

                        book.rendition.on("rendered", function(section){
                            var current = book.navigation && book.navigation.get(section.href);

                            if (current) {
                                iframe.contentDocument.title = current.label;

                                // TODO: this is needed to trigger the hypothesis client
                                // to inject into the iframe
                                requestAnimationFrame(function () {
                                  hiddenTitle.textContent = section.href;
                                })

                                // Add CFI fragment to the history
                                history.pushState({}, '', "?loc=" + encodeURIComponent(section.href));
                                // window.location.hash = "#/"+section.href

                                var old = iframe.contentDocument.querySelectorAll('.active');
                                Array.prototype.slice.call(old, 0).forEach(function (link) {
                                    link.classList.remove("active");
                                })

                                var active = iframe.contentDocument.querySelector('a[href="'+section.href+'"]');
                                if (active) {
                                    active.classList.add("active");
                                }
                            }
                        });

                        book.ready.then(function () {
                            var $viewer = iframe.contentDocument.getElementById("viewer");
                            $viewer.classList.remove("loading");
                        });
                    }

                    iframe.addEventListener('DOMContentLoaded', (iframe.contentWindow as any).startEpubReader(), { once: true });
                }}
            />
        );
    };
    return EpubAnnotation;
};

function addBookMetaToUI(iframe:HTMLIFrameElement, book: epubjs.Book) {
    // add chapters to table of contents
    book.loaded.navigation.then((nav:any) => {
        const toc = iframe.contentDocument.getElementById("toc"),
            docfrag = iframe.contentDocument.createDocumentFragment();

        nav.forEach((chapter:epubjs.NavItem) => {
            const item = iframe.contentDocument.createElement("li");
            const link = iframe.contentDocument.createElement("a");

            link.id = "chap-" + chapter.id;
            link.textContent = chapter.label;
            link.href = chapter.href;
            item.appendChild(link);
            docfrag.appendChild(item);

            link.onclick = () => {
                const url = link.getAttribute("href");
                book.rendition.display(url);
                return false;
            };
        });

        toc.appendChild(docfrag);
    });

    // add title and author to table of contents
    book.loaded.metadata.then(function(meta){
        iframe.contentDocument.getElementById("title").textContent = meta.title;
        iframe.contentDocument.getElementById("author").textContent = meta.creator;
    });

    // add cover to table of contents
    book.loaded.cover.then((cover:string) => {
        const coverImgEl = iframe.contentDocument.getElementById("cover") as HTMLImageElement;

        if (cover) {
            if(book.archive) {
                book.archive.createUrl(cover, { base64: false }).then((url) => {
                    coverImgEl.src = url;
                });
            } else {
                coverImgEl.src = cover;
            }
        }
    });

    book.rendition.hooks.content.register(function(contents) {
        contents.window.addEventListener('scrolltorange', function (e) {
            var range = e.detail;
            var cfi = new epubjs.EpubCFI(range, contents.cfiBase).toString();

            if (cfi) {
              book.rendition.display(cfi);
            }
            e.preventDefault();
        });
    });
}

function configureNavigationEvents(iframe:HTMLIFrameElement, book:epubjs.Book, readingMode:"scroll" | "pagination") {
    const idoc = iframe.contentDocument;

    // configure UI arrows
    if (readingMode == 'scroll') {
        idoc.querySelectorAll("a.arrow").forEach((e:HTMLElement) => e.style.display = 'none');
        idoc.querySelector("#viewer").classList.add("hide-after");
    }

    idoc.getElementById("next").addEventListener("click", function(e:Event){
        book.rendition.next();
        e.preventDefault();
    }, false);

    idoc.getElementById("prev").addEventListener("click", function(e:Event){
        book.rendition.prev();
        e.preventDefault();
    }, false);

    // turn pages by arrow buttons
    const keyListener = function(e:KeyboardEvent){
      // Left Key
      if ((e.keyCode || e.which) == 37) {
          book.rendition.prev();
      }

      // Right Key
      if ((e.keyCode || e.which) == 39) {
          book.rendition.next();
      }
    };

    book.rendition.on("keyup", keyListener);
    // to make keys work even when focus outside of reader iframe
    document.addEventListener("keyup", keyListener, false);

    // open/close table of contents
    const nav = iframe.contentDocument.getElementById("navigation");

    idoc.getElementById("opener").addEventListener("click", function(_){
        nav.classList.add("open");
    }, false);

    idoc.getElementById("closer").addEventListener("click", function(_){
        nav.classList.remove("open");
    }, false);
}
