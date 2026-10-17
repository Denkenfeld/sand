/* Film-Bibliothek: wiederverwendbare Szenenteile */
const HUT=[[27,-8,10,10,13,[170,130,110]],[-30,6,13,9,9,[140,110,125]],[14,30,5,5,7,[120,80,80]],[-16,-28,5,5,7,[120,80,80]]],DC=[[34,26],[-38,-18],[-8,40]],NI=[[4,5,20],[14,12,44],[40,28,72]],DY=[[26,10,48],[106,42,90],[255,154,90]];
const palD=(t,n,sto,rays,se)=>{const nit=t<n;for(let i=0;i<3;i++)SKY[i]=nit?NI[i]:DY[i];SUN.e=se==null?.1:se;SUN.a=nit?0:1;STAR.b=nit?1:0;return{nit,sto:sto||0,tint:'',rays:rays||0}};
const bell=(T,f,v)=>{V(O,T,f,{w:'sine',v,a:.003,r:2.8});V(O,T,f*2.76,{w:'sine',v:v*.3,a:.003,r:1.6})};
function beat(A,v0,dv){for(let k=0;k<28;k++){const v=Math.min(1.2,(v0||.5)+(dv||.1)*k);A(.3+7*k,T=>{thump(T,v,52);thump(T+.3,v*.6,46)})}}
function theme(A,t0,v){[[0,62,3],[3,69,1],[4,67,2],[6,65,2]].forEach(([b,m,d])=>A(t0+b*.625,T=>{brass(T,mt(m),d*.625,.2*v);brass(T,mt(m-12),d*.625,.1*v)}))}
function crackle(A,a,b,n){for(let k=0;k<n;k++)A(a+hash(k)*(b-a),T=>N(O,T,.03,.07,'highpass',3000,6000,1,.001,.05))}
function sil(x,y,h,col){g.fillStyle=col;g.beginPath();g.arc(x,y-h*.9,h*.12,0,TAU);g.fill();g.beginPath();g.moveTo(x-h*.12,y);g.lineTo(x-h*.09,y-h*.75);g.lineTo(x+h*.09,y-h*.75);g.lineTo(x+h*.12,y);g.fill()}
function base(t,nt){const F=.7+.3*Math.sin(t*17)*Math.sin(t*11);ship(t,[CX,CZ,PL,0],0,0);
 'KOLIBRI'.split('').forEach((ch,i)=>{const p=P(CX,PL+27-i*3.5,CZ);if(!p||p[2]*3.2<6)return;Q.push([p[3]-4,()=>{g.font=`400 ${3.2*p[2]}px Impact,Haettenschweiler,sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#e8742f';g.fillText(ch,p[0],p[1])}])});
 for(const[dx,dz,w,d,h,col]of HUT){box(CX+dx,CZ+dz,w,d,h,col,PL);if(nt){glow(CX+dx,PL+h*.55,CZ+dz,w*1.4,'255,190,110',.7,1);glow(CX+dx,PL+1,CZ+dz,w*2.4,'255,170,90',.35,1)}}
 DC.forEach(([dx,dz],i)=>{box(CX+dx,CZ+dz,3,3,16,[130,190,200],PL);ball(CX+dx,PL+16.8,CZ+dz,2,'#e8fbff','#6ab8c8','#1b4a60');glow(CX+dx,PL+18.5,CZ+dz,1.2+.8*Math.sin(t*3+i*2)**2,'220,250,255',.6,1)});
 glow(CX-12,PL+1.5,CZ-14,5*F,'255,150,50',.95,1);glow(CX-12,PL+3,CZ-14,2.4*F,'255,220,140',.95,1)}
function crowd(x,z,n,t,up,cup){for(let i=0;i<n;i++){const a=x+((i%4)-1.5)*4.2+Math.sin(i*7)*.9,b=z-((i/4|0))*4+Math.cos(i*5)*.9;human(a,gh(a,b),b,3.8,i%3?'#2fa7c9':'#e2a23f','#72dcff',t*2.5+i*1.3,up&&i%5!=3,cup)}}
function row(x,z,n,t,suit,vis,dx,dz,h,up){for(let i=0;i<n;i++){const a=x+dx*i+Math.sin(i*3)*.6,b=z+dz*i+Math.cos(i*2)*.6;human(a,gh(a,b),b,h||4.2,suit,vis,t*1.7+i*1.1,up,0)}}
function wormAt(x,z,h,t,tame,R,H){worm({x,z,R:R||12,H:H||100,tame:tame?1:0,h},t)}
function pillar(x,z,t,up,rgb){if(up<=0)return;const y=gh(x,z);for(let k=0;k<26;k++){const f=k/25;glow(x+Math.sin(k*.5+t*2)*1.2,y+f*200*up,z,(7+k*.6)*(.5+.5*up),rgb||'255,200,100',.36*(1-f*.8)*up,1)}glow(x,y+3,z,32,rgb||'255,210,120',.7*up,1);for(let i=0;i<30;i++){const a=i*.9+t*2,rr=3+(i%7)*.9,f=(t*.12+i*.07)%1;glow(x+Math.cos(a)*rr,y+f*190*up,z+Math.sin(a)*rr,.9,'255,235,160',.9*(1-f),1)}}
function rings(x,z,u,rgb,sp){if(u<0||u>3)return;const y=gh(x,z)+2;for(let k=0;k<34;k++){const a=k/34*TAU;glow(x+Math.cos(a)*u*sp,y,z+Math.sin(a)*u*sp,4+u*3,rgb||'255,200,100',.7*(1-u/3),1)}}
function stille(x,y,z,s,t,al){const p=P(x,y,z);if(!p||al<=0)return;Q.push([p[3],()=>{const R=s*p[2];g.globalAlpha=al;let q=g.createRadialGradient(p[0],p[1],R*.2,p[0],p[1],R*1.9);q.addColorStop(0,'rgba(0,0,0,.95)');q.addColorStop(.5,'rgba(10,0,20,.7)');q.addColorStop(1,'rgba(60,20,110,0)');g.fillStyle=q;g.beginPath();g.ellipse(p[0],p[1],R*1.9,R*.9,0,0,TAU);g.fill();g.fillStyle='#050208';g.beginPath();g.ellipse(p[0],p[1],R,R*.38,0,0,TAU);g.fill();g.strokeStyle='#9a5aff';g.lineWidth=Math.max(1,R*.05);g.stroke();g.fillStyle=`rgba(255,70,140,${.6+.4*Math.sin(t*3+x)})`;g.beginPath();g.arc(p[0],p[1],R*.1,0,TAU);g.fill();g.globalAlpha=1}])}
function motes(t,al,sp){const sn=Math.sin(cam.yaw),cs=Math.cos(cam.yaw);for(let i=0;i<26;i++){const m=((hash(i)*220+t*(sp||14)*(1+i%5*.2))%220)-110;glow(cam.x+m*cs+sn*(10+hash(i+2)*90),cam.y+(hash(i+5)-.5)*30,cam.z-m*sn+cs*(10+hash(i+2)*90),.35,'255,200,140',al||.7,1)}}
function nullv(W,Hh,t,u,bl){const cx=W/2,cy=Hh*.5,R=Hh*.2;let gr=g.createRadialGradient(cx,cy,0,cx,cy,W*.7);gr.addColorStop(0,'#1a0a30');gr.addColorStop(1,'#020006');g.fillStyle=gr;g.fillRect(0,0,W,Hh);
 for(let i=0;i<120;i++){g.fillStyle=`rgba(255,235,255,${.2+.5*hash(i)})`;g.fillRect(hash(i+1)*W,hash(i+2)*Hh,1.5,1.5)}
 g.save();g.translate(cx,cy);g.scale(1,.28);g.rotate(-.1);for(let k=0;k<9;k++){g.strokeStyle=`rgba(${bl?255:170},${bl?240:90},${bl?220:255},${.5-k*.04})`;g.lineWidth=R*(.12-k*.01);g.beginPath();g.arc(0,0,R*(1.5+k*.22),0,TAU);g.stroke()}
 for(let i=0;i<160;i++){const a=hash(i)*TAU+u*.15*(1+hash(i+3)),r=R*(1.6+hash(i+9)*2);g.fillStyle='#000';g.fillRect(Math.cos(a)*r,Math.sin(a)*r,3,3)}g.restore();
 gr=g.createRadialGradient(cx,cy,R*.9,cx,cy,R*1.5);gr.addColorStop(0,bl?'rgba(255,255,255,.9)':'rgba(150,60,255,.7)');gr.addColorStop(1,'rgba(100,30,200,0)');g.fillStyle=gr;g.beginPath();g.arc(cx,cy,R*1.5,0,TAU);g.fill();g.fillStyle='#000';g.beginPath();g.arc(cx,cy,R,0,TAU);g.fill();
 const op=S(1,3,u)*(1-(bl||0)*.9);g.fillStyle=`rgba(255,${bl?255:60},${bl?255:150},${op})`;g.beginPath();g.ellipse(cx,cy,R*.08,R*.5*op+1,0,0,TAU);g.fill()}
