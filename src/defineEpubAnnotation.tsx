import defineGenericAnnotation from 'defineGenericAnnotation';
import React from 'react';
import { EpubAnnotationProps } from './types';

export default ({ vault, resourceUrls }) => {
    const GenericAnnotationEpub = defineGenericAnnotation({ vault, resourceUrls });
    const EpubAnnotation = ({ ...props }: EpubAnnotationProps) => {
        return <GenericAnnotationEpub baseSrc="https://cdn.hypothes.is/demos/epub/epub.js/index.html" {...props} />;
    };
    return EpubAnnotation;
};
