const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const html=fs.readFileSync(__dirname+'/ui.html','utf8');
function harness(width=1000){
 const events={},mediaEvents={},elements={};let active;
 function element(){const attrs={};return {attrs,inert:false,disabled:false,tabIndex:0,getClientRects:()=>[{}],closest:()=>null,getAttribute:k=>attrs[k]??null,setAttribute:(k,v)=>attrs[k]=String(v),removeAttribute:k=>delete attrs[k],focus(){active=this},getBoundingClientRect:()=>({width:334})};}
 for(const id of ['controlsToggle','controlsPanel','drawerShade','statusToggle','sidebarDivider'])elements[id]=element();
 const first=element(),last=element(),disabled=element();disabled.disabled=true;
 elements.controlsPanel.querySelectorAll=()=>[disabled,first,last];elements.controlsPanel.contains=el=>[first,last].includes(el);
 const classes=new Set(),style={values:{},setProperty(k,v){this.values[k]=v},getPropertyValue(k){return this.values[k]||''}};
 const workspace=element();
 const document={getElementById:id=>elements[id],documentElement:{style},body:{classList:{contains:k=>classes.has(k),toggle(k,on){if(on===undefined)on=!classes.has(k);on?classes.add(k):classes.delete(k);return on}}},querySelector:s=>s==='.workspace'?workspace:element(),get activeElement(){return active}};
 const media={matches:width<=650,addEventListener:(k,f)=>mediaEvents[k]=f};
 const context=vm.createContext({document,innerWidth:width,matchMedia:()=>media,window:{addEventListener:(k,f)=>(events[k]??=[]).push(f)}});
 vm.runInContext(html.slice(html.indexOf("const $=id=>"),html.indexOf('let source=null')),context);
 return {context,elements,first,last,workspace,style,media,document,resize(w){context.innerWidth=w;media.matches=w<=650;for(const f of events.resize||[])f()},key(key,shiftKey=false){let prevented=false;for(const f of events.keydown||[])f({key,shiftKey,preventDefault(){prevented=true}});return prevented},run:s=>vm.runInContext(s,context)};
}
test('stored sidebar width is reclamped on window resize without rendering',()=>{
 const h=harness();h.run('resizeSidebar(420)');h.resize(651);assert.equal(h.style.values['--sidebar-width'],'291px');h.resize(500);assert.equal(h.style.values['--sidebar-width'],'260px');
 const css=html.split('<style>')[1].split('</style>')[0];assert.doesNotMatch(css,/\.toolbar(?: \.row)?\{[^}]*flex-wrap:nowrap/);
});
test('overlay drawer owns focus, modality, keyboard loop and close restoration only on mobile',()=>{
 const h=harness(650);h.run('showControls(true)');assert.equal(h.document.activeElement,h.first);assert.equal(h.workspace.inert,true);assert.equal(h.elements.controlsPanel.attrs.role,'dialog');assert.equal(h.elements.controlsPanel.attrs['aria-modal'],'true');
 h.last.focus();assert.equal(h.key('Tab'),true);assert.equal(h.document.activeElement,h.first);
 h.first.focus();assert.equal(h.key('Tab',true),true);assert.equal(h.document.activeElement,h.last);
 h.key('Escape');assert.equal(h.workspace.inert,false);assert.equal(h.elements.controlsPanel.inert,true);assert.equal(h.document.activeElement,h.elements.controlsToggle);assert.equal(h.elements.controlsPanel.attrs.role,undefined);assert.equal(h.elements.controlsPanel.attrs['aria-modal'],undefined);
 h.resize(1000);h.run('showControls(true)');h.last.focus();assert.equal(h.key('Tab'),false);assert.equal(h.key('Escape'),false);assert.equal(h.elements.controlsPanel.inert,false);assert.equal(h.workspace.inert,false);assert.equal(h.elements.controlsPanel.attrs.role,undefined);
});
