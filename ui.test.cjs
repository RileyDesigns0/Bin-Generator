const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
test('portable workspace has import, fit, orientation, generation and export controls',()=>{
 const html=fs.existsSync(__dirname+'/ui.html')?fs.readFileSync(__dirname+'/ui.html','utf8'):'';
 for(const id of ['file','width','depth','height','wall','floor','clearance','resolution','rx','ry','rz','generate','export','demo','viewport']) assert.ok(html.includes(`id="${id}"`),`missing control ${id}`);
 assert.ok(!/<script[^>]+src=["']https?:/.test(html));
 assert.ok(html.includes('new Worker('),'geometry must not block UI');
 assert.ok(html.includes("document.querySelectorAll('aside input, aside select')"),'configuration must be disabled during async work');
 assert.ok(html.includes('pendingReject'),'worker failure must reject the active request');
});
test('gizmo controls and standalone bundle include r128 transform dependency without visible licensing panel',()=>{const html=fs.readFileSync(__dirname+'/ui.html','utf8'),build=fs.readFileSync(__dirname+'/build.py','utf8');for(const id of ['move','rotate'])assert.ok(html.includes('id="'+id+'"'));assert.ok(html.includes('THREE.TransformControls'));assert.ok(html.includes("'dragging-changed'"));assert.ok(build.includes('TransformControls.js'));assert.ok(!html.includes('Bundled: Three.js'));assert.ok(!build.includes("notices+'</aside>'"));});

test('desktop shell keeps viewport right and sidebar independently scrollable at every size',()=>{
 const html=fs.readFileSync(__dirname+'/ui.html','utf8'),css=html.split('<style>')[1].split('</style>')[0];
 assert.doesNotMatch(css,/grid-row:1|main\{[^}]*grid-template-columns:1fr/,'never stack workspace above controls');
 assert.match(css,/main\{[^}]*grid-template-columns:clamp\(240px,30vw,334px\) minmax\(300px,1fr\)/);
 assert.match(css,/body\{[^}]*height:100vh;[^}]*height:100dvh/);
 assert.match(css,/main\{[^}]*min-height:0/);
 assert.match(css,/aside\{[^}]*height:100%;[^}]*min-height:0;[^}]*overflow-y:scroll/);
 assert.match(css,/aside\{[^}]*scrollbar-gutter:stable/);
 assert.doesNotMatch(css,/@media\(max-height:600px\)|main\{[^}]*height:auto/);
 assert.match(css,/#viewport\{[^}]*min-height:0/);
 assert.match(css,/\.toolbar,footer\{flex-shrink:0\}/);
 assert.match(html,/<aside>[\s\S]*id="generate"[\s\S]*<\/aside>/);
 assert.match(css,/#status[^}]*overflow-wrap:anywhere/);
});
