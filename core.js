/* Dependency-free, worker-safe geometry. All distances in millimeters. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BinCore=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const MAX_TRIANGLES=350000, MAX_AXIS=320, MAX_NODES=75000;
function validate(v){if(!v||!v.length||v.length%9||v.length/9>MAX_TRIANGLES)throw Error('Expected 1–350000 triangles');for(let i=0;i<v.length;i++)if(!Number.isFinite(v[i]))throw Error('Nonfinite vertex');}
function parseSTL(buffer){
 if(!(buffer instanceof ArrayBuffer))throw Error('STL must be an ArrayBuffer');
 const bytes=new Uint8Array(buffer);let out;
 if(bytes.length>=84&&84+new DataView(buffer).getUint32(80,true)*50===bytes.length){
  const view=new DataView(buffer),n=view.getUint32(80,true);if(!n||n>MAX_TRIANGLES)throw Error('STL triangle limit');out=new Float32Array(n*9);
  for(let i=0;i<n;i++)for(let j=0;j<9;j++)out[i*9+j]=view.getFloat32(84+i*50+12+j*4,true);
 }else{
  const text=new TextDecoder().decode(bytes);if(!/^\s*solid\b/i.test(text))throw Error('Invalid STL');
  const vals=[];const re=/\bvertex\s+(\S+)\s+(\S+)\s+(\S+)/gi;let m;
  while((m=re.exec(text))){vals.push(Number(m[1]),Number(m[2]),Number(m[3]));if(vals.length>MAX_TRIANGLES*9)throw Error('STL triangle limit');}out=new Float32Array(vals);
 }validate(out);return out;
}
function bounds(v){validate(v);const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<v.length;i++){let a=i%3;min[a]=Math.min(min[a],v[i]);max[a]=Math.max(max[a],v[i]);}return {min,max,size:max.map((x,i)=>x-min[i])};}
function transform(v,options={}){
 validate(v);const {rx=0,ry=0,rz=0,scale=1}=options;if(![rx,ry,rz,scale].every(Number.isFinite)||scale<=0)throw Error('Invalid transform');
 const [a,b,c]=[rx,ry,rz].map(x=>x*Math.PI/180),out=new Float32Array(v.length);
 for(let i=0;i<v.length;i+=3){let x=v[i],y=v[i+1]*Math.cos(a)-v[i+2]*Math.sin(a),z=v[i+1]*Math.sin(a)+v[i+2]*Math.cos(a);let xx=x*Math.cos(b)+z*Math.sin(b);z=-x*Math.sin(b)+z*Math.cos(b);x=xx;out[i]=(x*Math.cos(c)-y*Math.sin(c))*scale;out[i+1]=(x*Math.sin(c)+y*Math.cos(c))*scale;out[i+2]=z*scale;}
 const box=bounds(out),cx=(box.min[0]+box.max[0])/2,cy=(box.min[1]+box.max[1])/2;for(let i=0;i<out.length;i+=3){out[i]-=cx;out[i+1]-=cy;out[i+2]-=box.min[2];}return out;
}
function transformNormals(v,{rx=0,ry=0,rz=0}={}){
 validate(v);if(![rx,ry,rz].every(Number.isFinite))throw Error('Invalid normal rotation');
 const [a,b,c]=[rx,ry,rz].map(x=>x*Math.PI/180),out=new Float32Array(v.length);
 for(let i=0;i<v.length;i+=3){const x=v[i],y=v[i+1]*Math.cos(a)-v[i+2]*Math.sin(a),z=v[i+1]*Math.sin(a)+v[i+2]*Math.cos(a),xx=x*Math.cos(b)+z*Math.sin(b),zz=-x*Math.sin(b)+z*Math.cos(b);out[i]=xx*Math.cos(c)-y*Math.sin(c);out[i+1]=xx*Math.sin(c)+y*Math.cos(c);out[i+2]=zz;}return out;
}
// Shading only: weld exact duplicate coordinates, never move or scale a vertex.
function smoothNormals(v,creaseDegrees=45){
 validate(v);if(!Number.isFinite(creaseDegrees)||creaseDegrees<0||creaseDegrees>180)throw Error('Invalid crease angle');
 const faces=new Float32Array(v.length/3),groups=new Map(),keys=new Array(v.length/3),out=new Float32Array(v.length),threshold=Math.cos(creaseDegrees*Math.PI/180);
 for(let i=0;i<v.length;i+=9){const ux=v[i+3]-v[i],uy=v[i+4]-v[i+1],uz=v[i+5]-v[i+2],vx=v[i+6]-v[i],vy=v[i+7]-v[i+1],vz=v[i+8]-v[i+2];const x=uy*vz-uz*vy,y=uz*vx-ux*vz,z=ux*vy-uy*vx,len=Math.hypot(x,y,z)||1,f=i/3;faces[f]=x/len;faces[f+1]=y/len;faces[f+2]=z/len;
  for(let k=0;k<9;k+=3){const key=v[i+k]+','+v[i+k+1]+','+v[i+k+2];keys[(i+k)/3]=key;let g=groups.get(key);if(!g)groups.set(key,g=[]);if(g[g.length-1]!==f)g.push(f);}
 }
 for(let i=0;i<v.length;i+=3){const f=Math.floor(i/9)*3,nx=faces[f],ny=faces[f+1],nz=faces[f+2];let x=0,y=0,z=0;
  for(const g of groups.get(keys[i/3]))if(nx*faces[g]+ny*faces[g+1]+nz*faces[g+2]>=threshold-1e-7){x+=faces[g];y+=faces[g+1];z+=faces[g+2];}
  const len=Math.hypot(x,y,z)||1;out[i]=x/len;out[i+1]=y/len;out[i+2]=z/len;
 }return out;
}
// Clip even degenerate projected triangles: vertical faces and slivers must survive.
function clip(poly,axis,value,greater){const result=[];if(!poly.length)return result;let a=poly[poly.length-1],ain=greater?a[axis]>=value:a[axis]<=value;for(const b of poly){const bin=greater?b[axis]>=value:b[axis]<=value;if(ain!==bin){const t=(value-a[axis])/(b[axis]-a[axis]);result.push(a.map((x,k)=>x+(b[k]-x)*t));}if(bin)result.push(b);a=b;ain=bin;}return result;}
function buildBin(v,options){
 const box=bounds(v);const {width,depth,height,wall,floor,clearance=0,resolution=1,offsetX=0,offsetY=0}=options||{};
 if(![width,depth,height,wall,floor,clearance,resolution,offsetX,offsetY].every(Number.isFinite)||width<=0||depth<=0||height<=0||wall<=0||floor<=0||clearance<0||resolution<=0||2*wall>=Math.min(width,depth)||floor>=height)throw Error('Invalid bin dimensions, wall, floor, clearance or resolution');
 if(box.min[0]+offsetX-clearance < -width/2+wall || box.max[0]+offsetX+clearance > width/2-wall || box.min[1]+offsetY-clearance < -depth/2+wall || box.max[1]+offsetY+clearance > depth/2-wall)throw Error('Source plus clearance does not fit inside walls');
 if(box.size[2]+floor+2*clearance>height)throw Error('Source plus clearance exceeds bin rim height');
 const nx=Math.ceil(width/resolution)+1,ny=Math.ceil(depth/resolution)+1,dx=width/(nx-1),dy=depth/(ny-1);
 if(nx>MAX_AXIS||ny>MAX_AXIS||nx*ny>MAX_NODES)throw Error('Resolution too fine: maximum 320 nodes/axis and 75000 nodes');
 const cells=new Float64Array((nx-1)*(ny-1));cells.fill(Infinity);const heights=new Float64Array(nx*ny);heights.fill(height);let work=0,occupied=0;
 const X=i=>-width/2+i*dx,Y=j=>-depth/2+j*dy;
 for(let t=0;t<v.length;t+=9){const p=[];for(let k=0;k<9;k+=3)p.push([v[t+k]+offsetX,v[t+k+1]+offsetY,v[t+k+2]-box.min[2]+floor+clearance]);
  const ix0=Math.max(0,Math.floor((Math.min(...p.map(a=>a[0]))+width/2)/dx)-1),ix1=Math.min(nx-2,Math.floor((Math.max(...p.map(a=>a[0]))+width/2)/dx));
  const iy0=Math.max(0,Math.floor((Math.min(...p.map(a=>a[1]))+depth/2)/dy)-1),iy1=Math.min(ny-2,Math.floor((Math.max(...p.map(a=>a[1]))+depth/2)/dy));
  for(let j=iy0;j<=iy1;j++)for(let i=ix0;i<=ix1;i++){if(++work>12000000)throw Error('Raster work limit: simplify mesh or increase resolution');let q=clip(p,0,X(i),true);q=clip(q,0,X(i+1),false);q=clip(q,1,Y(j),true);q=clip(q,1,Y(j+1),false);if(q.length){const n=j*(nx-1)+i;cells[n]=Math.min(cells[n],...q.map(a=>a[2]));}}
 }
 // Each node is assigned a lower bound over ALL its incident cells. Linear
 // interpolation therefore cannot intrude into the conservatively swept cavity.
 for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){const h=cells[j*(nx-1)+i];if(!Number.isFinite(h))continue;occupied++;
  const ex=Math.ceil(clearance/dx)+2,ey=Math.ceil(clearance/dy)+2;
  for(let b=Math.max(0,j-ey);b<=Math.min(ny-1,j+1+ey);b++)for(let a=Math.max(0,i-ex);a<=Math.min(nx-1,i+1+ex);a++){
   if(++work>32000000)throw Error('Offset work limit: increase resolution or reduce clearance');
   const sx=Math.max(0,X(i)-(X(a)+dx),(X(a)-dx)-X(i+1)),sy=Math.max(0,Y(j)-(Y(b)+dy),(Y(b)-dy)-Y(j+1)),d2=sx*sx+sy*sy;
   if(d2<=clearance*clearance+1e-12){const z=Math.max(floor,h-Math.sqrt(Math.max(0,clearance*clearance-d2)));heights[b*nx+a]=Math.min(heights[b*nx+a],z);}
  }
 }
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++)if(heights[j*nx+i]<height && (X(i)-dx < -width/2+wall-1e-9 || X(i)+dx > width/2-wall+1e-9 || Y(j)-dy < -depth/2+wall-1e-9 || Y(j)+dy > depth/2-wall+1e-9))throw Error('Conservative raster would erode wall: use finer resolution, enlarge bin or move source inward');
 const out=[];const point=(i,j,z)=>[X(i),Y(j),z];const emit=(a,b,c)=>out.push(...a,...b,...c);
 for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){
  const a=point(i,j,heights[j*nx+i]),b=point(i+1,j,heights[j*nx+i+1]),c=point(i+1,j+1,heights[(j+1)*nx+i+1]),d=point(i,j+1,heights[(j+1)*nx+i]);emit(a,b,c);emit(a,c,d);
  const A=point(i,j,0),B=point(i+1,j,0),C=point(i+1,j+1,0),D=point(i,j+1,0);emit(A,C,B);emit(A,D,C);
 }
 const side=(i,j,k,l)=>{const a=point(i,j,0),b=point(k,l,0),c=point(k,l,heights[l*nx+k]),d=point(i,j,heights[j*nx+i]);emit(a,b,c);emit(a,c,d);};
 for(let i=0;i<nx-1;i++){side(i,0,i+1,0);side(i+1,ny-1,i,ny-1);}for(let j=0;j<ny-1;j++){side(nx-1,j,nx-1,j+1);side(0,j+1,0,j);}
 const positions=new Float32Array(out);return {positions,heights,nx,ny,dx,dy,stats:{triangleCount:positions.length/9,sourceTriangleCount:v.length/9,occupiedCells:occupied,requestedResolution:resolution,resolutionX:dx,resolutionY:dy,approximate:true,method:'Conservative lower-envelope raster, Euclidean ball offset, continuous triangulated heightfield',maxHorizontalOvercut:3*Math.hypot(dx,dy),work}};
}
function binarySTL(v){validate(v);const n=v.length/9,buffer=new ArrayBuffer(84+n*50),view=new DataView(buffer);new Uint8Array(buffer).set(new TextEncoder().encode('BinCore conservative heightfield approximation; millimeters'));view.setUint32(80,n,true);for(let t=0;t<n;t++){let i=t*9,o=84+t*50;const ux=v[i+3]-v[i],uy=v[i+4]-v[i+1],uz=v[i+5]-v[i+2],vx=v[i+6]-v[i],vy=v[i+7]-v[i+1],vz=v[i+8]-v[i+2];let normal=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx],len=Math.hypot(...normal)||1;for(let k=0;k<3;k++)view.setFloat32(o+k*4,normal[k]/len,true);for(let k=0;k<9;k++)view.setFloat32(o+12+k*4,v[i+k],true);}return buffer;}
function demoModel(){
 // T-shaped extrusion with overhang shoulders. A planar triangulation of its
 // polygonal caps avoids internal faces and keeps this example closed too.
 const poly=[[-4,0],[4,0],[4,9],[9,9],[9,14],[-9,14],[-9,9],[-4,9]],out=[];
 const p=(i,y)=>[poly[i][0],y,poly[i][1]],emit=(a,b,c)=>out.push(...a,...b,...c);
 // Ear clipping in XZ, polygon counterclockwise.
 let ids=poly.map((_,i)=>i);const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 while(ids.length>2){let found=false;for(let k=0;k<ids.length;k++){let a=ids[(k+ids.length-1)%ids.length],b=ids[k],c=ids[(k+1)%ids.length];if(cross(poly[a],poly[b],poly[c])<=0)continue;const inside=ids.some(i=>i!==a&&i!==b&&i!==c&&cross(poly[a],poly[b],poly[i])>=0&&cross(poly[b],poly[c],poly[i])>=0&&cross(poly[c],poly[a],poly[i])>=0);if(inside)continue;emit(p(a,-5),p(b,-5),p(c,-5));emit(p(a,5),p(c,5),p(b,5));ids.splice(k,1);found=true;break;}if(!found)throw Error('Demo triangulation');}
 for(let i=0;i<poly.length;i++){let j=(i+1)%poly.length;emit(p(i,-5),p(i,5),p(j,5));emit(p(i,-5),p(j,5),p(j,-5));}return new Float32Array(out);
}
return {parseSTL,bounds,transform,transformNormals,smoothNormals,buildBin,binarySTL,demoModel};
});
