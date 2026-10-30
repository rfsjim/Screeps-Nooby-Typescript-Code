/**
 * Depreciated
 * Role Upgrader performs same tasks
 */

module.exports = {
	// a function to run the logic for this role
	/** @param {Creep} creep */
	run: function (creep) {
		if (creep.room.controller?.level < 4 || !creep.room.storage) {
			return;
		}
		let storage = null;
		// if creep is bringing energy to the controller but has no energy left
		if (
			creep.memory.working === true &&
			creep.store[RESOURCE_ENERGY] === 0
		) {
			// switch state
			creep.memory.working = false;
		}
		// if creep is harvesting energy but is full
		else if (
			creep.memory.working === false &&
			creep.store[RESOURCE_ENERGY] ===
				creep.store.getCapacity(RESOURCE_ENERGY)
		) {
			// switch state
			creep.memory.working = true;
		}

		// if creep is supposed to transfer energy to the controller
		if (creep.memory.working === true) {
			// instead of upgraderController we could also use:
			// if (creep.transfer(creep.room.controller, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {

			// try to upgrade the controller
			if (
				creep.upgradeController(creep.room.controller) ===
				ERR_NOT_IN_RANGE
			) {
				// if not in range, move towards the controller
				creep.moveTo(creep.room.controller);
			}
		}
		// if creep is supposed to get energy
		// only collect energy from storage
		else {
			// find storage
			if (
				creep.room.storage &&
				creep.room.storage.store[RESOURCE_ENERGY] > 0
			) {
				storage = creep.room.storage;
			}
			// if one was found
			if (storage !== null) {
				// try to withdraw energy, if the container is not in range
				if (
					creep.withdraw(storage, RESOURCE_ENERGY) ===
					ERR_NOT_IN_RANGE
				) {
					// move towards it
					creep.moveTo(storage);
				}
			}
		}
	},
};
