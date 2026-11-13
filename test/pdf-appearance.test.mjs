import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {PdfAppearance} from './.generated/readers/pdf-appearance.js';
const defaults={readingMode:'scroll',fontSize:100,theme:'system',brightness:100,contrast:100,sepia:0};
function host(){const dom=new JSDOM('<body><aside>Unrelated UI</aside><main><div class="pdf-container"><div class="pdfViewer"><div class="page"><div class="canvasWrapper"><canvas></canvas></div><div class="textLayer"><span>Retained passage</span></div><div class="annotator-native-marks">Highlight</div></div></div></div></main></body>'),root=dom.window.document.querySelector('main'),container=root.querySelector('.pdf-container'),calls=[];let core={pageBackground:null,pageInvert:false,dom:{pdfContainerEl:container},setBackground(background,invert){calls.push([background,invert]);this.pageBackground=background;this.pageInvert=invert;}},preferences={...defaults},nativeRefresh=0;const appearance=new PdfAppearance(root,()=>core,()=>preferences,()=>nativeRefresh++);return{dom,root,container,calls,appearance,preferences,get core(){return core;},set core(value){core=value;},get nativeRefresh(){return nativeRefresh;},close(){appearance.dispose();dom.window.close();}};}
test('native PDF theme uses renderer background/inversion once and filters only canvas presentation',()=>{
 const h=host();try{const text=h.root.querySelector('.textLayer span').firstChild,selection=h.dom.window.document.getSelection(),range=h.dom.window.document.createRange();range.selectNodeContents(text);selection.addRange(range);const before=h.root.textContent;
 h.appearance.refresh();assert.deepEqual(h.calls,[]);assert.equal(h.root.style.cssText,'');h.preferences.theme='dark';h.preferences.brightness=145;h.preferences.contrast=85;h.preferences.sepia=12;h.appearance.refresh();assert.deepEqual(h.calls,[['#202020',true]]);assert.ok(h.container.classList.contains('mod-themed'));assert.equal(h.root.style.getPropertyValue('--annotator-pdf-adjustments'),'brightness(145%) contrast(85%) sepia(12%)');h.appearance.refresh();assert.equal(h.calls.length,1);
 assert.equal(h.root.querySelector('.textLayer span').firstChild,text);assert.equal(selection.toString(),'Retained passage');assert.equal(h.root.textContent,before);assert.equal(h.root.querySelector('.annotator-native-marks').style.filter,'');assert.equal(h.root.style.filter,'');
 h.preferences.theme='light';h.appearance.refresh();assert.deepEqual(h.calls.at(-1),['#ffffff',false]);assert.equal(h.container.classList.contains('mod-themed'),false);assert.equal(h.root.style.cssText,'');h.preferences.theme='sepia';h.appearance.refresh();assert.deepEqual(h.calls.at(-1),['#f4ecd8',false]);
 h.preferences.theme='system';h.appearance.refresh();assert.deepEqual(h.calls.at(-1),[null,false]);assert.equal(h.nativeRefresh,1);assert.equal(h.root.className,'');assert.equal(h.appearance.error,'');
 }finally{h.close();}
});
test('native PDF appearance restores owned state, keeps external changes and follows current native restoration',()=>{
 const h=host();try{h.core.pageBackground='#eeeeee';h.root.style.setProperty('--annotator-pdf-adjustments','contrast(92%)','important');const priority=h.root.style.getPropertyPriority('--annotator-pdf-adjustments');h.root.classList.add('other-plugin');h.preferences.theme='dark';h.preferences.brightness=130;h.appearance.refresh();h.core.pageBackground='#333333';h.core.pageInvert=true;h.appearance.refresh();h.preferences.theme='system';h.preferences.brightness=100;h.appearance.refresh();assert.deepEqual(h.calls.at(-1),['#333333',true]);assert.equal(h.nativeRefresh,1);assert.equal(h.root.style.getPropertyValue('--annotator-pdf-adjustments'),'contrast(92%)');assert.equal(h.root.style.getPropertyPriority('--annotator-pdf-adjustments'),priority);assert.ok(h.root.classList.contains('other-plugin'));
 h.preferences.theme='dark';h.appearance.refresh();h.core.pageBackground='external';h.core.pageInvert=false;const count=h.calls.length;h.appearance.dispose();assert.equal(h.calls.length,count,'dispose does not overwrite an external native renderer change');assert.equal(h.core.pageBackground,'external');
 }finally{h.close();}
});
test('native PDF renderer swaps restore the old leaf engine and apply preferences when the new engine is ready',()=>{
 const h=host();try{h.preferences.theme='dark';h.preferences.brightness=140;h.appearance.refresh();const old=h.core;h.core=null;h.appearance.refresh();assert.equal(old.pageBackground,null);assert.equal(old.pageInvert,false);assert.equal(h.root.style.cssText,'');assert.equal(h.nativeRefresh,0,'do not refresh an unrelated replacement renderer');
 const next={pageBackground:'#fff',pageInvert:false,dom:{pdfContainerEl:h.container},setBackground(bg,invert){this.pageBackground=bg;this.pageInvert=invert;}};h.core=next;h.appearance.refresh();assert.equal(next.pageBackground,'#202020');h.appearance.dispose();assert.equal(next.pageBackground,'#fff');assert.equal(h.root.style.cssText,'');assert.equal(h.nativeRefresh,1);
 }finally{h.close();}
});
test('system mode leaves native page colors alone and applies numeric adjustments only to an already inverted native page',()=>{
 const h=host();try{h.preferences.brightness=135;h.appearance.refresh();assert.deepEqual(h.calls,[]);assert.equal(h.root.style.cssText,'');h.core.pageInvert=true;h.appearance.refresh();assert.equal(h.root.style.getPropertyValue('--annotator-pdf-adjustments'),'brightness(135%) contrast(100%) sepia(0%)');assert.deepEqual(h.calls,[]);h.core.pageInvert=false;h.appearance.refresh();assert.equal(h.root.style.cssText,'');assert.equal(h.nativeRefresh,0);
 }finally{h.close();}
});
test('missing or throwing native PDF appearance capabilities cannot throw through annotation lifecycle or loop redraws',()=>{
 const h=host();try{h.preferences.theme='dark';h.core.setBackground=undefined;h.appearance.refresh();assert.match(h.appearance.error,/unavailable/);assert.deepEqual(h.calls,[]);let attempts=0;h.core.setBackground=()=>{attempts++;throw Error('Renderer destroyed');};h.appearance.refresh();h.appearance.refresh();assert.equal(attempts,1);assert.match(h.appearance.error,/could not apply/);h.appearance.dispose();assert.equal(h.root.style.cssText,'');
 }finally{h.close();}
});

