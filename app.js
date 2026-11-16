'use strict';
/* ================= helpers ================= */
const $=id=>document.getElementById(id);
const TAU=Math.PI*2;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const hexRGB=h=>{h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[(n>>16)&255,(n>>8)&255,n&255];};
const rgba=(h,a)=>{const c=hexRGB(h);return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')';};
const mix=(h1,h2,t)=>{const a=hexRGB(h1),b=hexRGB(h2);return '#'+a.map((v,i)=>Math.round(lerp(v,b[i],t)).toString(16).padStart(2,'0')).join('');};
const fmtT=s=>{s=Math.max(0,Math.floor(s||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
const pct=v=>Math.round(v*100)+'%';
const pickArr=a=>a[Math.floor(Math.random()*a.length)];
function rr(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}

/* ================= IndexedDB ================= */
function idbOpen(){return new Promise((res,rej)=>{
  try{
    const rq=indexedDB.open('dhamma-studio',1);
    rq.onupgradeneeded=()=>{try{rq.result.createObjectStore('kv');}catch(e){}};
    rq.onsuccess=()=>res(rq.result);
    rq.onerror=()=>rej(rq.error);
  }catch(e){rej(e);}
});}
async function idbSet(k,v){try{const db=await idbOpen();
  await new Promise((res,rej)=>{const tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});
  db.close();}catch(e){}}
async function idbGet(k){try{const db=await idbOpen();
  const v=await new Promise((res,rej)=>{const rq=db.transaction('kv').objectStore('kv').get(k);rq.onsuccess=()=>res(rq.result);rq.onerror=()=>rej(rq.error);});
  db.close();return v;}catch(e){return null;}}
async function idbDel(k){try{const db=await idbOpen();
  await new Promise((res,rej)=>{const tx=db.transaction('kv','readwrite');tx.objectStore('kv').delete(k);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});
  db.close();}catch(e){}}

/* ================= state ================= */
const DEFAULTS={
  title:'မေတ္တာသုတ် တရားတော်', speakerName:'ဘဒ္ဒန္တ ဝိမလ ဆရာတော်', channel:'ဓမ္မရိပ်သာ Dhamma',
  showText:true, logoSize:1,
  titleSize:1, nameSize:1, titleColor:'#FFD873', nameColor:'#FFE9B8',
  titleFont:'myanmar-angoun', nameFont:'myanmar-angoun',
  waveStyle:'bars', waveColor1:'#FFC24D', waveColor2:'#FF7A3D',
  waveHeight:1, waveCount:64, waveGlow:0.7, waveSmooth:0.82,
  speakerSize:1, speakerPos:'left', speakerFrame:'gold', speakerBreath:true,
  spZoom:1, spImgX:0, spImgY:-0.12,
  showSubs:true, subSize:1,
  bgDark:0.55, bgBlur:0, bgZoom:true, vignette:0.5, particles:30,
  theme:'dawn', tint:'#3A1408', particle:'#FFD98A', textCol:'#FFE9B8',
  aspect:'landscape', subShift:0, subColor:'#FFFFFF', subBg:0.68, titleIntro:false, showBranding:true,
  quality:720, exportRes:1080, format:'mp4', volume:0.9,
  slideMin:0, bgCount:1, trimOn:false, trimStart:0, trimEnd:0, normOn:false, clips:[]
};
const SETTINGS=Object.keys(DEFAULTS);
const PRESET_KEYS=SETTINGS.filter(k=>!['quality','exportRes','volume','format','aspect','subShift','clips','bgCount','trimStart','trimEnd'].includes(k));
const THEMES={
  dawn:{name:'ရွှေနံနက်ခင်း', w1:'#FFC24D', w2:'#FF7A3D', tint:'#3A1408', pc:'#FFD98A', tx:'#FFE9B8'},
  night:{name:'ညသန်းခေါင်', w1:'#7C5CFF', w2:'#3EC6FF', tint:'#0E1030', pc:'#9DB4FF', tx:'#E4E9FF'},
  lotus:{name:'ကြာပန်းမေတ္တာ', w1:'#FF5E8A', w2:'#FFB3C7', tint:'#33101E', pc:'#FFA7C4', tx:'#FFE3EC'},
  jade:{name:'ကျောက်စိမ်းငြိမ်', w1:'#2FBF8F', w2:'#B7F0AD', tint:'#0A2018', pc:'#A9E8C9', tx:'#E2F7E9'}
};
const BUILTIN_FONTS={
  padauk:{label:'Padauk — မြန်မာစာလုံးဝိုင်း', stack:"'Padauk','Noto Sans Myanmar','Myanmar Text',sans-serif"},
  noto:{label:'Noto Sans Myanmar — ခေတ်မီ', stack:"'Noto Sans Myanmar','Padauk','Myanmar Text',sans-serif"},
  serif:{label:'Noto Serif Myanmar — ရိုးရာ', stack:"'Noto Serif Myanmar','Padauk','Myanmar Text',serif"},
  system:{label:'စက်တွင်းဖောင့် (Myanmar Text)', stack:"'Myanmar Text','Pyidaungsu','Padauk',sans-serif"},
  'myanmar-black':{label:'Myanmar Black — ထည့်သွင်းပြီး • အထူ / ခေါင်းစဉ်ကြီး', stack:"'Myanmar Black','Noto Sans Myanmar','Padauk','Myanmar Text',sans-serif"},
  'myanmar-njaun':{label:'Myanmar Njaun — ထည့်သွင်းပြီး', stack:"'Myanmar Njaun','Noto Sans Myanmar','Padauk','Myanmar Text',sans-serif"},
  'myanmar-pauklay':{label:'Myanmar Pauklay — ထည့်သွင်းပြီး', stack:"'Myanmar Pauklay','Noto Sans Myanmar','Padauk','Myanmar Text',sans-serif"},
  'myanmar-angoun':{label:'Myanmar Angoun — ထည့်သွင်းပြီး • အလှစာ', stack:"'Myanmar Angoun','Noto Sans Myanmar','Padauk','Myanmar Text',sans-serif"},
  'myanmar-gantgaw':{label:'Myanmar Gantgaw — ထည့်သွင်းပြီး', stack:"'Myanmar Gantgaw','Noto Sans Myanmar','Padauk','Myanmar Text',sans-serif"},
  'myanmar-thuriya':{label:'Myanmar Thuriya — ထည့်သွင်းပြီး', stack:"'Myanmar Thuriya','Noto Sans Myanmar','Padauk','Myanmar Text',sans-serif"},
  'myanmar-waso':{label:'Myanmar Waso — ထည့်သွင်းပြီး', stack:"'Myanmar Waso','Noto Sans Myanmar','Padauk','Myanmar Text',sans-serif"},
  'myanmar-yinmar':{label:'Myanmar Yinmar — ထည့်သွင်းပြီး', stack:"'Myanmar Yinmar','Noto Sans Myanmar','Padauk','Myanmar Text',sans-serif"},
  'myanmar-sagar':{label:'Myanmar Sagar — ထည့်သွင်းပြီး', stack:"'Myanmar Sagar','Noto Sans Myanmar','Padauk','Myanmar Text',sans-serif"},
  'pangram':{label:'Pangram — ထည့်သွင်းပြီး', stack:"'Pangram','Noto Sans Myanmar','Padauk','Myanmar Text',sans-serif"},
  'myanmar-yein':{label:'Myanmar Yein — ထည့်သွင်းပြီး', stack:"'Myanmar Yein','Noto Sans Myanmar','Padauk','Myanmar Text',sans-serif"}
};
const customFonts=[];
function fontExists(id){return !!BUILTIN_FONTS[id]||customFonts.some(f=>f.id===id);}
function stack(id){
  const c=customFonts.find(f=>f.id===id);
  if(c)return "'"+c.family+"','Noto Sans Myanmar','Padauk','Myanmar Text',sans-serif";
  return (BUILTIN_FONTS[id]||BUILTIN_FONTS.padauk).stack;
}
const state=Object.assign({},DEFAULTS);
let presets=[];
const KEY='dhamma-studio-v4';
let saveTimer=null;
function saveSoon(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{
  const s={};SETTINGS.forEach(k=>s[k]=state[k]);
  localStorage.setItem(KEY,JSON.stringify({v:2,s,presets}));
}catch(e){}},400);}
function restore(){try{
  let d=JSON.parse(localStorage.getItem(KEY)||'null');
  if(!d)d=JSON.parse(localStorage.getItem('dhamma-studio-v3')||'null');
  if(!d)d=JSON.parse(localStorage.getItem('dhamma-studio-v2')||'null');
  if(!d)d=JSON.parse(localStorage.getItem('dhamma-studio-v1')||'null');
  if(!d)return;
  if(d.s)SETTINGS.forEach(k=>{if(k in d.s&&typeof d.s[k]===typeof DEFAULTS[k])state[k]=d.s[k];});
  if(Array.isArray(d.presets))presets=d.presets.filter(p=>p&&p.name&&p.data).slice(0,6);
}catch(e){}}

/* ================= toasts ================= */
function toast(msg,opt){
  opt=opt||{};
  const type=opt.type||'gold';
  const icons={gold:'spark',success:'check',warn:'alert',danger:'alert',info:'info'};
  const el=document.createElement('div');el.className='toast t-'+type;
  el.innerHTML='<svg class="ic"><use href="#i-'+(opt.icon||icons[type])+'"/></svg>';
  const sp=document.createElement('span');sp.className='tmsg';sp.textContent=msg;el.appendChild(sp);
  let killed=false;
  function kill(){if(killed)return;killed=true;clearTimeout(tm);el.classList.remove('in');el.classList.add('out');setTimeout(()=>el.remove(),320);}
  if(opt.action){const b=document.createElement('button');b.className='tact';b.textContent=opt.action;
    b.onclick=()=>{if(opt.onAction)opt.onAction();kill();};el.appendChild(b);}
  const x=document.createElement('button');x.className='tx';x.setAttribute('aria-label','ပိတ်ရန်');
  x.innerHTML='<svg class="ic"><use href="#i-x"/></svg>';x.onclick=kill;el.appendChild(x);
  const box=$('toasts');box.appendChild(el);
  while(box.children.length>4)box.firstChild.remove();
  requestAnimationFrame(()=>el.classList.add('in'));
  const tm=setTimeout(kill,opt.dur||4800);
  return kill;
}

/* ================= dimensions (V2: landscape / portrait) ================= */
let VW=1920,VH=1080;
function updateDims(){if(state.aspect==='portrait'){VW=1080;VH=1920;}else{VW=1920;VH=1080;}}

/* ================= canvas & sprites ================= */
const cv=$('cv'), ctx=cv.getContext('2d',{alpha:false});
const blurCv=document.createElement('canvas'), bctx=blurCv.getContext('2d');
let gradCache={key:'',dark:null,vig:null};
let mote=null, noisePat=null, fallbackBG=null, placeholderSp=null, bgThumbURL='', spThumbURL='';
let fontsReady=false;
const grainOff=[[0,0],[53,17],[9,71],[87,43]];let grainIdx=0;

function drawCover(c,img,W,H,zoom,px,py){
  const s=Math.max(W/img.w,H/img.h)*(zoom||1);
  const dw=img.w*s,dh=img.h*s;
  c.drawImage(img.el,(W-dw)/2+(px||0),(H-dh)/2+(py||0),dw,dh);
}
function drawWheel(c,x,y,r,col,rot){
  c.save();c.translate(x,y);c.rotate(rot||0);
  c.strokeStyle=col;c.lineWidth=Math.max(1.5,r*0.13);
  c.beginPath();c.arc(0,0,r,0,TAU);c.stroke();
  c.beginPath();
  for(let k=0;k<4;k++){const a=k*Math.PI/4;c.moveTo(-Math.cos(a)*r*0.82,-Math.sin(a)*r*0.82);c.lineTo(Math.cos(a)*r*0.82,Math.sin(a)*r*0.82);}
  c.stroke();
  c.fillStyle=col;c.beginPath();c.arc(0,0,r*0.26,0,TAU);c.fill();
  c.fillStyle='#241019';c.beginPath();c.arc(0,0,r*0.15,0,TAU);c.fill();
  c.fillStyle=col;c.beginPath();c.arc(0,0,r*0.07,0,TAU);c.fill();
  c.restore();
}
function makeMote(){
  mote=document.createElement('canvas');mote.width=mote.height=64;
  const c=mote.getContext('2d');
  const g=c.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,.95)');
  g.addColorStop(0.25,rgba(state.particle,0.85));
  g.addColorStop(0.6,rgba(state.particle,0.25));
  g.addColorStop(1,rgba(state.particle,0));
  c.fillStyle=g;c.fillRect(0,0,64,64);
}
function makeNoise(){
  const n=document.createElement('canvas');n.width=n.height=128;
  const c=n.getContext('2d'),d=c.createImageData(128,128);
  for(let i=0;i<d.data.length;i+=4){const v=180+Math.random()*75;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=26;}
  c.putImageData(d,0,0);noisePat=ctx.createPattern(n,'repeat');
}
function drawStupa(c,x,baseY,s,fill,edge){
  c.save();c.translate(x,baseY);c.scale(s,s);
  c.fillStyle=fill;c.strokeStyle=edge;c.lineWidth=3/s;
  const tier=(w,h,y)=>{c.beginPath();c.moveTo(-w/2,y);c.lineTo(w/2,y);c.lineTo(w/2-18,y-h);c.lineTo(-w/2+18,y-h);c.closePath();c.fill();c.stroke();};
  tier(300,26,0);tier(240,24,-26);tier(184,22,-50);
  c.beginPath();c.moveTo(-78,-72);c.bezierCurveTo(-84,-160,-30,-196,-14,-238);c.lineTo(14,-238);
  c.bezierCurveTo(30,-196,84,-160,78,-72);c.closePath();c.fill();c.stroke();
  c.beginPath();c.moveTo(-16,-238);c.lineTo(0,-352);c.lineTo(16,-238);c.closePath();c.fill();c.stroke();
  c.beginPath();c.moveTo(0,-352);c.lineTo(0,-392);c.stroke();
  [[-352,26],[-366,20],[-378,14]].forEach(p=>{c.beginPath();c.ellipse(0,p[0],p[1]/2,3.4,0,0,TAU);c.fill();c.stroke();});
  c.beginPath();c.arc(0,-396,3.4,0,TAU);c.fill();
  c.restore();
}
function drawLotusFlower(c,x,y,s){
  c.save();c.translate(x,y);
  for(let k=-3;k<=3;k++){
    c.save();c.rotate(k*0.3);
    const g=c.createLinearGradient(0,0,0,-46*s);
    g.addColorStop(0,rgba('#E86A96',0.95));g.addColorStop(1,rgba('#FFC7D8',0.95));
    c.fillStyle=g;
    c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-11*s,-26*s,0,-46*s);c.quadraticCurveTo(11*s,-26*s,0,0);c.fill();
    c.restore();
  }
  c.fillStyle=rgba('#FFD873',0.95);c.beginPath();c.arc(0,-8*s,4.5*s,0,TAU);c.fill();
  c.restore();
}
function buildFallbackBG(){
  const b=document.createElement('canvas');b.width=1920;b.height=1080;
  const c=b.getContext('2d');
  const sky=c.createLinearGradient(0,0,0,1080);
  sky.addColorStop(0,'#1B1030');sky.addColorStop(0.34,'#4A1E33');sky.addColorStop(0.6,'#8A3A2A');
  sky.addColorStop(0.76,'#C96B2E');sky.addColorStop(0.92,'#E89A4A');
  c.fillStyle=sky;c.fillRect(0,0,1920,1080);
  for(let i=0;i<110;i++){const y=Math.random()*500;c.fillStyle='rgba(255,240,220,'+((1-y/520)*Math.random()*0.7)+')';
    c.fillRect(Math.random()*1920,y,Math.random()<0.2?2:1.2,Math.random()<0.2?2:1.2);}
  let g=c.createRadialGradient(1400,660,0,1400,660,500);
  g.addColorStop(0,'rgba(255,216,140,.95)');g.addColorStop(0.35,'rgba(255,170,80,.4)');g.addColorStop(1,'rgba(255,170,80,0)');
  c.fillStyle=g;c.fillRect(820,120,1160,1080);
  const ridge=(base,amp,col,seed)=>{
    c.fillStyle=col;c.beginPath();c.moveTo(0,1080);c.lineTo(0,base);
    for(let x=0;x<=1920;x+=60){c.lineTo(x,base+Math.sin(x*0.004+seed)*amp+Math.sin(x*0.013+seed*2)*amp*0.4);}
    c.lineTo(1920,1080);c.closePath();c.fill();
  };
  ridge(620,55,'rgba(90,36,56,.85)',1.7);
  g=c.createLinearGradient(0,600,0,740);g.addColorStop(0,'rgba(255,205,150,0)');g.addColorStop(0.5,'rgba(255,205,150,.1)');g.addColorStop(1,'rgba(255,205,150,0)');
  c.fillStyle=g;c.fillRect(0,600,1920,140);
  ridge(716,70,'#421B2E',4.2);
  g=c.createLinearGradient(0,700,0,820);g.addColorStop(0,'rgba(255,205,150,0)');g.addColorStop(0.5,'rgba(255,205,150,.12)');g.addColorStop(1,'rgba(255,205,150,0)');
  c.fillStyle=g;c.fillRect(0,700,1920,120);
  ridge(806,48,'#2E1220',7.9);
  c.fillStyle='#2A1120';c.beginPath();c.ellipse(1400,838,360,118,0,Math.PI,0);c.fill();
  g=c.createRadialGradient(1400,640,0,1400,640,300);
  g.addColorStop(0,'rgba(255,196,110,.34)');g.addColorStop(1,'rgba(255,196,110,0)');
  c.fillStyle=g;c.fillRect(1050,320,700,660);
  drawStupa(c,1400,806,1,'#331527','rgba(255,196,110,.85)');
  drawStupa(c,1215,812,0.36,'#2E1220','rgba(255,196,110,.6)');
  drawStupa(c,1585,812,0.36,'#2E1220','rgba(255,196,110,.6)');
  g=c.createLinearGradient(0,830,0,1080);g.addColorStop(0,'#3A1626');g.addColorStop(1,'#120812');
  c.fillStyle=g;c.fillRect(0,830,1920,250);
  g=c.createLinearGradient(0,830,0,1080);g.addColorStop(0,'rgba(255,180,90,.28)');g.addColorStop(1,'rgba(255,180,90,0)');
  c.fillStyle=g;c.fillRect(1290,830,220,250);
  for(let i=0;i<46;i++){const y=845+Math.random()*220;
    c.fillStyle='rgba(255,200,130,'+(Math.random()*0.13)+')';
    c.fillRect(Math.random()*1820,y,60+Math.random()*260,1.6);}
  const leaf=(x,y,rx,ry,rot)=>{c.save();c.translate(x,y);c.rotate(rot);c.fillStyle='rgba(26,42,24,.95)';
    c.beginPath();c.ellipse(0,0,rx,ry,0,0,TAU);c.fill();
    c.strokeStyle='rgba(120,160,90,.3)';c.lineWidth=1.5;c.beginPath();c.moveTo(-rx*0.8,0);c.lineTo(rx*0.8,0);c.stroke();c.restore();};
  leaf(120,1035,95,26,-0.08);leaf(300,1060,110,30,0.1);leaf(560,1072,80,22,-0.05);
  leaf(1780,1052,105,28,0.06);leaf(1620,1074,85,24,-0.1);leaf(1010,1080,90,24,0.04);
  drawLotusFlower(c,190,1030,1.15);drawLotusFlower(c,420,1056,0.85);drawLotusFlower(c,1700,1044,1.05);drawLotusFlower(c,1520,1070,0.7);
  g=c.createLinearGradient(0,860,0,970);g.addColorStop(0,'rgba(255,200,150,0)');g.addColorStop(0.5,'rgba(255,200,150,.06)');g.addColorStop(1,'rgba(255,200,150,0)');
  c.fillStyle=g;c.fillRect(0,860,1920,110);
  fallbackBG={el:b,w:1920,h:1080};
  const t=document.createElement('canvas');t.width=96;t.height=54;
  drawCover(t.getContext('2d'),fallbackBG,96,54,1,0,0);
  bgThumbURL=t.toDataURL('image/png');
}
function buildPlaceholderSp(){
  const p=document.createElement('canvas');p.width=p.height=512;
  const c=p.getContext('2d');
  const g=c.createRadialGradient(256,220,40,256,256,300);
  g.addColorStop(0,'#4A1E2C');g.addColorStop(1,'#1E0D16');
  c.fillStyle=g;c.fillRect(0,0,512,512);
  c.strokeStyle='rgba(255,205,120,.5)';c.lineWidth=5;
  c.beginPath();c.arc(256,148,62,0,TAU);c.stroke();
  const fg=c.createLinearGradient(0,90,0,400);
  fg.addColorStop(0,'#FFD873');fg.addColorStop(1,'#B4651F');
  c.fillStyle=fg;
  c.beginPath();c.arc(256,148,42,0,TAU);c.fill();
  c.beginPath();c.moveTo(216,196);
  c.bezierCurveTo(150,224,128,300,112,352);
  c.quadraticCurveTo(256,392,400,352);
  c.bezierCurveTo(384,300,362,224,296,196);
  c.quadraticCurveTo(256,214,216,196);c.closePath();c.fill();
  c.beginPath();c.ellipse(256,362,158,36,0,0,TAU);c.fill();
  c.strokeStyle='rgba(60,25,10,.4)';c.lineWidth=6;
  c.beginPath();c.moveTo(180,238);c.quadraticCurveTo(250,300,318,330);c.stroke();
  c.beginPath();c.moveTo(170,330);c.quadraticCurveTo(256,356,342,330);c.stroke();
  placeholderSp={el:p,w:512,h:512};
  const t=document.createElement('canvas');t.width=t.height=64;
  t.getContext('2d').drawImage(p,0,0,64,64);
  spThumbURL=t.toDataURL('image/png');
}

