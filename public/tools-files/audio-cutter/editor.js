// INPUT Audio Cutter (the tools/audio-cutter page). The OGG encoder's address comes from the page's
// data-ogg-wasm, so it works wherever the site is hosted.
let oggWasmPromise=null;
function loadOggWasm(){if(!oggWasmPromise)oggWasmPromise=fetch(document.querySelector('[data-ogg-wasm]').dataset.oggWasm).then(r=>{if(!r.ok)throw Error('Cannot load OGG encoder ('+r.status+')');return r.arrayBuffer();}).then(b=>new Uint8Array(b)).catch(e=>{oggWasmPromise=null;throw e;});return oggWasmPromise;}
let exporting=false;
const ctx=new(window.AudioContext||window.webkitAudioContext)(),$=id=>document.getElementById(id);
let buffer=null,a=0,b=0,source=null,playingTrack=null,playStart=0,playEnd=0,playClock=0,raf=0,drag=null,listenAt=0,listenEnd=0,outputBuffer=null,outputClips=[],undoHistory=[],clipNo=1,currentName='Recording';
const views={source:{start:0,span:0},output:{start:0,span:0}};
const canvas=$('wave');
function stop(){if(source){source.onended=null;try{source.stop()}catch(e){}source=null;}cancelAnimationFrame(raf);playingTrack=null;draw();drawOutput();}
async function playAudio(audio,start,end,track){if(!audio||end-start<.005)return;stop();await ctx.resume();source=ctx.createBufferSource();source.buffer=audio;source.connect(ctx.destination);playStart=start;playEnd=end;playClock=ctx.currentTime;playingTrack=track;source.onended=()=>{source=null;playingTrack=null;cancelAnimationFrame(raf);draw();drawOutput();};source.start(0,start,end-start);frame();}
function frame(){draw();drawOutput();if(source)raf=requestAnimationFrame(frame);}
function constrain(){if(!buffer)return;a=Math.max(0,Math.min(buffer.duration,a));b=Math.max(a,Math.min(buffer.duration,b));listenAt=Math.max(0,Math.min(buffer.duration,listenAt));listenEnd=Math.max(listenAt,Math.min(buffer.duration,listenEnd));}
function clampView(kind){const audio=kind==='source'?buffer:outputBuffer,v=views[kind];if(!audio)return;v.span=Math.max(Math.min(.05,audio.duration),Math.min(audio.duration,v.span||audio.duration));v.start=Math.max(0,Math.min(audio.duration-v.span,v.start));}
function syncView(kind){const audio=kind==='source'?buffer:outputBuffer,v=views[kind];if(!audio)return;clampView(kind);$(kind+'-scroll').max=Math.max(0,audio.duration-v.span);$(kind+'-scroll').value=v.start;$(kind+'-scroll').disabled=v.span>=audio.duration;$(kind+'-view').textContent=v.start.toFixed(2)+'–'+(v.start+v.span).toFixed(2)+'s · '+(audio.duration/v.span).toFixed(1)+'×';}
function update(){if(!buffer)return;syncLinkedRanges();constrain();$('start').value=a.toFixed(3);$('end').value=b.toFixed(3);$('listen-at').value=listenAt.toFixed(3);$('listen-end').value=listenEnd.toFixed(3);$('listen-duration').textContent=(listenEnd-listenAt).toFixed(3)+' seconds to audition';$('listen-play').disabled=listenEnd-listenAt<.005;$('duration').textContent=(b-a).toFixed(3)+' seconds selected';const locked=$('lock-selection').checked;$('start').disabled=$('end').disabled=$('all').disabled=locked;$('lock-note').textContent=locked?'Selection locked · drag the blue listen range':'Selection unlocked';for(const id of ['save','save-ogg','save-mp3','copy-output'])$(id).disabled=exporting||b-a<.005;$('file').disabled=exporting;$('play').disabled=b-a<.005;syncView('source');updateOutputControls();updateCompactControls();draw();}
function plot(audio,element,kind){const g=element.getContext('2d'),w=element.clientWidth,h=element.clientHeight,dpr=devicePixelRatio||1;if(element.width!==Math.round(w*dpr)||element.height!==Math.round(h*dpr)){element.width=Math.round(w*dpr);element.height=Math.round(h*dpr);}g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);if(!audio){g.fillStyle='#a89c82';g.font='14px system-ui';g.fillText(kind==='source'?'Open an audio file to begin.':'Copy a cut here to build your track.',18,h/2);return;}clampView(kind);const v=views[kind],x=t=>(t-v.start)/v.span*w,top=24,bottom=h-28,mid=(top+bottom)/2,data=audio.getChannelData(0);g.strokeStyle='#3a2f1c';g.beginPath();g.moveTo(0,mid);g.lineTo(w,mid);g.stroke();
 if(kind==='output'){let t=0;outputClips.forEach((c,i)=>{const end=t+c.length/audio.sampleRate;g.fillStyle=i%2?'#234f7455':'#826d3844';g.fillRect(x(t),top,x(end)-x(t),bottom-top);g.fillStyle='#ead8ac';g.font='11px system-ui';if(x(end)>0&&x(t)<w)g.fillText('Part '+(i+1),Math.max(3,x(t)+5),15);g.strokeStyle='#8c7540';g.beginPath();g.moveTo(x(t),top);g.lineTo(x(t),bottom);g.stroke();t=end;});}
 g.strokeStyle='#b9ad92';g.beginPath();for(let px=0;px<w;px++){const first=Math.max(0,Math.floor((v.start+px/w*v.span)*audio.sampleRate)),last=Math.min(audio.length,Math.max(first+1,Math.ceil((v.start+(px+1)/w*v.span)*audio.sampleRate)));let lo=1,hi=-1;for(let i=first;i<last;i++){lo=Math.min(lo,data[i]);hi=Math.max(hi,data[i]);}g.moveTo(px,mid-hi*(bottom-top)/2*.9);g.lineTo(px,mid-lo*(bottom-top)/2*.9);}g.stroke();
 if(kind==='source'){g.fillStyle='#d8b95a22';g.fillRect(x(a),top,x(b)-x(a),bottom-top);g.strokeStyle='#d8b95a';g.lineWidth=2;for(const t of [a,b])if(x(t)>=0&&x(t)<=w){g.beginPath();g.moveTo(x(t),top);g.lineTo(x(t),bottom);g.stroke();g.fillStyle='#d8b95a';g.fillRect(x(t)-4,top,8,14);}g.fillStyle='#80b8e814';g.fillRect(x(listenAt),top,x(listenEnd)-x(listenAt),bottom-top);g.strokeStyle='#80b8e8';for(const t of [listenAt,listenEnd])if(x(t)>=0&&x(t)<=w){g.beginPath();g.moveTo(x(t),top);g.lineTo(x(t),bottom);g.stroke();g.fillStyle='#80b8e8';g.fillRect(x(t)-5,top-10,10,8);g.fillRect(x(t)-3,bottom-9,6,9);}}
 g.lineWidth=1;const rawStep=v.span/8,power=10**Math.floor(Math.log10(rawStep)),step=[1,2,5,10].find(n=>n*power>=rawStep)*power;g.font='11px system-ui';g.fillStyle='#b9ad92';for(let t=Math.ceil(v.start/step)*step;t<=v.start+v.span;t+=step)g.fillText(t.toFixed(step<1?2:1)+'s',Math.max(2,Math.min(w-45,x(t))),h-6);
 if(source&&playingTrack===kind){const t=Math.min(playEnd,playStart+ctx.currentTime-playClock);g.strokeStyle='#fff';g.beginPath();g.moveTo(x(t),top);g.lineTo(x(t),bottom);g.stroke();}}
