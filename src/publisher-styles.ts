import { last } from './portable';
import {
    typographyAliases,
    legacyTypographyValue,
    validTypographyValue,
    emphasisParts,
    expandEmphasis
} from './publisher-typography';
import { outlineParts, expandOutline } from './publisher-outline';
import { publisherStyleSheets } from './publisher-sheets';
import { listParts, expandList } from './publisher-list';
import { decorationParts, expandDecoration } from './publisher-decoration';
import parse from 'css-tree/parser';
import generate from 'css-tree/generator';
import walk from 'css-tree/walker';
import type { CssNode, Declaration, Rule } from 'css-tree';
import { archivePath, EPUB_FONT_BYTE_LIMIT, type Publication } from './epub-book';
import type { SafeProjection } from './dom-source';
import { gridProperties, gridExpansions, validLayoutValue, expandGrid } from './publisher-grid';
import { PublisherVariables, customName, hasVariables } from './publisher-variables';
import {
    publisherConditions,
    publisherMediaObservers,
    type PublisherCondition,
    type PublisherEnvironment
} from './publisher-conditions';
import { loadCssGrammar } from './css-grammar';

// Evaluate selectors only in the inert source document. Apply a bounded set of
// passive declarations to retained elements, never install publisher CSS in the
// host document or copy classes which could acquire Obsidian theme behavior.
const properties = new Set(
    `font font-language-override font-optical-sizing font-size-adjust font-variation-settings font-variant-emoji font-variant-ligatures font-variant-alternates font-variant-east-asian font-variant-position fill stroke fill-opacity stroke-opacity stroke-width stroke-linecap stroke-linejoin stroke-dasharray stroke-dashoffset color background background-color background-image background-position background-size background-repeat background-origin background-clip background-attachment font-family font-size font-style font-weight font-stretch font-variant font-variant-caps font-variant-numeric font-feature-settings font-kerning line-height letter-spacing word-spacing writing-mode text-orientation text-combine-upright ruby-position ruby-align text-align text-align-last text-indent text-transform text-emphasis text-emphasis-style text-emphasis-color text-emphasis-position text-decoration text-decoration-line text-decoration-style text-decoration-color text-decoration-thickness text-underline-offset text-underline-position outline outline-width outline-style outline-color outline-offset white-space overflow-wrap word-wrap word-break hyphens vertical-align direction unicode-bidi margin-block margin-inline padding-block padding-inline margin margin-top margin-right margin-bottom margin-left margin-block-start margin-block-end margin-inline-start margin-inline-end padding padding-top padding-right padding-bottom padding-left padding-block-start padding-block-end padding-inline-start padding-inline-end border border-top border-right border-bottom border-left border-width border-style border-color border-top-width border-right-width border-bottom-width border-left-width border-top-style border-right-style border-bottom-style border-left-style border-top-color border-right-color border-bottom-color border-left-color border-radius border-collapse border-spacing caption-side table-layout list-style list-style-type list-style-position list-style-image break-before break-after break-inside page-break-before page-break-after page-break-inside orphans widows`.split(
        ' '
    )
);
for (const property of 'display flex flex-flow flex-direction flex-wrap flex-grow flex-shrink flex-basis order justify-content align-items align-self align-content gap row-gap column-gap width height min-width max-width min-height max-height box-sizing'.split(
    ' '
))
    properties.add(property);
