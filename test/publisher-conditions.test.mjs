import test from 'node:test';
import assert from 'node:assert/strict';
import {publisherCondition,publisherConditions} from './.generated/readers/publisher-conditions.js';
const env={width:800,height:600,pixelRatio:2,theme:'light'};
const media=(text,environment=env)=>publisherCondition({kind:'media',text},environment);
test('media dimensions, orientation, aspect ratio and resolution use reader geometry',()=>{
 for(const query of ['screen','all','not print','screen and (min-width: 40em)','(width:800px)','(height:600px)','(400px < width <= 800px)','(width >= 800px)','(orientation:landscape)','(aspect-ratio:4/3)','(min-resolution:192dpi)','(width)'])assert.equal(media(query),true,query);
 for(const query of ['print','not screen','(min-width:801px)','(max-height:599px)','(orientation:portrait)','(width > 800px)','(resolution:1dppx)'])assert.equal(media(query),false,query);
 assert.equal(media('(orientation:portrait)',{...env,width:600,height:800}),true);
});
test('nested media boolean logic and comma alternatives preserve unknown conditions',()=>{
 assert.equal(media('print, (max-width:900px)'),true);assert.equal(media('((width > 900px) or (height > 500px))'),true);assert.equal(media('not (width > 900px)'),true);
 assert.equal(media('not (unknown-feature:unknown)'),null);assert.equal(media('(width > 900px) and (unknown-feature:unknown)'),false);assert.equal(media('(width > 900px) or (unknown-feature:unknown)'),null);
 assert.equal(media('(prefers-color-scheme:dark)'),false);assert.equal(media('(prefers-color-scheme:dark)',{...env,theme:'dark'}),true);
 const seen=[];assert.equal(media('(hover:hover)',{...env,feature:q=>{seen.push(q);return true;}}),true);assert.deepEqual(seen,['(hover:hover)']);
 assert.equal(media('(min-width:1unsupported-unit)'),null);
 assert.equal(publisherConditions([{kind:'media',text:'print'},{kind:'supports',text:'(color:red)'}],env),false);
});
test('supports conditions use the host parser without installing styles or accepting unavailable evaluation',()=>{
 let seen;assert.equal(publisherCondition({kind:'supports',text:'(font-style:italic)'},{...env,supports:query=>{seen=query;return true;}}),true);assert.equal(seen,'(font-style:italic)');assert.equal(publisherCondition({kind:'supports',text:'(color:red)'},env),null);
 assert.equal(media('('.repeat(10001)),null);
});
