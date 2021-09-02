import { SAMPLE_PDF_URL } from './constants';
import { TFile, Vault } from 'obsidian';
import { Annotation, AnnotationList } from 'types';
import AnnotatorPlugin from './main';

const makeAnnotationBlockRegex = (annotationId?: string) =>
    new RegExp(
        '(?<annotationBlock>^\n(>.*?\n)*?>```annotation-json(\n>.*?)*?)\n\\^(?<annotationId>' +
            (annotationId ?? '[a-zA-Z0-9]+') +
            ')\n',
        'gm'
    );

const getAnnotationFromAnnotationBlock = (annotationBlock: string, annotationId: string): Annotation => {
    const contentRegex = makeAnnotationContentRegex();
    const content = annotationBlock
        .split('\n')
        .map(x => x.substr(1))
        .join('\n');

    const {
        groups: { annotationJson, prefix, highlight, postfix, comment, tags }
    } = contentRegex.exec(content);
    const annotation = JSON.parse(annotationJson);
    const annotationTarget = annotation.target?.[0];
    if (annotationTarget && 'selector' in annotationTarget) {
        annotationTarget.selector = annotationTarget.selector.map(x =>
            x.type == 'TextQuoteSelector'
                ? { ...x, prefix: prefix ?? x.prefix, exact: x.exact ?? highlight, suffix: postfix ?? x.suffix }
                : x
        );
    }
    annotation.text = comment;
    annotation.tags = tags
        .split(',')
        .map(x => x.trim().substr(1))
        .filter(x => x);
    if ('group' in annotation) {
        delete annotation.group;
    }
    return { ...makeDefaultAnnotationObject(annotationId, annotation.tags), ...annotation };
};

const makeAnnotationContentRegex = () =>
    new RegExp(
        [
            '(.|\\n)*?',
            '%%\\n',
            '```annotation-json\\n',
            '(?<annotationJson>(.|\\n)*?)\\n',
            '```\\n',
            '%%(.|\\n)*?\\*',
            '(%%PREFIX%%(?<prefix>(.|\\n)*?))?',
            '(%%HIGHLIGHT%%( ==)?(?<highlight>(.|\\n)*?)(== )?)?',
            '(%%POSTFIX%%(?<postfix>(.|\\n)*?))?\\*\\n',
            '(%%LINK%%(?<link>(.|\\n)*?)\\n)?',
            '(%%COMMENT%%\\n(?<comment>(.|\\n)*?)\\n)?',
            '(%%TAGS%%\\n(?<tags>(.|\\n)*))?',
            '$'
        ].join(''),
        'gm'
    );

const makeAnnotationString = (annotation: Annotation, plugin: AnnotatorPlugin) => {
    const { highlightHighlightedText, includePostfix, includePrefix } = plugin.settings.annotationMarkdownSettings;
    let prefix = '';
    let exact = '';
    let suffix = '';
    annotation.target?.[0]?.selector?.forEach(x => {
        if (x.type == 'TextQuoteSelector') {
            prefix = x.prefix || '';
            exact = x.exact || '';
            suffix = x.suffix || '';
        }
    });
    const annotationString =
        '%%\n```annotation-json' +
        `\n${JSON.stringify(
            stripDefaultValues(annotation, makeDefaultAnnotationObject(annotation.id, annotation.tags))
        )}` +
        '\n```\n%%\n' +
        `*${includePrefix ? `%%PREFIX%%${prefix.trim()}` : ''}%%HIGHLIGHT%%${
            highlightHighlightedText ? ' ==' : ''
        }${exact.trim()}${highlightHighlightedText ? '== ' : ''}${
            includePostfix ? `%%POSTFIX%%${suffix.trim()}` : ''
        }*\n%%LINK%%[[#^${annotation.id}|show annotation]]\n%%COMMENT%%\n${
            annotation.text || ''
        }\n%%TAGS%%\n${annotation.tags.map(x => `#${x}`).join(', ')}`;

    return (
        '\n' +
        annotationString
            .split('\n')
            .map(x => `>${x}`)
            .join('\n') +
        '\n^' +
        annotation.id +
        '\n'
    );
};

