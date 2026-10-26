const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
test('portable workspace has import, fit, orientation, generation and export controls',()=>{
 const html=fs.existsSync(__dirname+'/ui.html')?fs.readFileSync(__dirname+'/ui.html','utf8'):'';
 for(const id of ['file','width','depth','height','wall','floor','clearance','resolution','rx','ry','rz','generate','export','demo','viewport']) assert.ok(html.includes(`id="${id}"`),`missing control ${id}`);
 assert.ok(!/<script[^>]+src=["']https?:/.test(html));
 assert.ok(html.includes('new Worker('),'geometry must not block UI');
 assert.ok(html.includes("document.querySelectorAll('aside input, aside select')"),'configuration must be disabled during async work');
 assert.ok(html.includes('pendingReject'),'worker failure must reject the active request');
});