/* ================= particles ================= */
const parts=[],bokeh=[];
function initParticles(){
  for(let i=0;i<140;i++)parts.push({x:Math.random()*VW,y:Math.random()*VH,r:2+Math.random()*5,
    v:14+Math.random()*30,sw:0.3+Math.random()*0.8,ph:Math.random()*TAU,tw:0.8+Math.random()*2,a:0.25+Math.random()*0.55});
  for(let i=0;i<6;i++)bokeh.push({x:Math.random()*VW,y:Math.random()*VH,r:60+Math.random()*90,
    v:4+Math.random()*7,ph:Math.random()*TAU,a:0.04+Math.random()*0.035});
}
function drawParticles(t,dt){
  for(let i=0;i<bokeh.length;i++){const p=bokeh[i];
    p.y-=p.v*dt;p.x+=Math.sin(t*0.1+p.ph)*6*dt;
    if(p.y<-p.r){p.y=VH+p.r;p.x=Math.random()*VW;}
    ctx.globalAlpha=p.a;ctx.drawImage(mote,p.x-p.r,p.y-p.r,p.r*2,p.r*2);}
  const n=Math.round(state.particles);
  for(let i=0;i<n;i++){const p=parts[i];
    p.y-=p.v*dt;p.x+=Math.sin(t*p.sw+p.ph)*14*dt;
    if(p.y<-12){p.y=VH+12;p.x=Math.random()*VW;}
    ctx.globalAlpha=p.a*(0.55+0.45*Math.sin(t*p.tw+p.ph));
    ctx.drawImage(mote,p.x-p.r,p.y-p.r,p.r*2,p.r*2);}
  ctx.globalAlpha=1;
}