function draw(){plot(buffer,canvas,'source');drawRangeLanes();}function drawOutput(){plot(outputBuffer,$('output-wave'),'output');}
function zoom(kind,factor,fit=false,all=false){const audio=kind==='source'?buffer:outputBuffer;if(!audio)return;const v=views[kind],center=kind==='source'&&a>=v.start&&b<=v.start+v.span&&b-a<v.span?(a+b)/2:v.start+v.span/2;v.span=all?audio.duration:fit&&kind==='source'?Math.min(audio.duration,Math.max(.05,(b-a)*1.2)):v.span/factor;v.start=all?0:(fit&&kind==='source'?(a+b)/2:center)-v.span/2;clampView(kind);syncView(kind);kind==='source'?draw():drawOutput();}
for(const kind of ['source','output']){for(const [suffix,factor]of [['in',2],['out',.5]])$(kind+'-zoom-'+suffix).onclick=()=>zoom(kind,factor);$(kind+'-zoom-all').onclick=()=>zoom(kind,1,false,true);$(kind+'-scroll').oninput=e=>{views[kind].start=Number(e.target.value);syncView(kind);kind==='source'?draw():drawOutput();};}
$('source-zoom-selection').onclick=()=>zoom('source',1,true);
async function load(data,name){stop();try{const decoded=await ctx.decodeAudioData(data);buffer=decoded;currentName=name;a=0;b=buffer.duration;listenAt=0;listenEnd=buffer.duration;views.source={start:0,span:buffer.duration};$('start').max=$('end').max=$('listen-at').max=$('listen-end').max=buffer.duration;$('lock-selection').checked=false;$('status').textContent='Ready · '+buffer.duration.toFixed(2)+' seconds · '+name;update();}catch(e){$('status').textContent='Could not decode this audio. Try WAV or MP3.';}}
$('play').onclick=()=>playAudio(buffer,a,b,'source');$('stop').onclick=stop;$('all').onclick=()=>{if($('lock-selection').checked)return;stop();a=0;b=buffer.duration;update();};
$('start').onchange=()=>{if($('lock-selection').checked)return;stop();a=Number($('start').value);if(a>b)b=a;update();};$('end').onchange=()=>{if($('lock-selection').checked)return;stop();b=Number($('end').value);if(b<a)a=b;update();};
$('lock-selection').onchange=()=>{drag=null;update();};$('listen-at').onchange=()=>{stop();listenAt=Number($('listen-at').value);if(listenAt>listenEnd)listenEnd=listenAt;update();};$('listen-end').onchange=()=>{stop();listenEnd=Number($('listen-end').value);if(listenEnd<listenAt)listenAt=listenEnd;update();};$('listen-play').onclick=()=>playAudio(buffer,listenAt,listenEnd,'source');
function time(e){const r=canvas.getBoundingClientRect(),v=views.source;return Math.max(0,Math.min(buffer.duration,v.start+(e.clientX-r.left)/r.width*v.span));}
canvas.onpointerdown=e=>{if(!buffer)return;stop();const t=time(e),threshold=12/canvas.clientWidth*views.source.span;
 if($('lock-selection').checked||$('listen-mode').checked){const mode=Math.abs(t-listenEnd)<threshold?'listen-end':Math.abs(t-listenAt)<threshold?'listen-start':'listen-new';drag={mode,anchor:t,pixel:e.clientX,moved:false};if(mode==='listen-new'){const duration=listenEnd-listenAt;listenAt=t;if(listenEnd<=t)listenEnd=Math.min(buffer.duration,t+Math.max(.05,duration));}canvas.setPointerCapture(e.pointerId);update();return;}
 drag=Math.abs(t-a)<threshold?{mode:'start'}:Math.abs(t-b)<threshold?{mode:'end'}:{mode:'new',anchor:t};if(drag.mode==='new'){a=t;b=t;}canvas.setPointerCapture(e.pointerId);update();};
