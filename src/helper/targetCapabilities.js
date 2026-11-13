/**
 * A capability library that managers can consult when making decisions
 * Assortment of helper functions that will assist with upcoming manager requirements
 */

/**
 * Checks if creeps can harvest from target
 * @param {Source|Mineral|Deposit} target
 * @returns {boolean} Is Target Harvestable
 */
function isHarvestable(target) {
	return (
		target instanceof Source ||
		target instanceof Mineral ||
		target instanceof Deposit
	);
}

/**
 * Checks if creeps can withdraw from target
 * @param {StructureSpawn|StructureExtension|StructureTower|StructurePowerSpawn|StructureNuker|StructureTerminal|StructureFactory|StructureStorage|StructureContainer|StructureLink|StructureLab|Tombstone|Ruin} target
 * @returns {boolean} Is Target Withdrawable
 */
function isWithdrawable(target) {
	return (
		target instanceof StructureSpawn ||
		target instanceof StructureExtension ||
		target instanceof StructureTower ||
		target instanceof StructurePowerSpawn ||
		target instanceof StructureNuker ||
		target instanceof StructureTerminal ||
		target instanceof StructureFactory ||
		target instanceof StructureStorage ||
		target instanceof StructureContainer ||
		target instanceof StructureLink ||
		target instanceof StructureLab ||
		target instanceof Tombstone ||
		target instanceof Ruin
	);
}

/**
 * Checks if creeps can pick-up from target
 * @param {Resource} target
 * @returns {boolean} Is Target Pickupable
 */
function isPickupable(target) {
	return target instanceof Resource;
}

/**
 * Checks if creep has a WORK part
 * @param {Creep} target
 * @returns {boolean} Does Creep have WORK part
 */
function hasWork(target) {
	return target.getActiveBodyparts(WORK) > 0;
}

/**
 * Checks if creep has a CARRY part
 * @param {Creep} target
 * @returns {boolean} Does Creep have CARRY part
 */
function hasCarry(target) {
	return target.getActiveBodyparts(CARRY) > 0;
}

module.exports = {
	isHarvestable,
	isWithdrawable,
	isPickupable,
	hasWork,
	hasCarry,
};
