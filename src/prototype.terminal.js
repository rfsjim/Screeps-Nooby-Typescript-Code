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
 * Finds a viable trade for the terminal from the market.
 * @param {ResourceConstant} resourceType - The resource to trade.
 * @returns {ProposedTrade | null} - Returns the order details if a viable trade is found, otherwise null.
 */
StructureTerminal.prototype.findSellTrade = function (resourceType) {
	return new MarketManager(this).findSellTrade(resourceType);
};
