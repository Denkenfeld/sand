/* ---------- Kamera & Loop ---------- */
const camPos=pos.clone().addScaledVector(d0,4),cUp=d0.clone(),cF=new V3(0,0,-1).applyQuaternion(q);
const emit=(p,v)=>{pp[pi*3]=p.x;pp[pi*3+1]=p.y;pp[pi*3+2]=p.z;pv[pi].copy(v);pl[pi]=1;pi=(pi+1)%NP};
const sandBase=new T.Color();let last=0,tt=0;
function frame(now){requestAnimationFrame(frame);if(PAUSED){last=now;return}const dt=Math.min((now-last)/1000||.016,.04);last=now;tt+=dt;
sun.applyAxisAngle(sAx,dt*(exploded?.03:.012)*SUNK);
let tx=(Math.abs(jx)>.1?jx:0)*1.15+((K.KeyD||K.ArrowRight)?1:0)-((K.KeyA||K.ArrowLeft)?1:0);
let ty=(Math.abs(jy)>.1?-jy:0)*1.25+((K.KeyW||K.ArrowUp)?1:0)-((K.KeyS||K.ArrowDown)?1:0);
if(K.ShiftLeft||K.ShiftRight)boost=1;else if(!bo.classList.contains('on'))boost=0;
if(FRZ){tx=ty=0;boost=0;jumpReq=0}
st+=(cl(tx,-1,1)-st)*Math.min(1,dt*8);thr=cl(ty,-1,1);
step(dt/2);step(dt/2);spd=vel.length();
const up=pos.clone().normalize(),fw=new V3(0,0,-1).applyQuaternion(q);
const gr=cOn[0]||cOn[1]||cOn[2]||cOn[3],vU=vel.dot(up);
if(!gr){airT+=dt;airV=Math.min(airV,vU)}else{if(airT>.2&&airV<-4)tone(110,38,.3,.35*cl(-airV/14,0,1));airT=0;airV=0}
car.position.copy(pos);car.quaternion.copy(q);
const fr=Math.max(0,Math.min(1,dt*(boost?60:30)));
// Kamera
cUp.lerp(up,1-Math.exp(-dt*4)).normalize();
const f2=fw.clone().addScaledVector(up,-fw.dot(up)).normalize();cF.lerp(f2,1-Math.exp(-dt*3.5));cF.addScaledVector(up,-cF.dot(up)).normalize();
const tgt=pos.clone().addScaledVector(cF,-(8.5+spd*.03)).addScaledVector(up,3.6);camPos.lerp(tgt,1-Math.exp(-dt*6));
const gh=H(camPos.clone().normalize())+1.4;if(camPos.length()<gh)camPos.setLength(gh);
camera.position.copy(camPos);camera.up.copy(cUp);camera.lookAt(pos.clone().addScaledVector(up,1.1).addScaledVector(cF,4));
if(SHK&&shake>.01)camera.position.add(new V3(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(shake*1.2));
camera.fov=Lp(camera.fov,62+Math.min(spd,60)*.28+(boost?7:0),dt*4);camera.updateProjectionMatrix();
// Licht & Uniforms
const dayF=sm(-.1,.3,up.dot(sun)),tw=Math.exp(-Math.abs(up.dot(sun)+.03)*8);Gfx.frame(dt,tt,dayF,pos.distanceTo(BPOS),{spd,vf,st,boost,comp});
dirL.position.copy(pos).addScaledVector(sun,60);dirL.target.position.copy(pos);dirL.intensity=.05+1.9*sm(-.12,.1,up.dot(sun));
dirL.color.setRGB(1,Lp(.9,.55,tw),Lp(.8,.3,tw));hemi.intensity=.15+.75*dayF;
U.uSun.value.copy(sun);U.uCam.value.copy(camPos);U.uT.value=tt;dayG=dayF;audio(spd,thr,gr);game(dt,up,f2);finale(dt,up);Zones.update(dt,tt);Radar.frame(dt,tt);
planetMat.uniforms.uLP.value.copy(pos).addScaledVector(up,.5);planetMat.uniforms.uLD.value.copy(fw).addScaledVector(up,-.12).normalize();
sky.position.copy(camPos);
// Schatten-Blob
{const N=TN(up),r=new V3().crossVectors(fw.clone().addScaledVector(N,-fw.dot(N)).normalize(),N),f=new V3().crossVectors(N,r).negate();
shadow.position.copy(up).multiplyScalar(H(up)+.08);shadow.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(r,f.negate(),N));shadow.material.opacity=.15+.6*dayF*(1-Math.min(1,(pos.length()-H(up))/4))}
// Staub
if(spd>4)for(let i=2;i<4;i++)if(cOn[i]&&Math.random()<spd*dt*(boost?2.2:1.2))emit(cp[i],vel.clone().multiplyScalar(.35).addScaledVector(up,1+Math.random()*2).add(new V3(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(2)));
for(let i=0;i<NP;i++){if(pl[i]>0){pl[i]-=dt*.9;pp[i*3]+=pv[i].x*dt;pp[i*3+1]+=pv[i].y*dt;pp[i*3+2]+=pv[i].z*dt;pv[i].multiplyScalar(1-dt*1.8);pa[i]=Math.max(pl[i],0);ps[i]=.8+(1-pl[i])*4}else pa[i]=0}
pg.attributes.position.needsUpdate=pg.attributes.aA.needsUpdate=pg.attributes.aS.needsUpdate=true;
dustMat.uniforms.uCol.value.setRGB(.5,.32,.2).multiplyScalar(.15+1.1*dayF);
$('sp').textContent=Math.round(spd*3.6);
renderer.render(scene,camera)}
function rs(){const pr=Math.min(devicePixelRatio,GQ===0?1:GQ===1?1.5:(innerWidth<900?1.75:2));renderer.setPixelRatio(pr);renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;dustMat.uniforms.uSz.value=innerHeight*pr*.8;if(window.GC&&GC.pointSz)GC.pointSz.value=innerHeight*pr*1.4}
addEventListener('resize',rs);rs();
setTimeout(()=>{build();$('ld').remove();requestAnimationFrame(frame)},60);