/* ================= audio engine ================= */
const audioEl=$('audioEl');
let AC=null,master=null,analyser=null,freqArr=null,timeArr=null,audioFailed=false,muted=false;
function ensureAudio(){
  if(AC)return;
  try{
    const Ctor=window.AudioContext||window.webkitAudioContext;
    AC=new Ctor();
    master=AC.createGain();master.gain.value=muted?0:state.volume;
    analyser=AC.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=state.waveSmooth;
    const src=AC.createMediaElementSource(audioEl);
    src.connect(analyser);analyser.connect(master);master.connect(AC.destination);
    freqArr=new Uint8Array(analyser.frequencyBinCount);
    timeArr=new Uint8Array(analyser.fftSize);
  }catch(e){audioFailed=true;AC=null;setTimeout(()=>{audioFailed=false;},4000);applyGain();}
}
function applyGain(){
  if(AC&&master)master.gain.setTargetAtTime(muted?0:state.volume,AC.currentTime,0.04);
  else{audioEl.volume=state.volume;audioEl.muted=muted;}
}
function wavURL(buf){
  const n=buf.length,sr=buf.sampleRate,d=buf.getChannelData(0);
  const b=new ArrayBuffer(44+n*2),v=new DataView(b);
  const ws=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  ws(0,'RIFF');v.setUint32(4,36+n*2,true);ws(8,'WAVE');ws(12,'fmt ');
  v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);
  ws(36,'data');v.setUint32(40,n*2,true);
  for(let i=0;i<n;i++){const s=clamp(d[i],-1,1);v.setInt16(44+i*2,s<0?s*0x8000:s*0x7FFF,true);}
  return URL.createObjectURL(new Blob([b],{type:'audio/wav'}));
}
async function makeDemoAudio(){
  const Ctor=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  const sr=44100,dur=18,oc=new Ctor(1,sr*dur,sr);
  const out=oc.createGain();out.connect(oc.destination);
  out.gain.setValueAtTime(0.0001,0);out.gain.exponentialRampToValueAtTime(0.9,0.8);
  out.gain.setValueAtTime(0.9,dur-2.4);out.gain.exponentialRampToValueAtTime(0.0001,dur-0.15);
  const dg=oc.createGain();dg.gain.value=0.05;dg.connect(out);
  [[110,0.6],[165,0.3],[220,0.18]].forEach(pr=>{
    const o=oc.createOscillator();o.type='sine';o.frequency.value=pr[0];
    const g=oc.createGain();g.gain.value=pr[1];o.connect(g);g.connect(dg);o.start(0);o.stop(dur);});
  const lfo=oc.createOscillator();lfo.frequency.value=0.09;
  const lg=oc.createGain();lg.gain.value=0.02;lfo.connect(lg);lg.connect(dg.gain);lfo.start(0);lfo.stop(dur);
  const bell=(t,f0)=>{
    [[1,0.5,9],[2.71,0.2,6.5],[4.95,0.09,4.2],[7.3,0.045,2.6]].forEach(pt=>{
      [-0.7,0.7].forEach(det=>{
        const o=oc.createOscillator();o.type='sine';o.frequency.value=f0*pt[0]+det;
        const g=oc.createGain();g.gain.setValueAtTime(0.0001,t);
        g.gain.exponentialRampToValueAtTime(pt[1]*0.5,t+0.02);
        g.gain.exponentialRampToValueAtTime(0.0001,t+pt[2]);
        o.connect(g);g.connect(out);o.start(t);o.stop(t+pt[2]+0.1);});});
  };
  [1,6,11,16].forEach(t=>bell(t,196));
  const chime=(t,f)=>{
    const o=oc.createOscillator();o.type='triangle';o.frequency.value=f;
    const g=oc.createGain();g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(0.06,t+0.03);g.gain.exponentialRampToValueAtTime(0.0001,t+3);
    o.connect(g);g.connect(out);o.start(t);o.stop(t+3.1);};
  [[3,293.66],[8,392],[13,349.23],[16.5,440]].forEach(p=>chime(p[0],p[1]));
  const buf=await oc.startRendering();
  return wavURL(buf);
}

/* ================= media ================= */
const media={bg:null,sp:null,logo:null,bgThumb:null,spThumb:null,logoThumb:null,
  bgName:'',spName:'',logoName:'',audioURL:null,audioName:'',isDemo:false,userAu:false,
  bgList:[],bgBlobs:[]};
const disposers=new Map();
/* ================= V3: export window + audio analysis ================= */
let WIN=null;   // {start,end} active export window (trim or clip); null = full audio
let ANA=null;   // cached analysis {key,lufs,gainDb,gain,trimStart,trimEnd,buf}
let progWall0=0;
function winStart(){return WIN?WIN.start:0;}
function winEnd(dur){return WIN?Math.min(WIN.end,dur||WIN.end):dur;}
function winDur(dur){return Math.max(0,winEnd(dur)-winStart());}
function parseT(str){
  str=String(str||'').trim();if(!str)return NaN;
  if(/^\d+(\.\d+)?$/.test(str))return parseFloat(str);
  const m=str.match(/^(?:(\d+):)?([0-5]?\d):([0-5]\d(?:\.\d+)?)$/);
  if(!m)return NaN;
  return (m[1]?+m[1]*3600:0)+(+m[2])*60+(+m[3]);
}
async function decodeCurrentAudio(){
  ensureAudio();if(!AC)throw new Error('no AC');
  const ab=await (await fetch(media.audioURL)).arrayBuffer();
  return AC.decodeAudioData(ab.slice(0));
}
function bufMono(buf){
  if(buf.numberOfChannels===1)return buf.getChannelData(0);
  const a=buf.getChannelData(0),b=buf.getChannelData(1),o=new Float32Array(buf.length);
  for(let i=0;i<buf.length;i++)o[i]=(a[i]+b[i])*0.5;
  return o;
}
function measureLUFS(buf){
  const d=bufMono(buf);let s=0,n=0;
  for(let i=0;i<d.length;i+=7){s+=d[i]*d[i];n++;}
  const rms=Math.sqrt(s/Math.max(1,n));
  return rms>1e-6?20*Math.log10(rms)-0.691:-70;
}
function detectSilence(buf){
  const d=bufMono(buf),sr=buf.sampleRate,win=Math.max(1,Math.floor(sr*0.05)),thr=Math.pow(10,-45/20);
  const loud=i=>{let s=0,c=0;for(let j=i;j<Math.min(i+win,d.length);j+=5){s+=d[j]*d[j];c++;}return Math.sqrt(s/Math.max(1,c))>thr;};
  let st=0;
  for(let i=0;i<d.length-win;i+=win){st=i/sr;if(loud(i))break;}
  let en=buf.duration;
  for(let i=d.length-win;i>0;i-=win){en=(i+win)/sr;if(loud(i))break;}
  return {start:Math.max(0,st-0.3),end:Math.min(buf.duration,en+0.3)};
}
async function ensureAnalysis(){
  if(!media.audioURL)throw new Error('no audio');
  const key=media.audioURL+'|'+(audioEl.duration||0);
  if(ANA&&ANA.key===key)return ANA;
  const buf=await decodeCurrentAudio();
  const lufs=measureLUFS(buf);
  const sil=detectSilence(buf);
  const gainDb=clamp(-14-lufs,-12,20);
  ANA={key,lufs,gainDb,gain:Math.pow(10,gainDb/20),trimStart:sil.start,trimEnd:sil.end,buf};
  const el=$('anaStat');
  if(el)el.textContent='အသံအဆင့် '+lufs.toFixed(1)+' LUFS • ညှိ gain '+(gainDb>=0?'+':'')+gainDb.toFixed(1)+' dB • တိတ်ဆိတ်မှု ဖြတ်ရန်: '+fmtT(sil.start)+' → '+fmtT(sil.end);
  return ANA;
}
function disposeLater(url){if(!url||!url.startsWith('blob:'))return;
  if(disposers.has(url))return;
  disposers.set(url,setTimeout(()=>{URL.revokeObjectURL(url);disposers.delete(url);},15000));}
