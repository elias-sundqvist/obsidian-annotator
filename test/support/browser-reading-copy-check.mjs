// Isolated Chromium layout check of the actual chooser contents with a stub
// Modal lifecycle. This is not an Obsidian/device modal integration test.
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2];
if(!out || !process.env.PLAYWRIGHT_MODULE)throw new Error('Usage: PLAYWRIGHT_MODULE=/absolute/playwright/index.mjs node test/support/browser-reading-copy-check.mjs /absolute/evidence');
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
await mkdir(out,{recursive:true});
const html=`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/styles.css"><style>body{margin:0;background:#202020;color:#ddd;font:16px system-ui}main{margin:20px 16px}button{padding:8px;background:#363636;color:inherit;border:1px solid #777;border-radius:6px;font:inherit}h2{font-size:22px}</style><main></main><script type="module">
import {ReadingCopyModal,TFile} from '/boundary.mjs';
HTMLElement.prototype.createEl=function(tag,options={}){const el=document.createElement(tag);el.textContent=options.text||'';el.className=options.cls||'';this.append(el);return el};HTMLElement.prototype.addClass=function(...names){this.classList.add(...names)};HTMLElement.prototype.empty=function(){this.replaceChildren()};
const results=[];const modal=new ReadingCopyModal({},'https://example.org/article',[new TFile('Web snapshots/An older saved article.md'),new TFile('Web snapshots/A second copy with a deliberately long descriptive filename.md')],file=>results.push(file?.path??null));modal.contentEl=document.querySelector('main');let closed=0;modal.close=()=>{closed++;modal.onClose()};modal.onOpen();const retired=[...document.querySelectorAll('button')];window.check=()=>{retired[0].click();retired[2].click();return{results,closed}};document.body.dataset.ready='yes';</script>`;
const server=createServer(async(req,res)=>{try{const file=req.url==='/boundary.mjs'?'test/.generated/plugin-boundary.mjs':req.url==='/styles.css'?'styles.css':null;res.setHeader('Content-Type',file?.endsWith('.mjs')?'text/javascript':file?'text/css':'text/html');res.end(file?await readFile(file):html);}catch(error){res.statusCode=500;res.end(String(error));}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('body[data-ready=yes]').waitFor();
 const layout=await page.locator('main').evaluate(el=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,buttons:[...el.querySelectorAll('button')].map(b=>({text:b.textContent,height:b.getBoundingClientRect().height,width:b.getBoundingClientRect().width}))}));
 assert.ok(layout.scrollWidth<=layout.width);assert.equal(layout.buttons.length,3);for(const b of layout.buttons)assert.ok(b.height>=44);
 await page.screenshot({path:out+'/chooser-phone.png',fullPage:true});
 await page.getByRole('button',{name:'Web snapshots/A second copy with a deliberately long descriptive filename.md',exact:true}).click();
 const result=await page.evaluate(()=>window.check());assert.deepEqual(result.results,['Web snapshots/A second copy with a deliberately long descriptive filename.md']);assert.equal(result.closed,1);
 await writeFile(out+'/browser-audit.json',JSON.stringify({browser:browser.version(),layout,...result,limits:'Production chooser contents/CSS in fresh Chromium with fake Modal lifecycle; not actual Obsidian focus management or Android touch.'},null,2)+'\n');console.log('Phone layout, selection and retired-control checks passed.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
