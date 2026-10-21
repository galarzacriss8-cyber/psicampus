import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true, args:['--no-sandbox','--hide-scrollbars'], defaultViewport:{width:1440,height:1000}});
const p = await b.newPage();
await p.goto('http://localhost:4321/#/', {waitUntil:'networkidle2'});
await new Promise(r=>setTimeout(r,800));
console.log(await p.$$eval('.hero-float', els => els.map(e => ({ text: e.querySelector('strong')?.textContent, anim: getComputedStyle(e).animationName, transform: getComputedStyle(e).transform }))));
await p.screenshot({path:'_capturas/29-hero-estatico.png', clip:{x:700,y:100,width:700,height:650}});
await b.close();
