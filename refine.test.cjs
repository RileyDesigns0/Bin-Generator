const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const Core=require('./core.js');const R=fs.existsSync(__dirname+'/refine.js')?require('./refine.js'):{};
const opts={width:50,depth:40,height:24,wall:2,floor:2,clearance:.3,resolution:.5,smoothing:6};
test('conservative transition rounding changes exported mesh without moving source or intruding into cavity',()=>{
 assert.equal(typeof R.smoothBin,'function');
 const raw=Core.buildBin(Core.demoModel(),opts),before=raw.positions.slice(),smooth=R.smoothBin(raw,opts);
 assert.deepEqual(raw.positions,before);assert.notDeepEqual(smooth.positions,raw.positions);
 let changed=0;for(let j=0;j<raw.ny;j++)for(let i=0;i<raw.nx;i++){const k=j*raw.nx+i,h=smooth.heights[k];assert.ok(h<=raw.heights[k]+1e-12);assert.ok(h>=opts.floor);if(h<raw.heights[k])changed++;const x=-opts.width/2+i*raw.dx,y=-opts.depth/2+j*raw.dy;if(Math.abs(x)>=opts.width/2-opts.wall||Math.abs(y)>=opts.depth/2-opts.wall)assert.equal(h,opts.height);}
 assert.ok(changed>0);assert.equal(smooth.positions.length,raw.positions.length);
 const edges=new Map();let volume=0;for(let i=0;i<smooth.positions.length;i+=9){const a=Array.from(smooth.positions.slice(i,i+3)),b=Array.from(smooth.positions.slice(i+3,i+6)),c=Array.from(smooth.positions.slice(i+6,i+9));volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;for(const [u,v] of [[a,b],[b,c],[c,a]]){const key=[u.join(','),v.join(',')].sort().join('|');edges.set(key,(edges.get(key)||0)+1)}}assert.ok(volume>0);for(const n of edges.values())assert.equal(n,2);
 assert.deepEqual(Core.parseSTL(Core.binarySTL(smooth.positions)),smooth.positions);
 assert.equal(R.smoothBin(raw,{...opts,smoothing:0}),raw);
});
