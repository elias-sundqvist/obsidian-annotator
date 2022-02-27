import * as genericAnnotation from 'defineGenericAnnotation';
import React from 'react';
import { EpubAnnotationProps } from './types';
import * as epubjs from 'epubjs';
import { settings } from 'cluster';

export default ({ vault, plugin, resourceUrls }) => {
    const GenericAnnotationEpub = genericAnnotation.default({ vault, plugin, resourceUrls });
    const EpubAnnotation = ({ ...props }: EpubAnnotationProps) => {
        return (
            <GenericAnnotationEpub
                baseSrc="https://cdn.hypothes.is/demos/epub/epub.js/index.html"
                {...props}
                onload={async iframe => {
                    const bookUrl = genericAnnotation.getProxiedUrl(props.epub, props, resourceUrls, vault);

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

                        const rendition = book.renderTo(iframe.contentDocument.getElementById("viewer"), {
                            ...readingMode[plugin.settings.epubSettings.readingMode],
                            ignoreClass: "annotator-hl",
                            width: "100%",
                            height: "100%",
                            allowScriptedContent: true
                        });

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
                          }

                          // TODO: this is needed to trigger the hypothesis client
                          // to inject into the iframe
                          requestAnimationFrame(function () {
                            hiddenTitle.textContent = section.href;
                          })

                          var old = iframe.contentDocument.querySelectorAll('.active');
                          Array.prototype.slice.call(old, 0).forEach(function (link) {
                            link.classList.remove("active");
                          })

                          var active = iframe.contentDocument.querySelector('a[href="'+section.href+'"]');
                          if (active) {
                            active.classList.add("active");
                          }
                          // Add CFI fragment to the history
                          history.pushState({}, '', "?loc=" + encodeURIComponent(section.href));
                          // window.location.hash = "#/"+section.href
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

                        book.loaded.navigation.then((nav:any) => {
                            var $nav = iframe.contentDocument.getElementById("toc"),
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
                                    rendition.display(url);
                                    return false;
                                };
                            });

                            $nav.appendChild(docfrag);
                        });

                        book.loaded.metadata.then(function(meta){
                          var $title = iframe.contentDocument.getElementById("title");
                          var $author = iframe.contentDocument.getElementById("author");
                          var $cover = iframe.contentDocument.getElementById("cover");
                          var $nav = iframe.contentDocument.getElementById('navigation');

                          $title.textContent = meta.title;
                          $author.textContent = meta.creator;
                          if (book.archive) {
                            book.loaded.cover.then((cover) => {
                                book.archive.createUrl(cover, { base64: false }).then((url) => {
                                    ($cover as HTMLImageElement).src = url;
                                });
                            });
                          } else {
                            book.loaded.cover.then((cover) => {
                                ($cover as HTMLImageElement).src = cover;
                            });
                          }

                        });

                        // book.rendition.hooks.content.register(function(contents, view) {

                        //   contents.window.addEventListener('scrolltorange', function (e) {
                        //     var range = e.detail;
                        //     var cfi = new ePub.CFI(range, contents.cfiBase).toString();
                        //     if (cfi) {
                        //       book.rendition.display(cfi);
                        //     }
                        //     e.preventDefault();
                        //   });

                        // });
                    }

                    iframe.addEventListener('DOMContentLoaded', (iframe.contentWindow as any).startEpubReader(), { once: true });
                }}
            />
        );
    };
    return EpubAnnotation;
};
