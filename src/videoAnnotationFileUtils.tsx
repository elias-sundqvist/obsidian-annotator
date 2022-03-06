import AnnotatorPlugin from 'main';
import { TFile, Vault } from 'obsidian';
import { VideoAnnotation } from 'types';
import {
    deleteVideoAnnotationFromVideoAnnotationFileString,
    getVideoAnnotationFromFileContent,
    loadVideoAnnotationsAtUriFromFileText,
    writeVideoAnnotationToVideoAnnotationFileString
} from 'videoAnnotationUtils';

export async function getVideoAnnotation(annotationId: string, file: TFile, vault: Vault): Promise<VideoAnnotation> {
    const text = await vault.read(file);
    return getVideoAnnotationFromFileContent(annotationId, text);
}

export async function writeVideoAnnotation(
    annotation: VideoAnnotation,
    plugin: AnnotatorPlugin,
    annotationFilePath: string
) {
    const vault = plugin.app.vault;
    const tfile = vault.getAbstractFileByPath(annotationFilePath);

    let res: ReturnType<typeof writeVideoAnnotationToVideoAnnotationFileString>;
    if (tfile instanceof TFile) {
        const text = await vault.read(tfile);
        res = writeVideoAnnotationToVideoAnnotationFileString(annotation, text, plugin);
        vault.modify(tfile, res.newVideoAnnotationFileString);
    } else {
        res = writeVideoAnnotationToVideoAnnotationFileString(annotation, null, plugin);
        vault.create(annotationFilePath, res.newVideoAnnotationFileString);
    }
    return res.newVideoAnnotation;
}

export async function loadVideoAnnotations(
    url: URL | null,
    vault: Vault,
    annotationFilePath: string
): Promise<VideoAnnotation[]> {
    const tfile = vault.getAbstractFileByPath(annotationFilePath);
    if (tfile instanceof TFile) {
        const text = await vault.read(tfile);
        return loadVideoAnnotationsAtUriFromFileText(url, text);
    } else {
        return loadVideoAnnotationsAtUriFromFileText(url, null);
    }
}

export async function deleteVideoAnnotation(
    annotationId,
    vault: Vault,
    annotationFilePath: string
): Promise<{
    deleted: boolean;
    id: string;
}> {
    const tfile = vault.getAbstractFileByPath(annotationFilePath);
    if (tfile instanceof TFile) {
        const text = await vault.read(tfile);
        const updatedText = deleteVideoAnnotationFromVideoAnnotationFileString(annotationId, text);
        if (text !== updatedText) {
            vault.modify(tfile, updatedText);
            return {
                deleted: true,
                id: annotationId
            };
        }
    }

    return {
        deleted: false,
        id: annotationId
    };
}
