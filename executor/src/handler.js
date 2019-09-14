const uniswap_ex_abi = require('./uniswapEx.js');

const env = require('../env.js');


module.exports = class Handler {
    constructor(w3) {
        this.w3 = w3;
        this.uniswap_ex = new w3.eth.Contract(uniswap_ex_abi, env.uniswapEx);
        this.orders = []
    }

    async exists(order) {
        return await this.uniswap_ex.methods.exists(
            order.fromToken,
            order.toToken,
            order.minReturn,
            order.fee,
            order.owner,
            order.salt
        ).call();
    }

    async isReady(order) {
        // TODO: Check if order is valid
        return await this.uniswap_ex.methods.canFill(
            order.fromToken,
            order.toToken,
            order.minReturn,
            order.fee,
            order.owner,
            order.salt
        ).call();
    }

    async decode(tx_data) {
        return this.uniswap_ex.methods.decode(order_data).call();
    }

    async addOrder(tx_data) {
        const order_data = `0x${tx_data.substr(-384)}`;
        const order = await this.uniswap_ex.methods.decode(order_data).call();
        if (await this.exists(order)) {
            this.orders.push(order);
        }
    }

    async start() {
        for (let i in this.orders) {
            const order = this.orders[i];

            if (await this.isReady(order)) {
                // Send fill tx
            }
        }

        setTimeout(() => this.start(), 5000);
    }

    async fillOrder(order, account) {
        const gasPrice = await this.w3.eth.getGasPrice();
        await this.uniswap_ex.methods.executeOrder(
            order._from,
            order._to,
            order._return,
            order._fee,
            order._owner,

        );
        const gasEstimate = await this.oracleFactory.methods.provide(address, medianRate).estimateGas(
            { from: signer.address }
        );
    }
}
