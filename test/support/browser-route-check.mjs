// Own fixture and fresh headless browser. No user tabs or Obsidian attachment.
import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.ANNOTATOR_PLAYWRIGHT_MODULE || 'playwright');
const out=process.argv[2];if(!out)throw Error('Pass a private evidence directory.');await mkdir(out,{recursive:true});
const entry=`import {LiveWebHost} from ${JSON.stringify(process.env.ANNOTATOR_LIVE_WEB_MODULE || './src/live-web.ts')};
const guest=document.createElement('div'),source=location.href,opened=[],captures=[];
guest.getURL=()=>location.href;guest.executeJavaScript=async code=>(0,eval)(code);
const foreign=new Highlight();CSS.highlights.set('fixture-foreign',foreign);
const host=new LiveWebHost({containerEl:document.body},guest,{capture:value=>captures.push(value),open:row=>opened.push(row.id),changed(){}});
host.setAnnotations([{id:'saved-route',text:'PRIVATE COMMENT MUST STAY OUT OF PAGE',tags:[],uri:source,target:[{source,selector:[{type:'TextQuoteSelector',exact:'AnchoredPassage'}]}]}]);
let serial=0;
const report=()=>{const agent=window.__obsidianAnnotatorRangeAgentV1;const rangeNames=[...CSS.highlights.keys()].filter(name=>name.startsWith('obsidian-annotator-'));document.querySelector('#report').textContent=JSON.stringify({serial:++serial,url:location.pathname,owner:agent?.owner||null,status:host.status('saved-route'),owned:rangeNames.map(name=>({name,ranges:[...CSS.highlights.get(name)].map(range=>({text:range.toString(),connected:range.startContainer.isConnected}))})),foreign:CSS.highlights.get('fixture-foreign')===foreign,opened,captures:captures.length});};
for(const id of ['depart','return','missed-depart','missed-return'])document.getElementById(id).onclick=async()=>{history.pushState({},'',id.endsWith('depart')?'/other':'/article');if(!id.startsWith('missed'))guest.dispatchEvent(new Event('did-navigate-in-page'));await host.capture();await new Promise(requestAnimationFrame);await new Promise(resolve=>setTimeout(resolve,800));report();};
document.querySelector('#inspect').onclick=report;document.querySelector('#controls').dataset.ready='yes';`;
const result=await build({stdin:{contents:entry,resolveDir:process.cwd(),sourcefile:'route-fixture.ts',loader:'ts'},bundle:true,format:'esm',platform:'browser',write:false});
const html='<!doctype html><html><head><title>Isolated native website route check</title><style>body{font:20px system-ui;margin:32px}p{padding:25px;border:1px solid #aaa}button{font:inherit;padding:10px;margin:6px}pre{font:14px monospace;white-space:pre-wrap}</style></head><body><h1>Native website route ownership</h1><p>Before <span id="anchor">AnchoredPassage</span> after.</p><div id="controls" data-obsidian-annotator-ui="fixture"><button id="inspect">Inspect</button><button id="depart">Leave source</button><button id="return">Return to source</button><button id="missed-depart">Leave without event</button><button id="missed-return">Return without event</button><pre id="report"></pre></div><script type="module" src="/fixture.js"></script></body></html>';
const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':'text/html');res.end(req.url==='/fixture.js'?result.outputFiles[0].contents:html);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1150,height:900}});await page.goto('http://127.0.0.1:'+server.address().port+'/article');await page.locator('#controls[data-ready=yes]').waitFor();await page.waitForTimeout(800);
 const observations={browser:browser.version()};
 const inspect=async(label,button='inspect')=>{const old=await page.locator('#report').textContent();await page.locator('#'+button).click();await page.waitForFunction(previous=>document.querySelector('#report').textContent!==previous,old);const value=JSON.parse(await page.locator('#report').textContent());observations[label]=value;await page.screenshot({path:out+'/'+label+'.png',fullPage:true});await writeFile(out+'/observations.json',JSON.stringify(observations,null,2));return value;};
 const initial=await inspect('01-initial');assert.equal(initial.owned.length,1);assert.equal(initial.status,'Highlight restored');
 let previous=initial;
 for(const [label,button] of [['02-departed','depart'],['03-returned','return'],['04-missed-departed','missed-depart'],['05-missed-returned','missed-return']]){
  const value=await inspect(label,button);assert.equal(value.foreign,true);assert.equal(value.captures,0);assert.deepEqual(value.opened,[]);
  if(button.endsWith('depart')){assert.deepEqual(value.owned,[]);assert.equal(value.owner,null);assert.match(value.status,/navigated/);}else{assert.equal(value.status,'Highlight restored');assert.equal(value.owned.length,1);assert.deepEqual(value.owned[0].ranges,[{text:'AnchoredPassage',connected:true}]);assert.notEqual(value.owner,previous.owner);previous=value;}
 }
 assert.doesNotMatch(await page.locator('body').textContent(),/PRIVATE COMMENT/);console.log('Real Chromium route departure, return and missed-event checks passed');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
