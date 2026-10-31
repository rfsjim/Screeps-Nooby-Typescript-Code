module.exports = {
	/**
	 * Run Claimer Logic
	 * @param {Creep} creep
	 */
	run: function (creep) {
		// if in target room
		if (creep.room.name !== creep.memory.target) {
			// find exit to target room
			const exit = creep.room.findExitTo(creep.memory.target);
			// move to exit
			creep.moveTo(creep.pos.findClosestByRange(exit));
		} else {
			// try to claim controller
			const actions = {
				claim: () => creep.claimController(creep.room.controller),
				reserve: () => creep.reserveController(creep.room.controller),
			};

			if (
				actions[creep.memory.controllerAction]?.() === ERR_NOT_IN_RANGE
			) {
				// move towards the controller
				creep.moveTo(creep.room.controller);
			}
		}
	},
};