canvas.onpointermove=e=>{if(!drag)return;const t=time(e);if(drag.mode.startsWith('listen-')){if(drag.mode==='listen-start')listenAt=Math.min(t,listenEnd);else if(drag.mode==='listen-end')listenEnd=Math.max(t,listenAt);else if(Math.abs(e.clientX-drag.pixel)>2||drag.moved){drag.moved=true;listenAt=Math.min(t,drag.anchor);listenEnd=Math.max(t,drag.anchor);}update();return;}if($('lock-selection').checked)return;if(drag.mode==='start')a=Math.min(t,b);else if(drag.mode==='end')b=Math.max(t,a);else{a=Math.min(t,drag.anchor);b=Math.max(t,drag.anchor);}update();};
canvas.onpointerup=()=>{const audition=drag?.mode.startsWith('listen-');drag=null;if(audition&&listenEnd-listenAt>=.005)playAudio(buffer,listenAt,listenEnd,'source');};canvas.onpointercancel=()=>{drag=null;};
$('file').onchange=async e=>{const f=e.target.files[0];if(f){$('name').value=f.name.replace(/\.[^.]+$/,'')+'-clip';await load(await f.arrayBuffer(),f.name);}};
function snapshot(){undoHistory.push(outputClips.map(c=>({...c})));if(undoHistory.length>50)undoHistory.shift();}
function rebuildOutput(){stop();if(!outputClips.length)outputBuffer=null;else{const n=outputClips.reduce((s,c)=>s+c.length,0),ch=Math.max(...outputClips.map(c=>Math.min(c.audio.numberOfChannels,2)));outputBuffer=ctx.createBuffer(ch,n,ctx.sampleRate);let offset=0;for(const c of outputClips){for(let j=0;j<ch;j++)outputBuffer.getChannelData(j).set(c.audio.getChannelData(Math.min(j,c.audio.numberOfChannels-1)).subarray(c.first,c.first+c.length),offset);offset+=c.length;}}views.output={start:0,span:outputBuffer?.duration||0};renderClips();updateOutputControls();drawOutput();}
function renderClips(){const list=$('output-parts');list.replaceChildren();outputClips.forEach((c,i)=>{const row=document.createElement('div');row.className='part';const text=document.createElement('span');text.textContent=(i+1)+'. '+c.name+' · '+(c.first/c.audio.sampleRate).toFixed(3)+'–'+((c.first+c.length)/c.audio.sampleRate).toFixed(3)+'s';row.append(text);for(const [label,action,disabled]of [['↑',()=>{snapshot();[outputClips[i-1],outputClips[i]]=[outputClips[i],outputClips[i-1]];rebuildOutput();},i===0],['↓',()=>{snapshot();[outputClips[i+1],outputClips[i]]=[outputClips[i],outputClips[i+1]];rebuildOutput();},i===outputClips.length-1],['Duplicate',()=>{snapshot();outputClips.splice(i+1,0,{...c});rebuildOutput();},false],['Remove',()=>{snapshot();outputClips.splice(i,1);rebuildOutput();},false]]){const bt=document.createElement('button');bt.textContent=label;bt.setAttribute('aria-label',label+' part '+(i+1));bt.disabled=disabled||exporting;bt.onclick=action;row.append(bt);}list.append(row);compactPartIcons(row);});}
function updateOutputControls(){const empty=!outputBuffer;$('output-duration').textContent=empty?'No parts copied yet':outputClips.length+' parts · '+outputBuffer.duration.toFixed(3)+' seconds'+(outputBuffer.duration>=30?' · Above the 30-second ringtone target':'');for(const id of ['output-play','output-wav','output-mp3','output-ogg','output-clear'])$(id).disabled=empty||exporting;$('output-undo').disabled=!undoHistory.length||exporting;syncView('output');}
$('copy-output').onclick=()=>{if(!buffer||b-a<.005||exporting)return;snapshot();const first=Math.floor(a*buffer.sampleRate),last=Math.min(buffer.length,Math.ceil(b*buffer.sampleRate));outputClips.push({audio:buffer,first,length:last-first,name:currentName});rebuildOutput();$('status').textContent='The cut is added to the end of your track. The recording is unchanged.';};
$('output-play').onclick=()=>playAudio(outputBuffer,0,outputBuffer.duration,'output');$('output-stop').onclick=stop;$('output-clear').onclick=()=>{snapshot();outputClips=[];rebuildOutput();};$('output-undo').onclick=()=>{if(undoHistory.length){outputClips=undoHistory.pop();rebuildOutput();}};
for(const format of ['wav','mp3','ogg'])$('output-'+format).onclick=()=>exportSelection(format,true);
$('save').onclick=()=>exportSelection('wav');$('save-mp3').onclick=()=>exportSelection('mp3');$('save-ogg').onclick=()=>exportSelection('ogg');
new ResizeObserver(()=>{draw();drawOutput();}).observe(canvas);
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','BUTTON','AUDIO','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();if(source)stop();else if($('listen-mode').checked||$('lock-selection').checked)$('listen-play').click();else $('play').click();}});
window.AudioCutterStudio={get selection(){return[a,b]},get listenRange(){return[listenAt,listenEnd]},get view(){return{...views.source}},get outputDuration(){return outputBuffer?.duration||0},get partCount(){return outputClips.length}};
updateOutputControls();drawOutput();

