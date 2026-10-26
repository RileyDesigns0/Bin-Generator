/* Gridfinity geometry in millimeters; worker-safe, no network or DOM dependencies. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BinGridfinity=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const PITCH=42, GAP=.5, MAX_CELLS=100, MAX_SPAN=840;
function makeLayout(width,depth){
 if(![width,depth].every(Number.isFinite)||Math.min(width,depth)+GAP<10.5)throw Error('Gridfinity minimum pitch span is 10.5 mm');
 if(Math.max(width,depth)>MAX_SPAN)throw Error('Gridfinity dimension limit is 840 mm');
 function split(n){const a=[];while(n>42+1e-7){a.push(42);n-=42;}if(n>1e-7)a.push(n);if(a.length>1&&a[a.length-1]<10.5){const d=10.5-a[a.length-1];a[a.length-2]-=d;a[a.length-1]=10.5;}return a;}
 const columns=split(width+GAP),rows=split(depth+GAP);
 if(columns.length*rows.length>MAX_CELLS)throw Error('Gridfinity cell limit is 100');
 const cells=[];let y=-(depth+GAP)/2;for(const sy of rows){let x=-(width+GAP)/2;for(const sx of columns){cells.push({x:x+sx/2,y:y+sy/2,width:sx,depth:sy});x+=sx;}y+=sy;}
 const standardCompatible=columns.every(x=>Math.abs(x-42)<1e-6)&&rows.every(x=>Math.abs(x-42)<1e-6);
 return {width,depth,pitchWidth:width+GAP,pitchDepth:depth+GAP,columns,rows,cells,standardCompatible,requiresMatchingBaseplate:!standardCompatible,label:standardCompatible?'Standard Gridfinity':'Custom Gridfinity — matching baseplate required'};
}
// Exact profile levels from gridfinity-rebuilt standard.scad BASE_PROFILE;
// female socket levels from gridfinity-baseplate.scad. No lip or hardware holes.
const FOOT=[[0,35.6,.8],[.8,37.2,1.6],[2.6,37.2,1.6],[4.75,41.5,3.75]];
const SOCKET=[[0,36.3,1.15],[.35,36.3,1.15],[1.05,37.7,1.85],[2.85,37.7,1.85],[5,42,4]];
function build({kernel:k,bodyPositions,width,depth,height}={}){
 const layout=makeLayout(width,depth);
 if(!k||!k.Manifold||!k.Mesh)throw Error('Initialized manifold kernel required');
 if(!Number.isFinite(height)||height<7)throw Error('Gridfinity nominal height must be at least 7 mm');
 if(!bodyPositions||!bodyPositions.length||bodyPositions.length%9||bodyPositions.length>350000*9)throw Error('Expected closed bodyPositions, at most 350000 triangles');
 const owned=[],hold=x=>(owned.push(x),x),M=k.Manifold;
 function check(s,name){const status=s.status();if(status!=='NoError'||s.isEmpty())throw Error(name+' kernel status: '+status);return s;}
 function output(s){const mesh=s.getMesh(),out=new Float32Array(mesh.triVerts.length*3);mesh.triVerts.forEach((v,i)=>{for(let a=0;a<3;a++)out[i*3+a]=mesh.vertProperties[v*mesh.numProp+a];});return out;}
 function fromPositions(p){const map=new Map(),verts=[],ids=[];for(let i=0;i<p.length;i+=3){if(![p[i],p[i+1],p[i+2]].every(Number.isFinite))throw Error('Nonfinite body vertex');const key=p[i]+','+p[i+1]+','+p[i+2];let id=map.get(key);if(id===undefined){id=verts.length/3;map.set(key,id);verts.push(p[i],p[i+1],p[i+2]);}ids.push(id);}return hold(new M(new k.Mesh({numProp:3,vertProperties:new Float32Array(verts),triVerts:new Uint32Array(ids)})));}
 // Corresponding rounded-rectangle rings preserve straight sides, corner radii,
 // and 45-degree profile slopes (unlike uniform scaled extrusions).
 function profile(cell,levels,zOffset){const verts=[],ids=[],segments=8,n=4*(segments+1);
  for(const [z,w,r] of levels){const sx=w-(42-cell.width),sy=w-(42-cell.depth),radius=Math.min(r,sx/2,sy/2);for(let corner=0;corner<4;corner++){const angle=corner*Math.PI/2,cx=(corner===0||corner===3?1:-1)*(sx/2-radius),cy=(corner<2?1:-1)*(sy/2-radius);for(let j=0;j<=segments;j++){const a=angle+j*Math.PI/(2*segments);verts.push(cell.x+cx+radius*Math.cos(a),cell.y+cy+radius*Math.sin(a),z+zOffset);}}}
  for(let l=0;l<levels.length-1;l++)for(let j=0;j<n;j++){const a=l*n+j,b=l*n+(j+1)%n,c=b+n,d=a+n;ids.push(a,b,c,a,c,d);}
  for(let j=1;j<n-1;j++){ids.push(0,j+1,j);const top=(levels.length-1)*n;ids.push(top,top+j,top+j+1);}
  return check(hold(new M(new k.Mesh({numProp:3,vertProperties:new Float32Array(verts),triVerts:new Uint32Array(ids)}))),'Profile');
 }
 try{
  const body=check(fromPositions(bodyPositions),'Body'),box=body.boundingBox();
  if(Math.abs(box.min[2])>.001||Math.abs(box.max[2]-height)>.001||Math.abs(box.min[0]+width/2)>.001||Math.abs(box.max[0]-width/2)>.001||Math.abs(box.min[1]+depth/2)>.001||Math.abs(box.max[1]-depth/2)>.001)throw Error('Body bounds must match centered width/depth and nominal height z0..height');
  const trimmed=hold(body.trimByPlane([0,0,1],4.75));
  // A core floor >=7mm is required: no cavity may penetrate the bridge.
  const lower=hold(body.trimByPlane([0,0,-1],-7));const expected=width*depth*7;
  if(Math.abs(lower.volume()-expected)>Math.max(.01,expected*1e-5))throw Error('Body cavity floor must be at least 7 mm');
  const feet=layout.cells.map(c=>profile(c,FOOT,0));
  const bin=check(hold(M.union([trimmed,...feet])),'Bin');
  const blank=hold(M.cube([layout.pitchWidth,layout.pitchDepth,7]).translate([-layout.pitchWidth/2,-layout.pitchDepth/2,0]));
  const sockets=layout.cells.map(c=>profile(c,SOCKET,2));
  const cutters=hold(M.union(sockets)),base=check(hold(blank.subtract(cutters)),'Baseplate');
  return {binPositions:output(bin),basePositions:output(base),layout,stats:{binStatus:bin.status(),baseStatus:base.status(),binVolume:bin.volume(),baseVolume:base.volume(),cellCount:layout.cells.length,nominalHeight:height,footHeight:4.75,bridgeHeight:2.25,baseHeight:7,baseBottom:2,seatingZ:2.25,standardCompatible:layout.standardCompatible,requiresMatchingBaseplate:layout.requiresMatchingBaseplate,hardwareHoles:false,stackingLip:false,profileSegmentsPerCorner:8}};
 }finally{for(let i=owned.length-1;i>=0;i--)owned[i].delete();}
}
return {makeLayout,build};
});
