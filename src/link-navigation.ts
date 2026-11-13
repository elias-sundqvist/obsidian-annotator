/** Intercept only recognized annotation links; preserve Obsidian's normal routing. */
// Any function's arguments, as a bound on a type: `unknown[]` would refuse the host's own signature.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function installAnnotationLinks<T extends { openLinkText: (...args: any[]) => Promise<void> }>(
    workspace: T,
    route: (...args: Parameters<T['openLinkText']>) => Promise<boolean>
) {
    const original = workspace.openLinkText;
    const wrapped = async (...args: Parameters<T['openLinkText']>) => {
        if (!(await route(...args))) await original.apply(workspace, args);
    };
    workspace.openLinkText = wrapped as T['openLinkText'];
    return () => {
        if (workspace.openLinkText === wrapped) workspace.openLinkText = original;
    };
}