function wavBlob(audio,lo,hi){
 const first=Math.floor(lo*audio.sampleRate),last=Math.min(audio.length,Math.ceil(hi*audio.sampleRate)),n=last-first,ch=audio.numberOfChannels,sr=audio.sampleRate;
 const ab=new ArrayBuffer(44+n*ch*2),dv=new DataView(ab);function str(off,s){for(let i=0;i<s.length;i++)dv.setUint8(off+i,s.charCodeAt(i))}
 str(0,"RIFF");dv.setUint32(4,36+n*ch*2,true);str(8,"WAVE");str(12,"fmt ");dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,ch,true);dv.setUint32(24,sr,true);dv.setUint32(28,sr*ch*2,true);dv.setUint16(32,ch*2,true);dv.setUint16(34,16,true);str(36,"data");dv.setUint32(40,n*ch*2,true);
 const data=Array.from({length:ch},(_,i)=>audio.getChannelData(i)),fade=$("fade").checked?Math.min(Math.floor(sr*.005),Math.floor(n/2)):0;
 let off=44;for(let i=0;i<n;i++){const gain=fade?Math.min(1,i/fade,(n-1-i)/fade):1;for(let j=0;j<ch;j++){const v=Math.max(-1,Math.min(1,data[j][first+i]*gain));dv.setInt16(off,Math.round(v<0?v*32768:v*32767),true);off+=2}}
 return new Blob([ab],{type:"audio/wav"});
}

