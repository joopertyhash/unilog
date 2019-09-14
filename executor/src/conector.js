const factory_abi = require('./uniswapFactory.js');
const ierc20_abi = require('./ierc20.js');

const env = require('../env.js');

const MAX_JUMP = 10000000;
module.exports = class Conector {
    constructor(w3) {
        this.w3 = w3;
        this.uni_factory = new w3.eth.Contract(factory_abi, env.uniswapFactory);
        this.last_monitored = 8548082;
    }

    async isValidOrder(order) {
        // TODO: Check if order is valid
        return true;
    }

    async getOrders(toBlock) {
        toBlock = Math.min(toBlock, this.last_monitored + MAX_JUMP);

        const total = await this.uni_factory.methods.tokenCount().call();

        const orders = [];

        for (var i = 1; i < total; i++) {
            const token_addr = await this.uni_factory.methods.getTokenWithId(i).call();
            // Skip USDT
            if (token_addr.toLowerCase() == "0xdac17f958d2ee523a2206206994597c13d831ec7") {
                continue
            }

            console.log(`Monitoring token ${token_addr}`);
            const token = new this.w3.eth.Contract(ierc20_abi, token_addr);
            const events = await token.getPastEvents('Transfer', {
                fromBlock: this.last_monitored,
                toBlock: toBlock
            });

            const checked = []
            var checkedCount = 0

            console.log(`Found ${events.length} TXs for ${token_addr}`);

            for (let i in events) {
                const event = events[i];

                const tx = event.transactionHash;
                checkedCount += 1

                if (checked.includes(tx)) {
                    continue
                }

                const full_tx = await this.w3.eth.getTransaction(tx)
                const tx_data = full_tx.input;

                console.log(`${checkedCount}/${events.length} - Check TX ${tx}`)
                if (tx_data.startsWith("0xa9059cbb") && tx_data.length == 650) {
                    orders.push(tx_data)
                    console.log(`Found order TX ${tx}`)
                }

                checked.push(tx);
            }
        }

        this.last_monitored = toBlock;
        return orders;
    }
}
