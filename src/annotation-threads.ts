import type { Annotation } from './codec';

export interface AnnotationThread {
    id: string;
    annotation?: Annotation;
    parent?: AnnotationThread;
    children: AnnotationThread[];
}
/** Presentation nodes only. Missing ancestors never become stored annotations. */
export function annotationThreads(records: readonly Annotation[]) {
    const nodes = new Map<string, AnnotationThread>(
        records.map(annotation => [annotation.id, { id: annotation.id, annotation, children: [] }])
    );
    for (const annotation of records) {
        const references = (annotation.references || []).filter(id => id !== annotation.id);
        let child = nodes.get(annotation.id)!;
        for (let at = references.length - 1; at >= 0 && !child.parent; at--) {
            const id = references[at];
            let parent = nodes.get(id);
            const missing = !parent;
            if (!parent) {
                parent = { id, children: [] };
                nodes.set(id, parent);
            }
            let cyclic = false;
            for (let ancestor: AnnotationThread | undefined = parent; ancestor; ancestor = ancestor.parent)
                if (ancestor === child) {
                    cyclic = true;
                    break;
                }
            if (cyclic) break;
            child.parent = parent;
            parent.children.push(child);
            // Existing records own their own ancestry. Infer only missing nodes.
            if (!missing) break;
            child = parent;
        }
    }
    const representative = (node: AnnotationThread): Annotation | undefined => {
        const pending = [node];
        while (pending.length) {
            const next = pending.pop()!;
            if (next.annotation) return next.annotation;
            // Do not spread siblings into a function call: large imported
            // threads can exceed the engine's argument-stack limit.
            for (let at = next.children.length - 1; at >= 0; at--) pending.push(next.children[at]);
        }
    };
    const root = (id: string) => {
        let node = nodes.get(id);
        while (node?.parent) node = node.parent;
        return node;
    };
    return {
        nodes,
        roots: [...nodes.values()].filter(node => !node.parent && representative(node)),
        root,
        representative
    };
}