function cancelDispose(url){if(disposers.has(url)){clearTimeout(disposers.get(url));disposers.delete(url);}}
async function loadBitmap(blob){
  try{return await createImageBitmap(blob,{imageOrientation:'from-image'});}
  catch(e){
    try{return await createImageBitmap(blob);}
    catch(e2){
      const url=URL.createObjectURL(blob);
      const img=await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('img'));};im.src=url;});
      img._objectURL=url;return img;
    }
  }
}
function wrapBmp(raw){return{el:raw,w:raw.width||raw.naturalWidth,h:raw.height||raw.naturalHeight,url:raw._objectURL||null};}
async function handleImage(file,kind){
  if(!file)return;
  if(!file.type.startsWith('image/')){toast('ပုံဖိုင် (JPG / PNG) ရွေးပေးပါ',{type:'warn'});return;}
  if(file.size>25e6){toast('ပုံဖိုင် 25MB ထက် ကြီးပါသည် — သေးအောင် လျှော့ပြီး ပြန်တင်ပါ',{type:'danger'});return;}
  try{
    const bmp=wrapBmp(await loadBitmap(file));
    const thumb=URL.createObjectURL(file);
    if(kind==='bg'){disposeLater(media.bgThumb);if(media.bg)disposeLater(media.bg.url);
      media.bg=bmp;media.bgThumb=thumb;media.bgName=file.name;media.bgList=[bmp];media.bgBlobs=[file];state.bgCount=1;renderBgThumbs();}
    else if(kind==='sp'){disposeLater(media.spThumb);if(media.sp)disposeLater(media.sp.url);
      media.sp=bmp;media.spThumb=thumb;media.spName=file.name;}
    else{disposeLater(media.logoThumb);if(media.logo)disposeLater(media.logo.url);
      media.logo=bmp;media.logoThumb=thumb;media.logoName=file.name;}
    try{idbSet('media-'+kind,file);}catch(e){}
    refreshMediaUI();
    toast('«'+file.name+'» တင်ပြီးပါပြီ',{type:'success'});
  }catch(e){toast('ပုံဖိုင် ဖတ်၍မရပါ — အခြားဖိုင် စမ်းကြည့်ပါ',{type:'danger'});}
}
async function handleBgFiles(files){
  const arr=[...files].filter(f=>f.type.startsWith('image/'));
  if(!arr.length)return;
  if(arr.length===1){handleImage(arr[0],'bg');return;}
  const ok=arr.filter(f=>f.size<=25e6).slice(0,8);
  if(!ok.length){toast('ပုံဖိုင် 25MB ထက် ကြီးပါသည် — သေးအောင် လျှော့ပါ',{type:'warn'});return;}
  const list=[],blobs=[];
  for(const f of ok){try{list.push(wrapBmp(await loadBitmap(f)));blobs.push(f);}catch(e){}}
  if(!list.length){toast('ပုံများ ဖတ်၍မရပါ',{type:'danger'});return;}
  media.bgList=list;media.bgBlobs=blobs;
  media.bg=list[0];media.bgThumb=URL.createObjectURL(blobs[0]);
  media.bgName=blobs[0].name+' (+'+(list.length-1)+' ပုံ)';
  state.bgCount=list.length;
  blobs.forEach((f,i)=>{try{idbSet('media-bg-'+i,f);}catch(e){}});
  try{idbSet('media-bg',blobs[0]);}catch(e){}
  renderBgThumbs();refreshMediaUI();saveSoon();
  toast('နောက်ခံပုံ '+list.length+' ပုံ တင်ပြီးပါပြီ — Slideshow လဲချိန် ချိန်ညှိနိုင်သည်',{type:'success'});
}
function renderBgThumbs(){
  const box=$('bgThumbs');if(!box)return;box.innerHTML='';
  (media.bgBlobs||[]).forEach((f,i)=>{
    const d=document.createElement('div');
    d.style.cssText='position:relative;width:52px;height:34px;border-radius:8px;overflow:hidden;border:1px solid rgba(255,200,100,.35);flex:none';
    const im=document.createElement('img');im.src=URL.createObjectURL(f);im.alt='';
    im.style.cssText='width:100%;height:100%;object-fit:cover;display:block';d.appendChild(im);
    const x=document.createElement('button');x.type='button';x.textContent='×';x.setAttribute('aria-label','ပုံ ဖယ်ရှားရန်');
    x.style.cssText='position:absolute;top:0;right:0;background:rgba(0,0,0,.65);color:#fff;border:0;width:16px;height:16px;font-size:11px;line-height:1;cursor:pointer;padding:0';
    x.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();removeBgAt(i);});
    d.appendChild(x);box.appendChild(d);
  });
}
function removeBgAt(i){
  media.bgList.splice(i,1);media.bgBlobs.splice(i,1);
  for(let k=0;k<9;k++)idbDel('media-bg-'+k);
  media.bgBlobs.forEach((f,k)=>{try{idbSet('media-bg-'+k,f);}catch(e){}});
  if(media.bgList.length){media.bg=media.bgList[0];media.bgThumb=URL.createObjectURL(media.bgBlobs[0]);media.bgName=media.bgBlobs[0].name||'နောက်ခံပုံ';try{idbSet('media-bg',media.bgBlobs[0]);}catch(e){}}
  else{media.bg=null;media.bgThumb=null;media.bgName='';idbDel('media-bg');}
  state.bgCount=media.bgList.length;
  renderBgThumbs();refreshMediaUI();saveSoon();
}
function handleAudioFile(file){
  if(!file)return;
  if(!file.type.startsWith('audio/')&&!/\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name)){
    toast('အသံဖိုင် (MP3 / WAV / M4A) ရွေးပေးပါ',{type:'warn'});return;}
  if(file.size>200e6){toast('အသံဖိုင် 200MB ထက် ကြီးပါသည် — ဖြတ်၍ ပြန်တင်ပါ',{type:'danger'});return;}
  const url=URL.createObjectURL(file);
  setAudio(url,file.name,false,true);
  if(file.size<=60e6){try{idbSet('media-audio',file);}catch(e){}}
  else toast('အသံဖိုင် ကြီးသောကြောင့် အလိုအလျောက် မသိမ်းထားပါ — Project JSON သီးသန့် သိမ်းပါ',{type:'info',dur:6000});
  toast('«'+file.name+'» တင်ပြီးပါပြီ',{type:'success'});
}
function setAudio(url,name,isDemo,user){
  if(media.audioURL&&media.audioURL!==url)disposeLater(media.audioURL);
  cancelDispose(url);
  audioEl.pause();
  media.audioURL=url;media.audioName=name;media.isDemo=isDemo;
  if(user)media.userAu=true;
  audioEl.src=url;audioEl.load();
  refreshMediaUI();syncExportButtons();
}
function refreshMediaUI(){
  const tb=$('tileBg'),ts=$('tileSp'),tl=$('tileLogo'),ta=$('tileAu'),tt=$('tileSrt');
  tb.classList.toggle('has',!!media.bg);
  $('thumbBg').src=media.bgThumb||bgThumbURL;
  $('nameBg').textContent=media.bgName||'နောက်ခံပုံ';
  $('subBg').textContent=media.bg?('အဆင်သင့် ✓'+(media.bgList&&media.bgList.length>1?' — ပုံ '+media.bgList.length+' ပုံ (slideshow ရသည်)':'')+' — နှိပ်၍ ပြောင်းနိုင်သည်'):'နှိပ်၍ရွေးပါ (သို့) ဖိုင်ဆွဲချပါ • ပုံများစွာ ရွေးနိုင်သည်';
  ts.classList.toggle('has',!!media.sp);
  $('thumbSp').src=media.spThumb||spThumbURL;
  $('nameSp').textContent=media.spName||'ဆရာတော် ဓာတ်ပုံ';
  $('subSp').textContent=media.sp?'အဆင်သင့် ✓ — ဖိဆွဲ၍ နေရာညှိနိုင်သည်':'နှိပ်၍ရွေးပါ (သို့) ဖိုင်ဆွဲချပါ • မျက်နှာအလယ်တွင်ပါသောပုံ';
  tl.classList.toggle('has',!!media.logo);
  if(media.logoThumb)$('thumbLogo').src=media.logoThumb;
  $('nameLogo').textContent=media.logoName||'ချန်နယ် လိုဂို';
  $('subLogo').textContent=media.logo?'အဆင်သင့် ✓ — ထိပ်ဘယ်ထောင့်တွင် ပြသမည်':'PNG / JPG — နောက်ခံကြည်လင်သောပုံ အကောင်းဆုံး';
  ta.classList.toggle('has',!!media.audioURL);
  $('nameAu').textContent=media.audioName||'တရားတော် အသံဖိုင်';
  const d=audioEl.duration;
  $('subAu').textContent=media.audioURL?(fmtT(d)+(media.isDemo?' • နမူနာအသံ':'')+' — နှိပ်၍ ပြောင်းနိုင်သည်'):'MP3 / WAV / M4A — နှိပ်၍ရွေးပါ (သို့) ဖိုင်ဆွဲချပါ';
  tt.classList.toggle('has',srt.cues.length>0);
  $('nameSrt').textContent=srt.name||'SRT စာတန်းဖိုင်';
  $('subSrt').textContent=srt.cues.length?('အဆင်သင့် ✓ — '+srt.cues.length+' ကြိမ် ပါဝင်သည်'):'နှိပ်၍ရွေးပါ (သို့) ဖိုင်ဆွဲချပါ • .srt / .vtt';
  $('frameTools').hidden=!media.sp;
  $('spHint').classList.toggle('off',!media.sp||state.recording);
  $('hintPlay').classList.toggle('off',!(media.isDemo&&!everPlayed));
}
function removeMedia(kind){
  if(kind==='bg'){
    if(!media.bg)return;
    const snap={bg:media.bg,bgThumb:media.bgThumb,bgName:media.bgName};
    media.bg=null;media.bgThumb=null;media.bgName='';media.bgList=[];media.bgBlobs=[];state.bgCount=0;for(let k=0;k<9;k++)idbDel('media-bg-'+k);idbDel('media-bg');renderBgThumbs();refreshMediaUI();saveSoon();
    disposeLater(snap.bgThumb);if(snap.bg)disposeLater(snap.bg.url);
    toast('နောက်ခံပုံ ဖယ်ရှားပြီးပါပြီ (ဒီဇိုင်းနမူနာ သုံးနေသည်)',{type:'info',action:'ပြန်ယူရန်',dur:7000,onAction:()=>{
      cancelDispose(snap.bgThumb);if(snap.bg)cancelDispose(snap.bg.url);
      Object.assign(media,snap);refreshMediaUI();toast('ပြန်လည်ရယူပြီးပါပြီ',{type:'success'});}});
  }else if(kind==='sp'){
    if(!media.sp)return;
    const snap={sp:media.sp,spThumb:media.spThumb,spName:media.spName};
    media.sp=null;media.spThumb=null;media.spName='';idbDel('media-sp');refreshMediaUI();
    disposeLater(snap.spThumb);if(snap.sp)disposeLater(snap.sp.url);
    toast('ဆရာတော်ပုံ ဖယ်ရှားပြီးပါပြီ',{type:'info',action:'ပြန်ယူရန်',dur:7000,onAction:()=>{
      cancelDispose(snap.spThumb);if(snap.sp)cancelDispose(snap.sp.url);
      Object.assign(media,snap);refreshMediaUI();toast('ပြန်လည်ရယူပြီးပါပြီ',{type:'success'});}});
  }else if(kind==='logo'){
    if(!media.logo)return;
    const snap={logo:media.logo,logoThumb:media.logoThumb,logoName:media.logoName};
    media.logo=null;media.logoThumb=null;media.logoName='';idbDel('media-logo');refreshMediaUI();
    disposeLater(snap.logoThumb);if(snap.logo)disposeLater(snap.logo.url);
    toast('လိုဂို ဖယ်ရှားပြီးပါပြီ (ဓမ္မစက် သင်္ကေတ ပြန်သုံးသည်)',{type:'info',action:'ပြန်ယူရန်',dur:7000,onAction:()=>{
      cancelDispose(snap.logoThumb);if(snap.logo)cancelDispose(snap.logo.url);
      Object.assign(media,snap);refreshMediaUI();toast('ပြန်လည်ရယူပြီးပါပြီ',{type:'success'});}});
  }else if(kind==='srt'){
    if(!srt.cues.length)return;
    const snap={name:srt.name,cues:srt.cues,raw:srt.raw};
    srt.name='';srt.cues=[];srt.raw='';srtIdx=0;lastCueText='';
    refreshMediaUI();idbDel('srt');
    toast('စာတန်းဖိုင် ဖယ်ရှားပြီးပါပြီ',{type:'info',action:'ပြန်ယူရန်',dur:7000,onAction:()=>{
      Object.assign(srt,snap);srtIdx=0;refreshMediaUI();
      idbSet('srt',{name:snap.name,text:snap.raw});
      toast('ပြန်လည်ရယူပြီးပါပြီ',{type:'success'});}});
  }else{
    if(!media.audioURL)return;
    const snap={audioURL:media.audioURL,audioName:media.audioName,isDemo:media.isDemo,userAu:media.userAu};
    audioEl.pause();audioEl.removeAttribute('src');audioEl.load();
    media.audioURL=null;media.audioName='';media.isDemo=false;
    idbDel('media-audio');
    refreshMediaUI();syncExportButtons();
    disposeLater(snap.audioURL);
    toast('အသံဖိုင် ဖယ်ရှားပြီးပါပြီ',{type:'info',action:'ပြန်ယူရန်',dur:7000,onAction:()=>{
      cancelDispose(snap.audioURL);
      media.userAu=snap.userAu;
      setAudio(snap.audioURL,snap.audioName,snap.isDemo,false);
      toast('ပြန်လည်ရယူပြီးပါပြီ',{type:'success'});}});
  }
}

