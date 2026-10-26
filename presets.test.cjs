const {test}=require('node:test'),assert=require('node:assert/strict');
test('Gridfinity conversion rounds upward to quarter units without shrinking',()=>{const p=require('./presets.js');assert.equal(p.xy(1),41.5);assert.equal(p.z(1.25),8.75);assert.deepEqual(p.snap({width:120,depth:90,height:40}),{width:125.5,depth:94,height:40.25});assert.equal(p.units(7,'height'),1);});
