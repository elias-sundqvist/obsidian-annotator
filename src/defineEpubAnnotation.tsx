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

                    (iframe.contentWindow as any).startEpubReader = function() {
                        const book = new epubjs.Book(bookUrl, {
                          canonical: function(path) {
                            return iframe.contentWindow.location.origin + iframe.contentWindow.location.pathname + "?loc=" + path;
                          }
                        });

                        const rendition = book.renderTo(iframe.contentDocument.getElementById("viewer"), {
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
                    }

                    iframe.addEventListener('DOMContentLoaded', (iframe.contentWindow as any).startEpubReader(), { once: true });
                }}
            />
        );
    };
    return EpubAnnotation;
};
