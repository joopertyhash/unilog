const Web3 = require('web3');

const Monitor = require('./monitor.js');
const Conector = require('./conector.js');
const Handler = require('./handler.js');
const read = require('read')
const util = require('util');

async function main() {
    var web3 = new Web3("https://node.rcn.loans/");
    const conector = new Conector(web3);
    const monitor = new Monitor(web3);
    const handler = new Handler(web3);

    var pk = await util.promisify(read)({ prompt: 'Private key: ', silent: true, replace: "*" })
    pk = pk.startsWith('0x') ? pk : `0x${pk}`
    const account = web3.eth.accounts.privateKeyToAccount(pk)

    console.log(`Using account ${account.address}`)

    var rawOrders = [];
    var decodedOrders = {};

    monitor.onBlock(async (newBlock) => {
        //const newOrders = await conector.getOrders(newBlock);
        // const newOrders = ["0xa9059cbb0000000000000000000000005ea4d1ab32e8df85b35039a53d2223d6f3183fd20000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000f970b8e36e23f7fc3fd752eea86f8be8d83375a60000000000000000000000003a9fff453d50d4ac52a6890647b823379ba36b9e000000000000000000000000000000000000000000000000011c37937e08000000000000000000000000000000000000000000000000000000005af3107a40000000000000000000000000008bf48768eb6654f2813ef9a9f83fabeb6178edf9ba9d42110c1fcc32c4ed437aefc0dfa035da687a1d88526d2cf5cb7dc88e33bc"];
        const newOrders = ["0xa9059cbb0000000000000000000000005e978fe9bc8509cc0c55ec7e19b0a42b6701d4e300000000000000000000000000000000000000000000000d8d726b7177a80000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000003a9fff453d50d4ac52a6890647b823379ba36b9e000000000000000000000000f970b8e36e23f7fc3fd752eea86f8be8d83375a6000000000000000000000000000000000000000000000071d75ab9b92050000000000000000000000000000000000000000000000000000000005af3107a40000000000000000000000000003ad152a06fb23d66aa498c53e451ed5c7ac632f1f63d1655d81bed2de4c4fa60bcfa95a2b1bab1296368ff823c33da4013079cec"]
        rawOrders = rawOrders.concat(newOrders.filter((o) => rawOrders.indexOf(o) < 0));
        // Decode orders
        for (const i in rawOrders) {
            const rawOrder = rawOrders[i]
            if (decodedOrders[rawOrder] == undefined) {
                decodedOrders[rawOrder] = await handler.decode(rawOrder);
            }
        };

        var openOrders = [];

        // Filter open orders
        for (const i in rawOrders) {
            const rawOrder = rawOrders[i];
            if (await handler.exists(decodedOrders[rawOrder])) {
                openOrders.push(decodedOrders[rawOrder]);
            }
        };

        // Find filleable orders
        for (const i in openOrders) {
            const order = openOrders[i];

            if (await handler.isReady(order)) {
                // TODO Fill order
                console.log(order);
            } else {
                console.log("not ready");
            }
        };
    });
}

main();
