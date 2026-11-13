import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {parseTranscript,transcriptVtt,youtubeTracks,loadYouTubeTranscript,transcriptSelection,transcriptClock} from './.generated/readers/video-transcript.js';
const id='M7lc1UVf-VE';
const page=tracks=>'var ytInitialPlayerResponse = '+JSON.stringify({videoDetails:{videoId:id},captions:{playerCaptionsTracklistRenderer:{captionTracks:tracks}}})+';';
const track=(language,kind)=>({baseUrl:`https://www.youtube.com/api/timedtext?v=${id}&lang=${language}`,languageCode:language,kind,name:{simpleText:language}});
test('VTT/SRT preserve fractional starts, Unicode and multiline text without executing caption markup',()=>{
 const cues=parseTranscript('\uFEFFWEBVTT\r\n\r\nNOTE note\r\nignored\r\n\r\nfirst\r\n00:12.500 --> 00:15.750 align:start\r\n<v Speaker>Hello &amp; <b>world</b>\r\nCafé 世界\r\n\r\n00:45.250 --> 00:47.000\r\nSecond passage\r\n','vtt');
 assert.deepEqual(cues,[{start:12.5,end:15.75,text:'Hello & world\nCafé 世界'},{start:45.25,end:47,text:'Second passage'}]);
 assert.equal(parseTranscript('1\n01:02:03,125 --> 01:02:04,250\nSRT passage\n','srt')[0].start,3723.125);
 for(const source of ['WEBVTT\n\n00:01.000 --> 00:00.000\nWrong','WEBVTT\n\n00:61.000 --> 01:03.000\nWrong','WEBVTT\n\nuntimed'])assert.throws(()=>parseTranscript(source,'vtt'));
 assert.throws(()=>parseTranscript('x'.repeat(5_000_001),'srt'),/limit/);
});
test('caption discovery checks exact video and endpoint, language selection prefers human captions and does not silently change languages',async()=>{
 const tracks=[track('en','asr'),track('sv'),track('en')];
 assert.equal(youtubeTracks(page(tracks),id).length,3);
 assert.throws(()=>youtubeTracks(page(tracks),'xxxxxxxxxxx'),/different video/);
 assert.equal(youtubeTracks(page([{...track('en'),baseUrl:'https://evil.test/api/timedtext?v='+id}]),id).length,0);
 const calls=[];const request=async url=>{calls.push(url);return calls.length===1?page(tracks):JSON.stringify({events:[{tStartMs:12500,dDurationMs:2500,segs:[{utf8:'Hello '},{utf8:'world'}]}]});};
 const result=await loadYouTubeTranscript('https://youtu.be/'+id,'en',request);assert.equal(result.cues[0].start,12.5);assert.equal(result.source,'YouTube · en');assert.equal(new URL(calls[1]).searchParams.get('fmt'),'json3');
 await assert.rejects(loadYouTubeTranscript('https://youtu.be/'+id,'de',async()=>page(tracks)),/Available languages/);
 let n=0;await assert.rejects(loadYouTubeTranscript('https://youtu.be/'+id,'en',async()=>++n===1?page(tracks):''),/empty response/);
 assert.throws(()=>parseTranscript('{"events":[{"tStartMs":0,"segs":[{"utf8":"x"}]}]}','json3'),/invalid timing/);
});
test('selection across passages excludes timestamp controls and preserves partial endpoints and first passage time',()=>{
 const dom=new JSDOM('<body><div id="root"><button>12.5 Go to timestamp</button><span data-transcript-cue="0">First passage text</span><button>20 Go to timestamp</button><span data-transcript-cue="1">Second passage text</span></div><p>Outside</p></body>'),doc=dom.window.document,root=doc.querySelector('#root'),nodes=root.querySelectorAll('span'),selection=doc.getSelection(),range=doc.createRange();
 range.setStart(nodes[0].firstChild,6);range.setEnd(nodes[1].firstChild,6);selection.addRange(range);
 const cues=[{start:12.5,end:15,text:'First passage text'},{start:20,end:25,text:'Second passage text'}];
 assert.deepEqual(transcriptSelection(root,selection,cues),{seconds:12.5,text:'passage text\nSecond'});
 range.setEnd(doc.querySelector('p').firstChild,2);selection.removeAllRanges();selection.addRange(range);assert.equal(transcriptSelection(root,selection,cues),null);dom.window.close();
});

