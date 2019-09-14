const uniswap_ex_abi = require('./uniswapEx.js');

const env = require('../env.js');


module.exports = class Handler {
    constructor(w3) {
        this.w3 = w3;
        this.uniswap_ex = new w3.eth.Contract(uniswap_ex_abi, env.uniswapEx);
        this.orders = []
    }

    async exists(order) {
        return await this.uniswap_ex.methods.existOrder(
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
        return await this.uniswap_ex.methods.canExecuteOrder(
            order.fromToken,
            order.toToken,
            order.minReturn,
            order.fee,
            order.owner,
            order.salt
        ).call();
    }

    async decode(tx_data) {
        console.log(`0x${tx_data.substr(-384)}`)
        const decoded = await this.uniswap_ex.methods.decodeOrder(`0x${tx_data.substr(-384)}`).call();
        console.log(decoded)
        return decoded
    }

    async fillOrder(order, account) {
        const gasPrice = await this.w3.eth.getGasPrice();
        const estimatedGas = await this.uniswap_ex.methods.executeOrder(
            order.fromToken,
            order.toToken,
            order.minReturn,
            order.fee,
            order.owner,
            order.salt
        ).estimateGas(
            { from: "0x35d803F11E900fb6300946b525f0d08D1Ffd4bed" }
        );

        console.log(estimatedGas);
        if (gasPrice.toFixed() * estimatedGas.toFixed() > order.fee) {
            // Fee is too low
            console.log("Skif filling order, fee is not enought")
            return undefined
        }

        try {
            const tx = await this.uniswap_ex.methods.executeOrder(
                order.fromToken,
                order.toToken,
                order.minReturn,
                order.fee,
                order.owner,
                order.salt
            ).send(
                { from: account.address, gas: estimatedGas, gasPrice: gasPrice }
            );
            console.log(log + ', txHash: ' + tx.transactionHash)
            return tx.transactionHash
        } catch (e) {
            console.log('Error: ' + log + ' Error message: ' + e.message)
            return undefined
        }
    }
}
