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
 * Finds a viable buy order for selling surplus resources.
 * Does not execute the trade, only returns the order details.
 * @param {ResourceConstant} resourceType
 * @returns {ProposedTrade | null} Returns the order details if a viable trade is found, otherwise null.
 */
StructureTerminal.prototype.findSellTrade = function (resourceType) {
	return new MarketManager(this).findSellTrade(resourceType);
};

/**
 * Finds a viable sell order for purchasing resources.
 * Does not execute the trade, only returns the order details.
 * @param {ResourceConstant} resourceType
 * @returns {ProposedTrade | null} Returns the order details if a viable trade is found, otherwise null.
 */
StructureTerminal.prototype.findBuyTrade = function (resourceType) {
	return new MarketManager(this).findBuyTrade(resourceType);
};
