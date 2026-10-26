/* Conservative cavity transition rounding: removes material only, never fills a cavity. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BinRefine=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function smoothBin(bin,options){
 const passes=options.smoothing||0;if(!passes)return bin;
 if(!Number.isInteger(passes)||passes<0||passes>12)throw Error('Smoothing must be 0–12 iterations');
 const {nx,ny,dx,dy}=bin,{width,depth,wall,floor}=options;
 let current=bin.heights.slice();
 // Keep the protected wall band untouched. A min-limited low-pass operator can
 // only enlarge the existing upward-swept void, so insertion safety survives.
 for(let pass=0;pass<passes;pass++){
  const next=current.slice();
  for(let j=1;j<ny-1;j++)for(let i=1;i<nx-1;i++){
   const x=-width/2+i*dx,y=-depth/2+j*dy;
   if(Math.abs(x)+dx>width/2-wall||Math.abs(y)+dy>depth/2-wall)continue;
   const k=j*nx+i;
   const average=(4*current[k]+2*(current[k-1]+current[k+1]+current[k-nx]+current[k+nx])+current[k-nx-1]+current[k-nx+1]+current[k+nx-1]+current[k+nx+1])/16;
   next[k]=Math.max(floor,Math.min(current[k],average));
  }
  current=next;
 }
 const positions=bin.positions.slice();
 // Every non-bottom vertex belongs to the graph top or its outer boundary.
 // Remap identical XY vertices identically, preserving welded topology.
 for(let k=0;k<positions.length;k+=3){if(positions[k+2]===0)continue;
  const i=Math.max(0,Math.min(nx-1,Math.round((positions[k]+width/2)/dx)));
  const j=Math.max(0,Math.min(ny-1,Math.round((positions[k+1]+depth/2)/dy)));
  positions[k+2]=current[j*nx+i];
 }
 return {...bin,positions,heights:current,stats:{...bin.stats,smoothingPasses:passes,smoothingMethod:'Downward-only conservative transition rounding (additional clearance, not a precision fillet)'}};
}
return {smoothBin};
});
