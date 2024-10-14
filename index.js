const { createCanvas, loadImage, registerFont } = require('canvas');
const config = require("./config.json");
const fs = require("fs");
const puppeteer = require('puppeteer');
const { TwitterApi } = require('twitter-api-v2');
const logger = require('./logger.js');
const { env } = require('process');

const client = new TwitterApi({
    appKey: env.appKey,
    appSecret: env.appSecret,
    accessToken: env.accessToken,
    accessSecret: env.accessSecret,
});

function sleep(ms) {

    // Permet de mettre en pose le script pendant ms millisecondes
    return new Promise(resolve => setTimeout(resolve, ms));

}

function getGMTOffset() {

    // Renvoie l'offset en minutes
    const offset = new Date().getTimezoneOffset();
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset > 0 ? "-" : "+";

    // Formatage du décalage horaire en GMT±HH:MM
    const gmtOffset = `GMT${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    return gmtOffset;

}

function addZeroIfNeeded(value) {

    // Ajoute un zéro devant la valeur si elle est inférieure à 10
    // (pour avoir un beau format en XX:XX)
    if(value.toString().length === 1) {
        return `0${value}`;
    } else {
        return value;
    }

}

function convertTo24Format(time) {

    // Permet de convertir une heure au format H12 en H24
    if(time.endsWith("pm")) {
        return `${parseInt(time.split(":")[0])+12}:${time.split(":")[1].replace("pm", "")}`;
    } else {
        return `${time.replace("am", "")}`;
    }

}

console.log("\nfreeGameViewer by Arthurprnt\n");
console.log("Verification started");

try {

    fs.readFile("./data.json", "utf8", (err, jsonString) => {
        if (err) {
            console.log(`File read failed: ${err}`);
            return;
        } else {
            (async () => {



                // Lecture effectuée avec sucès
                var data = JSON.parse(jsonString);
                const browser = await puppeteer.launch({
                    env: { LANGUAGE: "en_GB" },
                    args: ["--no-sandbox"]
                });
                const page = await browser.newPage();
                await page.setDefaultNavigationTimeout(0);



                // Récupère les liens des pages des jeux en réduction à -100%
                var result = [];
                try {

                    await page.goto('https://store.steampowered.com/search/?maxprice=free&supportedlang=french%2Cenglish&specials=1&ndl=1');
                    result = await page.evaluate(() => {

                        // On fait de la magie noir avec les données récup
                        let data = [];
                        let elements = document.querySelectorAll('#search_resultsRows');

                        for(let element of elements) {

                            data.push(element.innerHTML.split('<a href="'));

                        }

                        return data;

                    });

                } catch (err) {

                    console.log("Avoided a TIME_OUT crash")

                }
                
                var freeGamesList = [];
                // Si il n'y a pas de jeux en réduc, le programme ne crash pas grâce au try
                try {
                    for(i=0; i<result[0].length; i+=1) {

                        // On décrypte la magie noir, ça marche
                        if(result[0][i].startsWith("http")) {
    
                            gamelink = result[0][i].split('"')[0];
                            freeGamesList.push(gamelink);
    
                        }
    
                    }
                } catch (err) {
                    console.log("No games in sale")
                }
                console.log(`Grabbed ${freeGamesList.length} games in sale`);



                // Pour chaque jeu en promo, en récupère son nom, son prix d'origine et la date de la fin de la promo
                for (i=0; i<freeGamesList.length; i+=1) {

                    console.log(`Started verification for game n°${i+1}`);
                    const url = freeGamesList[i];
                    const appId = url.replace('https://store.steampowered.com/app/', "").split("/")[0];
                    await page.goto(url, { waitUntil: 'load' });
                    try {
                        // Si le jeu a une limite d'âge on n'a pas directement accès aux infos...
                        // On donne donc un âge valide pour accèder à la page
                        // C'est ma vrai date de naissance si jamais
                        await page.select('#ageDay', '24');
                        await page.select('#ageMonth', 'February');
                        await page.select('#ageYear', '2005');
                        await page.click('.agegate_btn_ctn');
                        console.log("Age restriction dodged with success");

                    } catch (err) {
                        console.log("No age restriction for this game");
                    }
                    await sleep(2500);
                    const title = await page.$eval('.apphub_AppName', el => el.textContent);
                    try {
                        const desc = await page.$eval('.game_purchase_discount_quantity ', el => el.textContent);
                        const priceofgame = await page.evaluate(() => {
    
                            let data_price = [];
                            let elements = document.querySelectorAll('.discount_original_price');
                            for(let element of elements) {
    
                                data_price.push(element.textContent);
    
                            }
                            return data_price;
    
                        });
                        // La date est pas en clair, donc on fait encore un peu de magie noire
                        const date = desc.split("\t")[0].replace("Free to keep when you get it before ", "").replaceAll(".", "");
                        // On vérifie si on a déjà scrap cette promo
                        if(!data.games.includes(title)) {
    
                            console.log(`New free game: ${title}`);
                            console.log(`New game: ${title}`);
                            data.games.push(title);
                            var gameData = {
    
                                "title": title,
                                "date": Date.parse(`${parseInt(date.split(" @ ")[0].split(" ")[0])+1} ${date.split(" @ ")[0].split(" ")[1]} ${convertTo24Format(date.split(" @ ")[1])} ${new Date().getFullYear()}`),
                                // On prend le premier élément car les prix des dlc sont aussi dans la liste
                                "price": priceofgame[0],
                                "img": `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`,
                                "link": url
    
                            }
                            data.games_data.push(gameData);
                            console.log(`Added "${title}" to the database`);
    
    
    
                            // Création de l'image attachée au tweet via canvas
                            const canvas = createCanvas(600, 407);
                            const ctx = canvas.getContext('2d');
                            registerFont('./assets/Montserrat-ExtraBold.ttf', { family: 'Mont' });
                            ctx.font = '50px Mont';
                            ctx.fillStyle = "#ffffff";
                            ctx.strokeStyle = "#000000";
                            ctx.lineWidth = 4;
                            loadImage('./assets/wallpaper.png').then((image) => {
                                ctx.drawImage(image, 0, 0);
                                const promise = loadImage(gameData.img);
                                promise.then(async cover => {
                                    ctx.drawImage(cover, 70, 70);
                                    var textToPrint = `${gameData.price} ➜ 0,00€`;
                                    var txtSize = ctx.measureText(textToPrint).width;
                                    var txtXPos = 300-txtSize/2;
                                    ctx.strokeText(textToPrint, txtXPos, 330);
                                    ctx.fillText(textToPrint, txtXPos, 330);
                                    const buffer = canvas.toBuffer("image/png");
    
    
    
                                    // Envoie du tweet
                                    // Ces variables servent pour l'écriture de la date
                                    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                    var DDay = new Date(gameData.date);
                                    const mediaIds = await Promise.all([
                                        client.v1.uploadMedia(buffer, { mimeType: 'png' })
                                    ]);
                                    client.v2.tweet({
                                        text: `"${gameData.title}" is free on Steam until the ${DDay.getDate()} ${months[DDay.getMonth()]} at ${addZeroIfNeeded(DDay.getHours())}:${addZeroIfNeeded(DDay.getMinutes())} ${getGMTOffset().split(":")[0]}.\n\nGet the game here: ${gameData.link}\n\n#FreeGame #SteamGame #Steam #FreeSteamGame #Free #Gratis #Game #${gameData.title.replaceAll(" ", "")}`,
                                        media: { media_ids: mediaIds }
                                    });
                                    console.log(`Tweeted successfully for the game "${gameData.title}"`)
    
    
                                })
                            })
    
                        }
                    } catch (err) {
                        console.log("It's a weird dlc, stopped the process");
                    }
                }



                // On vérifie si des promos dans database sont terminées, si oui on les supprime
                console.log("Checking if a sale has ended");
                await browser.close();
                for(i=0; i<data.games_data.length; i+=1) {
                    if(data.games_data[i].date < Date.now()) {

                        // La promo est finie, on la supprime
                        console.log(`The game "${data.games_data[i].title}" is no longer in sale`);
                        data.games.splice(data.games.indexOf(data.games_data[i].title));
                        data.games_data.splice(i);

                    }
                }



                // On enregistre les modifications faites
                await sleep(10000);
                fs.writeFile("./data.json", JSON.stringify(data), err => {
                    if (err) console.log(`Error writing file: ${err}`);
                    else {

                        console.log("Wrote in the database with success");

                    }
                });
            })();
        }
    });

} catch (err) {

    // Pour éviter de devoir relancer le script quand le max delay est dépassé
    console.log(`Unknown error: ${err}`)

}