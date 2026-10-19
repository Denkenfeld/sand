/* Level 8 – Salzpfad-Blockade. Destroy the raider stronghold before its final assault. */
(window.DTLV=window.DTLV||[])[7]={
 n:'Salzpfad-Blockade',sub:'Die Plünderer schneiden den Norden ab',
 siege:true,enemySite:10,
 h:17,fixedHeight:true,rn:4,tod:{cycle:250,start:.14,dark:.93},
 th:.9,r0:120,rg:78,rm:58,rc:5,sp0:420,industry:true,aliens:true,
 pre:[{k:'fak',c:2,r:0}],
 wv:[],
 rd:{h:9,w:[[['pl',6],['pz',2]],[['pl',4],['drn',2],['ali',2]],[['pz',4],['br',2],['drn',2]]]},
 p:{sp:.15,rk:.09,ne:.07,ts:.08,gb:.05,rl:.05},
 u:['cv','raf','kas','wel','tur','ene','fab','fak','bore','smelt'],
 t:'Plünderer haben den Salzpfad im Norden besetzt und bedrohen deine Versorgung. Baue eine stabile Basis, grabe dich bis zur Festung in den Reihen 10 bis 15 vor und zerstöre sie. Tippe den Angriffsknopf und dann ein Zielgebiet: Krieger und Crawler rücken gemeinsam aus, Sammler bleiben bei der Arbeit. Nach einem erfolgreichen Angriff kehren die Truppen zur Basis zurück. Halte deine Bänder, Strom-, Wasser- und Munitionsversorgung intakt. Nach dem Entdecken der Festung beginnen drei Angriffswellen; überstehe sie und zerstöre anschließend alle feindlichen Gebäude. Dein Quartier muss überleben.',
 nw:['Festung finden','Angriffsbefehl','Drei Wellen abwehren','Festung zerstören']
};

/* Level 8 mission info button */
(function(){
 const css=document.createElement('style');
 css.textContent=`
 #dt8info{display:flex;align-items:center;justify-content:center;min-width:38px;min-height:38px;
  border:1px solid rgba(255,179,71,.55);border-radius:12px;background:rgba(30,14,36,.9);
  color:#ffe9c9;font:700 17px/1 ui-rounded,system-ui;cursor:pointer}
 #dt8info.on{border-color:#ffb347;color:#ffb347;box-shadow:0 0 12px rgba(255,179,71,.45)}
 #dt8infoPanel{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;
  padding:18px;background:rgba(8,4,13,.82);backdrop-filter:blur(3px)}
 #dt8infoPanel.on{display:flex}
 #dt8infoCard{width:min(560px,94vw);max-height:82vh;overflow:auto;padding:18px;border-radius:18px;
  border:1px solid rgba(255,179,71,.45);background:linear-gradient(165deg,#241028,#120818);
  color:#ffe9c9;font-family:Georgia,serif}
 #dt8infoCard h3{margin:0 0 10px;color:#ffb347;letter-spacing:.14em;font-size:20px}
 #dt8infoCard p{margin:8px 0;font-size:14px;line-height:1.55}
 #dt8infoCard b{color:#72dcff}
 #dt8infoClose{margin-top:12px;width:100%;padding:11px;border-radius:12px;border:1px solid rgba(255,179,71,.5);
  background:#2a1230;color:#ffe9c9;font:700 14px ui-rounded,system-ui}
 `;
 document.head.appendChild(css);

 const open=()=>{
  let p=document.getElementById('dt8infoPanel');
  if(!p){
   p=document.createElement('div');p.id='dt8infoPanel';
   p.innerHTML=`
    <div id="dt8infoCard">
     <h3>SALZPFAD-BLOCKADE</h3>
     <p><b>Ziel:</b> Baue eine stabile Basis, grabe dich nach Norden vor und zerstöre die Plündererfestung in den Reihen 10 bis 15.</p>
     <p><b>Angriff:</b> Tippe den Angriffsknopf und anschließend ein Zielgebiet. Krieger und Crawler rücken aus; Sammler bleiben bei der Arbeit. Nach dem Angriff kehren sie zur Basis zurück.</p>
     <p><b>Verteidigung:</b> Nach dem Entdecken der Festung beginnen drei Angriffswellen. Schütze Bänder, Quartier, Strom-, Wasser- und Munitionsversorgung.</p>
     <p><b>Sieg:</b> Zerstöre alle feindlichen Gebäude der Festung und überlebe mit deinem Quartier.</p>
     <button id="dt8infoClose">Verstanden</button>
    </div>`;
   document.body.appendChild(p);
   p.querySelector('#dt8infoClose').onclick=()=>p.classList.remove('on');
   p.addEventListener('click',e=>{if(e.target===p)p.classList.remove('on')});
  }
  p.classList.add('on');
  const b=document.getElementById('dt8info');if(b)b.classList.add('on');
 };

 const add=()=>{
  const tools=document.getElementById('tools');
  if(!tools||document.getElementById('dt8info'))return;
  const b=document.createElement('button');
  b.id='dt8info';b.type='button';b.title='Mission: Salzpfad-Blockade';
  b.setAttribute('aria-label','Missioninformationen öffnen');
  b.textContent='i';
  b.onclick=open;
  tools.insertBefore(b,tools.firstChild);
 };

 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add,{once:true});
 else add();
})();