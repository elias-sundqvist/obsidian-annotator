import { VideoAnnotation } from 'types';

const makeVideoAnnotationBlockRegex = (annotationId?: string) =>
    new RegExp(
        '(?<annotationBlock>^\n>\\s*?\\*\\*(?<title>.*)\\*\\*\\s*\\%\\%TIMESTAMP:(?<time>.*)\\%\\%\\s*(?<content>(\n>.*)*?))\n\\^(?<annotationId>' +
            (annotationId ?? '[a-zA-Z0-9]+') +
            ')\n',
        'gm'
    );

const makeVideoAnnotationString = (annotation: VideoAnnotation) => {
    const annotationString = ` **${annotation.title}** %%TIMESTAMP: ${annotation.start}%%\n${annotation.content}`;

    return (
        '\n' +
        annotationString
            .split('\n')
            .map(x => `>${x}`)
            .join('\n') +
        '\n^' +
        annotation._id +
        '\n'
    );
};

export function getVideoAnnotationFromFileContent(annotationId: string, fileContent: string): VideoAnnotation {
    const annotationRegex = makeVideoAnnotationBlockRegex(annotationId);
    let m: RegExpExecArray;

    if ((m = annotationRegex.exec(fileContent)) !== null) {
        if (m.index === annotationRegex.lastIndex) {
            annotationRegex.lastIndex++;
        }
        const {
            groups: { annotationId, time, title, content }
        } = m;
        return {
            readwiseId: '',
            content: content
                .trim()
                .split('\n')
                .map(x => x.substr(1))
                .join('\n'),
            title,
            tags: [],
            _id: annotationId,
            video: '620d5a42b9ab630009bf3e31',
            start: Number(time.trim()),
            user: 'obsidianuser',
            updatedAt: JSON.parse(JSON.stringify(new Date())),
            createdAt: JSON.parse(JSON.stringify(new Date())),
            __v: 0
        };
    } else {
        return null;
    }
}

export function writeVideoAnnotationToVideoAnnotationFileString(
    annotation: VideoAnnotation,
    annotationFileString: string | null
): { newVideoAnnotationFileString: string; newVideoAnnotation: VideoAnnotation } {
    const annotationId = annotation._id ? annotation._id : Math.random().toString(36).substr(2);
    const res: VideoAnnotation = JSON.parse(JSON.stringify(annotation));
    res._id = annotationId;
    const annotationString = makeVideoAnnotationString(res);
    if (annotationFileString !== null) {
        let didReplace = false;
        const regex = makeVideoAnnotationBlockRegex(annotationId);
        annotationFileString = annotationFileString.replace(regex, () => {
            didReplace = true;
            return annotationString;
        });
        if (!didReplace) {
            annotationFileString = `${annotationFileString}\n${annotationString}`;
        }
        return { newVideoAnnotationFileString: annotationFileString, newVideoAnnotation: res };
    } else {
        return { newVideoAnnotationFileString: annotationString, newVideoAnnotation: res };
    }
}

export function loadVideoAnnotationsAtUriFromFileText(url: URL | null, fileText: string | null): VideoAnnotation[] {
    const params = url ? Object.fromEntries(url.searchParams.entries()) : null;
    if (params?.uri == 'app://obsidian.md/index.html') {
        return [];
    }

    const rows = [];

    const annotationRegex = makeVideoAnnotationBlockRegex();
    if (fileText !== null) {
        let m: RegExpExecArray;
        while ((m = annotationRegex.exec(fileText)) !== null) {
            if (m.index === annotationRegex.lastIndex) {
                annotationRegex.lastIndex++;
            }
            const {
                groups: { annotationId, time, title, content }
            } = m;
            const completeVideoAnnotation = {
                readwiseId: '',
                content: content
                    .trim()
                    .split('\n')
                    .map(x => x.substr(1))
                    .join('\n'),
                title,
                tags: [],
                _id: annotationId,
                video: '620d5a42b9ab630009bf3e31',
                start: Number(time.trim()),
                user: 'obsidianuser',
                updatedAt: JSON.parse(JSON.stringify(new Date())),
                createdAt: JSON.parse(JSON.stringify(new Date())),
                __v: 0
            };

            rows.push(completeVideoAnnotation);
        }
    }
    return rows;
}

export function deleteVideoAnnotationFromVideoAnnotationFileString(
    annotationId: string,
    annotationFileString: string | null
): string {
    if (annotationFileString !== null) {
        let didReplace = false;
        const regex = makeVideoAnnotationBlockRegex(annotationId);
        annotationFileString = annotationFileString.replace(regex, () => {
            didReplace = true;
            return '';
        });
        if (didReplace) {
            return annotationFileString;
        }
    }

    return annotationFileString;
}

export function checkPseudoVideoAnnotationEquality(
    annotation: VideoAnnotation,
    pseudoVideoAnnotation: VideoAnnotation
): boolean {
    return annotation.start == pseudoVideoAnnotation.start;
}
