import defineGenericAnnotation from 'defineGenericAnnotation';
import React from 'react';
import { Vault } from 'obsidian';
import AnnotatorPlugin from 'main';
import { VideoAnnotationProps } from './types';

export default (vault: Vault, plugin: AnnotatorPlugin) => {
    const GenericAnnotationEpub = defineGenericAnnotation(vault, plugin);
    const EpubAnnotation = ({ ...props }: VideoAnnotationProps) => {
        return (
            <GenericAnnotationEpub
                baseSrc="https://annotate.tv/videos/620d5a42b9ab630009bf3e31.html"
                {...props}
                onload={async iframe => {
                    await props.onload?.(iframe);
                }}
            />
        );
    };
    return EpubAnnotation;
};