test('unmodified native matches do not retain stale baselines across later system-theme changes',()=>{
 const h=host();try{h.core.pageBackground='#202020';h.core.pageInvert=true;h.container.classList.add('mod-themed');h.preferences.theme='dark';h.appearance.refresh();assert.deepEqual(h.calls,[]);h.preferences.theme='system';h.appearance.refresh();h.core.pageBackground='#ffffff';h.core.pageInvert=false;h.container.classList.remove('mod-themed');h.preferences.theme='dark';h.appearance.refresh();h.preferences.theme='system';h.appearance.refresh();assert.deepEqual(h.calls.at(-1),['#ffffff',false]);
 }finally{h.close();}
});
test('canvas cleanup retains newly observed external custom-property values without leaking its class',()=>{
 const h=host();try{h.preferences.theme='dark';h.preferences.brightness=130;h.appearance.refresh();h.root.style.setProperty('--annotator-pdf-adjustments','contrast(88%)');h.preferences.brightness=140;h.appearance.refresh();h.appearance.dispose();assert.equal(h.root.style.getPropertyValue('--annotator-pdf-adjustments'),'contrast(88%)');assert.equal(h.root.classList.contains('annotator-pdf-appearance'),false);
 }finally{h.close();}
});

test('optional native DOM metadata and non-confirming setters cannot cause a periodic redraw loop',()=>{
 const h=host();try{h.core.dom=undefined;h.preferences.theme='dark';h.appearance.refresh();h.appearance.refresh();assert.equal(h.calls.length,1);assert.equal(h.appearance.error,'');h.preferences.theme='light';let attempts=0;h.core.setBackground=()=>attempts++;h.appearance.refresh();h.appearance.refresh();assert.equal(attempts,1);assert.match(h.appearance.error,/could not apply/);
 }finally{h.close();}
});
test('Auto follows the app: a dark theme darkens the page in that theme, a light one hands the page back; ink is told which page it is on',()=>{
 const h=host();try{const body=h.dom.window.document.body;
  h.appearance.refresh();assert.deepEqual(h.calls,[]);assert.equal(h.root.dataset.annotatorPage,'light');
  body.classList.add('theme-dark');h.appearance.refresh();assert.deepEqual(h.calls.at(-1),['#202020',true]);assert.ok(h.container.classList.contains('mod-themed'));assert.equal(h.root.dataset.annotatorPage,'dark');
  // The theme's own surface colour is used when it has one.
  h.root.style.setProperty('--background-primary','#1c1c1c');h.appearance.refresh();assert.deepEqual(h.calls.at(-1),['#1c1c1c',true]);h.root.style.removeProperty('--background-primary');
  // An explicit choice holds whatever the app does.
  h.preferences.theme='sepia';h.appearance.refresh();assert.deepEqual(h.calls.at(-1),['#f4ecd8',false]);assert.equal(h.root.dataset.annotatorPage,'light');
  // The paper is a styling variable: set to parchment, the PDF page takes it; nonsense is not passed to the renderer.
  h.root.style.setProperty('--annotator-paper','#e8dcc0');h.appearance.refresh();assert.deepEqual(h.calls.at(-1),['#e8dcc0',false]);
  h.root.style.setProperty('--annotator-paper','url(x)');h.appearance.refresh();assert.deepEqual(h.calls.at(-1),['#f4ecd8',false]);h.root.style.removeProperty('--annotator-paper');h.appearance.refresh();
  h.preferences.theme='system';body.classList.remove('theme-dark');h.appearance.refresh();assert.deepEqual(h.calls.at(-1),[null,false]);assert.equal(h.container.classList.contains('mod-themed'),false);assert.equal(h.root.dataset.annotatorPage,'light');
  h.appearance.dispose();assert.equal(h.root.hasAttribute('data-annotator-page'),false);
 }finally{h.close();}
});

