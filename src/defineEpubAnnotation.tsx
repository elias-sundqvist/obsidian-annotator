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


                    (iframe.contentWindow as any).startEpubReader = function() {
                        const book = new epubjs.Book(bookUrl, {
                          canonical: function(path) {
                            return iframe.contentWindow.location.origin + iframe.contentWindow.location.pathname + "?loc=" + path;
                          }
                        });

                        const readingMode = ({
                          'scroll': { manager: "continuous", flow: "scrolled" },
                          'pagination': { manager: "default", flow: "paginated" }
                        });

                        const rendition = book.renderTo(viewerEl, {
                            ...readingMode[plugin.settings.epubSettings.readingMode],
                            ignoreClass: "annotator-hl",
                            width: "100%",
                            height: "100%",
                            allowScriptedContent: true
                        });

                        //TODO: FIX fontSize settings. It doesn't work anymore :(
                        // Looks like book renders with font size from the settings and then the setting drops to default 100%
                        rendition.themes.fontSize(`${plugin.settings.epubSettings.fontSize}%`);
                        (iframe.contentWindow as any ).rendition = rendition; 

                        // var hash = window.location.hash.slice(2);
                        var loc = iframe.contentWindow.location.href.indexOf("?loc=");
                        if (loc > -1) {
                            var href =  iframe.contentWindow.location.href.slice(loc + 5);
                            var hash = decodeURIComponent(href);
                        }

                        rendition.display(hash || undefined);

                        switch (plugin.settings.epubSettings.readingMode) {
                            case "scroll":
                                iframe.contentDocument.querySelectorAll("a.arrow").forEach((e) => e.remove());
                                iframe.contentDocument.querySelector("#viewer").classList.add("hide-after");
                                break;

                            case "pagination":
                                var next = iframe.contentDocument.getElementById("next");
                                next.addEventListener("click", function(e){
                                    rendition.next();
                                    e.preventDefault();
                                }, false);

                                var prev = iframe.contentDocument.getElementById("prev");
                                prev.addEventListener("click", function(e){
                                    rendition.prev();
                                    e.preventDefault();
                                }, false);
                                break;
                        }

                        var nav = iframe.contentDocument.getElementById("navigation");
                        var opener = iframe.contentDocument.getElementById("opener");
                        opener.addEventListener("click", function(e){
                            nav.classList.add("open");
                        }, false);

                        var closer = iframe.contentDocument.getElementById("closer");
                        closer.addEventListener("click", function(e){
                            nav.classList.remove("open");
                        }, false);

                        // Hidden
                        var hiddenTitle = iframe.contentDocument.getElementById("hiddenTitle");

                        rendition.on("rendered", function(section){
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

                        var keyListener = function(e){
                          // Left Key
                          if ((e.keyCode || e.which) == 37) {
                              rendition.prev();
                          }

                          // Right Key
                          if ((e.keyCode || e.which) == 39) {
                              rendition.next();
                          }
                        };

                        rendition.on("keyup", keyListener);
                        iframe.contentDocument.addEventListener("keyup", keyListener, false);

                        book.ready.then(function () {
                            var $viewer = iframe.contentDocument.getElementById("viewer");
                            $viewer.classList.remove("loading");
                        });

                        addBookMetaToUI(iframe, book);
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
