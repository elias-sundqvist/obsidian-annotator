import fs from "fs";
import path from "path";
import * as annotationUtils from "../src/annotationUtils";

const mdTestFilePath = path.join(__dirname, "./", "testfile.md");
const mdTestFile = fs.readFileSync(mdTestFilePath, {encoding: "utf8"}).replaceAll('\r\n','\n');
const jsonTestFilePath = path.join(__dirname, "./", "testfile.json");
const jsonTestFile = fs.readFileSync(jsonTestFilePath, {encoding: "utf8"});

test("AnnotationShouldBeCorrectlyParsed", ()=>{
    const loadedAnnotations = annotationUtils.loadAnnotationsAtUriFromFileText(null, mdTestFile)
    expect(JSON.parse(jsonTestFile)).toEqual(loadedAnnotations);
})