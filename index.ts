import {config} from "dotenv";
import {Client, Collection, Intents, Message, MessageEmbed} from 'discord.js';
import {initializeApp} from 'firebase/app';
import {addDoc, collection, getDocs, getFirestore} from 'firebase/firestore/lite';

config();

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS]});
const token = process.env.TOKEN;
console.log(token);

let status = false;
let sessionStatus = true;

let listValue = new Collection<string, number>();
let listDesc: string[] = [];
let listUrl: string[] = [];
let listPrice: number[] = [];

let listUserPoints = new Collection<string, number>();

const firebaseConfig = {
    apiKey: "AIzaSyBEvYklSTr7KlmFnQdCSfeGGkif4zw-MVQ",
    authDomain: "juste-prix-database.firebaseapp.com",
    databaseURL: "https://juste-prix-database-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "juste-prix-database",
    storageBucket: "juste-prix-database.appspot.com",
    messagingSenderId: "269285164062",
    appId: "1:269285164062:web:d25f380d24b71cfa8fda0f",
    measurementId: "G-NSEP8R2TCX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app)


const getProduct = async () => {
    const products = collection(db, 'products');
    const productsSnapshot = await getDocs(products);
    return productsSnapshot.docs.map(doc => doc.data());
}
//addProduct();

const addProduct = async (product: any) => {
    const products = collection(db, 'products');
    const addProduct = await addDoc(products, product).catch((error) => {
        console.log(error);
    });
    console.log(addProduct);
}


let listAlreadyUse: number[] = [];

let cmdList: string[] = ["?help"]; // list of commands

let txtChannel = "";
if(process.env.ID_CHANNEL_TXT) {
    txtChannel = process.env.ID_CHANNEL_TXT.toString(); // channel where the bot will send the messages
    console.log(txtChannel);
}

let addChannel = "";
if(process.env.ID_CHANNEL_ADD) {
    addChannel = process.env.ID_CHANNEL_ADD.toString(); // channel where the bot will send the messages
    console.log(addChannel);
}



client.once('ready', async () => {
    console.log('Ready!');
    const products = await getProduct();
    products.forEach((product) => {
        listDesc.push(product.description);
        listPrice.push(product.prix);
        listUrl.push(product.url);
    });
});

client.login(token).then(r => {});





client.on('messageCreate', (message) => {
    if(message.content === '?help' && message.channel.id === txtChannel) {
        console.log("help");
        message.channel.send("help");
    }
})

client.on('messageCreate', async (message) => {

    if (message.content.startsWith('?add') && message.channel.id === addChannel) {

        let list = message.content.split(" ");

        console.log(list.length);

        if (list.length != 3) {
            message.channel.send("Error: wrong number of parameters");
            message.channel.send("Usage: ?add <url> <price:format=0000.00>");
            return;
        }

        let url: String = list[1];

        let price: number = Number(list[2]);

        if (isNaN(price)) {
            message.channel.send("Error: wrong format of price");
            message.channel.send("Usage: ?add <url> <price:format=number>");
            return;
        }

        await addProduct({url: url, description: 'test', prix: price});
        message.channel.send("send to DB");

        await message.delete();

    }


})

client.on('messageCreate', async (message) => {

    if (message.content.startsWith("?start") && message.channel.id === txtChannel) {

        if (status) {
            message.channel.send("Error: already started");
            return;
        }


        let list = message.content.split(" ");

        if (list.length != 2) {
            message.channel.send("Error: wrong number of parameters");
            message.channel.send("Usage: ?start <nbImage>");
            return;
        }

        let nbImage: number = parseInt(list[1]);

        if (isNaN(nbImage)) {
            message.channel.send("Error: wrong format of nbImage, not a number");
            message.channel.send("Usage: ?start <nbImage>");
            return;
        }

        status = true;

        listValue.clear();

        sessionStatus = true;

        await doWait(nbImage, message);

        return;


    }

})

type KeyValue = {
    [key: string]: number;
}

async function doWait(nbImage: number, message: Message) {


    if (nbImage == 0) {
        return;
    }

    let random = Math.floor(Math.random() * listUrl.length);

    while (listAlreadyUse.includes(random)) {
        random = Math.floor(Math.random() * listUrl.length);
    }

    console.log(random);

    listAlreadyUse.push(random);

    let desc: string = listDesc[random];


    let price = listPrice[random];
    console.log(price);

    if (price == undefined) {
        return;
    }

    let url = listUrl[random];

    if (url == "") {
        return;
    }


    let embed = new MessageEmbed()
        .setTitle(desc)
        .setImage(url)

    await message.channel.send({embeds: [embed]});

    setTimeout(function () {
        sessionStatus = false;
        nbImage--;

        //if listValue contain the price of the image

        let founded = false;

        listValue.each((value, key) => {
            if (value == price) {
                let userId: string = client.users.cache.find(user => user.username == key)!.id;
                message.channel.send("<@" + userId + "> A TROUVÉ(E) LE JUSTE PRIX !!! (+3 points)");
                founded = true;
                if (listUserPoints.has(key)) {
                    listUserPoints.set(key, listUserPoints.get(key)! + 3);
                }else{
                    listUserPoints.set(key, 3);
                }
            }
        });

        if (!founded) {
            message.channel.send("Personnes n'a trouvées le bon prix :'(");
            let closest = "";
            let closestValue = 0;
            // diff with max value
            let diff = price;

            if (listValue.size != 0) {
                listValue.each((value, key) => {
                    let newDiff = Math.abs(price - value);
                    if (newDiff < diff) {
                        diff = newDiff;
                        closest = key;
                        closestValue = value;
                    }
                });
                message.channel.send(closest + " est le/la plus proche avec " + closestValue + " (+1 point)");
                if (listUserPoints.has(closest)) {
                    listUserPoints.set(closest, listUserPoints.get(closest)! + 1);
                }else {
                    listUserPoints.set(closest, 1);
                }

            }else{
                message.channel.send("Personnes n'a participées à cette manche :(");
            }

        }


        listValue.clear();
        if (nbImage != 0 && status) {
            setTimeout(function () {
                sessionStatus = true;
                message.channel.send("NEXT !");
                doWait(nbImage, message);
            }, 5000);

        } else {
            status = false;
            message.channel.send("FIN");

            let maxLineLength = 0;
            listUserPoints.sorted((a, b) => {
                return b - a;
            }).each((value, key) => {
                // if key + value length > maxLineLength
                if ((key + value.toString()).length > maxLineLength) {
                    maxLineLength = (key + value.toString()).length;
                }
            });
            let scoreMsg = "";
            let newLength = 0;
            if (maxLineLength % 2 != 0) {
                newLength = maxLineLength - 1;
            }else {
                newLength = maxLineLength - 2;
            }

            scoreMsg += "╔";
            for (let i = 0; i < 2; i++) {
                for (let i = 0; i < newLength; i += 2 ) {
                    scoreMsg += "═";
                }
                if (!scoreMsg.includes(" SCORES "))
                    scoreMsg += " SCORES ";

            }
            newLength = scoreMsg.length;
            scoreMsg += "╗\n";
            listUserPoints.each((value, key) => {
                if (newLength % 2 != 0) {
                    scoreMsg += "║ " + key + " " + value + " ║\n";
                }else{
                    scoreMsg += "║ " + key + "  " + value + " ║\n";
                }
            });
            scoreMsg += "╚";
            for (let i = 0; i < 2; i++) {
                for (let i = 0; i < (newLength+2); i += 2 ) {
                    scoreMsg += "═";
                }
            }
            scoreMsg += "╝";

            message.channel.send(scoreMsg);



        }

    }, 30000); //time in milliseconds

}

client.on('messageCreate', async (message) => {
    if (!isNaN(Number(message.content)) && message.channel.id === txtChannel && status && !message.author.bot) {


        if (!sessionStatus) {
            message.channel.send("Error: Pas de manche en cours");
            return;
        }

        let price: number = Number(message.content);

        if (isNaN(price)) {
            message.channel.send("Error: wrong format of price");
            message.channel.send("Usage: ?add <url> <price:format=number>");
            return;
        }

        // if already contain the price
        for (let i = 0; i < listValue.size; i++) {
            if (listValue.at(i) == price) {
                message.channel.send("Error: already contain the price");
                return;
            }
        }

        listValue.set(message.author.username, price);

        console.log(listValue);



    }else if (!message.content.startsWith("?") && (message.channel.id == addChannel || message.channel.id == txtChannel) && !status && !message.author.bot){
        await message.delete();
    }
})

client.on('messageCreate', async (message) => {
    if (message.content.startsWith("?stop") && message.channel.id === txtChannel) {

        if (!status) {
            message.channel.send("Error: already stopped");
            return;
        }

        status = false;

        message.channel.send("Bot will stop after the end of session");

    }

})