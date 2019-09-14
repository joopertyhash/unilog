const Web3 = require('web3');

const Monitor = require('./monitor.js');
const Conector = require('./conector.js');
const Handler = require('./handler.js');

async function main() {
    var web3 = new Web3("https://node.rcn.loans/");
    const conector = new Conector(web3);
    const monitor = new Monitor(web3);
    const handler = new Handler(web3);

    var rawOrders = [];
    var decodedOrders = {};

    monitor.onBlock(async (newBlock) => {
        const newOrders = await conector.getOrders(newBlock);

        rawOrders = rawOrders.concat(newOrders.filter((o) => rawOrders.indexOf(p) < 0));

        // Decode orders
        for (const rawOrder in rawOrders) {
            if (decodedOrders[rawOrder] == undefined) {
                decodedOrders[rawOrder] = await handler.decode(rawOrder);
            }
        };

        var openOrders = [];

        // Filter open orders
        for (const rawOrder in rawOrders) {
            if (await handler.exists(decodedOrders[rawOrder])) {
                openOrders.push(decodedOrders[rawOrder]);
            }
        };

        // Find filleable orders
        for (const order in openOrders) {
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