test('fresh player metadata replaces empty watch-page URLs and requests JSON3 without duplicate format parameters',async()=>{
 const apiTrack={...track('en'),baseUrl:`https://www.youtube.com/api/timedtext?v=${id}&lang=en&fmt=srv3&signature=fresh`,name:{runs:[{text:'English'}]}};
 const calls=[];const request=async(url,options)=>{calls.push({url,options});if(calls.length===1)return page([{...track('en'),baseUrl:track('en').baseUrl+'&exp=xpe'}])+';ytcfg.set({"INNERTUBE_API_KEY":"public-page-key"});';if(calls.length===2)return JSON.stringify({playabilityStatus:{status:'OK'},videoDetails:{videoId:id},captions:{playerCaptionsTracklistRenderer:{captionTracks:[apiTrack]}}});return JSON.stringify({events:[{tStartMs:10349,dDurationMs:1000,segs:[{utf8:'Real-format passage'}]}]});};
 const result=await loadYouTubeTranscript('https://youtu.be/'+id,'en',request);assert.equal(result.cues[0].start,10.349);assert.equal(result.source,'YouTube · English');assert.equal(calls.length,3);assert.equal(calls[1].options.method,'POST');assert.equal(calls[1].options.contentType,'application/json');const body=JSON.parse(calls[1].options.body);assert.equal(body.videoId,id);assert.equal(body.context.client.clientName,'ANDROID');assert.equal(new URL(calls[1].url).pathname,'/youtubei/v1/player');const url=new URL(calls[2].url);assert.deepEqual(url.searchParams.getAll('fmt'),['json3']);assert.equal(url.searchParams.get('signature'),'fresh');assert.equal(url.searchParams.has('exp'),false);
});
test('player retrieval refuses restricted, mismatched and malformed metadata before fetching captions',async()=>{
 for(const response of [{playabilityStatus:{status:'LOGIN_REQUIRED'}},{videoDetails:{videoId:'xxxxxxxxxxx'}},'bad json']){let calls=0;await assert.rejects(loadYouTubeTranscript('https://youtu.be/'+id,'en',async()=>++calls===1?'"INNERTUBE_API_KEY":"key"':typeof response==='string'?response:JSON.stringify(response)),/unavailable|different video|invalid caption metadata/);assert.equal(calls,2);}
 assert.equal(youtubeTracks(page([{...track('en'),baseUrl:`https://www.youtube.com:8443/api/timedtext?v=${id}`}]),id).length,0);
});


test('transcript playback lookup chooses the latest active overlap and clears during gaps, at ends and for invalid clocks',()=>{
 const cues=[{start:0,end:20,text:'Long passage'},{start:3,end:5,text:'Short overlap'},{start:10,end:15,text:'Later overlap'},{start:25,end:30,text:'After gap'}],at=transcriptClock(cues);
 for(const [time,index] of [[null,-1],[-1,-1],[Infinity,-1],[0,0],[3,1],[5,0],[10,2],[15,0],[20,-1],[24.99,-1],[25,3],[30,-1]])assert.equal(at(time),index,String(time));
 const large=Array.from({length:10000},(_,index)=>({start:index*3,end:index*3+1,text:'cue'}));const lookup=transcriptClock(large);assert.equal(lookup(29997.5),9999);assert.equal(lookup(29999),-1);
});