/* ================= custom fonts ================= */
function persistFonts(){idbSet('fonts',customFonts.map(f=>({id:f.id,name:f.name,family:f.family,buffer:f.buffer})));}
function syncFontPreviews(){
  const pt=$('pvTitle'),pn=$('pvName');
  pt.style.fontFamily=stack(state.titleFont);pt.style.color=state.titleColor;
  pn.style.fontFamily=stack(state.nameFont);pn.style.color=state.nameColor;
}
function rebuildFontSelects(){
  [['selTitleFont','titleFont'],['selNameFont','nameFont']].forEach(pr=>{
    const sel=$(pr[0]),key=pr[1];
    sel.innerHTML='';
    Object.keys(BUILTIN_FONTS).forEach(k=>{
      const o=document.createElement('option');o.value=k;o.textContent=BUILTIN_FONTS[k].label;sel.appendChild(o);});
    customFonts.forEach(f=>{
      const o=document.createElement('option');o.value=f.id;o.textContent='✦ '+f.name;sel.appendChild(o);});
    if(!fontExists(state[key]))state[key]='padauk';
    sel.value=state[key];
  });
  syncFontPreviews();
}
function renderFontChips(){
  const box=$('fontChips');box.innerHTML='';
  $('fontHint').hidden=customFonts.length>0;
  customFonts.forEach(f=>{
    const chip=document.createElement('span');chip.className='cchip';
    const ap=document.createElement('button');ap.type='button';ap.className='capply';ap.textContent=f.name;
    ap.title='ခေါင်းစဉ်နှင့် အမည် နှစ်ခုလုံးတွင် သုံးရန်';
    ap.style.fontFamily=stack(f.id);
    ap.addEventListener('click',()=>{
      state.titleFont=f.id;state.nameFont=f.id;
      rebuildFontSelects();wrapCache.clear();saveSoon();
      toast('«'+f.name+'» ဖောင့်ကို နှစ်နေရာလုံးတွင် သုံးပြီးပါပြီ',{type:'success',icon:'font'});
    });
    const del=document.createElement('button');del.type='button';del.className='cdel';del.textContent='×';
    del.setAttribute('aria-label','ဖောင့်ဖျက်ရန်');
    del.addEventListener('click',()=>deleteFont(f.id));
    chip.appendChild(ap);chip.appendChild(del);box.appendChild(chip);
  });
}
function deleteFont(id){
  const i=customFonts.findIndex(f=>f.id===id);if(i<0)return;
  const f=customFonts[i];
  try{document.fonts.delete(f.face);}catch(e){}
  customFonts.splice(i,1);
  if(state.titleFont===id)state.titleFont='padauk';
  if(state.nameFont===id)state.nameFont='padauk';
  rebuildFontSelects();renderFontChips();persistFonts();wrapCache.clear();saveSoon();
  toast('«'+f.name+'» ဖောင့် ဖျက်ပြီးပါပြီ',{type:'info',action:'ပြန်ယူရန်',dur:7000,onAction:()=>{
    customFonts.splice(Math.min(i,customFonts.length),0,f);
    try{document.fonts.add(f.face);}catch(e){}
    rebuildFontSelects();renderFontChips();persistFonts();wrapCache.clear();
    toast('ဖောင့် ပြန်လည်ရယူပြီးပါပြီ',{type:'success'});
  }});
}
async function handleFontFiles(list){
  const files=[...list];let ok=0;
  for(const file of files){
    if(!/\.(ttf|otf|woff2?)$/i.test(file.name)&&!(file.type||'').startsWith('font/')){
      toast('«'+file.name+'» — TTF / OTF / WOFF ဖောင့်ဖိုင်သာ လက်ခံပါသည်',{type:'warn'});continue;}
    if(file.size>8e6)toast('ဖောင့်ဖိုင် ကြီးပါသည် — ခေတ္တစောင့်ပါ',{type:'info'});
    try{
      const buffer=await file.arrayBuffer();
      const base=file.name.replace(/\.[^.]+$/,'').replace(/['"\\]/g,'').trim().slice(0,40)||'Custom Font';
      let family='DSC-'+base,n=2;
      while(customFonts.some(f=>f.family===family))family='DSC-'+base+'-'+(n++);
      const face=new FontFace(family,buffer);
      await face.load();
      document.fonts.add(face);
      const id='cf'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
      customFonts.push({id,name:base,family,buffer,face});
      ok++;
    }catch(e){toast('«'+file.name+'» ဖောင့်ဖတ်၍မရပါ — အခြားဖိုင် စမ်းကြည့်ပါ',{type:'danger'});}
  }
  if(ok){
    rebuildFontSelects();renderFontChips();persistFonts();wrapCache.clear();
    toast(ok+' ဖောင့် တင်ပြီးပါပြီ — ရွေးချယ်စာရင်းတွင် ရှိပါပြီ',{type:'success',icon:'font'});
  }
}
async function restoreFonts(){
  const arr=await idbGet('fonts');
  if(!Array.isArray(arr)||!arr.length)return;
  for(const f of arr){
    try{
      const face=new FontFace(f.family,f.buffer);
      await face.load();document.fonts.add(face);
      customFonts.push({id:f.id,name:f.name,family:f.family,buffer:f.buffer,face});
    }catch(e){}
  }
  rebuildFontSelects();renderFontChips();wrapCache.clear();syncAll();
}

/* ================= SRT ================= */
const srt={name:'',cues:[],raw:''};
let srtIdx=0,lastCueText='';
function parseSRT(raw){
  const text=String(raw).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  const blocks=text.split(/\n{2,}/);
  const cues=[];
  const ts=s=>{
    const m=String(s).trim().match(/(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{1,3})/);
    if(!m)return null;
    return (m[1]?+m[1]:0)*3600 + (+m[2])*60 + (+m[3]) + (+m[4].padEnd(3,'0'))/1000;
  };
  for(const b of blocks){
    const lines=b.split('\n').map(l=>l.trim()).filter(Boolean);
    if(!lines.length)continue;
    if(/^WEBVTT/.test(lines[0]))lines.shift();
    if(!lines.length)continue;
    let i=0;
    if(/^\d+$/.test(lines[0])&&lines[1]&&lines[1].includes('-->'))i=1;
    const tl=lines[i];
    if(!tl||!tl.includes('-->'))continue;
    const parts=tl.split('-->');
    const a=ts(parts[0]),b2=ts(parts[1]);
    if(a==null||b2==null||b2<=a)continue;
    const txt=lines.slice(i+1).join(' ').replace(/<[^>]+>/g,'').replace(/\{[^}]*\}/g,'').trim();
    if(txt)cues.push({start:a,end:b2,text:txt});
  }
  cues.sort((x,y)=>x.start-y.start);
  return cues;
}
async function handleSrtFile(file){
  if(!file)return;
  if(!/\.(srt|vtt)$/i.test(file.name)&&!(file.type||'').startsWith('text/')){
    toast('SRT / VTT စာတန်းဖိုင် ရွေးပေးပါ',{type:'warn'});return;}
  try{
    const raw=await file.text();
    const cues=parseSRT(raw);
    if(!cues.length){toast('စာတန်း အချိန်ကိုက်များ မတွေ့ပါ — ဖိုင်ပုံစံ စစ်ဆေးပါ',{type:'danger',dur:6000});return;}
    srt.name=file.name;srt.cues=cues;srt.raw=raw;srtIdx=0;
    refreshMediaUI();
    idbSet('srt',{name:file.name,text:raw});
    toast('«'+file.name+'» — စာတန်း '+cues.length+' ကြိမ် တင်ပြီးပါပြီ',{type:'success',icon:'sub'});
  }catch(e){toast('စာတန်းဖိုင် ဖတ်၍မရပါ',{type:'danger'});}
}
async function restoreMedia(){
  const kinds=[['media-bg','bg'],['media-sp','sp'],['media-logo','logo']];
  for(const pr of kinds){
    try{const blob=await idbGet(pr[0]);if(!blob)continue;
      const bmp=wrapBmp(await loadBitmap(blob));
      const thumb=URL.createObjectURL(blob);
      if(pr[1]==='bg'){media.bg=bmp;media.bgThumb=thumb;media.bgName=blob.name||'ပြန်ရထားသော နောက်ခံပုံ';}
      else if(pr[1]==='sp'){media.sp=bmp;media.spThumb=thumb;media.spName=blob.name||'ပြန်ရထားသော ဆရာတော်ပုံ';}
      else{media.logo=bmp;media.logoThumb=thumb;media.logoName=blob.name||'ပြန်ရထားသော လိုဂို';}
    }catch(e){}
  }
  if(state.bgCount>1){
    const list=[],blobs=[];
    for(let i=0;i<state.bgCount;i++){try{const b=await idbGet('media-bg-'+i);if(b){list.push(wrapBmp(await loadBitmap(b)));blobs.push(b);}}catch(e){}}
    if(list.length>1){media.bgList=list;media.bgBlobs=blobs;media.bg=list[0];renderBgThumbs();}
    else if(list.length===1){media.bgList=list;media.bgBlobs=blobs;}
  }
  try{const ab=await idbGet('media-audio');
    if(ab&&(!media.audioURL||media.isDemo)){const url=URL.createObjectURL(ab);setAudio(url,ab.name||'ပြန်ရထားသော အသံဖိုင်',false,true);}
  }catch(e){}
  refreshMediaUI();syncExportButtons();
}
async function restoreSRT(){
  const d=await idbGet('srt');
  if(d&&d.text){
    const cues=parseSRT(d.text);
    if(cues.length){srt.name=d.name||'srt';srt.cues=cues;srt.raw=d.text;srtIdx=0;refreshMediaUI();}
  }
}
function findCue(t){
  const cs=srt.cues;if(!cs.length)return null;
  if(srtIdx>=cs.length)srtIdx=0;
  while(srtIdx>0&&cs[srtIdx].start>t)srtIdx--;
  while(srtIdx<cs.length-1&&cs[srtIdx+1].start<=t)srtIdx++;
  const c=cs[srtIdx];
  return (t>=c.start&&t<c.end)?c:null;
}
function drawSubs(){
  lastCueText='';
  if(!state.showSubs||!srt.cues.length||!media.audioURL)return;
  const cue=findCue(RC.time-(state.subShift||0));
  if(!cue)return;
  lastCueText=cue.text;
  const px=Math.round(42*state.subSize);
  const fam=stack(state.nameFont);
  ctx.font=fontB(500,px,fam);
  const lines=getWrap(cue.text,Math.round(VW*0.84),'s'+px+state.nameFont+fontsReady);
  const lh=px*1.5,padX=36,padY=16;
  let w=0;lines.forEach(ln=>{w=Math.max(w,ctx.measureText(ln).width);});
  const h=lines.length*lh+padY*2;
  const x=VW/2-w/2-padX,y=(state.aspect==='portrait'?Math.round(VH*0.905):878)-h/2;
  rr(ctx,x,y,w+padX*2,h,18);
  ctx.fillStyle='rgba(8,4,10,'+(state.subBg!=null?state.subBg:0.68)+')';ctx.fill();
  ctx.strokeStyle=rgba(state.waveColor1,0.35);ctx.lineWidth=1.5;ctx.stroke();
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle=state.subColor||'#FFFFFF';
  ctx.shadowColor='rgba(0,0,0,.7)';ctx.shadowBlur=10*(cv.width/1920);ctx.shadowOffsetY=2*(cv.width/1920);
  lines.forEach((ln,i)=>ctx.fillText(ln,VW/2,y+padY+lh/2+i*lh));
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.textAlign='left';
}

/* ================= render context + offline FFT ================= */
const RC={time:0,dur:0,offline:false,mono:null,sr:44100,expDur:0,quiet:false,doneResolve:null};
const FN=2048;
const fftRev=new Uint16Array(FN),fftCos=new Float32Array(FN/2),fftSin=new Float32Array(FN/2),hann=new Float32Array(FN);
(function(){
  for(let i=0;i<FN;i++){let j=0;for(let b=0;b<11;b++)if(i&(1<<b))j|=1<<(10-b);fftRev[i]=j;
    hann[i]=0.5*(1-Math.cos(TAU*i/(FN-1)));}
  for(let k=0;k<FN/2;k++){fftCos[k]=Math.cos(-TAU*k/FN);fftSin[k]=Math.sin(-TAU*k/FN);}
})();
const fftRe=new Float32Array(FN),fftIm=new Float32Array(FN),offFreq=new Uint8Array(FN/2),offTime=new Uint8Array(FN);
const offPrev=new Float32Array(FN/2);
function fft(){
  for(let i=0;i<FN;i++){const j=fftRev[i];if(j>i){let t=fftRe[i];fftRe[i]=fftRe[j];fftRe[j]=t;t=fftIm[i];fftIm[i]=fftIm[j];fftIm[j]=t;}}
  for(let len=2;len<=FN;len<<=1){
    const half=len>>1,step=FN/len;
    for(let i=0;i<FN;i+=len){
      for(let k=0;k<half;k++){
        const wr=fftCos[k*step],wi=fftSin[k*step],a=i+k,b=a+half;
        const tr=fftRe[b]*wr-fftIm[b]*wi,ti=fftRe[b]*wi+fftIm[b]*wr;
        fftRe[b]=fftRe[a]-tr;fftIm[b]=fftIm[a]-ti;fftRe[a]+=tr;fftIm[a]+=ti;
      }
    }
  }
}
function computeOfflineFreq(time){
  const m=RC.mono,len=m.length,off=clamp(Math.round(time*RC.sr)-FN/2,0,Math.max(0,len-FN));
  for(let i=0;i<FN;i++){fftRe[i]=(m[off+i]||0)*hann[i];fftIm[i]=0;}
  fft();
  for(let k=0;k<FN/2;k++){
    const mag=Math.hypot(fftRe[k],fftIm[k])*2/FN;
    const nv=clamp(mag*255*1.9,0,255);
    offPrev[k]=offPrev[k]*state.waveSmooth+nv*(1-state.waveSmooth);
    offFreq[k]=offPrev[k];
  }
  return offFreq;
}
function computeOfflineTime(time){
  const m=RC.mono,len=m.length,off=clamp(Math.round(time*RC.sr)-FN/2,0,Math.max(0,len-FN));
  for(let i=0;i<FN;i++)offTime[i]=clamp(128+(m[off+i]||0)*127,0,255);
  return offTime;
}

/* ================= grapheme-safe wrapping (V2) ================= */
let _gseg=null;
function graphemes(s){
  try{
    if(window.Intl&&Intl.Segmenter){
      if(!_gseg)_gseg=new Intl.Segmenter('my',{granularity:'grapheme'});
      return Array.from(_gseg.segment(s),x=>x.segment);
    }
  }catch(e){}
  return Array.from(s);
}

/* ================= spectrum ================= */
const sm=new Float32Array(144);
function isPlaying(){return !!(AC&&!audioEl.paused&&!audioEl.ended&&media.audioURL);}
function spectrumActive(){return RC.offline?!!RC.mono:isPlaying();}
function readFreq(){
  if(RC.offline)return computeOfflineFreq(RC.time);
  if(analyser){analyser.smoothingTimeConstant=state.waveSmooth;analyser.getByteFrequencyData(freqArr);return freqArr;}
  return null;
}
function readTime(){
  if(RC.offline)return computeOfflineTime(RC.time);
  if(analyser){analyser.getByteTimeDomainData(timeArr);return timeArr;}
  return null;
}
function updateSpectrum(t,dt){
  const n=state.waveStyle==='ring'?clamp(Math.round(state.waveCount*1.5),48,144):Math.round(state.waveCount);
  const kA=1-Math.exp(-dt*22),kR=1-Math.exp(-dt*6);
  const data=spectrumActive()?readFreq():null;
  if(data){
    const bins=data.length,fMin=2,fMax=Math.min(bins-4,380);
    for(let i=0;i<n;i++){
      const idx=Math.round(fMin*Math.pow(fMax/fMin,i/Math.max(1,n-1)));
      const span=Math.max(1,Math.round(idx*0.12));
      let sum=0;for(let k=idx;k<=idx+span&&k<bins;k++)sum+=data[k];
      let v=clamp(Math.pow(sum/(span+1)/255,0.8)*1.3,0,1);
      sm[i]+= (v-sm[i])*(v>sm[i]?kA:kR);
    }
  }else{
    for(let i=0;i<n;i++){
      const v=0.05+0.15*(0.5+0.5*Math.sin(t*1.4+i*0.37))*(0.5+0.5*Math.sin(t*0.63+i*0.11));
      sm[i]+=(v-sm[i])*kA*0.5;
    }
  }
  return n;
}

/* ================= drawing ================= */
const wrapCache=new Map();
function getWrap(text,maxW,fontKey){
  const key=text+'|'+maxW+'|'+fontKey+'|'+fontsReady;
  if(wrapCache.has(key))return wrapCache.get(key);
  const words=text.split(/\s+/).filter(Boolean);const lines=[];let cur='';
  for(const w of words){
    const test=cur?cur+' '+w:w;
    if(ctx.measureText(test).width<=maxW)cur=test;
    else{
      if(cur)lines.push(cur);
      if(ctx.measureText(w).width>maxW){
        let chunk='';
        for(const ch of graphemes(w)){if(ctx.measureText(chunk+ch).width>maxW&&chunk){lines.push(chunk);chunk=ch;}else chunk+=ch;}
        cur=chunk;
      }else cur=w;
    }
  }
  if(cur)lines.push(cur);
  let out=lines;
  if(lines.length>2){
    out=lines.slice(0,2);let l2=out[1]+' …';
    while(ctx.measureText(l2).width>maxW&&l2.length>2)l2=l2.slice(0,-2)+'…';
    out[1]=l2;
  }
  if(!out.length)out=[''];
  wrapCache.set(key,out);
  if(wrapCache.size>240)wrapCache.delete(wrapCache.keys().next().value);
  return out;
}
const fontB=(w,px,fam)=>w+' '+px+'px '+(fam||BUILTIN_FONTS.padauk.stack);
let ringCache={key:'',cols:[]};
function ringCols(n){
  const key=n+'|'+state.waveColor1+'|'+state.waveColor2;
  if(ringCache.key!==key){
    ringCache={key,cols:Array.from({length:n},(_,i)=>mix(state.waveColor1,state.waveColor2,i/Math.max(1,n-1)))};
  }
  return ringCache.cols;
}
function drawWaveBottom(t,n){
  const c1=state.waveColor1,c2=state.waveColor2,glow=state.waveGlow,hMul=state.waveHeight;
  const style=state.waveStyle;
  const x0=Math.round(VW*0.068),x1=Math.round(VW*0.932),span=x1-x0;
  const portraitW=state.aspect==='portrait';
  const y0=portraitW?Math.round(VH*0.845):(style==='mirror'?946:style==='line'?930:1006);
  const hScale=portraitW?1.55:1;
  let g=ctx.createRadialGradient(960,y0,60,960,y0,760);
  g.addColorStop(0,rgba(c1,0.13*glow));g.addColorStop(1,rgba(c1,0));
  ctx.fillStyle=g;ctx.fillRect(x0-80,y0-320,span+160,420);
  const grad=ctx.createLinearGradient(x0,0,x1,0);
  grad.addColorStop(0,c1);grad.addColorStop(0.5,mix(c1,c2,0.5));grad.addColorStop(1,c2);
  if(style==='line'){
    const N=140,pts=[];
    const td=spectrumActive()?readTime():null;
    if(td){
      for(let i=0;i<N;i++){const idx=Math.floor(i/(N-1)*(td.length-1));
        pts.push([x0+i/(N-1)*span,y0+(td[idx]-128)/128*130*hMul*hScale]);}
    }else{
      for(let i=0;i<N;i++){const x=i/(N-1);
        pts.push([x0+x*span,y0+(Math.sin(x*9+t*2.2)*0.4+Math.sin(x*23-t*1.4)*0.25 )*36*hMul*hScale]);}
    }
    const path=()=>{ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
      for(let i=1;i<N-1;i++){const mx=(pts[i][0]+pts[i+1][0])/2,my=(pts[i][1]+pts[i+1][1])/2;
        ctx.quadraticCurveTo(pts[i][0],pts[i][1],mx,my);}
      ctx.lineTo(pts[N-1][0],pts[N-1][1]);};
    ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=grad;
    if(glow>0.03){ctx.globalAlpha=0.25*glow;ctx.lineWidth=17;path();ctx.stroke();}
    ctx.globalAlpha=1;ctx.lineWidth=4.5;path();ctx.stroke();
    ctx.globalAlpha=0.08;ctx.lineTo(x1,y0+110);ctx.lineTo(x0,y0+110);ctx.closePath();
    ctx.fillStyle=grad;ctx.fill();ctx.globalAlpha=1;
    return;
  }
  const slot=span/n,bw=slot*0.6;
  ctx.fillStyle=grad;
  if(glow>0.03){
    ctx.globalAlpha=0.26*glow;
    for(let i=0;i<n;i++){
      const h=Math.max(6,sm[i]*168*hMul*hScale);
      const x=x0+i*slot+(slot-bw)/2;
      if(style==='mirror')rr(ctx,x-bw*0.55,y0-h*1.05,bw*2.1,h*2.1,bw);
      else rr(ctx,x-bw*0.55,y0-h*1.06,bw*2.1,h*1.06+6,bw);
      ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  for(let i=0;i<n;i++){
    const h=Math.max(6,sm[i]*168*hMul*hScale);
    const x=x0+i*slot+(slot-bw)/2;
    if(style==='mirror')rr(ctx,x,y0-h,bw,h*2,bw/2);
    else rr(ctx,x,y0-h,bw,h,bw/2);
    ctx.fill();
  }
  if(style==='bars'){
    ctx.globalAlpha=0.15;
    for(let i=0;i<n;i++){
      const h=Math.max(6,sm[i]*168*hMul*hScale)*0.3;
      const x=x0+i*slot+(slot-bw)/2;
      rr(ctx,x,y0+9,bw,h,bw/2);ctx.fill();
    }
    ctx.globalAlpha=0.5;ctx.fillRect(x0,y0+3,span,2);ctx.globalAlpha=1;
  }else{
    ctx.globalAlpha=0.4;ctx.fillRect(x0,y0-1,span,2);ctx.globalAlpha=1;
  }
}
const spGeo={cx:470,cy:470,R:268};
let spHover=false,adjustMode=false;
function drawSpeaker(t,n){
  const size=state.speakerSize;
  const portraitS=state.aspect==='portrait';
  const pos=portraitS?'center':state.speakerPos;
  let cx=portraitS?VW/2:(pos==='left'?470:pos==='right'?1450:960);
  let cy=portraitS?Math.round(VH*0.26):(pos==='center'?392:470);
  let R=(portraitS?VW*0.30:(pos==='center'?238:268))*size;
  if(state.speakerBreath){R*=1+0.012*Math.sin(t*0.9);cy+=6*Math.sin(t*0.55);}
  spGeo.cx=cx;spGeo.cy=cy;spGeo.R=R;
  const c1=state.waveColor1,c2=state.waveColor2;
  let g=ctx.createRadialGradient(cx,cy,R*0.5,cx,cy,R*1.95);
  g.addColorStop(0,rgba(c1,0.3*Math.max(state.waveGlow,0.25)));g.addColorStop(1,rgba(c1,0));
  ctx.fillStyle=g;ctx.fillRect(cx-R*2,cy-R*2,R*4,R*4);
  if(state.speakerFrame==='lotus'){
    for(let k=0;k<18;k++){
      const a=k/18*TAU+0.05*Math.sin(t*0.6);
      ctx.save();ctx.translate(cx,cy);ctx.rotate(a);
      ctx.fillStyle=rgba(c1,0.5);ctx.strokeStyle=rgba(c2,0.65);ctx.lineWidth=2;
      ctx.beginPath();ctx.ellipse(R+22,0,24,10.5,0,0,TAU);ctx.fill();ctx.stroke();
      ctx.restore();
    }
  }
  if(state.waveStyle==='ring'){
    const cols=ringCols(n),rot=t*0.06,r0=R+26;
    const lenMul=(pos==='center'?0.6:1)*state.waveHeight;
    ctx.lineCap='round';
    if(state.waveGlow>0.03){
      ctx.lineWidth=13;ctx.globalAlpha=0.22*state.waveGlow;
      for(let i=0;i<n;i++){
        const a=i/n*TAU+rot,len=10+sm[i]*115*lenMul;
        ctx.strokeStyle=cols[i];
        ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0);
        ctx.lineTo(cx+Math.cos(a)*(r0+len),cy+Math.sin(a)*(r0+len));ctx.stroke();
      }
    }
    ctx.globalAlpha=0.95;ctx.lineWidth=5;
    for(let i=0;i<n;i++){
      const a=i/n*TAU+rot,len=10+sm[i]*115*lenMul;
      ctx.strokeStyle=cols[i];
      ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0);
      ctx.lineTo(cx+Math.cos(a)*(r0+len),cy+Math.sin(a)*(r0+len));ctx.stroke();
      ctx.globalAlpha=0.25;ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*(R+14),cy+Math.sin(a)*(R+14));
      ctx.lineTo(cx+Math.cos(a)*(R+14-len*0.28),cy+Math.sin(a)*(R+14-len*0.28));ctx.stroke();
      ctx.globalAlpha=0.95;ctx.lineWidth=5;
    }
    ctx.globalAlpha=1;
  }
  ctx.save();
  ctx.beginPath();ctx.arc(cx,cy,R,0,TAU);ctx.clip();
  if(media.sp){
    const s0=Math.max(2*R/media.sp.w,2*R/media.sp.h);
    const s=s0*state.spZoom;
    const dw=media.sp.w*s,dh=media.sp.h*s;
    const maxX=Math.max(0,(dw-2*R)/2)/R,maxY=Math.max(0,(dh-2*R)/2)/R;
    const ox=clamp(state.spImgX,-maxX,maxX)*R,oy=clamp(state.spImgY,-maxY,maxY)*R;
    ctx.drawImage(media.sp.el,cx-dw/2+ox,cy-dh/2+oy,dw,dh);
  }else{
    ctx.drawImage(placeholderSp.el,cx-R,cy-R,2*R,2*R);
    ctx.font=fontB(500,Math.round(R*0.115));
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle=rgba(state.textCol,0.8);
    ctx.fillText('ဆရာတော်ပုံ တင်ရန်',cx,cy+R*0.72);
    ctx.textAlign='left';
  }
  ctx.restore();
  const ringGrad=ctx.createLinearGradient(cx-R,cy-R,cx+R,cy+R);
  ringGrad.addColorStop(0,c1);ringGrad.addColorStop(0.5,mix(c1,'#FFFFFF',0.5));ringGrad.addColorStop(1,c2);
  if(state.speakerFrame==='gold'){
    ctx.fillStyle=rgba(c1,0.85);
    for(let k=0;k<36;k++){const a=k/36*TAU+t*0.03;
      ctx.beginPath();ctx.arc(cx+Math.cos(a)*(R+20),cy+Math.sin(a)*(R+20),4.2,0,TAU);ctx.fill();}
    ctx.strokeStyle=ringGrad;ctx.lineWidth=9;
    ctx.beginPath();ctx.arc(cx,cy,R+6,0,TAU);ctx.stroke();
    ctx.strokeStyle=rgba(state.textCol,0.55);ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(cx,cy,R-10,0,TAU);ctx.stroke();
  }else if(state.speakerFrame==='thin'){
    ctx.strokeStyle=rgba(state.textCol,0.8);ctx.lineWidth=3.5;
    ctx.beginPath();ctx.arc(cx,cy,R+4,0,TAU);ctx.stroke();
  }else if(state.speakerFrame==='lotus'){
    ctx.strokeStyle=ringGrad;ctx.lineWidth=5;
    ctx.beginPath();ctx.arc(cx,cy,R+3,0,TAU);ctx.stroke();
  }else{
    ctx.strokeStyle=rgba(c1,0.3);ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(cx,cy,R+2,0,TAU);ctx.stroke();
  }
  /* drag guide */
  if(media.sp&&(spHover||adjustMode)&&!state.recording){
    ctx.save();
    ctx.strokeStyle=rgba('#FFFFFF',0.65);ctx.lineWidth=2.5;
    ctx.setLineDash([12,9]);ctx.lineDashOffset=-t*30;
    ctx.beginPath();ctx.arc(cx,cy,R+16,0,TAU);ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle=rgba('#FFFFFF',0.8);ctx.lineWidth=3;ctx.lineCap='round';
    const ar=R+34;
    [[0,-1],[0,1],[-1,0],[1,0]].forEach(d=>{
      const x=cx+d[0]*ar,y=cy+d[1]*ar;
      ctx.beginPath();
      ctx.moveTo(x-d[1]*8-d[0]*6,y-d[0]*8-d[1]*6);
      ctx.lineTo(x,y);
      ctx.lineTo(x+d[1]*8-d[0]*6,y+d[0]*8-d[1]*6);
      ctx.stroke();
    });
    ctx.globalAlpha=0.85;
    ctx.strokeStyle=rgba('#FFFFFF',0.5);ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(cx-14,cy);ctx.lineTo(cx+14,cy);ctx.moveTo(cx,cy-14);ctx.lineTo(cx,cy+14);ctx.stroke();
    ctx.globalAlpha=1;
    ctx.restore();
  }
}
function drawTexts(t){
  const portraitT=state.aspect==='portrait';
  const pos=portraitT?'center':state.speakerPos;
  const c1=state.waveColor1,c2=state.waveColor2;
  const align=pos==='left'?'left':pos==='right'?'right':'center';
  const tx=portraitT?VW/2:(pos==='left'?920:pos==='right'?1000:960);
  const maxW=portraitT?Math.round(VW*0.88):(pos==='center'?1420:880);
  const titlePx=Math.round((portraitT?62:(pos==='center'?66:76))*state.titleSize);
  const namePx=Math.round((portraitT?38:44)*state.nameSize);
  const titleFam=stack(state.titleFont),nameFam=stack(state.nameFont);
  ctx.font=fontB(700,titlePx,titleFam);
  const lines=getWrap(state.title||' ',maxW,'t'+titlePx+state.titleFont);
  const lh=titlePx*1.34;
  const totalH=lines.length*lh+70+namePx;
  const topY=portraitT?Math.round(VH*0.26+VW*0.30*state.speakerSize+110):(pos==='center'?746-totalH*0.2:470-totalH/2);
  const blockCx=pos==='left'?tx+maxW*0.42:pos==='right'?tx-maxW*0.42:VW/2;
  const blockCy=topY+totalH/2;
  ctx.save();
  ctx.translate(blockCx,blockCy);ctx.scale(maxW*0.66,totalH*0.85+110);
  const bg=ctx.createRadialGradient(0,0,0,0,0,1);
  bg.addColorStop(0,'rgba(10,5,12,.44)');bg.addColorStop(1,'rgba(10,5,12,0)');
  ctx.fillStyle=bg;ctx.fillRect(-1,-1,2,2);
  ctx.restore();
  const showTitleBlock=state.showText&&!(state.titleIntro&&RC.dur>0&&RC.time>15);
  if(showTitleBlock){
  ctx.textAlign=align;ctx.textBaseline='middle';
  const tc=state.titleColor;
  const tg=ctx.createLinearGradient(0,topY,0,topY+lines.length*lh);
  tg.addColorStop(0,mix(tc,'#FFFFFF',0.5));tg.addColorStop(0.6,tc);tg.addColorStop(1,mix(tc,c2,0.3));
  ctx.font=fontB(700,titlePx,titleFam);
  ctx.fillStyle=tg;
  ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=18*(cv.width/1920);ctx.shadowOffsetY=3*(cv.width/1920);
  lines.forEach((ln,i)=>ctx.fillText(ln,tx,topY+lh/2+i*lh));
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  const divY=topY+lines.length*lh+22;
  const divW=Math.min(maxW*0.55,460);
  const divX=align==='left'?tx:align==='right'?tx-divW:tx-divW/2;
  const dg=ctx.createLinearGradient(divX,0,divX+divW,0);
  dg.addColorStop(0,rgba(c1,0.95));dg.addColorStop(1,rgba(c2,0));
  ctx.fillStyle=dg;ctx.fillRect(divX,divY,divW,3);
  ctx.save();ctx.translate(divX+5,divY+1.5);ctx.rotate(Math.PI/4);
  ctx.fillStyle=c1;ctx.fillRect(-6,-6,12,12);ctx.restore();
  ctx.font=fontB(500,namePx,nameFam);
  ctx.fillStyle=rgba(state.nameColor,0.97);
  ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=10*(cv.width/1920);
  ctx.fillText(state.speakerName||'',tx,divY+40+namePx/2);
  ctx.shadowBlur=0;
  }
  if(state.showBranding){
  const lr=media.logo?34*state.logoSize:26;
  if(media.logo){
    ctx.save();ctx.beginPath();ctx.arc(116,84,lr,0,TAU);ctx.clip();
    const s=Math.max(2*lr/media.logo.w,2*lr/media.logo.h);
    const dw=media.logo.w*s,dh=media.logo.h*s;
    ctx.drawImage(media.logo.el,116-dw/2,84-dh/2,dw,dh);
    ctx.restore();
    ctx.strokeStyle=rgba(c1,0.8);ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(116,84,lr+2,0,TAU);ctx.stroke();
  }else{
    drawWheel(ctx,116,84,26,rgba(c1,0.9),t*0.12);
  }
  ctx.font=fontB(600,30,nameFam);ctx.textAlign='left';
  ctx.fillStyle=rgba(state.nameColor,0.88);
  ctx.fillText(state.channel||'',116+lr+16,86);
  ctx.font=fontB(700,30,nameFam);
  const tag='တရားတော်',tw=ctx.measureText(tag).width,tagR=VW-90;
  rr(ctx,tagR-tw-58,61,tw+58,46,23);
  ctx.fillStyle='rgba(0,0,0,.38)';ctx.fill();
  ctx.strokeStyle=rgba(c1,0.55);ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle=c2;ctx.beginPath();ctx.arc(tagR-tw-34,84,4.5,0,TAU);ctx.fill();
  ctx.fillStyle=c1;ctx.textAlign='right';
  ctx.fillText(tag,tagR-26,86);
  ctx.textAlign='left';
  }
}
function slideAt(t){
  const list=media.bgList;
  if(!list||list.length<2||!(state.slideMin>0))return{img:media.bg};
  const per=state.slideMin*60;
  const tt=media.audioURL?RC.time:t;
  const idx=Math.floor(tt/per)%list.length;
  const ph=(tt%per)/per,fade=Math.min(0.25,1.5/per);
  if(ph>1-fade)return{img:list[idx],img2:list[(idx+1)%list.length],a:(ph-(1-fade))/fade};
  return{img:list[idx]};
}
function drawFrame(t,dt){
  const W=VW,H=VH,S=cv.width/W;
  ctx.setTransform(S,0,0,S,0,0);
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  const n=updateSpectrum(t,dt);
  const sl=slideAt(t);
  const img=sl.img||fallbackBG;
  const dur=RC.dur||0;
  const prog=dur?clamp(RC.time/dur,0,1):(t%150)/150;
  const zoom=state.bgZoom?1.03+0.075*prog:1.02;
  const panX=state.bgZoom?Math.sin(t*0.05)*14:0,panY=state.bgZoom?Math.cos(t*0.04)*8:0;
  if(state.bgBlur>0.4){
    const f=clamp(1/(1+state.bgBlur*0.85),0.05,1);
    const bw=Math.max(24,Math.round(W*f)),bh=Math.max(14,Math.round(H*f));
    if(blurCv.width!==bw||blurCv.height!==bh){blurCv.width=bw;blurCv.height=bh;}
    bctx.setTransform(f,0,0,f,0,0);
    bctx.imageSmoothingEnabled=true;bctx.imageSmoothingQuality='high';
    drawCover(bctx,img,W,H,zoom,panX,panY);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(blurCv,0,0,W,H);
  }else{
    drawCover(ctx,img,W,H,zoom,panX,panY);
  }
  if(sl.img2){ctx.save();ctx.globalAlpha=clamp(sl.a,0,1);drawCover(ctx,sl.img2,W,H,zoom,panX,panY);ctx.restore();}
  ctx.globalCompositeOperation='overlay';
  ctx.fillStyle=rgba(state.tint,0.28);ctx.fillRect(0,0,W,H);
  ctx.globalCompositeOperation='source-over';
  const dk=mix(state.tint,'#000000',0.5);
  const gk=W+'x'+H+'|'+state.tint+'|'+state.bgDark+'|'+state.vignette;
  if(gradCache.key!==gk){
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,rgba(dk,state.bgDark*0.55));
    g.addColorStop(0.55,rgba(dk,state.bgDark*0.45));
    g.addColorStop(1,rgba(mix(state.tint,'#000000',0.62),Math.min(0.95,state.bgDark*1.25)));
    let vg=null;
    if(state.vignette>0.02){
      vg=ctx.createRadialGradient(W/2,H*0.46,320,W/2,H/2,Math.max(W,H)*0.6);
      vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(8,4,10,'+(0.75*state.vignette)+')');
    }
    gradCache={key:gk,dark:g,vig:vg};
  }
  ctx.fillStyle=gradCache.dark;ctx.fillRect(0,0,W,H);
  if(gradCache.vig){ctx.fillStyle=gradCache.vig;ctx.fillRect(0,0,W,H);}
  drawParticles(t,dt);
  if(state.waveStyle!=='ring')drawWaveBottom(t,n);
  drawSpeaker(t,n);
  if(state.showText||state.showBranding)drawTexts(t);
  drawSubs();
  const off=grainOff[(grainIdx++)&3];
  ctx.globalAlpha=0.05;ctx.globalCompositeOperation='overlay';
  ctx.fillStyle=noisePat;
  ctx.save();ctx.translate(off[0],off[1]);ctx.fillRect(-160,-160,W+320,H+320);ctx.restore();
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
}
function setCanvasSize(h){
  updateDims();
  if(state.aspect==='portrait'){cv.width=h;cv.height=Math.round(h*16/9);}
  else{cv.width=Math.round(h*16/9);cv.height=h;}
  cv.style.aspectRatio=cv.width+' / '+cv.height;
  $('resBadge').textContent=cv.width+' × '+cv.height;
  const ab=$('aspectBadge');if(ab)ab.textContent=state.aspect==='portrait'?'9 : 16':'16 : 9';
  const al=$('aspectLabel');if(al)al.textContent=state.aspect==='portrait'?'Shorts ပုံစံ':'YouTube ပုံစံ';
}

