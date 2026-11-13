// compat/published/legacy-videoAnnotationUtils.tsx
var makeVideoAnnotationBlockRegex = (annotationId) => new RegExp(
  "(?<annotationBlock>^\n>\\s*?\\*\\*(?<title>.*)\\*\\*\\s*\\%\\%TIMESTAMP:(?<time>.*)\\%\\%\\s*(?<content>(\n>.*)*?))\n\\^(?<annotationId>" + (annotationId ?? "[a-zA-Z0-9]+") + ")\n",
  "gm"
);
var makeVideoAnnotationString = (annotation) => {
  const annotationString = ` **${annotation.title}** %%TIMESTAMP: ${annotation.start}%%
${annotation.content}`;
  return "\n" + annotationString.split("\n").map((x) => `>${x}`).join("\n") + "\n^" + annotation._id + "\n";
};
function getVideoAnnotationFromFileContent(annotationId, fileContent) {
  const annotationRegex = makeVideoAnnotationBlockRegex(annotationId);
  let m;
  if ((m = annotationRegex.exec(fileContent)) !== null) {
    if (m.index === annotationRegex.lastIndex) {
      annotationRegex.lastIndex++;
    }
    const {
      groups: { annotationId: annotationId2, time, title, content }
    } = m;
    return {
      readwiseId: "",
      content: content.trim().split("\n").map((x) => x.substr(1)).join("\n"),
      title,
      tags: [],
      _id: annotationId2,
      video: "620d5a42b9ab630009bf3e31",
      start: Number(time.trim()),
      user: "obsidianuser",
      updatedAt: JSON.parse(JSON.stringify(/* @__PURE__ */ new Date())),
      createdAt: JSON.parse(JSON.stringify(/* @__PURE__ */ new Date())),
      __v: 0
    };
  } else {
    return null;
  }
}
function writeVideoAnnotationToVideoAnnotationFileString(annotation, annotationFileString) {
  const annotationId = annotation._id ? annotation._id : Math.random().toString(36).substr(2);
  const res = JSON.parse(JSON.stringify(annotation));
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
      annotationFileString = `${annotationFileString}
${annotationString}`;
    }
    return { newVideoAnnotationFileString: annotationFileString, newVideoAnnotation: res };
  } else {
    return { newVideoAnnotationFileString: annotationString, newVideoAnnotation: res };
  }
}
function loadVideoAnnotationsAtUriFromFileText(url, fileText) {
  const params = url ? Object.fromEntries(url.searchParams.entries()) : null;
  if (params?.uri == "app://obsidian.md/index.html") {
    return [];
  }
  const rows = [];
  const annotationRegex = makeVideoAnnotationBlockRegex();
  if (fileText !== null) {
    let m;
    while ((m = annotationRegex.exec(fileText)) !== null) {
      if (m.index === annotationRegex.lastIndex) {
        annotationRegex.lastIndex++;
      }
      const {
        groups: { annotationId, time, title, content }
      } = m;
      const completeVideoAnnotation = {
        readwiseId: "",
        content: content.trim().split("\n").map((x) => x.substr(1)).join("\n"),
        title,
        tags: [],
        _id: annotationId,
        video: "620d5a42b9ab630009bf3e31",
        start: Number(time.trim()),
        user: "obsidianuser",
        updatedAt: JSON.parse(JSON.stringify(/* @__PURE__ */ new Date())),
        createdAt: JSON.parse(JSON.stringify(/* @__PURE__ */ new Date())),
        __v: 0
      };
      rows.push(completeVideoAnnotation);
    }
  }
  return rows;
}
function deleteVideoAnnotationFromVideoAnnotationFileString(annotationId, annotationFileString) {
  if (annotationFileString !== null) {
    let didReplace = false;
    const regex = makeVideoAnnotationBlockRegex(annotationId);
    annotationFileString = annotationFileString.replace(regex, () => {
      didReplace = true;
      return "";
    });
    if (didReplace) {
      return annotationFileString;
    }
  }
  return annotationFileString;
}
function checkPseudoVideoAnnotationEquality(annotation, pseudoVideoAnnotation) {
  return annotation.start == pseudoVideoAnnotation.start;
}
export {
  checkPseudoVideoAnnotationEquality,
  deleteVideoAnnotationFromVideoAnnotationFileString,
  getVideoAnnotationFromFileContent,
  loadVideoAnnotationsAtUriFromFileText,
  writeVideoAnnotationToVideoAnnotationFileString
};
