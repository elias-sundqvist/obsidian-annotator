import defineGenericAnnotation from 'defineGenericAnnotation';
import React from 'react';
import { EpubAnnotationProps } from './types';
import { normalizePath, TFile } from 'obsidian';
import * as epubjs from 'epubjs';

export default ({ vault, plugin, resourceUrls }) => {
    const GenericAnnotationEpub = defineGenericAnnotation({ vault, plugin, resourceUrls });
    const EpubAnnotation = ({ ...props }: EpubAnnotationProps) => {
        function getBookUrl ():string {
            const getUrl = ():URL => {
                let path;

                try {
                    path = new URL(props.epub).href;
                } catch {
                    return new URL(`vault:/${props.epub}`);
                }

                return new URL(path);
            };

            const url = getUrl();

            switch (url.protocol) {
                case 'vault:': {
                    return getVaultPathResourceUrl(normalizePath(url.pathname));
                }
                default: {
                    return url.toString();
                }
            }
        }

        function getVaultPathResourceUrl(vaultPath):string {
            function tryGetResourceUrl(vaultPath) {
                const abstractFile = getAbstractFileByPath(vaultPath);
                const resourcePath = vault.getResourcePath(abstractFile);
                return resourcePath;
            }
            try {
                return tryGetResourceUrl(vaultPath);
            } catch (e) {
                try {
                    return tryGetResourceUrl(decodeURI(vaultPath));
                } catch (e) {
                    return `error:/${encodeURIComponent(e.toString())}/`;
                }
            }
        }

        function getAbstractFileByPath(path):TFile {
            let p;
            if (
                (p = vault.getAbstractFileByPath(path)) instanceof TFile ||
                (p = vault.getAbstractFileByPath(`${path}.html`)) instanceof TFile
            ) {
                return p;
            }
        }

        return (
            <GenericAnnotationEpub
                baseSrc="https://cdn.hypothes.is/demos/epub/epub.js/index.html"
                {...props}
                onload={async iframe => {
                    (iframe.contentWindow as any).startEpubReader = function() {
                        const book = new epubjs.Book(getBookUrl(), {
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
