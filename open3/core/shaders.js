/* ---------- Shader ---------- */
const SK=`uniform vec3 uSun;
float hs(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
vec3 skyCol(vec3 d,vec3 up){float e=dot(d,up),su=dot(up,uSun),day=smoothstep(-.18,.25,su),tw=exp(-abs(su+.03)*8.),sg=smoothstep(-.1,.05,su);
vec3 zen=mix(vec3(.002,.004,.015),vec3(.12,.27,.62),day),hor=mix(vec3(.01,.015,.035),vec3(.8,.55,.38),day);
hor=mix(hor,vec3(1.,.28,.08),tw*.85);
vec3 c=mix(hor,zen,pow(clamp(e,0.,1.),.5));c*=mix(1.,.3,clamp(-e*3.,0.,1.));
float sd=max(dot(d,uSun),0.);
c+=vec3(1.,.6,.3)*pow(sd,6.)*(.2+tw)*sg+vec3(1.,.9,.75)*smoothstep(.9992,.9997,sd)*8.*sg;
return c;}`;
const END=`
#include <tonemapping_fragment>
#include <encodings_fragment>
`;
const U={uSun:{value:new V3()},uCam:{value:new V3()},uT:{value:0}};
const planetMat=new T.ShaderMaterial({uniforms:{...U,uLP:{value:new V3()},uLD:{value:new V3()},uEx:{value:new V3()},uExI:{value:0},uTL:{value:[new T.Vector4(),new T.Vector4(),new T.Vector4(),new T.Vector4()]}},
vertexShader:`attribute float aC;varying vec3 vP,vN;varying float vC;
void main(){vP=position;vN=normal;vC=aC;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
fragmentShader:SK+`varying vec3 vP,vN;varying float vC;uniform vec3 uCam,uLP,uLD,uEx;uniform float uExI;uniform vec4 uTL[4];
vec3 tlt(vec4 L,vec3 P,vec3 n,vec3 b){vec3 d=L.xyz-P;float l=length(d);return b*vec3(1.7,.8,.32)*L.w*max(dot(n,d/l),0.)/(1.+l*l*.006);}
void main(){vec3 up=normalize(vP),N=normalize(vN),V=uCam-vP;float di=length(V);V/=di;
vec3 W1=vec3(.8,.1,.6),W2=vec3(-.5,.7,.3);
float p1=dot(vP,W1)*5.+sin(dot(vP,W2)*.7)*3.,p2=dot(vP,W2)*17.,k=1.-smoothstep(6.,140.,di);
vec3 t1=W1-N*dot(W1,N),t2=W2-N*dot(W2,N);
vec3 n=normalize(N-t1*cos(p1)*.07*k-t2*cos(p2)*.05*k);
float nd=dot(n,uSun),su=dot(up,uSun),dayl=smoothstep(-.1,.3,su);
vec3 base=mix(vec3(.62,.33,.14),vec3(.30,.11,.06),smoothstep(.25,.75,vC));
vec3 lc=mix(vec3(1.6,.6,.25),vec3(1.7,1.5,1.25),smoothstep(0.,.5,su));
float dif=smoothstep(-.02,.45,nd)*smoothstep(-.15,.08,su);
vec3 amb=mix(vec3(.01,.015,.04),vec3(.22,.28,.4),dayl)*(.6+.4*dot(n,up));
vec3 c=base*(lc*dif+amb);
c+=base*vec3(.9,.25,.1)*pow(clamp(1.-abs(nd),0.,1.),4.)*dif*.25;
float sp=step(.975,hs(floor(vP*40.)))*pow(max(dot(normalize(uSun+V),n),0.),24.)*dif*(1.-smoothstep(3.,50.,di));
c+=vec3(1.,.9,.7)*sp*3.;
vec3 tl=vP-uLP;float dl=length(tl);tl/=dl;
float cone=smoothstep(.86,.97,dot(tl,uLD))*smoothstep(0.,2.,dl)/(1.+dl*dl*.003);
c+=base*vec3(1.4,1.25,1.)*cone*max(dot(n,-tl),0.)*3.5;
c+=tlt(uTL[0],vP,n,base)+tlt(uTL[1],vP,n,base)+tlt(uTL[2],vP,n,base)+tlt(uTL[3],vP,n,base);
vec3 te=uEx-vP;float de=length(te);c+=base*vec3(1.8,.75,.28)*uExI*max(dot(n,te/de),0.)/(1.+de*de*.0015);
vec3 uc=normalize(uCam),fd=normalize(-V-uc*dot(-V,uc)*.8+uc*.05);
c=mix(c,skyCol(fd,uc),1.-exp(-di*.0085));
gl_FragColor=vec4(c,1.);`+END+`}`});
const skyMat=new T.ShaderMaterial({uniforms:U,side:T.BackSide,depthWrite:false,depthTest:false,
vertexShader:`varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
fragmentShader:SK+`varying vec3 vD;uniform vec3 uCam;uniform float uT;
void main(){vec3 d=normalize(vD),up=normalize(uCam);vec3 c=skyCol(d,up);float day=smoothstep(-.18,.25,dot(up,uSun)),ab=step(-.02,dot(d,up));
vec3 s=d*170.,id=floor(s);float h=hs(id);
c+=vec3(.8,.9,1.)*step(.993,h)*(1.-smoothstep(0.,.4,length(fract(s)-.5)))*(.5+.5*sin(uT*3.+h*99.))*(1.-day)*1.5;
vec3 m1=normalize(vec3(-.5,.55,.7)),m2=normalize(vec3(.7,.35,-.6));
c=mix(c,vec3(.8,.75,.7)*clamp(.5+dot(d-m1,uSun)*25.,.2,1.),smoothstep(.9988,.9992,dot(d,m1))*ab);
c=mix(c,vec3(.55,.65,.8)*clamp(.5+dot(d-m2,uSun)*40.,.2,1.),smoothstep(.9994,.9996,dot(d,m2))*ab);
gl_FragColor=vec4(c,1.);`+END+`}`});
