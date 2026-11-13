import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
import {embeddedVideo,BrowserVideo,EmbeddedYouTube} from './.generated/readers/embedded-video.js';
const id='M7lc1UVf-VE';
function host(){const dom=new JSDOM('<body><main></main></body>',{url:'app://obsidian.md/index.html'}),root=dom.window.document.querySelector('main'),statuses=[];return{dom,w:dom.window,root,statuses,status:s=>statuses.push(s)};}
function provider(){const h=host(),player=new EmbeddedYouTube(h.root,id,12.5,h.status),sent=[];player.element.contentWindow.postMessage=(text,origin)=>sent.push({data:JSON.parse(text),origin});player.element.dispatchEvent(new h.w.Event('load'));
 const send=(event,info,extra={})=>h.w.dispatchEvent(new h.w.MessageEvent('message',{origin:'https://www.youtube.com',source:player.element.contentWindow,data:JSON.stringify({id:sent[0].data.id,channel:'widget',event,info,...extra})}));
 return{...h,player,sent,send,ready(){send('initialDelivery',{duration:300,currentTime:12.5,videoData:{video_id:id,isLive:false}});},dispose(){player.dispose();h.dom.window.close();}};
}
test('provider frame stays inside the source pane and seeks only through identity-checked playback messages',async()=>{
 const h=provider();try{assert.equal(h.player.element.parentElement,h.root);assert.match(h.player.element.src,new RegExp('/embed/'+id));assert.equal(h.player.element.getAttribute('sandbox').includes('allow-top-navigation'),false);assert.equal(h.root.querySelector('script'),null);
 await assert.rejects(h.player.seek(20),/ready/);h.ready();assert.equal(h.player.time(),12.5);h.send('infoDelivery',{currentTime:null});assert.equal(h.player.time(),null);h.send('infoDelivery',{currentTime:400});assert.equal(h.player.time(),null);h.send('infoDelivery',{currentTime:12.5});const seek=h.player.seek(22.75);assert.deepEqual(h.sent.at(-1).data.args,[22.75,true]);assert.equal(h.sent.at(-1).data.func,'seekTo');assert.ok(!JSON.stringify(h.sent).includes('Private.md'));
 h.send('infoDelivery',{currentTime:22.6});assert.equal(await seek,22.6);assert.equal(h.player.time(),22.6);
 for(const invalid of [-1,Infinity,301])await assert.rejects(h.player.seek(invalid),/duration/);
 const pending=h.player.seek(40);h.player.dispose();await assert.rejects(pending,/closed/);assert.equal(h.root.children.length,0);
 }finally{h.dispose();}
});
test('wrong source/origin/channel/session are ignored and provider navigation/errors never seek another video',async()=>{
 const h=provider();try{
 const payload=JSON.stringify({id:h.sent[0].data.id,channel:'widget',event:'initialDelivery',info:{duration:300,currentTime:1,videoData:{video_id:id,isLive:false}}});
 h.w.dispatchEvent(new h.w.MessageEvent('message',{origin:'https://evil.example',source:h.player.element.contentWindow,data:payload}));h.w.dispatchEvent(new h.w.MessageEvent('message',{origin:'https://www.youtube.com',source:h.w,data:payload}));h.send('initialDelivery',{}, {id:'other'});assert.equal(h.player.time(),null);
 h.ready();const pending=h.player.seek(30);h.send('infoDelivery',{videoData:{video_id:'abcdefghijk'}});await assert.rejects(pending,/another video/);await assert.rejects(h.player.seek(20),/another video/);
 }finally{h.dispose();}
 const changed=provider();try{changed.ready();changed.player.element.src='https://example.org/';assert.equal(changed.player.time(),null);await assert.rejects(changed.player.seek(20),/ready/);}finally{changed.dispose();}
 const failed=provider();try{failed.ready();failed.send('onError',153);await assert.rejects(failed.player.seek(20),/identification/);assert.equal(failed.player.time(),null);}finally{failed.dispose();}
});
test('generic browser player retains fractional time and waits for a seek observation, not just an assignment',async()=>{
 const h=host(),player=new BrowserVideo(h.root,'https://example.org/movie.mp4',h.status);try{
 const video=player.element;Object.defineProperties(video,{readyState:{value:1},duration:{value:300},currentTime:{value:0,writable:true}});video.pause=()=>{};assert.equal(video.controls,true);assert.equal(player.time(),0);
 let landed=false;const pending=player.seek(12.75).then(time=>{landed=true;return time;});await Promise.resolve();assert.equal(landed,false);assert.equal(video.currentTime,12.75);video.dispatchEvent(new h.w.Event('seeked'));assert.equal(await pending,12.75);
 await assert.rejects(player.seek(301),/duration/);const cancel=player.seek(30);player.dispose();await assert.rejects(cancel,/closed/);
 }finally{player.dispose();h.dom.window.close();}
});
test('the player factory supports browser media and vault resources without external-page actions',()=>{
 const h=host();try{const remote=embeddedVideo(h.root,'https://example.org/movie.webm',()=>null,h.status);remote.element.pause=()=>{};assert.equal(remote.element.tagName,'VIDEO');remote.dispose();const local=embeddedVideo(h.root,'movie.mp4',()=> 'app://local/movie.mp4',h.status);local.element.pause=()=>{};assert.equal(local.element.getAttribute('src'),'app://local/movie.mp4');local.dispose();assert.throws(()=>embeddedVideo(h.root,'https://example.org/watch',()=>null,h.status),/no in-app/);assert.equal(h.root.querySelector('a'),null);}finally{h.dom.window.close();}
});


