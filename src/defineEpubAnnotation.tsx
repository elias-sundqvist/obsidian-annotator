import defineGenericAnnotation from 'defineGenericAnnotation';
import React from 'react';
import { EpubAnnotationProps } from './types';

export default ({ vault, plugin }) => {
    const GenericAnnotationEpub = defineGenericAnnotation({ vault, plugin });
    const EpubAnnotation = ({ ...props }: EpubAnnotationProps) => {
        return (
            <GenericAnnotationEpub
                baseSrc="https://cdn.hypothes.is/demos/epub/epub.js/index.html"
                {...props}
                onload={async iframe => {
                    await props.onload?.(iframe);

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (iframe.contentWindow as any).epubReader(plugin.settings.epubSettings);
                }}
            />
        );
    };
    return EpubAnnotation;
};
