import { TFile, Vault } from 'obsidian';
import { Annotation, AnnotationList } from 'types';
import AnnotatorPlugin from './main';
import {
    deleteAnnotationFromAnnotationFileString,
    getAnnotationFromFileContent,
    loadAnnotationsAtUriFromFileText,
    writeAnnotationToAnnotationFileString
} from 'annotationUtils';

export async function getAnnotation(annotationId: string, file: TFile, vault: Vault): Promise<Annotation> {
    const text = await vault.read(file);
    return getAnnotationFromFileContent(annotationId, text);
}

export async function writeAnnotation(annotation: Annotation, plugin: AnnotatorPlugin, annotationFilePath: string) {
    const vault = plugin.app.vault;
    const tfile = vault.getAbstractFileByPath(annotationFilePath);

    let res: ReturnType<typeof writeAnnotationToAnnotationFileString>;
    if (tfile instanceof TFile) {
        const text = await vault.read(tfile);
        res = writeAnnotationToAnnotationFileString(annotation, text, plugin);
        vault.modify(tfile, res.newAnnotationFileString);
    } else {
        res = writeAnnotationToAnnotationFileString(annotation, null, plugin);
        vault.create(annotationFilePath, res.newAnnotationFileString);
    }
    return res.newAnnotation;
}

export async function loadAnnotations(
    url: URL | null,
    vault: Vault,
    annotationFilePath: string
): Promise<AnnotationList> {
    const tfile = vault.getAbstractFileByPath(annotationFilePath);
    if (tfile instanceof TFile) {
        const text = await vault.read(tfile);
        return loadAnnotationsAtUriFromFileText(url, text);
    } else {
        return loadAnnotationsAtUriFromFileText(url, null);
    }
}

export async function deleteAnnotation(
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
        const updatedText = deleteAnnotationFromAnnotationFileString(annotationId, text);
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