test('playback clock subscriptions emit only verified source time and stop after unsubscribe or disposal',()=>{
 const h=provider();try{const times=[],unsubscribe=h.player.subscribe(time=>times.push(time));assert.deepEqual(times,[null]);h.ready();assert.equal(times.at(-1),12.5);h.send('infoDelivery',{currentTime:14.125});assert.equal(times.at(-1),14.125);unsubscribe();const count=times.length;h.send('infoDelivery',{currentTime:15});assert.equal(times.length,count);
 const end=[];h.player.subscribe(time=>end.push(time));h.send('onError',100);assert.equal(end.at(-1),null);h.player.dispose();const stopped=end.length;h.send('infoDelivery',{currentTime:16});assert.equal(end.length,stopped);
 }finally{h.dispose();}
 const browser=host(),player=new BrowserVideo(browser.root,'https://example.org/movie.mp4',browser.status);try{const times=[],video=player.element;video.pause=()=>{};Object.defineProperties(video,{readyState:{value:1},duration:{value:300},currentTime:{value:5,writable:true}});const unsubscribe=player.subscribe(time=>times.push(time));assert.equal(times.at(-1),5);video.currentTime=6.5;video.dispatchEvent(new browser.w.Event('timeupdate'));assert.equal(times.at(-1),6.5);video.dispatchEvent(new browser.w.Event('error'));assert.equal(times.at(-1),null);video.dispatchEvent(new browser.w.Event('loadedmetadata'));assert.equal(times.at(-1),6.5);unsubscribe();const count=times.length;video.dispatchEvent(new browser.w.Event('timeupdate'));assert.equal(times.length,count);player.dispose();}finally{player.dispose();browser.dom.window.close();}
});


test('provider-neutral play and pause wait for observed state and cancel on replacement, source failure or close',async()=>{
 const h=provider();try{await assert.rejects(h.player.setPlaying(true),/ready/);h.ready();h.send('infoDelivery',{playerState:2});let resolved=false;const play=h.player.setPlaying(true).then(()=>{resolved=true;});assert.equal(h.sent.at(-1).data.func,'playVideo');h.send('onStateChange',3);await Promise.resolve();assert.equal(resolved,false);h.send('onStateChange',1);await play;assert.equal(resolved,true);
 const pause=h.player.setPlaying(false);assert.equal(h.sent.at(-1).data.func,'pauseVideo');h.send('onStateChange',2);await pause;await h.player.setPlaying(false);
 const first=h.player.setPlaying(true),firstRejected=assert.rejects(first,/replaced/);const replacement=h.player.setPlaying(false);h.send('onStateChange',2);await replacement;await firstRejected;
 const blocked=h.player.setPlaying(true);h.send('onAutoplayBlocked');await assert.rejects(blocked,/blocked playback/);
 const pending=h.player.setPlaying(true);h.send('infoDelivery',{videoData:{video_id:'abcdefghijk'}});await assert.rejects(pending,/another video/);
 }finally{h.dispose();}
 const closed=provider();try{closed.ready();const pending=closed.player.setPlaying(true);closed.player.dispose();await assert.rejects(pending,/closed/);}finally{closed.dispose();}
});
test('browser play/pause controls observe real media state and refuse changed sources after an asynchronous play',async()=>{
 const h=host(),player=new BrowserVideo(h.root,'https://example.org/movie.mp4',h.status);try{const video=player.element;let paused=true,finish;Object.defineProperties(video,{paused:{get:()=>paused},ended:{value:false}});video.pause=()=>{paused=true;video.dispatchEvent(new h.w.Event('pause'));};video.play=()=>new Promise(resolve=>{finish=()=>{paused=false;resolve();};});
 let resolved=false;const play=player.setPlaying(true).then(()=>{resolved=true;});await Promise.resolve();assert.equal(resolved,false);finish();await play;assert.equal(resolved,true);await player.setPlaying(false);assert.equal(paused,true);
 const changed=player.setPlaying(true);video.setAttribute('src','https://example.org/other.mp4');finish();await assert.rejects(changed,/source changed/);await assert.rejects(player.setPlaying(false),/source changed/);
 }finally{player.dispose();h.dom.window.close();}
});

