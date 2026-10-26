'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const G=require('./gridfinity.js');
const Core=require('./core.js');
const ready=require('./vendor/manifold.js')({wasmBinary:fs.readFileSync(__dirname+'/vendor/manifold.wasm')}).then(k=>{k.setup();return k;});
function positions(s){const m=s.getMesh(),out=new Float32Array(m.triVerts.length*3);m.triVerts.forEach((v,i)=>out.set(m.vertProperties.subarray(v*m.numProp,v*m.numProp+3),i*3));return out;}
function solid(k,p){const verts=[],ids=[],map=new Map();for(let i=0;i<p.length;i+=3){const key=Array.from(p.subarray(i,i+3)).join(',');let id=map.get(key);if(id===undefined){id=verts.length/3;map.set(key,id);verts.push(...p.subarray(i,i+3));}ids.push(id);}return new k.Manifold(new k.Mesh({numProp:3,vertProperties:new Float32Array(verts),triVerts:new Uint32Array(ids)}));}
function closed(p){const edges=new Map();for(let i=0;i<p.length;i+=9){const v=[0,3,6].map(j=>Array.from(p.subarray(i+j,i+j+3)).join(','));for(let j=0;j<3;j++){const a=v[j],b=v[(j+1)%3],key=a<b?a+'|'+b:b+'|'+a;const e=edges.get(key)||[0,0];e[0]++;e[1]+=a<b?1:-1;edges.set(key,e);}}for(const e of edges.values())assert.deepEqual(e,[2,0]);}
function near(a,b,t=2e-4){assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);}
test('real kernel produces one closed bin and socket plate with exact feet and clearance',async()=>{
 const k=await ready;
 for(const [width,depth] of [[41.5,41.5],[83.5,41.5],[52,20.5],[10,10]]){
  const box=k.Manifold.cube([width,depth,21]).translate([-width/2,-depth/2,0]);
  const result=G.build({kernel:k,bodyPositions:positions(box),width,depth,height:21});box.delete();
  assert.ok(result.binPositions instanceof Float32Array);assert.ok(result.basePositions instanceof Float32Array);
  for(const p of [result.binPositions,result.basePositions]){closed(p);const s=solid(k,p);assert.equal(s.status(),'NoError');assert.ok(s.volume()>0);const parts=s.decompose();assert.equal(parts.length,1);parts.forEach(p=>p.delete());s.delete();}
  const bin=solid(k,result.binPositions),plate=solid(k,result.basePositions);
  near(bin.boundingBox().min[2],0);near(bin.boundingBox().max[2],21);near(plate.boundingBox().max[2],7);
  near(plate.boundingBox().max[0]-plate.boundingBox().min[0],width+.5);
  const cell=result.layout.cells[0];
  for(const [z,w] of [[2,36.3],[2.35,36.3],[3.05,37.7],[4.85,37.7],[6.99999,42]]){
   const slice=plate.slice(z),polys=slice.toPolygons();
   // Socket rings may touch the exterior at the very top; inspect below rim.
   const holes=polys.filter(poly=>poly.every(p=>p[0]>=cell.x-cell.width/2-1e-4&&p[0]<=cell.x+cell.width/2+1e-4&&p[1]>=cell.y-cell.depth/2-1e-4&&p[1]<=cell.y+cell.depth/2+1e-4));
   assert.ok(holes.length);const hole=holes.sort((a,b)=>b.length-a.length)[0];near(Math.max(...hole.map(p=>p[0]))-Math.min(...hole.map(p=>p[0])),w-(42-cell.width),.001);slice.delete();
  }
  for(const [z,w,r] of [[0,35.6,.8],[.8,37.2,1.6],[2.6,37.2,1.6],[4.74999,41.5,3.75]]){
   const slice=bin.slice(z),polys=slice.toPolygons();const points=polys.flat().filter(p=>p[0]<cell.x+cell.width/2-.1&&p[0]>cell.x-cell.width/2+.1&&p[1]<cell.y+cell.depth/2-.1&&p[1]>cell.y-cell.depth/2+.1);
   near(Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0])),w-(42-cell.width),.001);
   const rr=Math.min(r,(w-(42-cell.width))/2,(w-(42-cell.depth))/2);assert.ok(points.some(p=>Math.abs(p[0]-(cell.x+(w-(42-cell.width))/2-rr))<.002));slice.delete();
  }
  // Female socket is 5mm high, male foot 4.75mm: seat bridge on plate rim.
  near(result.stats.seatingZ,2.25);const seated=bin.translate([0,0,result.stats.seatingZ]);const collision=seated.intersect(plate);near(collision.volume(),0);collision.delete();seated.delete();bin.delete();plate.delete();
  assert.equal(result.stats.binStatus,'NoError');assert.equal(result.stats.baseStatus,'NoError');
 }
});
test('conservative core body retains nominal height and floor while low input is rejected',async()=>{
 const k=await ready,body=Core.buildBin(Core.demoModel(),{width:41.5,depth:41.5,height:28,wall:2,floor:7,resolution:2});
 const r=G.build({kernel:k,bodyPositions:body.positions,width:41.5,depth:41.5,height:28});near(Core.bounds(r.binPositions).max[2],28);closed(r.binPositions);
 assert.throws(()=>G.build({kernel:k,bodyPositions:body.positions,width:41.5,depth:41.5,height:5}),/height|bounds/i);
});
test('42mm pitch layout supports quarter cells and exact custom dimensions',()=>{
 const a=G.makeLayout(83.5,41.5);assert.equal(a.cells.length,2);assert.equal(a.standardCompatible,true);assert.equal(a.pitchWidth,84);
 const b=G.makeLayout(52,20.5);assert.equal(b.cells.length,2);assert.equal(b.standardCompatible,false);assert.deepEqual(b.columns,[42,10.5]);assert.deepEqual(b.rows,[21]);
 const c=G.makeLayout(49.5,41.5);assert.deepEqual(c.columns,[39.5,10.5]);assert.equal(c.pitchWidth,50);
 assert.throws(()=>G.makeLayout(9,41.5),/10.5/);assert.throws(()=>G.makeLayout(4200,4200),/limit/);
});
