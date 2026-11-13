// Tested host boundary over the separately checked Bend timestamp modules.
// @ts-expect-error The proofs' JavaScript wrappers carry no type declarations.
import * as Bridge from '../proofs/video-crud.mjs';
export interface VideoRecord {
    kind: 'video';
    id: string;
    title: string;
    comment: string;
    timestamp: string;
    seconds: number;
    seekable: boolean;
    raw: string;
    start: number;
    end: number;
}
export interface VideoInput {
    id: string;
    title: string;
    comment: string;
    seconds: number;
}
export interface VideoPatch {
    title?: string;
    comment?: string;
    seconds?: number;
}
export interface VideoInspection {
    blocks: VideoRecord[];
    diagnostics: { line?: number; message: string; raw?: string }[];
    safe: boolean;
}
export function inspectVideo(source: string): VideoInspection {
    return Bridge.inspectVideoDocument(source);
}
export function createVideo(source: string, input: VideoInput): string {
    return Bridge.createVideoAnnotation(source, input);
}
export function updateVideo(source: string, id: string, expectedRaw: string, patch: VideoPatch): string {
    return Bridge.updateVideoAnnotation(source, id, expectedRaw, patch);
}
export function deleteVideo(source: string, id: string, expectedRaw: string): string {
    return Bridge.deleteVideoAnnotation(source, id, expectedRaw);
}