function showDownload(blob,name,length){
 const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=name;link.click();
 const row=document.createElement("div");row.className="clip";const label=document.createElement("span");label.textContent=name+" · "+length.toFixed(2)+"s";
 const audio=document.createElement("audio");audio.controls=true;audio.src=url;const again=document.createElement("a");again.href=url;again.download=name;again.textContent="Download";
 row.append(label,audio,again);$("clips").append(row);$("saved").hidden=false;$("status").textContent="Saved "+name+". Adjust the waveform for your next sound.";$("name").value="audio-clip-"+String(++clipNo).padStart(2,"0");
}
async function exportSelection(format,assembled=false){
 const audio=assembled?outputBuffer:buffer,lo=assembled?0:a,hi=assembled?(outputBuffer?.duration||0):b;
 if(!audio||hi-lo<.005||exporting)return;
 const length=hi-lo,name=($("name").value.trim()||"audio-clip").replace(/[^a-zA-Z0-9_-]/g,"-")+(assembled?"-output":"")+"."+format;
 if(format==="wav"){showDownload(wavBlob(audio,lo,hi),name,length);return}
 exporting=true;update();$("status").textContent="Encoding "+format.toUpperCase()+" locally…";
 try{
  const first=Math.floor(lo*audio.sampleRate),last=Math.min(audio.length,Math.ceil(hi*audio.sampleRate)),n=last-first,sr=audio.sampleRate,ch=audio.numberOfChannels;
  if(ch>2)throw Error("Compressed export supports mono or stereo recordings. WAV supports the current channel count.");
  const data=Array.from({length:ch},(_,i)=>audio.getChannelData(i).slice(first,last)),fade=$("fade").checked?Math.min(Math.floor(sr*.005),Math.floor(n/2)):0;
  if(fade)for(let j=0;j<ch;j++)for(let i=0;i<n;i++)data[j][i]*=Math.min(1,i/fade,(n-1-i)/fade);
  if(format==="mp3"){
   const encoder=new lamejs.Mp3Encoder(ch,sr,192),pcm=data.map(d=>Int16Array.from(d,v=>{v=Math.max(-1,Math.min(1,v));return Math.round(v<0?v*32768:v*32767)})),chunks=[];
   for(let offset=0;offset<n;offset+=1152){const left=pcm[0].subarray(offset,Math.min(n,offset+1152)),right=ch===2?pcm[1].subarray(offset,Math.min(n,offset+1152)):undefined,part=encoder.encodeBuffer(left,right);if(part.length)chunks.push(part.slice());if(offset% (1152*64)===0)await new Promise(resolve=>setTimeout(resolve,0));}
   const tail=encoder.flush();if(tail.length)chunks.push(tail.slice());showDownload(new Blob(chunks,{type:"audio/mpeg"}),name,length);return;
  }
  const wasm=await loadOggWasm();
  const encoder=await WasmMediaEncoder.createEncoder("audio/ogg",wasm);encoder.configure({sampleRate:sr,channels:ch,vbrQuality:5});
  const chunks=[];for(let offset=0;offset<n;offset+=16384){const part=encoder.encode(data.map(d=>d.subarray(offset,Math.min(n,offset+16384))));if(part.length)chunks.push(part.slice());await new Promise(resolve=>setTimeout(resolve,0));}
  const final=encoder.finalize();if(final.length)chunks.push(final.slice());
  showDownload(new Blob(chunks,{type:"audio/ogg"}),name,length);
 }catch(e){$("status").textContent=format.toUpperCase()+" export failed: "+e.message+" You can still download WAV.";}
 finally{exporting=false;update();}
}

