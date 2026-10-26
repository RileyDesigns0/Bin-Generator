// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright package.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
test('standalone viewport starts, imports STL and STEP, generates and exports bins',async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(__dirname,'Formnest.html')).href);
  await page.waitForTimeout(500);
  assert.deepEqual(errors,[],'startup must not throw');
  assert.equal(await page.evaluate(()=>renderer.info.render.calls>0),true,'viewport must render');
  await page.locator('#demo').click();
  await page.locator('#generate').click();
  await page.waitForFunction(()=>!busy);
  assert.equal(await page.locator('#export').isEnabled(),true,await page.locator('#status').textContent());
  const stl=await page.evaluate(()=>Array.from(new Uint8Array(BinCore.binarySTL(BinCore.demoModel()))));
  await page.locator('#file').setInputFiles({name:'demo.stl',mimeType:'model/stl',buffer:Buffer.from(stl)});
  await page.waitForFunction(()=>!busy&&sourceName==='demo.stl');
  await page.locator('#file').setInputFiles(path.join(__dirname,'fixtures/cube.step'));
  await page.waitForFunction(()=>!busy&&sourceName==='cube.step',null,{timeout:30000});
  await page.locator('#resolution').selectOption('1.5');
  await page.locator('#fit').click();
  await page.locator('#system').selectOption('gridfinity');
  await page.locator('#generate').click();
  await page.waitForFunction(()=>!busy,null,{timeout:30000});
  assert.equal(await page.locator('#export').isEnabled(),true,await page.locator('#status').textContent());
  assert.equal(await page.locator('#exportBase').isEnabled(),true);
  const downloaded=page.waitForEvent('download');await page.locator('#export').click();
  assert.match((await downloaded).suggestedFilename(),/bin-mm\.stl$/);
  assert.deepEqual(errors,[]);
 } finally {await browser.close()}
});