for (const property of gridProperties) properties.add(property);
for (const property of ['justify-items', 'justify-self']) properties.add(property);
const pageTransforms = new Set(
    'matrix translate translatex translatey scale scalex scaley rotate skew skewx skewy'.split(' ')
);
const functions = new Set('rgb rgba hsl hsla hwb lab lch oklab oklch color calc min max clamp'.split(' '));
const imageProperties = new Set(['background', 'background-image', 'list-style', 'list-style-image']);
const backgroundGradients = new Set(
    'linear-gradient radial-gradient conic-gradient repeating-linear-gradient repeating-radial-gradient repeating-conic-gradient'.split(
        ' '
    )
);
// History-dependent :visited stays unsupported; match static hyperlinks in the inert source.
const pseudo = new Set(
    'link any-link root first-child last-child only-child first-of-type last-of-type only-of-type empty nth-child nth-last-child nth-of-type nth-last-of-type lang dir'.split(
        ' '
    )
);
const inherited = new Set(
    'list-style list-style-type list-style-position list-style-image font font-language-override font-optical-sizing font-size-adjust font-variation-settings font-variant-emoji font-variant-ligatures font-variant-alternates font-variant-east-asian font-variant-position color font-family font-size font-style font-weight font-stretch font-variant font-feature-settings font-kerning line-height letter-spacing word-spacing writing-mode text-orientation text-combine-upright text-underline-position ruby-position ruby-align text-align text-align-last text-indent text-transform text-emphasis text-emphasis-style text-emphasis-color text-emphasis-position white-space overflow-wrap word-wrap word-break hyphens direction unicode-bidi'.split(
        ' '
    )
);
const sourceTypographyDefaults: Record<string, string> = {
    'writing-mode': 'horizontal-tb',
    'text-orientation': 'mixed',
    'text-combine-upright': 'none',
    'text-emphasis-style': 'none',
    'text-emphasis-color': 'currentcolor',
    'text-emphasis-position': 'over right',
    'text-underline-position': 'auto'
};
const logicalSpacing = new Set(['margin-block', 'margin-inline', 'padding-block', 'padding-inline']);
const expansions: Record<string, string[]> = {
    ...Object.fromEntries([...logicalSpacing].map(name => [name, ['start', 'end'].map(side => `${name}-${side}`)])),
    ...gridExpansions,
    'text-decoration': decorationParts,
    outline: outlineParts,
    'text-emphasis': emphasisParts,
    'list-style': listParts,
    flex: ['flex-grow', 'flex-shrink', 'flex-basis'],
    'flex-flow': ['flex-direction', 'flex-wrap'],
    gap: ['row-gap', 'column-gap'],
    background: ['color', 'image', 'position', 'size', 'repeat', 'origin', 'clip', 'attachment'].map(
        part => `background-${part}`
    ),
    margin: ['top', 'right', 'bottom', 'left'].map(side => `margin-${side}`),
    padding: ['top', 'right', 'bottom', 'left'].map(side => `padding-${side}`),
    border: ['top', 'right', 'bottom', 'left'].flatMap(side =>
        ['width', 'style', 'color'].map(part => `border-${side}-${part}`)
    ),
    ...Object.fromEntries(
        ['top', 'right', 'bottom', 'left'].map(side => [
            `border-${side}`,
            ['width', 'style', 'color'].map(part => `border-${side}-${part}`)
        ])
    ),
    ...Object.fromEntries(
        ['width', 'style', 'color'].map(part => [
            `border-${part}`,
            ['top', 'right', 'bottom', 'left'].map(side => `border-${side}-${part}`)
        ])
    )
};
type Weight = [number, number, number, number, number];
interface Chosen {
    value: string;
    weight: Weight;
    order: number;
}
interface FontRule {
    family: string;
    path: string;
    descriptors: FontFaceDescriptors;
    conditions: PublisherCondition[];
}
const fontNamespace = Math.random().toString(36).slice(2);
let fontSerial = 0;
export interface PublisherStyles {
    styleSets: readonly string[];
    selectedStyleSet: string | null;
    omitted: number;
    reorders: boolean;
    refresh(): boolean;
    dispose(): void;
}
export async function applyPublisherStyles(
    book: Publication,
    chapterPath: string,
    projection: SafeProjection,
    current: () => boolean,
    environment?: () => PublisherEnvironment,
    conditionChanged?: () => void,
    fixedPage = false,
    selectedStyle: string | null = null
): Promise<PublisherStyles> {
    // The grammar the styles are checked against is loaded on first use (see css-grammar.ts).
    await loadCssGrammar();
    const source = projection.original.ownerDocument,
        doc = projection.rendered.ownerDocument;
    const sheetSet = publisherStyleSheets(source, selectedStyle);
    let total = 0,
        matches = 0,
        applications = 0,
        disposed = false,
        collecting = true,
        cascadeOmitted = 0;
    const env = environment || (() => publisherEnvironment(projection.rendered));
    const warnings: PublisherCondition[][] = [],
        listeners: (() => void)[] = [];
    const rules: { rule: Rule; path: string; conditions: PublisherCondition[] }[] = [],
        fonts: FontRule[] = [],
        loaded: { face: FontFace; font: FontRule }[] = [],
        registered = new Set<FontFace>(),
        cache = new Map<string, string>();
    const backgroundUrls = new Set<string>(),
        backgroundAssets = new Map<string, string | null>(),
        inlineRules = new Map<Element, CssNode>();
    const backgroundBases = new WeakMap<CssNode, string>(),
        pendingBackgrounds = new Map<string, Promise<string | null>>(),
        backgroundFailures = new Set<string>();
    let refreshBackgrounds = () => {};
    let reorders = false;
    let backgroundQueue: Promise<unknown> = Promise.resolve();
    const urlApi = doc.defaultView!.URL;
    let backgroundBytes = 0;
    const localText = async (path: string) => {
        if (!cache.has(path)) cache.set(path, await book.text(path));
        return cache.get(path)!;
    };
    const result: PublisherStyles = {
        styleSets: sheetSet.titles,
        selectedStyleSet: sheetSet.selected,
        get reorders() {
            return reorders;
        },
        get omitted() {
            const currentEnv = env();
            return (
                cascadeOmitted +
                warnings.filter(conditions => publisherConditions(conditions, currentEnv) !== false).length
            );
        },
        refresh: () => false,
        dispose() {
            disposed = true;
            for (const remove of listeners) remove();
            listeners.length = 0;
            for (const face of registered) doc.fonts?.delete(face);
            registered.clear();
            loaded.length = 0;
            for (const url of backgroundUrls) urlApi.revokeObjectURL(url);
            backgroundUrls.clear();
            backgroundAssets.clear();
            backgroundFailures.clear();
            pendingBackgrounds.clear();
        }
    };
    const fail = (conditions: PublisherCondition[] = []) => {
        if (collecting) warnings.push(conditions);
        else cascadeOmitted++;
    };
    const collect = async (
        css: string,
        path: string,
        depth = 0,
        ancestors = new Set<string>(),
        conditions: PublisherCondition[] = []
    ): Promise<void> => {
        if (ancestors.has(path)) return;
        const active = new Set(ancestors);
        active.add(path);
        total += css.length;
        if (total > 2_000_000 || depth > 8) {
            fail(conditions);
            return;
        }
        let ast: CssNode;
        try {
            ast = parse(css, { parseCustomProperty: true });
        } catch {
            fail(conditions);
            return;
        }
        if (ast.type === 'StyleSheet') await visit(ast.children, path, depth, active, conditions, 0);
    };
    const visit = async (
        nodes: Iterable<CssNode>,
        path: string,
        depth: number,
        active: Set<string>,
        conditions: PublisherCondition[],
        nesting: number
    ): Promise<void> => {
        if (nesting > 32) {
            fail(conditions);
            return;
        }
        for (const node of nodes) {
            if (!current()) return;
            if (node.type === 'Rule') {
                if (rules.length < 5000) rules.push({ rule: node, path, conditions });
                else fail(conditions);
            } else if (
                node.type === 'Atrule' &&
                ['media', 'supports'].includes(node.name.toLowerCase()) &&
                node.block &&
                node.prelude
            ) {
                await visit(
                    node.block.children,
                    path,
                    depth,
                    active,
                    [
                        ...conditions,
                        { kind: node.name.toLowerCase() as 'media' | 'supports', text: generate(node.prelude) }
                    ],
                    nesting + 1
                );
            } else if (
                node.type === 'Atrule' &&
                node.name.toLowerCase() === 'import' &&
                node.prelude?.type === 'AtrulePrelude'
            ) {
                const parts = node.prelude.children.toArray(),
                    first = parts.shift();
                if (
                    !first ||
                    !['Url', 'String'].includes(first.type) ||
                    parts.some(part => part.type !== 'MediaQueryList')
                ) {
                    fail(conditions);
                    continue;
                }
                const imported = parts.length
                    ? [...conditions, { kind: 'media' as const, text: parts.map(part => generate(part)).join(' ') }]
                    : conditions;
                try {
                    const target = archivePath(path, (first as { value: string }).value).path;
                    if (!active.has(target))
                        await collect(await localText(target), target, depth + 1, active, imported);
                } catch {
                    fail(imported);
                }
            } else if (node.type === 'Atrule' && node.name.toLowerCase() === 'font-face' && node.block) {
                try {
                    const declarations = new Map(
                        node.block.children
                            .toArray()
                            .filter((n): n is Declaration => n.type === 'Declaration')
                            .map(n => [n.property.toLowerCase(), n.value])
                    );
                    const familyValue = declarations.get('font-family'),
                        src = declarations.get('src');
                    if (!familyValue || !src || fonts.length >= 12) throw new Error();
                    const family = familyName(familyValue);
                    let href = '';
                    walk(src, n => {
                        if (n.type === 'Url' && !href) href = n.value;
                    });
                    if (!family || !href) throw new Error();
                    const descriptors: FontFaceDescriptors = {};
                    for (const [property, field] of [
                        ['font-style', 'style'],
                        ['font-weight', 'weight'],
                        ['font-stretch', 'stretch'],
                        ['unicode-range', 'unicodeRange']
                    ] as const) {
                        const value = declarations.get(property);
                        if (value) descriptors[field] = generate(value);
                    }
                    fonts.push({ family, path: archivePath(path, href).path, descriptors, conditions });
                } catch {
                    fail(conditions);
                }
            } else if (!(node.type === 'Atrule' && node.name.toLowerCase() === 'charset')) fail(conditions);
        }
    };
    for (const node of sheetSet.active) {
        if (!current()) return result;
        if (total > 2_000_000) {
            fail();
            break;
        }
        const media = node.getAttribute('media')?.trim();
        const conditions: PublisherCondition[] = media ? [{ kind: 'media', text: media }] : [];
        if (node.localName === 'style') await collect(node.textContent || '', chapterPath, 0, new Set(), conditions);
        else
            try {
                await collect(
                    await localText(archivePath(chapterPath, node.getAttribute('href') || '').path),
                    archivePath(chapterPath, node.getAttribute('href') || '').path,
                    0,
                    new Set(),
                    conditions
                );
            } catch {
                fail(conditions);
            }
    }
    const backgroundAsset = async (base: string, href: string): Promise<string | null> => {
        try {
            if (!current() || disposed || !href) return null;
            const target = archivePath(base, href);
            if (target.fragment) return null;
            if (backgroundAssets.has(target.path)) return backgroundAssets.get(target.path)!;
            if (backgroundAssets.size >= 32) return null;
            backgroundAssets.set(target.path, null);
            const image = await book.image?.(target.path);
            if (
                !current() ||
                disposed ||
                !image ||
                !['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'].includes(image.mime)
            )
                return null;
            backgroundBytes += image.bytes.byteLength;
            if (backgroundBytes > 32 * 1024 * 1024 || typeof urlApi.createObjectURL !== 'function') return null;
            const url = urlApi.createObjectURL(
                new Blob([image.bytes.slice().buffer as ArrayBuffer], { type: image.mime })
            );
            backgroundUrls.add(url);
            backgroundAssets.set(target.path, url);
            return url;
        } catch {
            return null;
        }
    };
    const prepareBackgrounds = async (nodes: Iterable<CssNode>, path: string) => {
        for (const declaration of nodes) {
            if (!current() || disposed) return;
            if (declaration.type !== 'Declaration' || !imageProperties.has(declaration.property.toLowerCase()))
                continue;
            backgroundBases.set(declaration, path);
            const urls: { type: 'Url'; value: string }[] = [];
            walk(declaration.value, node => {
                if (node.type === 'Url') urls.push(node);
            });
            for (const node of urls) {
                const url = await backgroundAsset(path, node.value);
                if (url) node.value = url;
            }
        }
    };
    for (const entry of rules) {
        await prepareBackgrounds(entry.rule.block.children, entry.path);
        if (!current()) return result;
    }
    for (const element of Array.from(source.querySelectorAll('[style]')).slice(0, 10000)) {
        try {
            const ast = parse(element.getAttribute('style') || '', {
                context: 'declarationList',
                parseCustomProperty: true
            });
            if (ast.type === 'DeclarationList') {
                await prepareBackgrounds(ast.children, chapterPath);
                inlineRules.set(element, ast);
            }
        } catch {
            /* Normal declaration evaluation reports malformed inline CSS. */
        }
        if (!current()) return result;
    }
    // Custom-property URL tokens stay unresolved until consumed by an ordinary
    // image declaration (CSS Variables 1). Use that declaration's base.
    const resolveBackgrounds = (value: CssNode, base: string): boolean => {
        let waiting = false;
        walk(value, node => {
            if (node.type !== 'Url' || backgroundUrls.has(node.value)) return;
            try {
                const target = archivePath(base, node.value);
                if (!node.value || target.fragment) return;
                const known = backgroundAssets.get(target.path);
                if (known) {
                    node.value = known;
                    return;
                }
                if (pendingBackgrounds.has(target.path)) {
                    waiting = true;
                    return;
                }
                if (backgroundAssets.has(target.path) || backgroundFailures.has(target.path)) return;
                if (new Set([...backgroundAssets.keys(), ...pendingBackgrounds.keys()]).size >= 32) return;
                waiting = true;
                const href = node.value;
                const job = backgroundQueue
                    .then(() => backgroundAsset(base, href))
                    .then(url => {
                        pendingBackgrounds.delete(target.path);
                        if (!disposed) {
                            if (!url) backgroundFailures.add(target.path);
                            if (!pendingBackgrounds.size) refreshBackgrounds();
                        }
                        return url;
                    });
                pendingBackgrounds.set(target.path, job);
                backgroundQueue = job.then(
                    () => undefined,
                    () => undefined
                );
            } catch {
                /* Evaluation reports unresolved unsafe references. */
            }
        });
        return waiting;
    };
    const families = new Map<string, string>();
    let fontBytes = 0;
    for (const font of fonts) {
        if (!current()) return result;
        try {
            const bytes = await book.font?.(font.path);
            if (!current()) return result;
            fontBytes += bytes?.byteLength || 0;
            if (!bytes || fontBytes > EPUB_FONT_BYTE_LIMIT || !doc.defaultView?.FontFace || !doc.fonts)
                throw new Error();
            let family = families.get(font.family.toLowerCase());
            if (!family)
                families.set(
                    font.family.toLowerCase(),
                    (family = `annotator-publisher-${++fontSerial}-${fontNamespace}`)
                );
            const face = await new doc.defaultView.FontFace(
                family,
                bytes.slice().buffer as ArrayBuffer,
                font.descriptors
            ).load();
            if (!current()) return result;
            loaded.push({ face, font });
        } catch {
            fail(font.conditions);
        }
    }
    const targets = new Map<Element, HTMLElement>([[projection.original, projection.rendered]]);
    for (const [original, rendered] of projection.elements) {
        if (targets.size >= 10000) {
            fail();
            break;
        }
        if ('style' in rendered) targets.set(original, rendered as HTMLElement);
    }
    const chosen = new Map<Element, Map<string, Chosen>>();
    const variableElements = Array.from(source.querySelectorAll('*')).slice(0, 10000);
    if (source.querySelectorAll('*').length > variableElements.length) fail();
    const definitions = new Map<Element, Map<string, { node: CssNode; weight: Weight }>>();
    const jobs: {
        nodes: CssNode[];
        specificity: [number, number, number];
        inline: number;
        element: Element;
        onlyInherited: boolean;
        sourceElement: Element;
    }[] = [];
    let variables: PublisherVariables;
    const collectDeclarations = (
        nodes: Iterable<CssNode>,
        specificity: [number, number, number],
        inline: number,
        sourceElement: Element,
        onlyInherited = false
    ) => {
        if (applications > 250000) return;
        const ordinary: CssNode[] = [];
        for (const node of nodes) {
            if (applications >= 250000) {
                fail();
                break;
            }
            applications++;
            if (node.type === 'Declaration' && customName(node.property).startsWith('--')) {
                const name = customName(node.property);
                let values = definitions.get(sourceElement);
                if (!values) definitions.set(sourceElement, (values = new Map()));
                if (values.size >= 256 && !values.has(name)) {
                    fail();
                    continue;
                }
                const weight: Weight = [node.important ? 1 : 0, inline, ...specificity],
                    prior = values.get(name);
                if (!prior || compare(weight, prior.weight) >= 0) values.set(name, { node: node.value, weight });
            } else ordinary.push(node);
        }
        if (ordinary.length && (onlyInherited || targets.has(sourceElement)))
            jobs.push({
                nodes: ordinary,
                specificity,
                inline,
                element: onlyInherited ? projection.original : sourceElement,
                onlyInherited,
                sourceElement
            });
    };
    const declarations = (
        nodes: Iterable<CssNode>,
        specificity: [number, number, number],
        inline: number,
        element: Element,
        onlyInherited = false,
        sourceElement = element
    ) => {
        let winners = chosen.get(element);
        if (!winners) chosen.set(element, (winners = new Map()));
        for (const declaration of nodes) {
            if (++applications > 250000) {
                fail();
                break;
            }
            if (declaration.type !== 'Declaration') {
                fail();
                continue;
            }
            const rawProperty = declaration.property.toLowerCase();
            const property =
                typographyAliases[rawProperty] ||
                (
                    { 'grid-gap': 'gap', 'grid-row-gap': 'row-gap', 'grid-column-gap': 'column-gap' } as Record<
                        string,
                        string
                    >
                )[rawProperty] ||
                rawProperty;
            if (
                (!properties.has(property) &&
                    !(
                        fixedPage &&
                        [
                            'transform',
                            'transform-origin',
                            'background',
                            'position',
                            'left',
                            'right',
                            'top',
                            'bottom',
                            'width',
                            'height',
                            'min-width',
                            'max-width',
                            'min-height',
                            'max-height',
                            'box-sizing'
                        ].includes(property)
                    )) ||
                (onlyInherited && !inherited.has(property))
            ) {
                fail();
                continue;
            }
            const substituted = hasVariables(declaration.value);
            let resolved = substituted ? variables.resolve(sourceElement, declaration.value) : declaration.value;
            const waiting =
                resolved && imageProperties.has(property)
                    ? resolveBackgrounds(resolved, backgroundBases.get(declaration) || chapterPath)
                    : false;
            if (
                resolved &&
                !passiveValue(
                    resolved,
                    fixedPage && property === 'transform',
                    imageProperties.has(property) ? backgroundUrls : undefined,
                    gridProperties.has(property)
                )
            ) {
                if (!waiting) fail();
                resolved = null;
            }
            if (!resolved && !substituted) continue;
            let value = resolved ? publisherValue(resolved, currentEnvironment, property === 'font') : 'unset';
            if ((gridProperties.has(property) || logicalSpacing.has(property)) && !validLayoutValue(property, value)) {
                fail();
                if (!substituted) continue;
                value = 'unset';
            }
            value = legacyTypographyValue(rawProperty, value);
            if (!validTypographyValue(property, value)) {
                fail();
                if (!substituted) continue;
                value = 'unset';
            }
            if (
                property === 'writing-mode' &&
                !['horizontal-tb', 'vertical-rl', 'vertical-lr', 'inherit', 'initial', 'unset'].includes(
                    value.toLowerCase()
                )
            ) {
                fail();
                continue;
            }
            if (
                property === 'position' &&
                !['static', 'relative', 'absolute', 'inherit', 'initial', 'unset'].includes(value.toLowerCase())
            ) {
                fail();
                continue;
            }
            if (property === 'font-family' && resolved) value = rewriteFamilies(resolved, activeFamilies);
            const expandShorthand =
                property === 'text-decoration'
                    ? expandDecoration
                    : property === 'list-style'
                      ? expandList
                      : property === 'outline'
                        ? (value: string) => expandOutline(value, doc.createElement('span').style)
                        : property === 'text-emphasis'
                          ? (value: string) => expandEmphasis(value, doc.createElement('span').style)
                          : null;
            let shorthandValues = expandShorthand?.(value) || null;
            if (expandShorthand && !shorthandValues) {
                fail();
                if (!substituted) continue;
                value = 'unset';
                shorthandValues = expandShorthand(value);
            }
            const style = doc.createElement('span').style;
            style.setProperty(property, value);
            if (
                (property === 'background-attachment' &&
                    value
                        .split(',')
                        .some(part => !['scroll', 'local', 'inherit', 'initial', 'unset'].includes(part.trim()))) ||
                (property === 'background' && /\bfixed\b/.test(style.getPropertyValue('background-attachment')))
            ) {
                fail();
                continue;
            }
            if (
                !style.getPropertyValue(property) &&
                !(property === 'font' && ['inherit', 'initial', 'unset'].includes(value))
            ) {
                fail();
                if (!substituted) continue;
                // Invalid after substitution is computed-value invalidity. It
                // must mask earlier author declarations rather than revive them.
                value = 'unset';
                style.setProperty(property, value);
            }
            const weight: Weight = [
                declaration.important ? 1 : 0,
                inline,
                specificity[0],
                specificity[1],
                specificity[2]
            ];
            const layoutValues = shorthandValues || expandGrid(property, value) || expandLayout(style, property, value);
            const values =
                layoutValues ||
                (substituted && value === 'unset' && property !== 'font' && property !== 'font-variant'
                    ? (expansions[property] || [property]).map(part => [part, 'unset'])
                    : property === 'font'
                      ? expandFont(style, value, activeFamilies)
                      : property === 'font-variant'
                        ? expandVariant(style, value)
                        : (expansions[property] || [property]).map(part => [
                              part,
                              style.getPropertyValue(part) || (property === 'background' ? 'initial' : '')
                          ]));
            if (!values) {
                fail();
                continue;
            }
            for (const [part, resolved] of values) {
                if (!resolved) continue;
                const prior = winners.get(part);
                if (!prior || compare(weight, prior.weight) >= 0)
                    winners.set(part, { value: resolved, weight, order: applications });
            }
        }
    };
    collecting = false;
    const applied = new Map<HTMLElement, Set<string>>();
    const activeFamilies = new Map<string, string>();
    let currentEnvironment = env(),
        lastSignature: string | null = null;
    const allConditions = [
        ...new Set([
            ...rules.flatMap(entry => entry.conditions),
            ...fonts.flatMap(font => font.conditions),
            ...warnings.flat()
        ])
    ];
    let viewportLengths = false;
    for (const { rule } of rules)
        walk(rule.block, node => {
            if (node.type === 'Dimension' && /^(?:[sld])?v(?:w|h|min|max|i|b)$/i.test(node.unit))
                viewportLengths = true;
        });
    // Inline declarations can contain viewport lengths too.
    if (
        [...targets.keys()].some(node =>
            /[\d.](?:[sld])?v(?:w|h|min|max|i|b)\b/i.test(node.getAttribute('style') || '')
        )
    )
        viewportLengths = true;
    result.refresh = () => {
        if (disposed || !current()) return false;
        const currentEnv = env();
        const signature = JSON.stringify([
            viewportLengths ? [currentEnv.width, currentEnv.height] : null,
            allConditions.map(condition => publisherConditions([condition], currentEnv))
        ]);
        if (signature === lastSignature) return false;
        lastSignature = signature;
        currentEnvironment = currentEnv;
        matches = 0;
        applications = 0;
        chosen.clear();
        reorders = false;
        definitions.clear();
        jobs.length = 0;
        cascadeOmitted = 0;
        activeFamilies.clear();
        let fontChanged = false;
        const activeFaces: FontFace[] = [];
        for (const { face, font } of loaded) {
            const state = publisherConditions(font.conditions, currentEnv);
            if (state === null) fail(font.conditions);
            if (state === true) {
                activeFamilies.set(font.family.toLowerCase(), families.get(font.family.toLowerCase())!);
                activeFaces.push(face);
            }
        }
        if (registered.size !== activeFaces.length || activeFaces.some(face => !registered.has(face))) {
            // Reinsert in source order when a condition changes. Appending just
            // a newly activated earlier face could reverse same-family priority.
            for (const face of registered) doc.fonts.delete(face);
            registered.clear();
            for (const face of activeFaces) {
                doc.fonts.add(face);
                registered.add(face);
            }
            fontChanged = true;
        }
        // HTML's inherited declarations become a low-priority base on the retained
        // body; body/descendant rules are still evaluated against the original tree.
        for (const inheritedRoot of [true, false]) {
            for (const entry of rules) {
                const state = publisherConditions(entry.conditions, currentEnv);
                if (state === false) continue;
                if (state === null) {
                    fail(entry.conditions);
                    continue;
                }
                const rule = entry.rule;
                if (rule.prelude.type !== 'SelectorList') {
                    fail();
                    continue;
                }
                for (const selector of rule.prelude.children) {
                    const specificity = selectorWeight(selector);
                    if (!specificity) {
                        fail();
                        continue;
                    }
                    const selectorText = generate(selector);
                    const candidates = inheritedRoot
                        ? source.documentElement === projection.original
                            ? []
                            : [source.documentElement]
                        : variableElements.filter(
                              element => element !== source.documentElement || element === projection.original
                          );
                    for (const element of candidates) {
                        if (++matches > 2_000_000) {
                            fail();
                            break;
                        }
                        let matched = false;
                        try {
                            matched = element.matches(selectorText);
                        } catch {
                            fail();
                            break;
                        }
                        if (matched) collectDeclarations(rule.block.children, specificity, 0, element, inheritedRoot);
                    }
                    if (matches > 2_000_000) break;
                }
                if (matches > 2_000_000) break;
            }
        }
        for (const original of variableElements) {
            const inline = original.getAttribute('style');
            if (!inline) continue;
            try {
                const ast =
                    inlineRules.get(original) ||
                    parse(inline, { context: 'declarationList', parseCustomProperty: true });
                if (ast.type === 'DeclarationList')
                    collectDeclarations(
                        ast.children,
                        [0, 0, 0],
                        1,
                        original,
                        original === source.documentElement && original !== projection.original
                    );
            } catch {
                fail();
            }
        }
        applications = 0;
        variables = new PublisherVariables(
            variableElements,
            new Map(
                [...definitions].map(([element, values]) => [
                    element,
                    new Map([...values].map(([name, value]) => [name, value.node]))
                ])
            ),
            () => fail()
        );
        const inheritedWriting = new Map<string, string>();
        for (const root of [true, false]) {
            for (const job of jobs)
                if (job.onlyInherited === root)
                    declarations(
                        job.nodes,
                        job.specificity,
                        job.inline,
                        job.element,
                        job.onlyInherited,
                        job.sourceElement
                    );
            // The source HTML root and retained body share a rendered element.
            // Resolve these inherited layout keywords before they can inherit
            // Obsidian's viewport writing mode instead of the book's HTML root.
            for (const [property, initial] of Object.entries(sourceTypographyDefaults)) {
                const winner = chosen.get(projection.original)?.get(property);
                if (winner) {
                    const keyword = winner.value.toLowerCase();
                    if (keyword === 'initial') winner.value = initial;
                    else if (keyword === 'inherit' || keyword === 'unset')
                        winner.value = root ? initial : inheritedWriting.get(property) || initial;
                    if (root) inheritedWriting.set(property, winner.value);
                }
            }
            if (root)
                for (const winner of chosen.get(projection.original)?.values() || []) winner.weight = [-1, 0, 0, 0, 0];
        }
        const before = [...targets.values()].map(element => element.style.cssText).join('\n');
        for (const [element, names] of applied) for (const property of names) element.style.removeProperty(property);
        applied.clear();
        // Logical/physical edges can alias: emit weak/early winners first and
        // let the browser resolve direction and writing-mode dependent edges.
        for (const [element, values] of chosen)
            for (const [property, { value, weight }] of [...values].sort(
                (a, b) => compare(a[1].weight, b[1].weight) || a[1].order - b[1].order
            )) {
                const target = targets.get(element)!;
                target.style.setProperty(property, value, weight[0] > 0 ? 'important' : '');
                if (
                    (property === 'display' && /(?:^|[ -])grid$/i.test(value)) ||
                    (property === 'order' && Number(value) !== 0) ||
                    (property === 'flex-direction' && value.toLowerCase().endsWith('reverse')) ||
                    (property === 'flex-wrap' && value.toLowerCase() === 'wrap-reverse')
                )
                    reorders = true;
                if (!applied.has(target)) applied.set(target, new Set());
                applied.get(target)!.add(property);
            }
        return fontChanged || before !== [...targets.values()].map(element => element.style.cssText).join('\n');
    };
    refreshBackgrounds = () => {
        if (disposed || !current()) return;
        lastSignature = null;
        const changed = result.refresh();
        if (changed) conditionChanged?.();
    };
    result.refresh();
    while (pendingBackgrounds.size && current() && !disposed) await Promise.all([...pendingBackgrounds.values()]);
    if (conditionChanged && doc.defaultView?.matchMedia && current()) {
        const conditions = [...rules.flatMap(entry => entry.conditions), ...fonts.flatMap(font => font.conditions)];
        const queries = publisherMediaObservers(conditions);
        if (queries.length > 128) warnings.push([]);
        for (const query of queries.slice(0, 128)) {
            const media = doc.defaultView.matchMedia(query);
            const changed = () => {
                if (!disposed && current()) conditionChanged();
            };
            media.addEventListener('change', changed);
            listeners.push(() => media.removeEventListener('change', changed));
        }
    }
    return result;
}
/** Expand layout shorthands before comparing longhand cascade weights.
 * CSSStyleDeclaration implementations differ in whether gap/flex-flow expose
 * their component properties, so derive those two from parsed values. */
