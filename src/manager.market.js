/**
 * @typedef {Object} ResourceTradePolicy
 * @property {boolean} enabled
 * @property {number} reserve
 * @property {number} minimumPrice
 * @property {number} maximumTradeSize
 */

/**
 * @typedef {Object} ProposedTrade
 * @property {string} orderId
 * @property {ResourceConstant} resourceType
 * @property {number} amount
 * @property {number} price
 * @property {number} grossCredits
 * @property {number} transactionEnergy
 */

/**
 * @typedef {Partial<Record<ResourceConstant, ResourceTradePolicy>>} TradePolicy
 */

/** @type {TradePolicy} */
const tradePolicy = {
	[RESOURCE_HYDROGEN]: {
		enabled: true,
		reserve: 2000,
		minimumPrice: 0.7,
		maximumTradeSize: 200,
	},
};

/**
 * Managers Market Trades
 */
class MarketManager {
	/**
	 * Creates Instance for a given terminal
	 * @param {StructureTerminal} terminal
	 */
	constructor(terminal) {
		this.terminal = terminal;
	}
	/**
	 * Finds a viable buy order for selling surplus resources.
	 * Does not execute the trade, only returns the order details.
	 * @param {ResourceConstant} resourceType
	 * @param {TradePolicy} policy
	 * @returns {ProposedTrade | null} - Returns the order details if a viable trade is found, otherwise null.
	 */
	findSellTrade(resourceType, policy = tradePolicy) {
		if (!policy[resourceType]) {
			console.log(`No Trade policy found for ${resourceType}`);
			return null;
		}
		const resourcePolicy = policy[resourceType];
		if (!resourcePolicy.enabled) {
			console.log(`Trade policy for ${resourceType} is not enabled`);
			return null;
		}
		const availableSurplus =
			(this.terminal.store[resourceType] ?? 0) - resourcePolicy.reserve;
		if (availableSurplus <= 0) {
			console.log(`No surplus available for ${resourceType}`);
			return null;
		}
		const orders = Game.market.getAllOrders(
			(order) =>
				order.resourceType === resourceType &&
				order.type === ORDER_BUY &&
				order.amount > 0 &&
				order.price >= resourcePolicy.minimumPrice,
		);

		if (orders.length === 0) {
			console.log(`No ORDER_BUY orders found for ${resourceType}`);
			return null;
		}

		orders.sort(function (a, b) {
			return b.price - a.price;
		});

		const order = orders[0];
		const orderPrice = order.price;
		const orderAmount = Math.min(
			order.amount,
			resourcePolicy.maximumTradeSize,
			availableSurplus,
		);
		const grossOrderCredits = orderAmount * orderPrice;
		const orderTransactionEnergy = Game.market.calcTransactionCost(
			orderAmount,
			this.terminal.room.name,
			order.roomName,
		);

		return {
			orderId: order.id,
			resourceType: order.resourceType,
			amount: orderAmount,
			price: orderPrice,
			grossCredits: grossOrderCredits,
			transactionEnergy: orderTransactionEnergy,
		};
	}
}

module.exports = MarketManager;

/**
 * TODO:
 * - Implement findBuyTrade method to find viable sell orders for buying resources.
 * Your code sorts orders by descending price:
orders.sort((a, b) => b.price - a.price);

Then evaluates only orders[0].

Suppose two orders are available:
	Order A	Order B
Unit price	0.90	0.85
Trade amount	200	200
Gross credits	180	170
Transaction energy	800	100

Your code selects Order A.

But Order B costs 700 less energy for only 10 fewer credits.

If energy is valued at 0.1 credits per unit, Order A's net value is 100 credits, while Order B's is 160 credits.

There's also a correctness consequence: if Order A's transaction energy is unaffordable, your function should ideally examine Order B rather than immediately abandoning the search.

I wouldn't necessarily introduce dynamic energy pricing yet. But I'd make sure you're aware that highest unit price and best trade aren't necessarily the same thing.

Later test for
Then add the two important economic cases: an unaffordable highest-priced order and a lower-priced order with better net value.
 *
 */