test('opposite playback replacement cannot acknowledge itself with a pre-command cached state',async()=>{
 const h=provider();try{h.ready();h.send('onStateChange',2);const count=h.sent.length;await h.player.setPlaying(false);assert.equal(h.sent.length,count);
 const play=h.player.setPlaying(true),rejected=assert.rejects(play,/replaced/);let paused=false;const pause=h.player.setPlaying(false).then(()=>{paused=true;});await rejected;await Promise.resolve();assert.equal(paused,false);
 h.send('onStateChange',1);await Promise.resolve();assert.equal(paused,false);h.send('onStateChange',2);await pause;assert.equal(paused,true);
 h.send('onStateChange',1);const pauseCommand=h.player.setPlaying(false);const replaced=assert.rejects(pauseCommand,/replaced/);let playing=false;const last=h.player.setPlaying(true).then(()=>{playing=true;});await replaced;await Promise.resolve();assert.equal(playing,false);h.send('onStateChange',2);await Promise.resolve();assert.equal(playing,false);h.send('onStateChange',1);await last;assert.equal(playing,true);
 }finally{h.dispose();}
});

test('where YouTube refuses to play inside Obsidian for iOS, its place is taken by a message and a link out, and a note\'s time opens there; elsewhere the error is reported as before',async()=>{
 const at=url=>{const dom=new JSDOM('<body><main class="annotator-video-view"></main></body>',{url}),root=dom.window.document.querySelector('main'),statuses=[],opened=[];dom.window.open=(href,target)=>{opened.push([href,target]);return {};};
  const player=new EmbeddedYouTube(root,id,95.4,s=>statuses.push(s)),sent=[];player.element.contentWindow.postMessage=text=>sent.push(JSON.parse(text));player.element.dispatchEvent(new dom.window.Event('load'));
  const send=(event,info)=>dom.window.dispatchEvent(new dom.window.MessageEvent('message',{origin:'https://www.youtube.com',source:player.element.contentWindow,data:JSON.stringify({id:sent[0].id,channel:'widget',event,info})}));
  return{dom,root,player,statuses,opened,send};};
 // Obsidian for iOS serves its page from capacitor://, which gives YouTube no http(s) referrer.
 const ios=at('capacitor://localhost/index.html');
 try{
  assert.equal(ios.dom.window.location.protocol,'capacitor:');assert.equal(ios.player.elsewhere(10),null,'while the player may still work, nothing is opened elsewhere');
  ios.send('onError',153);
  const box=ios.root.querySelector('.annotator-video-unavailable');assert.ok(box);assert.equal(ios.root.querySelector('iframe'),null);assert.ok(ios.root.classList.contains('is-video-unavailable'));
  assert.equal(box.querySelector('p').textContent,'YouTube videos can’t play inside Obsidian on iOS. Your annotations are below.');
  const link=box.querySelector('a');assert.equal(link.textContent,'Open in YouTube');assert.equal(link.href,`https://www.youtube.com/watch?v=${id}&t=95s`);assert.equal(link.rel,'noopener noreferrer');
  // Only this video, at a time: a whole number of seconds, none for the start.
  assert.equal(ios.player.elsewhere(18.9),`https://www.youtube.com/watch?v=${id}&t=18s`);assert.equal(ios.player.elsewhere(0),`https://www.youtube.com/watch?v=${id}`);assert.equal(ios.player.elsewhere(NaN),`https://www.youtube.com/watch?v=${id}`);
  link.dispatchEvent(new ios.dom.window.MouseEvent('click',{bubbles:true,cancelable:true}));assert.deepEqual(ios.opened,[[`https://www.youtube.com/watch?v=${id}&t=95s`,'_blank']]);
  await assert.rejects(ios.player.seek(20));assert.equal(ios.player.time(),null);
 }finally{ios.player.dispose();ios.dom.window.close();}
 // The same refusal on a desktop page, and any other error on iOS, are errors of the player as before.
 for(const [url,code] of [['app://obsidian.md/index.html',153],['capacitor://localhost/index.html',100],['http://localhost/',153]]){
  const other=at(url);try{other.send('onError',code);assert.equal(other.root.querySelector('.annotator-video-unavailable'),null,`${url} ${code}`);assert.ok(other.root.querySelector('iframe'));assert.equal(other.player.elsewhere(10),null);assert.ok(other.statuses.length>0);}finally{other.player.dispose();other.dom.window.close();}
 }
});