/* ================= bindings ================= */
const syncers=[],rangeSync={};
function paintRange(el){const p=(el.value-el.min)/(el.max-el.min)*100;el.style.setProperty('--p',p+'%');}
function bindRange(id,key,outId,fmt,cb){
  const el=$(id),out=outId?$(outId):null;
  el.addEventListener('input',()=>{
    state[key]=parseFloat(el.value);paintRange(el);
    if(out)out.textContent=fmt(state[key]);
    if(cb)cb(state[key]);saveSoon();
  });
  const sync=()=>{el.value=state[key];paintRange(el);if(out)out.textContent=fmt(state[key]);};
  syncers.push(sync);rangeSync[id]=sync;
}
function bindCheck(id,key){
  const el=$(id);
  el.addEventListener('change',()=>{state[key]=el.checked;saveSoon();});
  syncers.push(()=>{el.checked=state[key];});
}
function bindText(id,key){
  const el=$(id);
  el.addEventListener('input',()=>{state[key]=el.value;saveSoon();});
  syncers.push(()=>{if(el.value!==state[key])el.value=state[key];});
}
function bindColor(id,key,markCustom){
  const el=$(id);
  el.addEventListener('input',()=>{
    state[key]=el.value;
    if(markCustom!==false){state.theme='custom';syncThemeChips();}
    syncFontPreviews();saveSoon();
  });
  syncers.push(()=>{el.value=state[key];});
}
function bindSelect(id,key,cb){
  const el=$(id),num=key==='quality'||key==='exportRes';
  el.addEventListener('change',()=>{
    state[key]=num?parseFloat(el.value):el.value;
    if(cb)cb(state[key]);saveSoon();
  });
  syncers.push(()=>{el.value=String(state[key]);});
}
function seg(id,key,cb){
  const box=$(id),btns=[...box.querySelectorAll('button')];
  btns.forEach(b=>b.addEventListener('click',()=>{
    state[key]=b.dataset.val;
    btns.forEach(x=>x.classList.toggle('on',x===b));saveSoon();
    if(cb)cb(state[key]);
  }));
  syncers.push(()=>btns.forEach(b=>b.classList.toggle('on',b.dataset.val===String(state[key]))));
}
function syncThemeChips(){
  [...$('themes').children].forEach(ch=>ch.classList.toggle('on',ch.dataset.k===state.theme));
}
function applyTheme(k){
  const th=THEMES[k];if(!th)return;
  state.theme=k;state.waveColor1=th.w1;state.waveColor2=th.w2;
  state.tint=th.tint;state.particle=th.pc;state.textCol=th.tx;
  state.titleColor=mix(th.w1,'#FFFFFF',0.45);state.nameColor=th.tx;
  makeMote();syncers.forEach(f=>f());syncThemeChips();saveSoon();
}
function buildThemeChips(){
  const box=$('themes');
  Object.keys(THEMES).forEach(k=>{
    const th=THEMES[k];
    const b=document.createElement('button');b.type='button';b.className='themechip';b.dataset.k=k;
    const i=document.createElement('i');
    i.style.background='linear-gradient(135deg,'+th.w1+','+th.w2+')';
    const s=document.createElement('span');s.textContent=th.name;
    b.appendChild(i);b.appendChild(s);
    b.addEventListener('click',()=>applyTheme(k));
    box.appendChild(b);
  });
}
function buildSwatches(){
  const pairs=[['#FFC24D','#FF7A3D'],['#FFD873','#FF5E8A'],['#7C5CFF','#3EC6FF'],['#FF5E8A','#FFB3C7'],['#2FBF8F','#B7F0AD'],['#FFE9B8','#F6B23C']];
  const box=$('swatches');
  pairs.forEach(p=>{
    const b=document.createElement('button');b.type='button';b.className='sw';
    b.style.background='linear-gradient(135deg,'+p[0]+' 50%,'+p[1]+' 50%)';
    b.title=p[0]+' → '+p[1];b.setAttribute('aria-label','အရောင်တွဲ '+p[0]+' '+p[1]);
    b.addEventListener('click',()=>{
      state.waveColor1=p[0];state.waveColor2=p[1];state.theme='custom';
      $('colW1').value=p[0];$('colW2').value=p[1];syncThemeChips();saveSoon();
    });
    box.appendChild(b);
  });
}
function buildTextSwatches(boxId,inputId,key){
  const cols=['#FFD873','#FFFFFF','#FFE9B8','#FF5E8A','#7C5CFF','#3EC6FF','#2FBF8F','#F6B23C'];
  const box=$(boxId);
  cols.forEach(c=>{
    const b=document.createElement('button');b.type='button';b.className='sw mini';
    b.style.background=c;b.title=c;b.setAttribute('aria-label','အရောင် '+c);
    b.addEventListener('click',()=>{
      state[key]=c;$(inputId).value=c;syncFontPreviews();saveSoon();
    });
    box.appendChild(b);
  });
}
function renderCustomPresets(){
  const box=$('customPresets');box.innerHTML='';
  $('presetHint').hidden=presets.length>0;
  presets.forEach((p,idx)=>{
    const chip=document.createElement('span');chip.className='cchip';
    const ap=document.createElement('button');ap.type='button';ap.className='capply';ap.textContent=p.name;
    ap.title='ဤဒီဇိုင်း ပြန်သုံးရန်';
    ap.addEventListener('click',()=>{
      PRESET_KEYS.forEach(k=>{if(k in p.data)state[k]=p.data[k];});
      makeMote();wrapCache.clear();syncers.forEach(f=>f());rebuildFontSelects();syncThemeChips();saveSoon();
      toast('«'+p.name+'» ဒီဇိုင်း ပြောင်းပြီးပါပြီ',{type:'success'});
    });
    const del=document.createElement('button');del.type='button';del.className='cdel';del.textContent='×';
    del.setAttribute('aria-label','ဖျက်ရန်');
    del.addEventListener('click',()=>{
      const removed=presets.splice(idx,1)[0];
      renderCustomPresets();saveSoon();
      toast('ဒီဇိုင်း ဖျက်ပြီးပါပြီ',{type:'info',action:'ပြန်ယူရန်',onAction:()=>{
        presets.splice(Math.min(idx,presets.length),0,removed);renderCustomPresets();saveSoon();}});
    });
    chip.appendChild(ap);chip.appendChild(del);box.appendChild(chip);
  });
}
function syncAll(){
  syncers.forEach(f=>f());rebuildFontSelects();syncThemeChips();updateMuteIcons();syncExportButtons();refreshMediaUI();
}

