/**
 * TODO
 * See archived storage only version as reference is functionality is later required
 * Git Commit - fc017e51bd5e538521e74469d12dac3d64d15507
 * development/colony-v2 fc017e5
 **/

module.exports = {
	/**
	 * Function to run the logic for this role
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

			// signController if not already signed
			if (
				!creep.room.controller.sign ||
				creep.room.controller.sign.username !==
					creep.room.controller.owner.username
			) {
				if (
					creep.signController(
						creep.room.controller,
						'007 was here',
					) === ERR_NOT_IN_RANGE
				) {
					creep.moveTo(creep.room.controller);
				}
			}
		}
		// if creep is supposed to get energy
		else {
			creep.getEnergy(true, true);
		}
	},
};
