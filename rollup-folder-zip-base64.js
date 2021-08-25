import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

const importSuffix = "!zipBase64"; 

export default function zipBase64() {
  return {
    name: 'zip-base-64', // this name will show up in warnings and errors
    resolveId ( source ) {
      if (source.endsWith(importSuffix)) {
        return source; // this signals that rollup should not ask other plugins or check the file system to find this id
      }
      return null; // other ids should be handled as usually
    },
    async load ( id ) {
      if (id.endsWith(importSuffix)) {
        const folder = id.substr(0, id.length - importSuffix.length);
        const zip = getZipOfFolder(folder);
        const base64 = await zip.generateAsync({type: "base64"});
        return `export default "${base64}"`; // the source code for "virtual-module"
      }
      return null; // other ids should be handled as usually
    }
  };
}


const getFilePathsRecursively = (dir) => {

  // returns a flat array of absolute paths of all files recursively contained in the dir
  let results = [];
  let list = fs.readdirSync(dir);

  var pending = list.length;
  if (!pending) return results;

  for (let file of list) {
    file = path.resolve(dir, file);

    let stat = fs.lstatSync(file);

    if (stat && stat.isDirectory()) {
      results = results.concat(getFilePathsRecursively(file));
    } else {
      results.push(file);
    }

    if (!--pending) return results;
  }

  return results;
};

const getZipOfFolder = (dir) => {

  // returns a JSZip instance filled with contents of dir.

  let allPaths = getFilePathsRecursively(dir);

  let zip = new JSZip();
  for (let filePath of allPaths) {
    let addPath = slash(path.relative(dir, filePath)); // use this instead if you don't want the source folder itself in the zip
    let data = fs.readFileSync(filePath);
    let stat = fs.lstatSync(filePath);
    let permissions = stat.mode;

    if (stat.isSymbolicLink()) {
      zip.file(addPath, fs.readlinkSync(filePath), {
        unixPermissions: parseInt('120755', 8), // This permission can be more permissive than necessary for non-executables but we don't mind.
        dir: stat.isDirectory()
      });
    } else {
      zip.file(addPath, data, {
        unixPermissions: permissions,
        dir: stat.isDirectory()
      });
    }
  }

  return zip;
};

function slash(path) {
	const isExtendedLengthPath = /^\\\\\?\\/.test(path);
	const hasNonAscii = /[^\u0000-\u0080]+/.test(path); // eslint-disable-line no-control-regex

	if (isExtendedLengthPath || hasNonAscii) {
		return path;
	}

	return path.replace(/\\/g, '/');
}