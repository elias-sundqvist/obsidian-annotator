import defineGenericAnnotation from 'defineGenericAnnotation';
import React from 'react';
import { Vault, Platform } from 'obsidian';
import AnnotatorPlugin from 'main';
import { VideoAnnotationProps } from './types';

export default (vault: Vault, plugin: AnnotatorPlugin) => {
    const GenericAnnotationVideo = defineGenericAnnotation(vault, plugin);
    const VideoAnnotation = ({ ...props }: VideoAnnotationProps) => {
        if (Platform.isMobile) {
            return (
                <h2>obsidian-annotator plugin doesn&apos;t support video annotation on mobile</h2>
            );
        }

        return (
            <GenericAnnotationVideo
                baseSrc="https://annotate.tv/videos/620d5a42b9ab630009bf3e31.html"
                {...props}
                onload={async iframe => {
                    await props.onload?.(iframe);
                }}
            />
        );
    };

    return VideoAnnotation;
};