test('offline VTT save/reparse preserves exact times and literal text including blank lines and markup',()=>{
 const cues=[{start:10.349,end:15.125,text:'Café <b>literal</b> &amp; 世界\n\n00:00.000 --> 00:01.000\nsecond line'},{start:360000.001,end:360002.999,text:'Long video'}];
 assert.deepEqual(parseTranscript(transcriptVtt(cues),'vtt'),cues);
 for(const cue of [{start:0.000001,end:1,text:'Precise'},{start:0,end:1,text:' padded '},{start:0,end:1,text:'nul\u0000text'}])assert.throws(()=>transcriptVtt([cue]),/precision|without changing/);
});

test('real-caption minute-boundary timings survive VTT save without floating-point drift',()=>{
 const cues=[{start:60.929,end:61.029,text:'Minute boundary'},{start:91.28,end:93.829,text:'What we are going to be covering\nis things that are'}];
 assert.deepEqual(parseTranscript(transcriptVtt(cues),'vtt'),cues);
 assert.equal(parseTranscript('WEBVTT\n\n01:00.929 --> 01:01.029\nMinute boundary\n','vtt')[0].start,60.929);
 assert.throws(()=>parseTranscript('WEBVTT\n\n9999999999999999:00:00.000 --> 9999999999999999:00:01.000\nToo long\n','vtt'),/precision/);
});

test('automatic JSON3 scrolling controls do not duplicate phrases or erase intentionally repeated words',()=>{
 // Envelope source-inspected from aircAruvnKk's public automatic English track;
 // substitute fixture prose, retaining window/append/timing/segment structure.
 const source=JSON.stringify({events:[
  {tStartMs:0,dDurationMs:1107920,id:1,wpWinPosId:1,wsWinStyleId:1},
  {tStartMs:4280,dDurationMs:4080,wWinId:1,segs:[{utf8:'Repeat'},{utf8:' this',tOffsetMs:480},{utf8:' phrase.',tOffsetMs:680}]},
  {tStartMs:6830,dDurationMs:1530,wWinId:1,aAppend:1,segs:[{utf8:'\n'}]},
  {tStartMs:6840,dDurationMs:4400,wWinId:1,segs:[{utf8:'Repeat'},{utf8:' this',tOffsetMs:200},{utf8:' phrase.',tOffsetMs:520}]},
  {tStartMs:8350,dDurationMs:2890,wWinId:1,aAppend:1,segs:[{utf8:'\n'}]},
  {tStartMs:8360,dDurationMs:4920,wWinId:1,segs:[{utf8:'Next'},{utf8:' passage',tOffsetMs:640}]},
 ]});
 const cues=parseTranscript(source,'json3');assert.deepEqual(cues,[{start:4.28,end:8.36,text:'Repeat this phrase.'},{start:6.84,end:11.24,text:'Repeat this phrase.'},{start:8.36,end:13.28,text:'Next passage'}]);
 assert.equal(transcriptClock(cues)(7),1,'latest phrase wins during rolling display overlap');assert.equal(transcriptClock(cues)(8.36),2);assert.deepEqual(parseTranscript(transcriptVtt(cues),'vtt'),cues,'offline save preserves intentional repetition and all exact cue times');
});

test('VTT cue identifiers beginning with the file signature are retained instead of silently treated as headers',()=>{
 const source='WEBVTT Caption export\nLanguage: en\n\nNOTE comment\nIgnored metadata\n\nSTYLE\n::cue { color: lime }\n\nREGION\nid:main\n\nWEBVTT-introduction\n00:00.000 --> 00:01.000\nFirst passage\n\nWEBVTT\n00:01.000 --> 00:02.000\nSecond passage\n\nNOTEbook\n00:02.000 --> 00:03.000\nThird passage\n';
 const cues=parseTranscript(source,'vtt');assert.deepEqual(cues,[{start:0,end:1,text:'First passage'},{start:1,end:2,text:'Second passage'},{start:2,end:3,text:'Third passage'}]);assert.deepEqual(parseTranscript(transcriptVtt(cues),'vtt'),cues);
});
