module.exports = {
	/**
	 * Run Claimer Logic
	 * @param {Creep} creep
	 */
	run: function (creep) {
		const { target, controllerAction } = creep.memory;
		if (
			typeof target !== 'string' ||
			!target ||
			!['claim', 'reserve'].includes(controllerAction)
		) {
			console.log(`[ERROR] ${creep.name}: Invalid claimer configuration`);
			return;
		}
		// if in target room
		if (creep.room.name !== creep.memory.target) {
			// find exit to target room
			const exit = creep.room.findExitTo(creep.memory.target);
			if (exit < 0) {
				console.log(
					`[ERROR] ${creep.name}: Cannot find exit towards ${target} (${exit})`,
				);
				return;
			}
			// move to exit
			creep.moveTo(creep.pos.findClosestByRange(exit));
		} else {
			// try to claim controller
			const actions = {
				claim: () => creep.claimController(creep.room.controller),
				reserve: () => creep.reserveController(creep.room.controller),
			};

			if (actions[creep.memory.controllerAction]() === ERR_NOT_IN_RANGE) {
				// move towards the controller
				creep.moveTo(creep.room.controller);
			}
		}
	},
};
