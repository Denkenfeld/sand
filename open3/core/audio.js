/* ---------- Audio (Web Audio, komplett synthetisch) ---------- */
let AC=null,A={},mute=false,dayG=1,airT=0,airV=0;
let VOL=1,MUS=1,VOICE=true,GQ=2,SHK=true,PAUSED=false;
const SC=[293.66,311.13,369.99,392,440,466.16,587.33];
function tone(f0,f1,du,v){if(!AC||mute)return;const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+du);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+du*1.3);o.connect(g);g.connect(A.m);o.start(t);o.stop(t+du*1.4)}
function note(){if(AC&&AC.state==='running'&&!mute){const t=AC.currentTime,f=SC[Math.random()*SC.length|0]*(dayG<.3&&Math.random()<.6?.5:1)*(Math.random()<.2?.5:1);
[[1,.12],[2.003,.03]].forEach(([m,v])=>{const o=AC.createOscillator(),g=AC.createGain();o.type='triangle';o.frequency.value=f*m;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.03);g.gain.exponentialRampToValueAtTime(.0005,t+5);o.connect(g);g.connect(A.mb);o.start(t);o.stop(t+5.2)})}
setTimeout(note,3500+Math.random()*4500)}
function initAudio(){
if(AC){if(AC.state==='suspended'&&!PAUSED)AC.resume();return}
const C=window.AudioContext||window.webkitAudioContext;if(!C)return;AC=new C();
const mst=AC.createGain();mst.gain.value=mute?0:VOL*.9;mst.connect(AC.destination);A.m=mst;
const nb=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate),d=nb.getChannelData(0),w=Float32Array.from({length:d.length},()=>Math.random()*2-1);let o=0;
for(let p=0;p<2;p++)for(let i=0;i<d.length;i++){o+=(w[i]-o)*.1;if(p)d[i]=o*3}
A.nb=nb;A.wn=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);{const wd=A.wn.getChannelData(0);for(let i=0;i<wd.length;i++)wd[i]=Math.random()*2-1}
const ns=(type,f,q)=>{const s=AC.createBufferSource();s.buffer=nb;s.loop=true;const fl=AC.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=AC.createGain();g.gain.value=0;s.connect(fl);fl.connect(g);g.connect(mst);s.start();return{f:fl,g}};
A.w=ns('bandpass',500,.6);A.s=ns('lowpass',600,.7);A.b=ns('bandpass',1400,.8);
const e1=AC.createOscillator(),e2=AC.createOscillator(),ef=AC.createBiquadFilter(),eg=AC.createGain();e1.type='sawtooth';e2.type='triangle';ef.type='lowpass';ef.frequency.value=300;eg.gain.value=0;e1.connect(ef);e2.connect(ef);ef.connect(eg);eg.connect(mst);e1.start();e2.start();A.e1=e1;A.e2=e2;A.ef=ef;A.eg=eg;
const mb=AC.createGain();mb.gain.setValueAtTime(0,AC.currentTime);mb.gain.linearRampToValueAtTime(MUS,AC.currentTime+6);mb.connect(mst);A.mb=mb;
[.61,.97].forEach(tm=>{const dl=AC.createDelay(2),fk=AC.createGain(),lp=AC.createBiquadFilter(),wg=AC.createGain();dl.delayTime.value=tm;fk.gain.value=.5;wg.gain.value=.5;lp.type='lowpass';lp.frequency.value=1400;mb.connect(dl);dl.connect(lp);lp.connect(fk);fk.connect(dl);lp.connect(wg);wg.connect(mst)});
[[73.42,.08],[110,.055],[146.83,.03]].forEach(([f,v],i)=>{const o=AC.createOscillator(),g=AC.createGain(),l=AC.createOscillator(),lg=AC.createGain();o.type='sine';o.frequency.value=f*(1+i*.0013);g.gain.value=v;l.frequency.value=.05+i*.03;lg.gain.value=v*.8;l.connect(lg);lg.connect(g.gain);o.connect(g);g.connect(mb);o.start();l.start()});
setTimeout(note,2500)}
function audio(spd,thr,gr){if(!AC)return;const t=AC.currentTime,sp=Math.min(spd/45,1),th=Math.abs(thr);
A.w.g.gain.setTargetAtTime(.05+.16*sp+(boost?.05:0),t,.2);A.w.f.frequency.setTargetAtTime(350+sp*900+Math.sin(tt*.35)*150,t,.3);
A.s.g.gain.setTargetAtTime(gr?.02+.2*sp*sp:0,t,.1);A.s.f.frequency.setTargetAtTime(400+sp*700,t,.2);
A.b.g.gain.setTargetAtTime(boost&&spd>2?.1:0,t,.15);
const rpm=55+spd*2.2+th*18+(boost?25:0);A.e1.frequency.setTargetAtTime(rpm,t,.08);A.e2.frequency.setTargetAtTime(rpm*.5,t,.08);
A.ef.frequency.setTargetAtTime(220+sp*300+th*180,t,.1);A.eg.gain.setTargetAtTime(.05+.08*th+.04*sp,t,.1)}
['pointerup','touchend','click','keydown'].forEach(t=>addEventListener(t,initAudio));
$('mu').addEventListener('click',()=>{mute=!mute;if(mute&&window.speechSynthesis)speechSynthesis.cancel();$('mu').textContent=mute?'🔇':'🔊';applyVol()});
/* ---------- Pause & Einstellungen ---------- */
const pz=$('pz'),pm=$('pm');
try{const c=JSON.parse(localStorage.getItem('dp_cfg')||'{}');if(c.vol!=null)VOL=c.vol;if(c.mus!=null)MUS=c.mus;if(c.voice!=null)VOICE=c.voice;if(c.gq!=null)GQ=c.gq;if(c.shk!=null)SHK=c.shk}catch(e){}
function applyVol(){if(A.m)A.m.gain.setTargetAtTime(mute?0:VOL*.9,AC.currentTime,.05)}
function applyMus(){if(A.mb){const g=A.mb.gain,t=AC.currentTime;g.cancelScheduledValues(t);g.setValueAtTime(MUS,t)}}
function saveCfg(){try{localStorage.setItem('dp_cfg',JSON.stringify({vol:VOL,mus:MUS,voice:VOICE,gq:GQ,shk:SHK}))}catch(e){}}
function syncUI(){$('pm-vol').value=VOL*100;$('pm-mus').value=MUS*100;$('pm-gq').value=GQ;[['pm-voice',VOICE],['pm-shk',SHK]].forEach(([id,v])=>{$(id).classList.toggle('on',v);$(id).setAttribute('aria-pressed',String(v))})}
function setPause(p){if(p===PAUSED)return;PAUSED=p;pm.style.display=p?'grid':'none';
if(p){jp=null;jx=jy=0;jb.style.display='none';boost=0;bo.classList.remove('on');for(const k in K)K[k]=0;syncUI();if(AC&&AC.state==='running')AC.suspend();if(window.speechSynthesis)speechSynthesis.pause()}
else{if(AC&&AC.state==='suspended')AC.resume();if(window.speechSynthesis)speechSynthesis.resume()}}
['pointerdown','pointerup','touchstart','touchend'].forEach(t=>[pz,pm].forEach(el=>el.addEventListener(t,e=>e.stopPropagation(),{passive:true})));
pz.addEventListener('click',()=>setPause(true));$('pm-go').addEventListener('click',()=>setPause(false));
$('pm-vol').addEventListener('input',e=>{VOL=e.target.value/100;applyVol();saveCfg()});
$('pm-mus').addEventListener('input',e=>{MUS=e.target.value/100;applyMus();saveCfg()});
$('pm-voice').addEventListener('click',()=>{VOICE=!VOICE;if(!VOICE&&window.speechSynthesis)speechSynthesis.cancel();syncUI();saveCfg()});
$('pm-shk').addEventListener('click',()=>{SHK=!SHK;syncUI();saveCfg()});
$('pm-gq').addEventListener('change',e=>{GQ=+e.target.value;rs();saveCfg()});
addEventListener('keydown',e=>{if(e.code==='Escape'||e.code==='KeyP')setPause(!PAUSED)});
if(document.addEventListener)document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true)});
const bkm=$('back-to-map');
// Verhindert, dass der Button-Tipp auch die Spielsteuerung auslöst.
['pointerdown','pointerup','touchstart','touchend'].forEach(type=>{bkm.addEventListener(type,event=>{event.stopPropagation()},{passive:true})});
bkm.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();
// Falls nötig: hier deine vorhandene Speicherfunktion aufrufen.
Zones.saveAll();
saveCfg();
try{if(window.parent!==window&&window.parent.DT&&typeof window.parent.DT.go==='function'){window.parent.DT.go('map');return}}catch(_){/* Fallback, falls die übergeordnete Seite nicht erreichbar ist. */}
// Open World wurde direkt geöffnet: zurück zur Haupt-Shell.
window.location.assign(new URL('../index.html#map',window.location.href).href)});

$('pm-reset').addEventListener('click',()=>{if(confirm('Spielstand wirklich löschen? Der Basisbau beginnt dann von vorn.')){Save.reset();location.reload()}});
