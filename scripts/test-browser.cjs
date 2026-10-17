const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
const page=await browser.newPage({viewport:{width:1440,height:1050}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4173');
await page.waitForSelector('.card');
assert.equal(await page.locator('.card').count(),330);
await page.screenshot({path:'desktop-preview.png',fullPage:false});
await page.locator('[data-toggle="spell-001"]').click();
await page.reload();
await page.locator('[data-view="selected"]').click();
assert.equal(await page.locator('.card').count(),1);
await page.locator('.details').click();
assert.match(await page.locator('#spell-description').innerText(),/Интеллект/);
await page.keyboard.press('Escape');
await page.locator('[data-view="all"]').click();
await page.locator('#search').fill('молния');
assert((await page.locator('.card').count())>0);
assert((await page.locator('.card').count())<330);
await page.locator('#search').fill('несуществующеезаклинание');
assert(await page.locator('#empty').isVisible());
await page.locator('#reset').click();
await page.locator('[data-tradition="Огонь"]').click();
assert.equal(await page.locator('.card').count(),11);
await page.locator('[data-rank="5"]').click();
assert.equal(await page.locator('.card').count(),1);
await page.locator('#reset').click();
await page.locator('#character-open').click();
await page.locator('#character-name').fill('Тестовый маг');
await page.locator('#character-notes').fill('Проверка переноса');
const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadPromise;await download.saveAs('test-character.json');
await page.keyboard.press('Escape');await page.reload();
assert.equal(await page.locator('#character-label').innerText(),'Тестовый маг');
await page.locator('#character-open').click();
page.once('dialog',d=>d.accept());
await page.locator('#import-file').setInputFiles('test-character.json');
await page.waitForFunction(()=>document.querySelector('#toast').textContent==='Персонаж загружен');
await page.keyboard.press('Escape');
await page.locator('#search').fill('Дикая магия');
await page.locator('[data-open="spell-328"]').first().click();
assert.equal(await page.locator('.effect-table tbody tr').count(),9);
await page.screenshot({path:'spell-preview.png'});
await page.keyboard.press('Escape');
await page.locator('#reset').click();
for(const width of [360,390,768]){
 await page.setViewportSize({width,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
 if(width===390)await page.screenshot({path:'mobile-preview.png',fullPage:false});
 await page.locator('.details').first().click();
 assert(await page.locator('#spell-dialog').isVisible());
 assert(await page.evaluate(()=>document.querySelector('#spell-dialog').getBoundingClientRect().width<=innerWidth));
 await page.keyboard.press('Escape');
}
assert.deepEqual(errors,[]);await browser.close();console.log('PASS: 330 spells; search; filters; selection persistence; description; export/import; responsive widths 360/390/768; no JS errors');
})().catch(e=>{console.error(e);process.exit(1)});