/* ================= transport ================= */
let everPlayed=false,seekDrag=false;
function updateMuteIcons(){
  const href=muted?'#i-mute':'#i-vol';
  $('muteUseA').setAttribute('href',href);
  $('muteUseB').setAttribute('href',href);
  $('btnMute').title=muted?'အသံ ပြန်ဖွင့်ရန် (M)':'အသံ ပိတ်ရန် (M)';
}
function toggleMute(){muted=!muted;applyGain();updateMuteIcons();}
async function pickExportCodecs(sr,ch){
  if(!window.VideoEncoder||!window.AudioEncoder)return null;
  const vList=state.exportRes>=1080?['avc1.640028','avc1.4d0028','avc1.420028']:['avc1.64001f','avc1.4d001f','avc1.42001f'];
  vList.push('vp09.00.10.08');
  let v=null;
  for(const c of vList){
    try{const q=await VideoEncoder.isConfigSupported({codec:c,width:1280,height:720,bitrate:videoBitrate(),framerate:30,hardwareAcceleration:'prefer-hardware'});
      if(q.supported){v=c;break;}}catch(e){}
  }
  if(!v)return null;
  const vKind=v.startsWith('avc1')?'avc':'vp9';
  const aac={codec:'mp4a.40.2',sampleRate:sr,numberOfChannels:ch,bitrate:192000};
  try{if((await AudioEncoder.isConfigSupported(aac)).supported)return{v:v,vKind:vKind,aCfg:aac,aKind:'aac'};}catch(e){}
  const opus={codec:'opus',sampleRate:sr,numberOfChannels:ch,bitrate:128000};
  try{if((await AudioEncoder.isConfigSupported(opus)).supported)return{v:v,vKind:vKind,aCfg:opus,aKind:'opus'};}catch(e){}
  return null;
}
async function updateCodecBadge(){
  const el=$('codecBadge');if(!el)return;
  const pick=await pickExportCodecs(48000,2);
  if(pick){
    el.textContent='✓ အမြန် export ရပါသည် ('+(pick.vKind==='avc'?'H.264':'VP9')+' + '+(pick.aKind==='aac'?'AAC':'Opus')+')';
    el.style.color='var(--jade)';
  }else{
    el.textContent='⚠ အမြန် export မရပါ — realtime နည်းသာ ရမည် (Chrome / Edge အသစ် သုံးပါ)';
    el.style.color='var(--amber)';
  }
}
function syncExportButtons(){
  const has=!!media.audioURL,rec=state.recording;
  $('btnExport').disabled=!has||rec;
  $('btnExportTop').disabled=!has||rec;
  $('btnThumb').disabled=rec;
  $('btnThumbTop').disabled=rec;
  $('btnPlay').disabled=!has||rec;
  $('seek').disabled=!has||rec;
  $('selQuality').disabled=rec;
  $('selRes').disabled=rec;
  $('selFormat').disabled=rec;
  $('btnPlay').classList.toggle('attract',has&&!everPlayed&&!rec);
  const mp4=state.format==='mp4';
  $('btnExport').lastChild.textContent=mp4?'MP4 Export':'WebM Export';
}
async function togglePlay(){
  if(state.recording)return;
  if(!media.audioURL){toast('အသံဖိုင် အရင် တင်ပေးပါ',{type:'warn'});return;}
  ensureAudio();
  if(AC&&AC.state==='suspended'){try{await AC.resume();}catch(e){}}
  if(audioEl.paused){
    try{await audioEl.play();}
    catch(e){toast('အသံဖွင့်၍မရပါ — ဖိုင်ပြန်တင်ကြည့်ပါ',{type:'danger'});}
  }else audioEl.pause();
}
audioEl.addEventListener('play',()=>{
  everPlayed=true;
  $('playUse').setAttribute('href','#i-pause');
  document.body.classList.add('playing');
  $('hintPlay').classList.add('off');
  syncExportButtons();
});
audioEl.addEventListener('pause',()=>{
  $('playUse').setAttribute('href','#i-play');
  document.body.classList.remove('playing');
});
audioEl.addEventListener('ended',()=>{
  $('playUse').setAttribute('href','#i-play');
  document.body.classList.remove('playing');
  if(state.recording&&recMode==='realtime')stopRec();
});
audioEl.addEventListener('loadedmetadata',()=>{
  $('tDur').textContent=fmtT(audioEl.duration);
  refreshMediaUI();
});
audioEl.addEventListener('error',()=>{
  if(media.audioURL&&!state.recording)toast('အသံဖိုင် ဖတ်၍မရပါ — အခြားဖိုင် စမ်းကြည့်ပါ',{type:'danger'});
});

