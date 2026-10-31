/**
 * TODO
 * See archived storage only version as reference is functionality is later required
 * Git Commit - fc017e51bd5e538521e74469d12dac3d64d15507
 * development/colony-v2 fc017e5
 **/

module.exports = {
	/**
	 * Function to run the logic for upgraders
	 * @param {Creep} creep
	 */
	run: function (creep) {
		// if creep is bringing energy to the controller but has no energy left
		if (
			creep.memory.working === true &&
			creep.store[RESOURCE_ENERGY] === 0
		) {
			// switch state
			creep.memory.working = false;
			creep.say('🚜 harvest');
		}
		// if creep is harvesting energy but is full
		else if (
			creep.memory.working === false &&
			creep.store[RESOURCE_ENERGY] ===
				creep.store.getCapacity(RESOURCE_ENERGY)
		) {
			// switch state
			creep.memory.working = true;
			creep.say('⚡ upgrade');
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
				creep.moveTo(creep.room.controller, {
					visualizePathStyle: { stroke: '#8B0000' },
				});
			}

			// signController if not already signed
			if (
				signControllerIfNeeded(creep, creep.room.controller) ===
				ERR_NOT_IN_RANGE
			) {
				creep.moveTo(creep.room.controller, {
					visualizePathStyle: { stroke: '#8B00ff' },
				});
			}
		}
		// if creep is supposed to get energy
		else {
			creep.getEnergy(true, true);
		}
	},
};

/**
 * Signs Controller if Required
 * @param {Creep} creep
 * @param {StructureController} controller
 * @param {string} text
 * @returns {OK | ERR_BUSY | ERR_INVALID_TARGET | ERR_NOT_IN_RANGE} Signing result
 */
function signControllerIfNeeded(creep, controller, text = '007 was here') {
	const ownerName = controller.owner?.username;
	const reserverName = controller.reservation?.username;

	// Skip controllers owned by another player
	if (ownerName && ownerName !== PLAYER_USERNAME) {
		return ERR_INVALID_TARGET;
	}

	// Skip controllers reserved by another player
	if (reserverName && reserverName !== PLAYER_USERNAME) {
		return ERR_INVALID_TARGET;
	}

	// Sign if the message differs or another player signed it
	if (
		controller.sign?.text !== text ||
		controller.sign?.username !== PLAYER_USERNAME
	) {
		return creep.signController(controller, text);
	}

	return ERR_INVALID_TARGET;
}
