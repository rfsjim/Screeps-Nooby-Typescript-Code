/**
 * Assist with values and information about objects
 */

/**
 * Obtains the resource type produced by a harvestable object.
 * @param {Id<Source|Mineral|Deposit>|undefined} id
 * @returns {ResourceConstant|null}
 */
function getResourceTypeFromId(id) {
	if (!id) {
		return null;
	}
	const obj = Game.getObjectById(id);
	if (!obj) {
		return null;
	}

	if (obj instanceof Source) {
		return RESOURCE_ENERGY;
	}
	if (obj instanceof Mineral) {
		return obj.mineralType;
	}
	if (obj instanceof Deposit) {
		return obj.depositType;
	}

	return null;
}

/**
 * Obtains Player Username
 * @returns {string|null}
 */
function getPlayerUsername() {
	// Check structures first
	for (const obj of Object.values(Game.structures)) {
		if (obj.owner?.username) {
			return obj.owner.username;
		}
	}

	// Then creeps
	for (const obj of Object.values(Game.creeps)) {
		if (obj.owner?.username) {
			return obj.owner.username;
		}
	}

	// Finally construction sites
	for (const obj of Object.values(Game.constructionSites)) {
		if (obj.owner?.username) {
			return obj.owner.username;
		}
	}

	// Otherwise the player name is unknown
	return null;
}

/**
 * Is Given Object a Source
 * @param {unknown} obj
 * @returns {obj is Source} obj is Source
 */
function isSource(obj) {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'energy' in obj &&
		typeof obj.energy === 'number' &&
		!('mineralType' in obj) &&
		!('depositType' in obj)
	);
}

/**
 * Is Given Object a Mineral
 * @param {unknown} obj
 * @returns {obj is Mineral} obj is Mineral
 */
function isMineral(obj) {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'mineralType' in obj &&
		typeof obj.mineralType === 'string' &&
		!('energy' in obj) &&
		!('depositType' in obj)
	);
}

/**
 * Narrow type guard to deposit
 * @param {unknown} obj
 * @returns {obj is Deposit} obj is Deposit
 */
function isDeposit(obj) {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'depositType' in obj &&
		typeof obj.depositType === 'string' &&
		!('energy' in obj) &&
		!('mineralType' in obj)
	);
}

module.exports = {
	getResourceTypeFromId,
	getPlayerUsername,
	isDeposit,
	isMineral,
	isSource,
};