const iconPaths={play:'<path d="m8 5 11 7-11 7Z"/>',stop:'<rect x="6" y="6" width="12" height="12" rx="1"/>',cut:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8.3 8 11 12M8.3 16 20 4"/>',headphones:'<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="12" width="4" height="8" rx="2"/><rect x="17" y="12" width="4" height="8" rx="2"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',unlock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 7.5-2M12 14v3"/>',plus:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M7 10h6M10 7v6"/>',minus:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M7 10h6"/>',fit:'<path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5M8 12h8"/>',selection:'<path d="M7 4H4v16h3M17 4h3v16h-3M9 8v8M12 5v14M15 9v6"/>',all:'<rect x="3" y="4" width="18" height="16" rx="2" stroke-dasharray="3 3"/><path d="m7 12 3 3 7-7"/>',folder:'<path d="M3 7V5h6l2 2h10v13H3Z"/><path d="M3 10h18"/>',append:'<path d="M12 3v12m-4-4 4 4 4-4M4 18v3h16v-3"/>',download:'<path d="M12 3v12m-4-4 4 4 4-4M4 18v3h16v-3"/>',undo:'<path d="m9 4-6 6 6 6M3 10h11a6 6 0 0 1 6 6v4"/>',trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',up:'<path d="m6 14 6-6 6 6"/>',down:'<path d="m6 10 6 6 6-6"/>',duplicate:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>'};
function icon(name){return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">'+(iconPaths[name]||iconPaths.play)+'</svg>';}
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
const compactIcons={play:'play',stop:'stop',all:'all','source-zoom-in':'plus','source-zoom-out':'minus','source-zoom-all':'fit','source-zoom-selection':'selection','listen-play':'play','output-play':'play','output-stop':'stop','output-undo':'undo','output-clear':'trash','output-zoom-in':'plus','output-zoom-out':'minus','output-zoom-all':'fit'};
for(const [id,name]of Object.entries(compactIcons))$(id).innerHTML=icon(name);
for(const id of ['save','save-mp3','save-ogg','output-wav','output-mp3','output-ogg'])$(id).insertAdjacentHTML('afterbegin',icon('download'));
function compactPartIcons(row){const map={'↑':'up','↓':'down',Duplicate:'duplicate',Remove:'trash'};for(const bt of row.querySelectorAll('button')){const text=bt.textContent;if(map[text]){bt.title=bt.getAttribute('aria-label');bt.innerHTML=icon(map[text]);}}}
function updateCompactControls(){const locked=$('lock-selection').checked;$('selection-length').value=(b-a).toFixed(3);$('listen-length').value=(listenEnd-listenAt).toFixed(3);$('selection-length').max=Math.max(0,buffer.duration-a);$('listen-length').max=Math.max(0,buffer.duration-listenAt);$('selection-length').disabled=locked;$('lock-icon').innerHTML=icon(locked?'lock':'unlock');$('lock-label').title=locked?'Unlock cut selection':'Lock cut selection';$('lock-selection').setAttribute('aria-label',locked?'Unlock cut selection':'Lock cut selection');}
function finiteField(id,fallback){const v=$(id).valueAsNumber;return Number.isFinite(v)?Math.max(0,v):fallback;}
$('start').onchange=()=>{if($('lock-selection').checked){update();return;}stop();const duration=b-a;a=Math.min(buffer.duration,finiteField('start',a));b=Math.min(buffer.duration,a+duration);update();};
$('end').onchange=()=>{if($('lock-selection').checked){update();return;}stop();b=Math.min(buffer.duration,finiteField('end',b));if(b<a)a=b;update();};
$('selection-length').onchange=()=>{if($('lock-selection').checked){update();return;}stop();b=Math.min(buffer.duration,a+finiteField('selection-length',b-a));update();};
$('listen-at').onchange=()=>{stop();const duration=listenEnd-listenAt;listenAt=Math.min(buffer.duration,finiteField('listen-at',listenAt));listenEnd=Math.min(buffer.duration,listenAt+duration);update();};
$('listen-end').onchange=()=>{stop();listenEnd=Math.min(buffer.duration,finiteField('listen-end',listenEnd));if(listenEnd<listenAt)listenAt=listenEnd;update();};
$('listen-length').onchange=()=>{stop();listenEnd=Math.min(buffer.duration,listenAt+finiteField('listen-length',listenEnd-listenAt));update();};
for(const [kind,el]of [['source',canvas],['source',$('listen-lane-top')],['source',$('cut-lane')],['output',$('output-wave')]])el.addEventListener('wheel',e=>{const audio=kind==='source'?buffer:outputBuffer;if(!audio)return;e.preventDefault();const v=views[kind],rect=el.getBoundingClientRect(),fraction=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?rect.height:1);if(e.shiftKey){v.start+=((delta||e.deltaX)/rect.width)*v.span;clampView(kind);}else{const anchor=v.start+fraction*v.span;v.span=Math.max(Math.min(.05,audio.duration),Math.min(audio.duration,v.span*Math.exp(Math.max(-1,Math.min(1,delta*.002)))));v.start=anchor-fraction*v.span;clampView(kind);}syncView(kind);kind==='source'?draw():drawOutput();},{passive:false});
// Both tracks keep their content and cut ranges unchanged when zooming or panning.

function drawRangeLanes(){for(const [id,kind,label]of [['listen-lane-top','listen','LISTEN'],['cut-lane','cut','CUT']]){const el=$(id);if(!el)continue;const g=el.getContext('2d'),w=el.clientWidth,h=el.clientHeight,dpr=devicePixelRatio||1;if(el.width!==Math.round(w*dpr)||el.height!==Math.round(h*dpr)){el.width=Math.round(w*dpr);el.height=Math.round(h*dpr);}g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);const locked=kind==='cut'&&$('lock-selection').checked,color=kind==='listen'?'#80b8e8':'#d8b95a';g.fillStyle=color;g.font='9px system-ui';g.fillText(label+(locked?' · LOCKED':''),5,10);g.fillStyle=kind==='listen'?'#80b8e814':'#d8b95a14';g.fillRect(0,14,w,h-16);if(!buffer)continue;const v=views.source,left=kind==='listen'?listenAt:a,right=kind==='listen'?listenEnd:b,x=t=>(t-v.start)/v.span*w;g.fillStyle=kind==='listen'?'#80b8e84d':'#d8b95a4d';g.fillRect(x(left),14,x(right)-x(left),h-16);g.strokeStyle=color;g.lineWidth=1;g.strokeRect(x(left),14,x(right)-x(left),h-16);g.fillStyle=color;for(const t of [left,right])if(x(t)>=0&&x(t)<=w)g.fillRect(x(t)-3,12,6,h-12);if(left>=v.start&&right<=v.start+v.span&&x(right)-x(left)>125){g.font='9px system-ui';g.fillText((right-left).toFixed(3)+'s',x(left)+10,h-5);}el.style.cursor=locked?'not-allowed':'ew-resize';}}
for(const [id,kind]of [['listen-lane-top','listen'],['cut-lane','cut']]){const el=$(id);let laneDrag=null;const at=e=>{const rect=el.getBoundingClientRect(),v=views.source;return Math.max(0,Math.min(buffer.duration,v.start+(e.clientX-rect.left)/rect.width*v.span));};
 el.onpointerdown=e=>{if(!buffer||exporting)return;if(kind==='cut'&&$('lock-selection').checked){$('status').textContent='Unlock the cut selection to move its gold bar. The blue listen bar stays editable.';return;}stop();drag=null;$(kind==='listen'?'listen-mode':'select-mode').checked=true;const t=at(e),start=kind==='listen'?listenAt:a,end=kind==='listen'?listenEnd:b,threshold=8/el.clientWidth*views.source.span,mode=Math.abs(t-start)<=threshold?'start':Math.abs(t-end)<=threshold?'end':'move';laneDrag={mode,start,end,anchor:t,pixel:e.clientX,moved:false,base:t>=start&&t<=end?start:Math.min(t,buffer.duration-(end-start))};el.setPointerCapture(e.pointerId);update();};
 el.onpointermove=e=>{if(!laneDrag)return;if(kind==='cut'&&$('lock-selection').checked){laneDrag=null;return;}const d=laneDrag,t=at(e);if(Math.abs(e.clientX-d.pixel)>2)d.moved=true;if(!d.moved)return;let start=d.start,end=d.end;if(d.mode==='start')start=Math.min(t,end);else if(d.mode==='end')end=Math.max(t,start);else{const length=d.end-d.start;start=Math.max(0,Math.min(buffer.duration-length,d.base+t-d.anchor));end=start+length;}if(kind==='listen'){listenAt=start;listenEnd=end;}else{a=start;b=end;}update();};
 el.onpointerup=e=>{if(!laneDrag)return;const d=laneDrag;laneDrag=null;if(kind==='cut'&&$('lock-selection').checked)return;if(!d.moved&&d.mode==='move'){const start=at(e),end=Math.min(buffer.duration,start+d.end-d.start);if(kind==='listen'){listenAt=start;listenEnd=end;}else{a=start;b=end;}}update();if(kind==='listen'&&listenEnd-listenAt>=.005)playAudio(buffer,listenAt,listenEnd,'source');};el.onpointercancel=()=>{laneDrag=null;};
}


