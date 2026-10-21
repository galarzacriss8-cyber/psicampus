import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true, args:['--no-sandbox'], defaultViewport:{width:1440,height:1000}});
const p = await b.newPage();
await p.goto('https://show-weighted-none-satin.trycloudflare.com/#/', {waitUntil:'networkidle2', timeout:60000});
await new Promise(r=>setTimeout(r,1000));
console.log('public:', await p.$$eval('.hero-float', els => els.map(e => getComputedStyle(e).animationName)));
await b.close();
