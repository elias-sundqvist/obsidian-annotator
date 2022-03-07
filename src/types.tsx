import { DarkReaderType } from 'darkreader';

export type AnnotationList = {
    total: number;
    rows: Annotation[];
};

export type Group = {
    id: string;
    groupid: string;
    name: string;
    links: unknown;
    organization: string | unknown;
    scopes: unknown;
    scoped: boolean;
    type: 'private' | 'restricted';
};

export type VideoAnnotation = {
    readwiseId: string;
    content: string;
    title: string;
    tags: string[];
    _id: string;
    video: string;
    start: number;
    user: 'obsidianuser';
    updatedAt: string;
    createdAt: string;
    __v: 0;
};

export type Annotation = {
    id: string;
    document: {
        title: string[];
        documentFingerprint?: string;
    };
    created: string;
    updated: string;
    user: string;
    uri: string;
    text: string;
    tags: string[];
    group: string;
    permissions: unknown;
    target: {
        source: string;
        selector: Selector[];
    }[];
    links: {
        html: string;
        incontext: string;
        json: string;
    };
    hidden: boolean;
    flagged: boolean;
    references: string[];
    user_info: {
        display_name: string;
    };
};

export type AnnotationCreationData = {
    created: string;
    updated: string;
    user: string;
    links: {
        html: string;
        incontext: string;
        json: string;
    };
    hidden: boolean;
    user_info: {
        display_name: string;
    };
    uri: string;
    document: {
        title: string[] | string;
    };
    text: string;
    tags: string[];
    group: string;
    permissions: unknown;
    target: {
        source: string;
        selector: Selector[];
    }[];
    references: string[];
};

export type Selector = TextPositionSelector | TextQuoteSelector | RangeSelector;

export type RangeSelector = {
    type: 'RangeSelector';
    endContainer: string;
    endOffset: number;
    startContainer: string;
    startOffset: number;
};

export type TextPositionSelector = {
    type: 'TextPositionSelector';
    start: number;
    end: number;
};

export type TextQuoteSelector = {
    type: 'TextQuoteSelector';
    exact: string;
    prefix: string;
    suffix: string;
};

export type GenericAnnotationProps = {
    annotationFile: string;
    containerEl: HTMLElement;
    onload: (iframe: HTMLIFrameElement) => Promise<void>;
    onDarkReadersUpdated: (darkReaderReferences: Set<WeakRef<DarkReaderType>>) => Promise<void>;
};

export type PdfAnnotationProps = GenericAnnotationProps & {
    pdf: string;
};

export type EpubAnnotationProps = GenericAnnotationProps & {
    epub: string;
};

export type VideoAnnotationProps = GenericAnnotationProps & {
    video: string;
};

export type WebAnnotationProps = GenericAnnotationProps & {
    url: string;
};

export type SpecificAnnotationProps =
    | PdfAnnotationProps
    | EpubAnnotationProps
    | VideoAnnotationProps
    | WebAnnotationProps;

export type LocalIFrameProps = {
    onIframePatch: (iframe: HTMLIFrameElement) => Promise<void>;
    onload: (iframe: HTMLIFrameElement) => Promise<void>;
    onDarkReadersUpdated: (darkReaderReferences: Set<WeakRef<DarkReaderType>>) => Promise<void>;
    src: string;
    proxy: (url: URL) => URL;
    fetchProxy: (args: {
        href: string;
        init?: RequestInit;
        contextUrl: string;
        base: (href: string) => Promise<Response>;
    }) => Promise<Response>;
    htmlPostProcessFunction?: (html: string) => string;
};
