/* Formnest Gridfinity & MultiBin unit conversions. Dimensions are always mm internally. */
(function(root){'use strict';
const Gridfinity={pitchX:42,pitchY:42,heightUnit:7};
const MultiBin={pitchX:40,pitchY:40,heightUnit:10};
const xyGridfinity=u=>Gridfinity.pitchX*u-.5,xyMultiBin=u=>MultiBin.pitchX*u-.5;
const zGridfinity=u=>Gridfinity.heightUnit*u,zMultiBin=u=>MultiBin.heightUnit*u;
function unitsGridfinity(mm,axis,pitch,heightUnit){const p=pitch??(axis==='height'?heightUnit??Gridfinity.heightUnit:Gridfinity.pitchX),h=heightUnit??(axis==='height'?Gridfinity.heightUnit:Gridfinity.pitchX);return Math.max(axis==='height'?1:.25,Math.ceil(((axis==='height'?mm/h:(mm+.5)/p)-1e-10)*4)/4)}
function unitsMultiBin(mm,axis,pitch,heightUnit){const p=pitch??(axis==='height'?heightUnit??MultiBin.heightUnit:MultiBin.pitchX),h=heightUnit??(axis==='height'?MultiBin.heightUnit:MultiBin.pitchX);return Math.max(axis==='height'?1:.25,Math.ceil(((axis==='height'?mm/h:(mm+.5)/p)-1e-10)*4)/4)}
function snapGridfinity(o,pitch,heightUnit){return {width:xyGridfinity(unitsGridfinity(o.width,'width',pitch,heightUnit),pitch,heightUnit),depth:xyGridfinity(unitsGridfinity(o.depth,'depth',pitch,heightUnit),pitch,heightUnit),height:zGridfinity(unitsGridfinity(o.height,'height',pitch,heightUnit),pitch,heightUnit)}}
function snapMultiBin(o,pitch,heightUnit){return {width:xyMultiBin(unitsMultiBin(o.width,'width',pitch,heightUnit),pitch,heightUnit),depth:xyMultiBin(unitsMultiBin(o.depth,'depth',pitch,heightUnit),pitch,heightUnit),height:zMultiBin(unitsMultiBin(o.height,'height',pitch,heightUnit),pitch,heightUnit)}}
function snapCustom(o){return {width:o.width,depth:o.depth,height:o.height}}
const api={Gridfinity,MultiBin,xyGridfinity,xyMultiBin,zGridfinity,zMultiBin,unitsGridfinity,unitsMultiBin,snapGridfinity,snapMultiBin,snapCustom};if(typeof module==='object'&&module.exports)module.exports=api;root.BinPresets=api;
})(globalThis);
