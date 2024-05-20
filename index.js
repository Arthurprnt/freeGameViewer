const fs = require("fs");
const puppeteer = require('puppeteer');

function getGMTOffset() {
    const offset = new Date().getTimezoneOffset(); // Renvoie l'offset en minutes
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset > 0 ? "-" : "+";
  
    // Formatage du décalage horaire en GMT±HH:MM
    const gmtOffset = `GMT${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    return gmtOffset;
}



//setInterval(() => {

    console.log("Vérification lancée");
    fs.readFile("./data.json", "utf8", (err, jsonString) => {
        if (err) {
            console.log("File read failed:", err);
            return;
        } else {
            (async () => {
                //Lecture effectuée avec sucès
                var data = JSON.parse(jsonString)
                const browser = await puppeteer.launch({env: { LANGUAGE: "en_GB" } });
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
                console.log(`Jeux en réduction récupérés, il y en a ${gameinsell.length}`);
                //console.log(gameinsell)
                for (i=0; i<gameinsell.length; i+=1) {
                    console.log(`Je vérifie le jeu en promo n°${i+1}`)
                    const url = gameinsell[i];
                    await page.goto(url);
                    const title = await page.$eval('.apphub_AppName', el => el.textContent);
                    const desc = await page.$eval('.game_purchase_discount_quantity ', el => el.textContent);
                    const priceofgame = await page.evaluate(() => {
        
                        let data = []
                        let elements = document.querySelectorAll('.discount_original_price');
                        for(let element of elements) {
        
                            data.push(element.textContent);
        
                        }
                        return data
                        
                
                    });
                    const date = desc.split("\t")[0].replace("Free to keep when you get it before ", "").replaceAll(".", "")
                    //console.log(`${title} | ${date} ${getGMTOffset().split(":")[0]} | ${priceofgame[0]}`)
                    if(!data.games.includes(title)) {
                        console.log(`Nouveau jeu gratuit: ${title}`);
                        data.games.push(title)
                        data.games_data.push({
                            "title": title,
                            "date": Date.parse(`${parseInt(date.split(" @ ")[0].split(" ")[0])+1} ${date.split(" @ ")[0].split(" ")[1]} ${new Date().getFullYear()}`)
                        })
                        console.log(`J'ai ajouté ${title}`)
                        // Faire le tweet
                    }
                }
                console.log("Je vérifie si des promos sont finies");
                await browser.close();
                for(i=0; i<data.games_data.length; i+=1) {
                    if(data.games_data[i].date < Date.now()) {
                        // La promo est finie
                        console.log(`La promo ${data.games_data[i].title} est fini`)
                        data.games.splice(data.games.indexOf(data.games_data[i].title));
                        data.games_data.splice(i);
                    }
                }
                fs.writeFile("./data.json", JSON.stringify(data), err => {
                    if (err) console.log("Error writing file:", err);
                    else {
                        console.log("L'écriture s'est bien passée");
                        console.log("\n==========\n");
                    }
                });
            })();
        }
    });

//}, 3600000)