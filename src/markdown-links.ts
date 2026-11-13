import { Keymap, Notice, type App, type Component } from 'obsidian';

/** MarkdownRenderer creates vault-link markup; custom views own its navigation. */
export function bindMarkdownLinks(app: App, root: HTMLElement, sourcePath: string, component: Component) {
    const open = (event: MouseEvent) => {
        if (
            event.defaultPrevented ||
            !root.isConnected ||
            (event.type === 'click' ? event.button !== 0 : event.button !== 1)
        )
            return;
        const node = event.target as Node | null;
        const target = node?.nodeType === 1 ? (node as Element) : node?.parentElement;
        const link = target?.closest<HTMLAnchorElement>('a.internal-link[data-href]');
        const href = link?.getAttribute('data-href');
        if (!link || !root.contains(link) || !href) return;
        event.preventDefault();
        event.stopPropagation();
        void app.workspace.openLinkText(href, sourcePath, Keymap.isModEvent(event)).catch(error => {
            new Notice(`Could not open annotation link: ${error instanceof Error ? error.message : String(error)}`);
        });
    };
    component.registerDomEvent(root, 'click', open);
    component.registerDomEvent(root, 'auxclick', open);
}