let lastLinkedState=null;
function syncLinkedRanges(){if(!buffer)return;constrain();const linked=$('link-ranges').checked;if(linked){const previous=lastLinkedState,listenChanged=!previous||!previous.linked||previous.listenAt!==listenAt||previous.listenEnd!==listenEnd,cutChanged=previous&&(previous.a!==a||previous.b!==b);if(listenChanged){a=listenAt;b=listenEnd;}else if(cutChanged){listenAt=a;listenEnd=b;}$('lock-selection').checked=false;}lastLinkedState={linked,a,b,listenAt,listenEnd};$('lock-selection').disabled=linked;$('link-icon').innerHTML=icon('link');$('link-label').title=linked?'Unlink cut and listen ranges':'Link ranges: cut follows listen';$('link-ranges').setAttribute('aria-label',linked?'Unlink cut and listen ranges':'Link cut and listen ranges');}
iconPaths.link='<path d="m10 13 4-4M8 15l-2 2a4 4 0 0 1-5-5l4-4a4 4 0 0 1 5 0M14 9l2-2a4 4 0 0 1 5 5l-4 4a4 4 0 0 1-5 0"/>';
$('link-ranges').onchange=()=>{stop();lastLinkedState=null;update();};$('link-icon').innerHTML=icon('link');

