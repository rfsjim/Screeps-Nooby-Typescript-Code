/**
 * @typedef {Object} ResourceTradePolicy
 * @property {boolean} enabled
 * @property {number} reserve
 * @property {number} minimumPrice
 * @property {number} [maximumPrice]
 * @property {number} maximumTradeSize
 * @property {number} energyValue
 */

/**
 * @typedef {Object} ProposedTrade
 * @property {string} orderId
 * @property {ResourceConstant} resourceType
 * @property {number} amount
 * @property {number} price
 * @property {number} grossCredits
 * @property {number} transactionEnergy
 * @property {number} netValue a signed value: positive for selling, negative for buying
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
		energyValue: 0.1,
	},
	[RESOURCE_ZYNTHIUM]: {
		enabled: true,
		reserve: 2000,
		minimumPrice: 0.7,
		maximumTradeSize: 200,
		energyValue: 0.1,
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
	 * @returns {ProposedTrade | null} Returns the order details if a viable trade is found, otherwise null.
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
		const terminalEnergy = this.terminal.store[RESOURCE_ENERGY] ?? 0;
		if (terminalEnergy === 0) {
			console.log(`No energy available for ${resourceType}`);
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

		let bestTrade = null;
		let bestNetValue = -Infinity;

		orders.forEach((order) => {
			const amount = Math.min(
				order.amount,
				resourcePolicy.maximumTradeSize,
				availableSurplus,
			);

			if (amount <= 0) {
				return;
			}

			const transactionEnergyCost = Game.market.calcTransactionCost(
				amount,
				this.terminal.room.name,
				order.roomName,
			);

			if (transactionEnergyCost > terminalEnergy) {
				return;
			}

			if (
				order.resourceType === RESOURCE_ENERGY &&
				amount + transactionEnergyCost > terminalEnergy
			) {
				return;
			}

			const grossCredits = amount * order.price;
			const netValue =
				grossCredits -
				transactionEnergyCost * resourcePolicy.energyValue;

			if (netValue <= 0) {
				return;
			}

			if (
				netValue > bestNetValue ||
				(netValue === bestNetValue &&
					bestTrade !== null &&
					transactionEnergyCost < bestTrade.transactionEnergy)
			) {
				bestNetValue = netValue;
				/** @type {ProposedTrade} */
				bestTrade = {
					orderId: order.id,
					resourceType: order.resourceType,
					amount,
					price: order.price,
					grossCredits,
					transactionEnergy: transactionEnergyCost,
					netValue,
				};
			}
		});

		if (!bestTrade) {
			console.log(`No viable trade found for ${resourceType}`);
			return null;
		}

		return bestTrade;
	}

	/**
	 * Finds a viable sell order for purchasing resources.
	 * Does not execute the trade, only returns the order details.
	 * @param {ResourceConstant} resourceType
	 * @param {TradePolicy} policy
	 * @returns {ProposedTrade | null} Returns the order details if a viable trade is found, otherwise null.
	 */
	findBuyTrade(resourceType, policy = tradePolicy) {
		if (!policy[resourceType]) {
			console.log(`No Trade policy found for ${resourceType}`);
			return null;
		}
		const resourcePolicy = policy[resourceType];
		if (!resourcePolicy.enabled) {
			console.log(`Trade policy for ${resourceType} is not enabled`);
			return null;
		}
		const terminalEnergy = this.terminal.store[RESOURCE_ENERGY] ?? 0;
		if (terminalEnergy === 0) {
			console.log(`No energy available for ${resourceType}`);
			return null;
		}
		const orders = Game.market.getAllOrders(
			(order) =>
				order.resourceType === resourceType &&
				order.type === ORDER_SELL &&
				order.amount > 0 &&
				(resourcePolicy.maximumPrice === undefined ||
					order.price <= resourcePolicy.maximumPrice),
		);

		if (orders.length === 0) {
			console.log(`No ORDER_SELL orders found for ${resourceType}`);
			return null;
		}

		let bestTrade = null;
		let lowestAcquisitionCost = Infinity;

		orders.forEach((order) => {
			const amount = Math.min(
				order.amount,
				resourcePolicy.maximumTradeSize,
				this.terminal.store.getFreeCapacity(),
				Math.floor(Game.market.credits / order.price),
			);

			if (amount <= 0) {
				return;
			}

			const transactionEnergyCost = Game.market.calcTransactionCost(
				amount,
				this.terminal.room.name,
				order.roomName,
			);

			if (transactionEnergyCost > terminalEnergy) {
				return;
			}

			const grossCredits = amount * order.price;
			if (grossCredits > Game.market.credits) {
				return;
			}

			const acquisitionCost =
				grossCredits +
				transactionEnergyCost * resourcePolicy.energyValue;
			const unitAcquisitionCost = acquisitionCost / amount;

			if (
				unitAcquisitionCost < lowestAcquisitionCost ||
				(unitAcquisitionCost === lowestAcquisitionCost &&
					bestTrade !== null &&
					transactionEnergyCost < bestTrade.transactionEnergy)
			) {
				lowestAcquisitionCost = unitAcquisitionCost;
				/** @type {ProposedTrade} */
				bestTrade = {
					orderId: order.id,
					resourceType: order.resourceType,
					amount,
					price: order.price,
					grossCredits,
					transactionEnergy: transactionEnergyCost,
					netValue: -acquisitionCost,
				};
			}
		});

		if (!bestTrade) {
			console.log(`No viable trade found for ${resourceType}`);
			return null;
		}

		return bestTrade;
	}
}

module.exports = MarketManager;