export async function getAnnotation(annotationId: string, file: TFile, vault: Vault): Promise<Annotation> {
    const annotationRegex = makeAnnotationBlockRegex(annotationId);
    const text = await vault.read(file);
    let m: RegExpExecArray;

    if ((m = annotationRegex.exec(text)) !== null) {
        if (m.index === annotationRegex.lastIndex) {
            annotationRegex.lastIndex++;
        }
        const {
            groups: { annotationBlock, annotationId }
        } = m;
        return getAnnotationFromAnnotationBlock(annotationBlock, annotationId);
    } else {
        return null;
    }
}

export const makeDefaultAnnotationObject = (annotationId: string, tags: string[]) => ({
    group: '__world__',
    permissions: { read: ['Obsidian User'], update: ['Obsidian User'], delete: ['Obsidian User'] },
    tags,
    text: '',
    user: 'Obsidian User',
    user_info: { display_name: 'Obsidian User' },
    hidden: false,
    target: [],
    links: {},
    flagged: false,
    id: annotationId
});

export const stripDefaultValues = (obj: Record<string, unknown>, defaultObj: Record<string, unknown>) => {
    const strippedObject: Record<string, unknown> = {};
    const toIgnore = ['group', 'permissions', 'user', 'user_info'];
    for (const key of Object.keys(obj)) {
        if (JSON.stringify(obj[key]) !== JSON.stringify(defaultObj[key]) && !toIgnore.contains(key)) {
            strippedObject[key] = obj[key];
        }
    }
    return strippedObject;
};

export async function writeAnnotation(annotation, plugin: AnnotatorPlugin, annotationFilePath: string) {
    const vault = plugin.app.vault;
    const annotationId = annotation.id ? annotation.id : Math.random().toString(36).substr(2);
    const res = JSON.parse(JSON.stringify(annotation));
    res.flagged = false;
    res.id = annotationId;
    const annotationString = makeAnnotationString(annotation, plugin);

    const tfile = vault.getAbstractFileByPath(annotationFilePath);
    if (tfile instanceof TFile) {
        let text = await vault.read(tfile);
        let didReplace = false;
        const regex = makeAnnotationBlockRegex(annotationId);
        text = text.replace(regex, () => {
            didReplace = true;
            return annotationString;
        });
        if (!didReplace) {
            text = `${text}\n${annotationString}`;
        }
        vault.modify(tfile, text);
    } else {
        vault.create(annotationFilePath, annotationString);
    }
    return res;
}

export async function loadAnnotations(url: URL, vault: Vault, annotationFilePath: string): Promise<AnnotationList> {
    const params = Object.fromEntries(url.searchParams.entries());
    if (params.uri == 'app://obsidian.md/index.html') {
        return { rows: [], total: 0 };
    }

    const tfile = vault.getAbstractFileByPath(annotationFilePath);
    const rows = [];

    const annotationRegex = makeAnnotationBlockRegex();
    if (tfile instanceof TFile) {
        const text = await vault.read(tfile);
        let m: RegExpExecArray;
        while ((m = annotationRegex.exec(text)) !== null) {
            if (m.index === annotationRegex.lastIndex) {
                annotationRegex.lastIndex++;
            }
            const {
                groups: { annotationBlock, annotationId }
            } = m;
            const completeAnnotation = getAnnotationFromAnnotationBlock(annotationBlock, annotationId);
            const annotationDocumentIdentifiers = [
                completeAnnotation.document?.documentFingerprint,
                completeAnnotation.uri
            ];

            //The check against SAMPLE_PDF_URL is for backwards compability.
            if (
                annotationDocumentIdentifiers.includes(params.uri) ||
                annotationDocumentIdentifiers.includes(SAMPLE_PDF_URL)
            ) {
                rows.push(completeAnnotation);
            }
        }
    }
    return { rows, total: rows.length };
}

export async function deleteAnnotation(annotationId, vault: Vault, annotationFilePath: string) {
    const tfile = vault.getAbstractFileByPath(annotationFilePath);
    if (tfile instanceof TFile) {
        let text = await vault.read(tfile);
        let didReplace = false;
        const regex = makeAnnotationBlockRegex(annotationId);
        text = text.replace(regex, () => {
            didReplace = true;
            return '';
        });
        if (didReplace) {
            vault.modify(tfile, text);
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