function expandLayout(style: CSSStyleDeclaration, property: string, value: string): string[][] | null {
    if (!['flex', 'flex-flow', 'gap'].includes(property) && !logicalSpacing.has(property)) return null;
    if (['inherit', 'initial', 'unset', 'revert', 'revert-layer'].includes(value))
        return expansions[property].map(part => [part, value]);
    if (property === 'flex') return expansions.flex.map(part => [part, style.getPropertyValue(part)]);
    const parsed = parse(value, { context: 'value' });
    if (parsed.type !== 'Value') return null;
    const parts = parsed.children.toArray().map(part => generate(part));
    if (logicalSpacing.has(property))
        return expansions[property].map((name, index) => [name, parts[index] || parts[0]]);
    if (property === 'gap')
        return [
            ['row-gap', parts[0]],
            ['column-gap', parts[1] || parts[0]]
        ];
    return [
        [
            'flex-direction',
            parts
                .map(part => part.toLowerCase())
                .find(part => ['row', 'row-reverse', 'column', 'column-reverse'].includes(part)) || 'row'
        ],
        [
            'flex-wrap',
            parts.map(part => part.toLowerCase()).find(part => ['nowrap', 'wrap', 'wrap-reverse'].includes(part)) ||
                'nowrap'
        ]
    ];
}
function compare(a: Weight, b: Weight) {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
}
function passiveValue(node: CssNode, pageTransform = false, urls?: ReadonlySet<string>, grid = false) {
    let safe = true;
    walk(node, n => {
        if (
            n.type === 'Raw' ||
            (n.type === 'Url' && !urls?.has(n.value)) ||
            (n.type === 'Function' &&
                !functions.has(n.name.toLowerCase()) &&
                !(urls && backgroundGradients.has(n.name.toLowerCase())) &&
                !(pageTransform && pageTransforms.has(n.name.toLowerCase())) &&
                !(grid && ['repeat', 'minmax', 'fit-content'].includes(n.name.toLowerCase())))
        )
            safe = false;
        if (
            (n.type === 'Dimension' || n.type === 'Number' || n.type === 'Percentage') &&
            (!Number.isFinite(Number(n.value)) || Math.abs(Number(n.value)) > 10000)
        )
            safe = false;
    });
    return safe;
}
function selectorWeight(node: CssNode): [number, number, number] | null {
    let safe = true;
    const weight: [number, number, number] = [0, 0, 0];
    walk(node, n => {
        if (n.type === 'IdSelector') weight[0]++;
        else if (n.type === 'ClassSelector' || n.type === 'AttributeSelector') weight[1]++;
        else if (n.type === 'TypeSelector' && n.name !== '*') weight[2]++;
        else if (n.type === 'PseudoClassSelector') {
            if (!pseudo.has(n.name.toLowerCase())) safe = false;
            weight[1]++;
        } else if (['Raw', 'PseudoElementSelector', 'NestingSelector'].includes(n.type)) safe = false;
    });
    return safe ? weight : null;
}
function familyName(node: CssNode) {
    if (node.type !== 'Value') return '';
    const parts = node.children.toArray();
    return parts.every(n => n.type === 'String' || n.type === 'Identifier')
        ? parts.map(n => (n as { value?: string; name?: string }).value ?? (n as { name: string }).name).join(' ')
        : '';
}
function rewriteFamilies(node: CssNode, families: Map<string, string>) {
    if (node.type !== 'Value') return '';
    const groups: CssNode[][] = [[]];
    for (const part of node.children) {
        if (part.type === 'Operator' && part.value === ',') groups.push([]);
        else last(groups)!.push(part);
    }
    return groups
        .map(parts => {
            const name = parts
                .map(n => (n.type === 'String' ? n.value : n.type === 'Identifier' ? n.name : ''))
                .join(' ');
            const mapped = families.get(name.toLowerCase());
            return mapped ? JSON.stringify(mapped) : parts.map(n => generate(n)).join(' ');
        })
        .join(',');
}

