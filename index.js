const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://store.steampowered.com/search/?maxprice=free&supportedlang=french%2Cenglish&specials=1&ndl=1');
    const result = await page.evaluate(() => {

        let data = [];
        let elements = document.querySelectorAll('#search_resultsRows');

        for(let element of elements) {
            data.push(element.innerHTML.split('<a href="'));
        }

        return data
        

    });
    var gameinsell = []
    for(i=0; i<result[0].length; i+=1) {
        if(result[0][i].startsWith("http")) {
            gamelink = result[0][i].split('"')[0];
            gameinsell.push(gamelink);
        }
    }
    console.log(gameinsell)
    for(i=0; i<gameinsell.length; i+=1) {
        const url = gameinsell[i];
        (async () => {
            const browserOfGame = await puppeteer.launch();
            const page = await browserOfGame.newPage();
            await page.goto(url);
            const title = await page.$eval('.apphub_AppName', el => el.textContent);
            const resultofgame = await page.evaluate(() => {

                let elements = document.querySelectorAll('.discount_original_price');
                let data = []
                for(let element of elements) {
                    data.push(element.textContent);
                }
                return data
                
        
            });
            console.log(title, resultofgame[0])
            await browserOfGame.close();
        })();
    }
    await browser.close();
})();