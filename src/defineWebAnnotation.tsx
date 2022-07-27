import defineGenericAnnotation from 'defineGenericAnnotation';
import React from 'react';
import { Vault } from 'obsidian';
import AnnotatorPlugin from 'main';
import { WebAnnotationProps } from './types';
import { wait } from './utils';

export default (vault: Vault, plugin: AnnotatorPlugin) => {
    const GenericAnnotationEpub = defineGenericAnnotation(vault, plugin);
    const EpubAnnotation = ({ ...props }: WebAnnotationProps) => {
        return (
            <GenericAnnotationEpub
                baseSrc={props.url}
                {...props}
                onload={async iframe => {
                    await props.onload?.(iframe);
                    while (iframe?.contentDocument?.body?.innerHTML == '') {
                        await wait(50);
                    }
                    const script = iframe.contentDocument.createElement('script');
                    script.src = 'https://cdn.hypothes.is/hypothesis';
                    iframe.contentDocument.head.appendChild(script);
                }}
            />
        );
    };
    return EpubAnnotation;
};
