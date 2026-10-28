/* ---------- Physik: Starrkörper, 4 Federbeine, Kugelgravität ---------- */
const d0=new V3(.3,.85,.4).normalize(),tb=new V3().crossVectors(d0,new V3(0,1,0)).normalize(),bd=d0.clone().addScaledVector(tb,30/R).normalize();
BH=H0(bd);BD=bd;const cu=new V3().crossVectors(bd,new V3(0,0,1)).normalize(),cv=new V3().crossVectors(bd,cu);CD=bd.clone().multiplyScalar(Math.cos(380/R)).addScaledVector(cu.clone().multiplyScalar(Math.cos(.9)).addScaledVector(cv,Math.sin(.9)),Math.sin(380/R)).normalize();CH=H0(CD);BPOS=bd.clone().multiplyScalar(BH);
const pos=d0.clone().multiplyScalar(H(d0)+3),vel=new V3(),om=new V3(),fw0=tb.clone().applyAxisAngle(d0,.45),q=new Q().setFromRotationMatrix(new T.Matrix4().makeBasis(new V3().crossVectors(fw0,d0),d0,fw0.clone().negate()));
const sun=d0.clone().multiplyScalar(.3).addScaledVector(new V3().crossVectors(d0,new V3(0,0,1)).normalize(),.95).normalize();
const sAx=new V3().crossVectors(d0,sun).normalize(),cp=[0,1,2,3].map(()=>new V3()),cOn=[0,0,0,0],comp=[0,0,0,0];
let st=0,thr=0,spd=0,vf=0,G=15;
function step(dt){
const up=pos.clone().normalize(),N=TN(up);let acc=new V3(),tq=new V3(),n=0;
for(let i=0;i<4;i++){const r=LP[i].clone().applyQuaternion(q),wp=pos.clone().add(r),wl=wp.length(),wd=wp.clone().divideScalar(wl),c=H(wd)+S0-wl;cOn[i]=c>0;comp[i]=cl(c,0,1.1);
if(c>0){n++;const pv2=vel.clone().add(om.clone().cross(r));let F=16*comp[i]*(c>.6?3:1)-4.4*pv2.dot(N);
if(F>0){const f=N.clone().multiplyScalar(F);acc.add(f);tq.add(r.clone().cross(f))}cp[i].copy(wd).multiplyScalar(wl-S0+c)}}
vel.addScaledVector(acc,dt).addScaledVector(up,-G*(n?1+Math.min(vel.length(),60)/70:1)*dt);om.addScaledVector(tq,dt/1.4).multiplyScalar(1-dt*1.8);
const ub=new V3(0,1,0).applyQuaternion(q);om.addScaledVector(ub.clone().cross(n?N:up),dt*(n?3:2.5));
const w=om.length();if(w>1e-5)q.premultiply(new Q().setFromAxisAngle(om.clone().divideScalar(w),w*dt));q.normalize();
if(n){const fr=n/4,fw=new V3(0,0,-1).applyQuaternion(q);fw.addScaledVector(N,-fw.dot(N)).normalize();const rt=new V3().crossVectors(fw,N);
vf=vel.dot(fw);const vr=vel.dot(rt),vm=boost?58:34,ac=boost?46:28;
if(thr>0)vel.addScaledVector(fw,thr*ac*fr*dt*Math.max(0,1-Math.max(vf,0)/vm));
else if(thr<0)vel.addScaledVector(fw,thr*(vf>0?60:20)*fr*dt*(vf>-12?1:0));
vel.addScaledVector(rt,-vr*Math.min(1,dt*6*fr));vel.addScaledVector(fw,-vf*dt*.25*fr);
q.premultiply(new Q().setFromAxisAngle(N,-st*1.7*cl(vf/8,-1,1)/(1+Math.abs(vf)*.02)*dt*fr));
if(jumpReq&&fr>.4){vel.addScaledVector(up,9);tone(200,420,.14,.07)}}
jumpReq=0;pos.addScaledVector(vel,dt);
const d2=pos.clone().normalize(),gh=H(d2)+.6;if(pos.length()<gh){pos.copy(d2).multiplyScalar(gh);const vn2=vel.dot(d2);if(vn2<0)vel.addScaledVector(d2,-vn2*1.1)}
const rl0=pos.clone().sub(BPOS);rl0.addScaledVector(BD,-rl0.dot(BD));const rl=rl0.length();if(rl<SHR&&!exploded){rl0.divideScalar(rl||1);pos.addScaledVector(rl0,SHR-rl);const vi=vel.dot(rl0);if(vi<0)vel.addScaledVector(rl0,-vi*1.4)}}