test('a dark page with its pictures darkened too is the light page turned as a whole: the renderer stays light, the canvas is turned, and ink is told the page is dark',()=>{
 const h=host();try{
  h.preferences.theme='dark';h.preferences.darkFigures=true;h.appearance.refresh();
  // The renderer is asked for white paper, not its own dark; nothing is marked as themed.
  assert.deepEqual(h.calls,[['#ffffff',false]]);assert.equal(h.container.classList.contains('mod-themed'),false);
  assert.equal(h.root.style.getPropertyValue('--annotator-pdf-adjustments'),'invert(0.89) hue-rotate(180deg)');assert.equal(h.root.dataset.annotatorPage,'dark');assert.equal(h.root.dataset.annotatorFigures,'turned');assert.ok(h.root.classList.contains('annotator-pdf-appearance'));
  // Only the page's pixels are turned: the text layer and the marks over it are as they were.
  assert.equal(h.root.querySelector('.annotator-native-marks').style.filter,'');assert.equal(h.root.style.filter,'');
  // The reader's own adjustments follow the turn.
  h.preferences.brightness=120;h.preferences.contrast=90;h.appearance.refresh();assert.equal(h.root.style.getPropertyValue('--annotator-pdf-adjustments'),'invert(0.89) hue-rotate(180deg) brightness(120%) contrast(90%) sepia(0%)');
  // Without the option the renderer's own dark is used again, pictures left as they are.
  h.preferences.darkFigures=false;h.preferences.brightness=100;h.preferences.contrast=100;h.appearance.refresh();assert.deepEqual(h.calls.at(-1),['#202020',true]);assert.equal(h.root.dataset.annotatorFigures,undefined);assert.equal(h.root.dataset.annotatorPage,'dark');assert.equal(h.root.style.getPropertyValue('--annotator-pdf-adjustments'),'');
  // The option says nothing on a light or sepia page, and Auto follows the app with it.
  h.preferences.darkFigures=true;h.preferences.theme='sepia';h.appearance.refresh();assert.deepEqual(h.calls.at(-1),['#f4ecd8',false]);assert.equal(h.root.dataset.annotatorFigures,undefined);assert.equal(h.root.dataset.annotatorPage,'light');
  h.preferences.theme='system';h.dom.window.document.body.classList.add('theme-dark');h.appearance.refresh();assert.deepEqual(h.calls.at(-1),['#ffffff',false]);assert.equal(h.root.dataset.annotatorFigures,'turned');
  h.dom.window.document.body.classList.remove('theme-dark');h.appearance.refresh();assert.equal(h.root.dataset.annotatorFigures,undefined);
  // Leaving hands everything back.
  h.appearance.dispose();assert.equal(h.root.dataset.annotatorFigures,undefined);assert.equal(h.root.dataset.annotatorPage,undefined);assert.equal(h.root.style.getPropertyValue('--annotator-pdf-adjustments'),'');
 }finally{h.close();}
});
