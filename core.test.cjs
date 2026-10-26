const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Core=fs.existsSync(__dirname+'/core.js')?require('./core.js'):{};
const ascii=s=>new TextEncoder().encode(s).buffer;
const tri=(z=0)=>new Float32Array([-1,-1,z, 1,-1,z, 0,1,z]);
test('smoothNormals blends curved shared vertices without changing positions',()=>{
 const v=new Float32Array([0,0,0,1,0,0,0,1,0, 1,0,0,0,0,0,0,-1,.4]),copy=v.slice();
 const n=Core.smoothNormals(v);assert.deepEqual(v,copy);assert.equal(n.length,v.length);
 assert.ok(n[1]>0&&n[2]>0.9);assert.deepEqual([...n.slice(0,3)],[...n.slice(12,15)]);
 for(let i=0;i<n.length;i+=3)assert.ok(Math.abs(Math.hypot(...n.slice(i,i+3))-1)<1e-6);
});
test('smoothNormals preserves hard edges and handles degenerate triangles',()=>{
 const v=new Float32Array([0,0,0,1,0,0,0,1,0, 1,0,0,0,0,0,0,0,1]);const n=Core.smoothNormals(v);
 assert.deepEqual([...n.slice(0,3)],[0,0,1]);assert.deepEqual([...n.slice(12,15)],[0,1,0]);
 assert.ok([...Core.smoothNormals(new Float32Array(9))].every(Number.isFinite));
 assert.throws(()=>Core.smoothNormals(v,-1));
});
test('transformNormals rotates normals without centering, grounding, scaling or mutation',()=>{
 const n=new Float32Array([0,0,1,0,1,0,1,0,0]),copy=n.slice();
 const out=Core.transformNormals(n,{rx:90,rz:90,scale:25.4});
 for(let i=0;i<3;i++)assert.ok(Math.abs(out[i]-[1,0,0][i])<1e-6);
 assert.deepEqual(n,copy);for(let i=0;i<9;i+=3)assert.ok(Math.abs(Math.hypot(...out.slice(i,i+3))-1)<1e-6);
 assert.throws(()=>Core.transformNormals(n,{rx:NaN}));
});
test('transform rotates XYZ in degrees then scales, centers XY, grounds Z',()=>{
 const b=Core.bounds(Core.transform(new Float32Array([0,0,0, 2,0,0, 0,3,4]),{rx:90,ry:0,rz:90,scale:2}));
 for(let i=0;i<3;i++)assert.ok(Math.abs(b.size[i]-[8,4,6][i])<1e-5);
 assert.equal(b.min[2],0);assert.ok(Math.abs(b.min[0]+b.max[0])<1e-5);assert.ok(Math.abs(b.min[1]+b.max[1])<1e-5);
 assert.throws(()=>Core.transform(tri(),{scale:0}));
 assert.throws(()=>Core.bounds(new Float32Array([NaN])));
});
test('STEP worker preserves indexed CAD normals and applies selected quality with shared triangle limit',async()=>{
 const vm=require('node:vm'),ui=fs.readFileSync(__dirname+'/ui.html','utf8'),code=ui.match(/\+`\\nlet stepKernel;([\s\S]*?)`;\n/)[1];
 let received,reply;const mesh={index:{array:[0,1,2]},attributes:{position:{array:[0,0,0,1,0,0,0,1,0]},normal:{array:[0,0,1,0,.2,.98,.2,0,.98]}}};
 const context={BinCore:Core,BinRefine:{},Uint8Array,Float32Array,atob:()=>'',postMessage:x=>reply=x,occtimportjs:async()=>({ReadStepFile:(data,options)=>{received=options;return {success:true,meshes:[mesh]}}})};
 vm.createContext(context);vm.runInContext('let stepKernel;'+code,context);
 await context.onmessage({data:{id:1,type:'step',data:new ArrayBuffer(0),wasm:'',options:{quality:'ultra'}}});
 assert.equal(received.angularDeflection,.1);assert.equal(received.linearDeflection,.01);assert.deepEqual([...reply.out.normals],Array.from(new Float32Array(mesh.attributes.normal.array)));assert.equal(reply.out.positions.length,9);
 mesh.index.array=new Uint32Array(350001*3);await context.onmessage({data:{id:2,type:'step',data:new ArrayBuffer(0),options:{quality:'standard'}}});assert.match(reply.error,/350000/);
 assert.match(ui,/id="stepQuality"/);assert.match(ui,/Reimport.*quality/i);assert.match(ui,/id="smoothCavity"/);
});
const opts={width:20,depth:20,height:12,wall:1,floor:2,clearance:0,resolution:0.5,offsetX:0,offsetY:0};
function sample(b,x,y){let i=Math.round((x+opts.width/2)/b.dx),j=Math.round((y+opts.depth/2)/b.dy);return b.heights[j*b.nx+i];}
test('bin removes from lowest intersection to rim including thin triangles',()=>{
 const v=new Float32Array([...tri(0),...tri(5), 3.01,0,2, 3.02,0,2, 3.015,2,2]);
 const b=Core.buildBin(v,opts);
 assert.equal(sample(b,0,0),2);assert.ok(sample(b,3,1)<=4);assert.equal(sample(b,7,7),12);
 assert.ok(b.positions instanceof Float32Array);assert.ok(b.heights instanceof Float64Array);
 assert.equal(b.heights.length,b.nx*b.ny);assert.equal(b.stats.triangleCount,b.positions.length/9);
});
test('rejects invalid configuration, source outside walls/rim and numerical wall erosion',()=>{
 for(const change of [{width:0},{floor:12},{wall:11},{clearance:-1},{resolution:0},{resolution:0.001},{offsetX:9},{height:2.5,clearance:1}])assert.throws(()=>Core.buildBin(tri(),{...opts,...change}),JSON.stringify(change));
 assert.throws(()=>Core.buildBin(tri(),{...opts,offsetX:7.7}),/resolution|wall/i);
});
function meshMetrics(v){const edges=new Map();let volume=0;for(let i=0;i<v.length;i+=9){const p=[Array.from(v.slice(i,i+3)),Array.from(v.slice(i+3,i+6)),Array.from(v.slice(i+6,i+9))];const [a,b,c]=p;const cross=[b[1]*c[2]-b[2]*c[1],b[2]*c[0]-b[0]*c[2],b[0]*c[1]-b[1]*c[0]];volume+=a.reduce((s,n,k)=>s+n*cross[k],0)/6;for(let k=0;k<3;k++){const a=p[k].join(','),b=p[(k+1)%3].join(','),key=[a,b].sort().join('|');const e=edges.get(key)||[0,0];e[0]++;e[1]+=a<b?1:-1;edges.set(key,e);}}return {edges,volume};}
test('binary export round trips and demo bin is closed outward manifold with preserved floor and walls',()=>{
 const demo=Core.demoModel();const b=Core.buildBin(demo,{...opts,width:50,depth:50,height:30,clearance:0.7});
 const v=b.positions;const {edges,volume}=meshMetrics(v);for(const [key,[n,d]] of edges){assert.equal(n,2,key);assert.equal(d,0,key);}assert.ok(volume>0);
 for(let j=0;j<b.ny;j++)for(let i=0;i<b.nx;i++){const h=b.heights[j*b.nx+i];assert.ok(h>=2&&h<=30);if(!i||!j||i===b.nx-1||j===b.ny-1)assert.equal(h,30);}
 const exported=Core.binarySTL(v);assert.ok(exported instanceof ArrayBuffer);assert.equal(exported.byteLength,84+v.length/9*50);assert.deepEqual(Core.parseSTL(exported),v);
 assert.throws(()=>Core.binarySTL(new Float32Array([NaN])));
});
test('Euclidean clearance shrinks a hole instead of scaling its opening outward',()=>{
 const quad=(x0,y0,x1,y1)=>[x0,y0,0,x1,y0,0,x1,y1,0,x0,y0,0,x1,y1,0,x0,y1,0];
 const frame=new Float32Array([...quad(-6,-6,-3,6),...quad(3,-6,6,6),...quad(-3,-6,3,-3),...quad(-3,3,3,6)]);
 const zero=Core.buildBin(frame,{...opts,resolution:0.1});const offset=Core.buildBin(frame,{...opts,resolution:0.1,clearance:1});
 assert.equal(sample(zero,2,0),12);assert.ok(sample(offset,2,0)<3);assert.equal(sample(offset,0,0),12);
 assert.equal(sample(offset,5,0),2);assert.ok(sample(offset,6.8,0)<3);assert.ok(sample(offset,6.8,0)>2);
});
test('maximum supported grid can export and parse its own generated triangle count',()=>{
 const b=Core.buildBin(tri(),{...opts,resolution:0.08});assert.ok(b.positions.length/9>200000);
 assert.deepEqual(Core.parseSTL(Core.binarySTL(b.positions)),b.positions);
});
test('offset uses spherical distance, not square or cylindrical clearance',()=>{
 const point=new Float32Array([0,0,0,0,0,1,0,0,2]);const b=Core.buildBin(point,{...opts,resolution:0.25,clearance:1});
 assert.equal(sample(b,1.5,1.5),12);assert.ok(Math.abs(sample(b,1.25,0)-(3-Math.sqrt(1-0.75**2)))<1e-10);
});
test('browser/worker global loads without a DOM and demo source itself is manifold',()=>{
 const vm=require('node:vm'),sandbox={TextEncoder,TextDecoder,ArrayBuffer,Float32Array,Float64Array,Uint8Array,DataView};vm.runInNewContext(fs.readFileSync(__dirname+'/core.js','utf8'),sandbox);assert.equal(typeof sandbox.BinCore.buildBin,'function');
 const {edges,volume}=meshMetrics(Core.demoModel());for(const [, [n,d]] of edges){assert.equal(n,2);assert.equal(d,0);}assert.ok(volume>0);
 const b=sandbox.BinCore.buildBin(tri(),opts);assert.ok(b.positions.length>0);
});
test('binary parsing rejects truncated and nonfinite coordinates and oversized meshes',()=>{
 const binary=Core.binarySTL(tri());new Uint8Array(binary).set(new TextEncoder().encode('solid misleading binary header'));
 assert.deepEqual(Core.parseSTL(binary),tri());const invalid=binary.slice(0);new DataView(invalid).setFloat32(96,Infinity,true);assert.throws(()=>Core.parseSTL(invalid));assert.throws(()=>Core.parseSTL(binary.slice(0,-1)));
 assert.throws(()=>Core.bounds(new Float32Array(350001*9)));
});
test('build grounds a translated source at floor plus clearance without mutating vertices',()=>{
 const v=tri(25),copy=v.slice(),b=Core.buildBin(v,{...opts,clearance:0.6});assert.deepEqual(v,copy);assert.equal(sample(b,0,0),2);
});
test('ASCII STL parses triangles and rejects malformed/nonfinite data',()=>{
 assert.equal(typeof Core.parseSTL,'function');
 assert.deepEqual([...Core.parseSTL(ascii('solid t\nfacet normal 0 0 1\nouter loop\nvertex -1 -1 0\nvertex 1 -1 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid'))],[...tri()]);
 assert.throws(()=>Core.parseSTL(ascii('solid empty endsolid')));
 assert.throws(()=>Core.parseSTL(ascii('solid x vertex NaN 0 0 endsolid')));
});

test('elevation raises cavity depths without reducing the floor and validates elevated top',()=>{
 const v=new Float32Array([...tri(0),...tri(5)]),base=Core.buildBin(v,opts),raised=Core.buildBin(v,{...opts,offsetZ:3});
 assert.equal(sample(raised,0,0),sample(base,0,0)+3);
 for(const offsetZ of [-1,NaN,Infinity,6])assert.throws(()=>Core.buildBin(v,{...opts,offsetZ}));
 assert.doesNotThrow(()=>Core.buildBin(v,{...opts,offsetZ:5}));
});
