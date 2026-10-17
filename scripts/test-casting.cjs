const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173');
 // Previous saves acquire sensible defaults without losing the character.
 await page.evaluate(()=>localStorage.setItem('demonlord-grimoire-v1',JSON.stringify({name:'Маг',notes:'',selected:['spell-001','spell-002','spell-011']})));
 await page.reload();
 assert.equal(await page.locator('#power').inputValue(),'0');
 await page.locator('[data-view="selected"]').click();
 await page.locator('#power').selectOption('2');
 const first=page.locator('.card').filter({has:page.locator('[data-cast="spell-001"]')});
 const second=page.locator('.card').filter({has:page.locator('[data-cast="spell-002"]')});
 assert.equal(await first.locator('.usage-summary strong').innerText(),'3 / 3');
 await first.locator('[data-cast]').click();
 assert.equal(await first.locator('.usage-summary strong').innerText(),'2 / 3');
 assert.equal(await second.locator('.usage-summary strong').innerText(),'3 / 3');
 assert(await page.locator('[data-cast="spell-011"]').isDisabled());
 await first.locator('[data-cast]').click();await first.locator('[data-cast]').click();
 assert(await first.locator('[data-cast]').isDisabled());
 assert.equal(await first.locator('.used').count(),3);
 await first.locator('[data-restore]').click();
 assert.equal(await first.locator('.usage-summary strong').innerText(),'1 / 3');
 await page.reload();await page.locator('[data-view="selected"]').click();
 assert.equal(await first.locator('.usage-summary strong').innerText(),'1 / 3');
 await first.locator('.details').click();
 assert.equal(await page.locator('#spell-uses .usage-summary strong').innerText(),'1 / 3');
 await page.locator('#spell-uses [data-cast]').click();
 assert.equal(await page.locator('#spell-uses .usage-summary strong').innerText(),'0 / 3');
 await page.keyboard.press('Escape');
 // Power changes preserve expenditure; removal and re-addition cannot refill a spell.
 await page.locator('#power').selectOption('0');await page.locator('#power').selectOption('2');
 assert.equal(await first.locator('.usage-summary strong').innerText(),'0 / 3');
 await first.locator('[data-toggle]').click();await page.locator('[data-view="all"]').click();
 await page.locator('[data-toggle="spell-001"]').click();
 assert.equal(await first.locator('.usage-summary strong').innerText(),'0 / 3');
 await page.locator('#rest').click();
 assert.equal(await first.locator('.usage-summary strong').innerText(),'3 / 3');
 await page.locator('#power').selectOption('10');
 assert.equal(await first.locator('.usage-summary strong').innerText(),'11 / 11');
 await first.locator('[data-cast]').click();
 await page.locator('#character-open').click();
 const pending=page.waitForEvent('download');await page.locator('#export').click();const download=await pending;await download.saveAs('tmp/casting-character.json');
 const fs=require('node:fs');const data=JSON.parse(fs.readFileSync('tmp/casting-character.json','utf8'));
 assert.equal(data.power,10);assert.equal(data.spent['spell-001'],1);
 page.once('dialog',d=>d.accept());await page.locator('#import-file').setInputFiles('tmp/casting-character.json');
 await page.waitForFunction(()=>document.querySelector('#toast').textContent==='Персонаж загружен');
 await page.keyboard.press('Escape');
 assert.equal(await first.locator('.usage-summary strong').innerText(),'10 / 11');
 await page.locator('[data-view="selected"]').click();
 for(const width of [360,390,768,1440]){
  await page.setViewportSize({width,height:1000});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
 }
 await page.setViewportSize({width:390,height:1100});await page.screenshot({path:'tmp/casting-mobile.png'});
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: power table, separate pools, exhaustion, undo, rest, power changes, persistence, old saves, export/import and responsive layout');
})().catch(e=>{console.error(e);process.exit(1)});