export function publisherEnvironment(root: HTMLElement): PublisherEnvironment {
    const win = root.ownerDocument.defaultView!,
        viewport = root.closest<HTMLElement>('.annotator-book-viewport');
    const theme = root.closest<HTMLElement>('[data-reader-theme]')?.dataset.readerTheme;
    return {
        width: viewport?.clientWidth ?? win.innerWidth,
        height: viewport?.clientHeight ?? win.innerHeight,
        pixelRatio: win.devicePixelRatio || 1,
        ...(theme === 'dark'
            ? { theme: 'dark' as const }
            : theme === 'light' || theme === 'sepia'
              ? { theme: 'light' as const }
              : {}),
        ...(win.matchMedia ? { feature: (query: string) => win.matchMedia(query).matches } : {}),
        ...(win.CSS?.supports ? { supports: (condition: string) => win.CSS.supports(condition) } : {})
    };
}

const variantParts = ['ligatures', 'caps', 'alternates', 'numeric', 'east-asian', 'position', 'emoji'].map(
    part => `font-variant-${part}`
);
function expandVariant(style: CSSStyleDeclaration, value: string): string[][] {
    return variantParts.map(part => [
        part,
        style.getPropertyValue(part) ||
            (['inherit', 'initial', 'unset'].includes(value)
                ? value
                : part === 'font-variant-caps' && value === 'small-caps'
                  ? value
                  : 'normal')
    ]);
}
function expandFont(style: CSSStyleDeclaration, value: string, families: Map<string, string>): string[][] | null {
    const defaults: Record<string, string> = {
        'font-style': 'normal',
        'font-weight': 'normal',
        'font-stretch': 'normal',
        'line-height': 'normal',
        'font-feature-settings': 'normal',
        'font-kerning': 'auto',
        'font-language-override': 'normal',
        'font-optical-sizing': 'auto',
        'font-size-adjust': 'none',
        'font-variation-settings': 'normal'
    };
    const names = ['font-family', 'font-size', ...Object.keys(defaults), ...variantParts];
    if (['inherit', 'initial', 'unset'].includes(value)) return names.map(name => [name, value]);
    // System-font keywords are not expanded by every supported CSSOM; keep an
    // explicit omission rather than fabricating a family/size for those engines.
    if (!style.fontFamily || !style.fontSize) return null;
    let family: CssNode;
    try {
        family = parse(style.fontFamily, { context: 'value' });
    } catch {
        return null;
    }
    return [
        ['font-family', rewriteFamilies(family, families)],
        ['font-size', style.fontSize],
        ...Object.entries(defaults).map(([property, initial]) => [
            property,
            style.getPropertyValue(property) || initial
        ]),
        ...expandVariant(style, style.fontVariant === 'small-caps' ? 'small-caps' : 'normal')
    ];
}

function publisherValue(node: CssNode, env: PublisherEnvironment, spaced = false): string {
    const changed: { node: Extract<CssNode, { type: 'Dimension' }>; value: string; unit: string }[] = [];
    try {
        walk(node, part => {
            if (part.type !== 'Dimension') return;
            const match = /^(?:[sld])?v(w|h|min|max|i|b)$/i.exec(part.unit);
            if (!match) return;
            const axis = match[1].toLowerCase(),
                size =
                    axis === 'w' || axis === 'i'
                        ? env.width
                        : axis === 'h' || axis === 'b'
                          ? env.height
                          : axis === 'min'
                            ? Math.min(env.width, env.height)
                            : Math.max(env.width, env.height);
            changed.push({ node: part, value: part.value, unit: part.unit });
            part.value = String((Number(part.value) * size) / 100);
            part.unit = 'px';
        });
        return spaced && node.type === 'Value'
            ? node.children
                  .toArray()
                  .map(part => generate(part))
                  .join(' ')
            : generate(node);
    } finally {
        for (const part of changed) {
            part.node.value = part.value;
            part.node.unit = part.unit;
        }
    }
}
