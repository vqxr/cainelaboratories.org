const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    // Fake user gesture to satisfy Tone.js
    await page.goto('http://localhost:5173', {waitUntil: 'networkidle2'});
    await page.mouse.click(10, 10);
    await new Promise(r => setTimeout(r, 1000));
    await page.evaluate(() => { window.scrollBy(0, window.innerHeight * 1.5); });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({path: 'umap_fixed.png'});
    await browser.close();
})();
