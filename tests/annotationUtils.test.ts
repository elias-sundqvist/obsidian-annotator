import fs from "fs";
import path from "path";
import { IHasAnnotatorSettings } from "settings";
import * as annotationUtils from "../src/annotationUtils";
import { Annotation } from '../src/types';

const testAnnotatorSettings: IHasAnnotatorSettings = {
    settings: {
        deafultDarkMode: false,
        darkReaderSettings: null,
        debugLogging: false,
        customDefaultPath: null,
        epubSettings: {
            readingMode: "scroll",
            fontSize: 16
        },
        annotationMarkdownSettings: {
            annotationModeByDefault: true,
            includePostfix: true,
            includePrefix: true,
            highlightHighlightedText: true
        }
    }
}

function loadMd(mdfile: string) {
    const mdTestFilePath = path.join(__dirname, "./", mdfile);
    return fs.readFileSync(mdTestFilePath, {encoding: "utf8"}).replaceAll('\r\n','\n');
}

function loadJson(jsonfile: string) {
    const jsonTestFilePath = path.join(__dirname, "./", jsonfile);
    return fs.readFileSync(jsonTestFilePath, {encoding: "utf8"});
}


test("AnnotationShouldBeCorrectlyParsed", ()=>{
    const mdTestFile = loadMd("testfile.md");
    const jsonTestFile = loadJson("testfile.json");
    const loadedAnnotations = annotationUtils.loadAnnotationsAtUriFromFileText(null, mdTestFile);
    expect(JSON.parse(jsonTestFile)).toEqual(loadedAnnotations);
})

test("AnnotationsCanBeModified", ()=>{
    const mdTestFile = loadMd("testfile2.md");
    const loadedAnnotations = annotationUtils.loadAnnotationsAtUriFromFileText(null, mdTestFile);
    const modifiedAnnotation: Annotation = {...JSON.parse(JSON.stringify(loadedAnnotations.rows[0])), text: "this is a modified comment"};
    const res = annotationUtils.writeAnnotationToAnnotationFileString(modifiedAnnotation, mdTestFile, testAnnotatorSettings);
    const loadedModifiedAnnotations = annotationUtils.loadAnnotationsAtUriFromFileText(null, res.newAnnotationFileString);
    expect(loadedModifiedAnnotations.total).toEqual(loadedAnnotations.total);
    expect(loadedModifiedAnnotations.rows[0]).toEqual(modifiedAnnotation);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const drop1 = ([_, ...rest]: Annotation[])=>rest;
    expect(drop1(loadedAnnotations.rows)).toEqual(drop1(loadedModifiedAnnotations.rows));
})

test("AnnotationsCanBeAdded", ()=>{
    const mdTestFile = loadMd("testfile2.md");
    const loadedAnnotations = annotationUtils.loadAnnotationsAtUriFromFileText(null, mdTestFile);
    const newAnnotation: Annotation = {...JSON.parse(JSON.stringify(loadedAnnotations.rows[0])), id: 'anewid'};
    const res = annotationUtils.writeAnnotationToAnnotationFileString(newAnnotation, mdTestFile, testAnnotatorSettings);
    const loadedModifiedAnnotations = annotationUtils.loadAnnotationsAtUriFromFileText(null, res.newAnnotationFileString);
    expect(loadedModifiedAnnotations.total).toEqual(loadedAnnotations.total+1);
    expect(loadedModifiedAnnotations.rows).toEqual([...loadedAnnotations.rows, newAnnotation]);
})