// Synthetic merged table with native header associations and an open-ended row span.
import JSZip from 'jszip';
import {gridLayoutBook} from './grid-layout-fixture.mjs';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export async function tableLayoutBook(){
 const zip=await JSZip.loadAsync(await gridLayoutBook()),chapter=await zip.file('OPS/chapter.xhtml').async('string');
 zip.file('OPS/chapter.xhtml',chapter.replace(/<body[^>]*>[\s\S]*<\/body>/,'<body><h1>Merged table fidelity</h1><p>Header relationships and cell spans remain in the source document.</p><table><caption>Quarterly measurements</caption><colgroup><col/><col span="2"/></colgroup><thead><tr><th id="period" scope="col" rowspan="2" abbr="Period">Reporting period</th><th id="measurements" scope="colgroup" colspan="2">Measurements</th></tr><tr><th id="quantity" scope="col">Quantity</th><th id="quality" scope="col">Quality</th></tr></thead><tbody><tr><th id="q1" scope="row" rowspan="0">Q1</th><td headers="q1 quantity">42</td><td headers="q1 quality">Good</td></tr><tr><td headers="q1 quantity">43</td><td headers="q1 quality">Better</td></tr></tbody><tfoot><tr><td colspan="3">End of measurements</td></tr></tfoot></table></body>'));
 zip.file('OPS/layout.css','body{font-family:serif;color:#202020}h1{font-size:1.6em}table{border-collapse:collapse}caption{font-weight:bold;text-align:left;margin-block:10px}th,td{border:1px solid #3158bb;padding:8px;text-align:left}th{background:#e3edf8}td{background:white}');
 zip.forEach((_path,entry)=>{entry.date=new Date('2020-01-01T00:00:00Z');});
 return zip.generateAsync({type:'uint8array',compression:'STORE'});
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){if(!process.argv[2])throw new Error('Pass output .epub path');await writeFile(process.argv[2],await tableLayoutBook());}
