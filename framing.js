/* Aspect-aware sphere framing; resizing scales the existing orbit, not its orientation. */
var BinFraming={
 fitDistance(radius,fov,aspect){const vertical=fov*Math.PI/360,horizontal=Math.atan(Math.tan(vertical)*Math.max(aspect,1e-6));return Math.max(radius,.001)*1.1/Math.sin(Math.min(vertical,horizontal));},
 resizeDistance(distance,oldFit,newFit){return distance*newFit/oldFit;}
};