/* ================= speaker drag / zoom ================= */
let spDrag=null;
function evPos(e){const r=cv.getBoundingClientRect();
  return{x:(e.clientX-r.left)/r.width*VW,y:(e.clientY-r.top)/r.height*VH};}
function overSp(p){return !!media.sp&&Math.hypot(p.x-spGeo.cx,p.y-spGeo.cy)<=spGeo.R;}
function setAdjust(on){
  adjustMode=on;
  $('btnAdjust').classList.toggle('on',on);
  cv.style.touchAction=on?'none':'pan-y';
  if(on)toast('ညှိမုဒ် ဖွင့်ထားပါသည် — ပုံကို ဖိဆွဲ၍ ရွှေ့ပါ',{type:'info',icon:'hand',dur:3500});
}
function spZoomBy(f){
  state.spZoom=clamp(state.spZoom*f,1,3);
  rangeSync.rgSpZoom();saveSoon();
}
function spReset(){
  state.spZoom=1;state.spImgX=0;state.spImgY=-0.12;
  rangeSync.rgSpZoom();rangeSync.rgSpX();rangeSync.rgSpY();saveSoon();
  toast('ဆရာတော်ပုံနေရာ မူလ ပြန်ထားပြီးပါပြီ',{type:'info',icon:'move'});
}
cv.addEventListener('pointerdown',e=>{
  if(state.recording)return;
  if(e.pointerType==='mouse'&&e.button!==0)return;
  const p=evPos(e);if(!overSp(p))return;
  if(e.pointerType!=='mouse'&&!adjustMode)return;
  spDrag={x:p.x,y:p.y,id:e.pointerId};
  try{cv.setPointerCapture(e.pointerId);}catch(err){}
  cv.style.cursor='grabbing';e.preventDefault();
});
cv.addEventListener('pointermove',e=>{
  const p=evPos(e);
  if(spDrag&&e.pointerId===spDrag.id){
    const dx=(p.x-spDrag.x)/spGeo.R,dy=(p.y-spDrag.y)/spGeo.R;
    spDrag={x:p.x,y:p.y,id:e.pointerId};
    state.spImgX=clamp(state.spImgX+dx,-1,1);
    state.spImgY=clamp(state.spImgY+dy,-1,1);
    rangeSync.rgSpX();rangeSync.rgSpY();saveSoon();
  }else{
    spHover=overSp(p);
    cv.style.cursor=(!state.recording&&spHover)?'grab':'default';
  }
});
['pointerup','pointercancel'].forEach(ev=>cv.addEventListener(ev,e=>{
  if(spDrag&&e.pointerId===spDrag.id){spDrag=null;cv.style.cursor=spHover?'grab':'default';}
}));
cv.addEventListener('pointerleave',()=>{spHover=false;if(!spDrag)cv.style.cursor='default';});
cv.addEventListener('wheel',e=>{
  if(state.recording)return;
  const p=evPos(e);if(!overSp(p))return;
  e.preventDefault();
  spZoomBy(e.deltaY<0?1.06:0.94);
},{passive:false});
cv.addEventListener('dblclick',e=>{
  const p=evPos(e);if(!overSp(p)||state.recording)return;
  spReset();
});

