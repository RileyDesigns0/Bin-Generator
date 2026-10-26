/* Formnest placement preview. Geometry is committed only on release. */
var BinPlacement={create({mesh,orbit,invalidate,sync,commit}){
 const proxy=new THREE.Object3D(),startPosition=new THREE.Vector3(),startQuaternion=new THREE.Quaternion(),startPivot=new THREE.Vector3(),vertex=new THREE.Vector3();let active=false,initial,orbitEnabled;
 function begin(values){if(active)return;active=true;initial={...values};orbitEnabled=orbit.enabled;orbit.enabled=false;startPosition.copy(mesh.position);startPivot.copy(proxy.position);startQuaternion.copy(proxy.quaternion);invalidate();}
 // Source geometry is already canonically rotated/grounded; only the drag delta is applied here.
 function liveMinZ(delta){
  if(delta.x===0&&delta.y===0&&delta.z===0)return mesh.geometry.boundingBox.min.z+mesh.position.z;
  const positions=mesh.geometry.attributes.position;let minZ=Infinity;
  mesh.updateMatrixWorld(true);
  for(let i=0;i<positions.count;i++){vertex.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);minZ=Math.min(minZ,vertex.z);}
  return minZ;
 }
 function preview(){if(!active)return;const delta=proxy.quaternion.clone().multiply(startQuaternion.clone().invert());mesh.quaternion.copy(delta);mesh.position.copy(startPosition).sub(startPivot).applyQuaternion(delta).add(proxy.position);const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(initial.rx*Math.PI/180,initial.ry*Math.PI/180,initial.rz*Math.PI/180,'ZYX'));rotation.premultiply(delta);const e=new THREE.Euler().setFromQuaternion(rotation,'ZYX');sync({rx:e.x*180/Math.PI,ry:e.y*180/Math.PI,rz:e.z*180/Math.PI,offsetX:initial.offsetX+proxy.position.x-startPivot.x,offsetY:initial.offsetY+proxy.position.y-startPivot.y,offsetZ:(initial.offsetZ||0)+liveMinZ(delta)-(startPosition.z+mesh.geometry.boundingBox.min.z)});}
 function end(){if(!active)return;active=false;orbit.enabled=orbitEnabled;commit();}
 function reset(){mesh.geometry.computeBoundingBox();mesh.geometry.boundingBox.getCenter(proxy.position).add(mesh.position);proxy.quaternion.identity();}
 reset();return {proxy,begin,preview,end,reset,get dragging(){return active}};
}};