function setEditorReady(ready){document.querySelectorAll('.audio-cutter button,.audio-cutter input').forEach(el=>{if(el.id!=='file'&&!el.classList.contains('ac-sample'))el.disabled=!ready;});}
const loadEmbeddedVersion=load;
load=async function(data,name){setEditorReady(false);$('status').textContent='Loading '+name+'…';await loadEmbeddedVersion(data,name);setEditorReady(Boolean(buffer));if(buffer)update();};
$('lock-icon').innerHTML=icon('unlock');setEditorReady(false);$('status').textContent='Open an audio file to begin. Everything is processed in your browser.';draw();drawOutput();

// What is open: a file chosen with Open audio, or one of the game's sounds (the buttons with
// data-sample-url). The one open is marked; the editor's other controls work on either.
let opened=null;
const fileKey=f=>f?'file|'+[f.name,f.size,f.lastModified].join('|'):null;
const samples=[...document.querySelectorAll('[data-sample-url]')];
function markSample(url){for(const el of samples)el.setAttribute('aria-pressed',String(el.dataset.sampleUrl===url));}
const openFile=$('file').onchange;
$('file').onchange=async e=>{opened=fileKey(e.target.files[0]);markSample(null);await openFile(e);};
async function openSample(el){
 if(exporting)return;const url=el.dataset.sampleUrl,name=el.dataset.sampleName;
 samples.forEach(s=>s.disabled=true);$('status').textContent='Opening '+name+'…';
 try{const r=await fetch(url);if(!r.ok)throw Error(r.status);const data=await r.arrayBuffer();
  $('file').value='';await load(data,name);if(buffer){opened='sample|'+url;markSample(url);$('name').value=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-clip';}
 }catch(e){$('status').textContent='Could not open '+name+'. Try again.';}
 finally{samples.forEach(s=>s.disabled=false);}
}
for(const el of samples)el.onclick=()=>openSample(el);

// Coming back to the page (Back after leaving it, or a reload): the browser hands back the file
// that was chosen but not the editor, so what was open is opened again and the cut, the listen
// range, the file name and the track's parts are put back as they were (kept for this tab only).
const RETURN_KEY='input-audio-cutter';
function keepForReturn(){if(!buffer||!opened)return;const ownParts=outputClips.every(c=>c.audio===buffer);try{sessionStorage.setItem(RETURN_KEY,JSON.stringify({opened,a,b,listenAt,listenEnd,name:$('name').value,parts:ownParts?outputClips.map(c=>[c.first,c.length]):[]}));}catch(e){}}
addEventListener('pagehide',keepForReturn);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')keepForReturn();});
addEventListener('pageshow',async e=>{
 if(e.persisted){if(buffer)update();return;}
 if(buffer)return;
 const how=performance.getEntriesByType('navigation')[0]?.type;if(how!=='back_forward'&&how!=='reload')return;
 let kept=null;try{kept=JSON.parse(sessionStorage.getItem(RETURN_KEY));}catch(err){}
 const f=$('file').files[0];let title;
 if(f){opened=fileKey(f);title=f.name;await load(await f.arrayBuffer(),f.name);if(buffer&&!(kept&&kept.opened===opened))$('name').value=f.name.replace(/\.[^.]+$/,'')+'-clip';}
 else if(kept&&kept.opened.startsWith('sample|')){const el=samples.find(s=>'sample|'+s.dataset.sampleUrl===kept.opened);if(!el)return;title=el.dataset.sampleName;await openSample(el);}
 else return;
 if(!buffer||!kept||kept.opened!==opened)return;
 a=kept.a;b=kept.b;listenAt=kept.listenAt;listenEnd=kept.listenEnd;$('name').value=kept.name||$('name').value;
 if(kept.parts.length){outputClips=kept.parts.map(([first,length])=>({audio:buffer,first,length,name:title}));undoHistory=[];rebuildOutput();}
 update();$('status').textContent='Back where you left off: '+title+(kept.parts.length?', with your track':'')+'.';
});
