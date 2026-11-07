const roleUpgrader = require('./role.upgrader');

module.exports = {
	/**
	 * Run Logic for Builders
	 * @param {Creep} creep
	 */
	run: function (creep) {
		// if creep has a target but not in target room
		creep.memory.working ??= false;
		if (
			creep.memory.target !== undefined &&
			creep.room.name !== creep.memory.target
		) {
			// find exit to room
			const exit = creep.room.findExitTo(creep.memory.target);
			if (exit < 0) {
				return;
			}

			const exitPosition = creep.pos.findClosestByRange(exit);

			// move to exit
			if (exitPosition) {
				creep.moveTo(creep.pos.findClosestByRange(exit));
			}
			// don't do anything else this turn
			return;
		}

		if (
			creep.memory.target !== undefined &&
			creep.room.name === creep.memory.target &&
			creep.room.controller?.ticksToDowngrade < 999
		) {
			roleUpgrader.run(creep);
			return;
		}

		// if creep is trying to complete a constructionSite but has no energy left
		if (
			creep.memory.working === true &&
			creep.store[RESOURCE_ENERGY] === 0
		) {
			// switch state
			creep.memory.working = false;
			creep.say('🚜 harvest');
		} else if (
			creep.memory.working === false &&
			creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0
		) {
			// if creep is harvesting energy but is full
			// switch state
			creep.memory.working = true;
			creep.say('🏗️ build');
		}

		// if creep is completing constructionSite
		if (creep.memory.working === true) {
			// find closest constructionSite
			const constructionSite = creep.pos.findClosestByPath(
				FIND_MY_CONSTRUCTION_SITES,
			);
			// if one is found
			if (constructionSite) {
				// try to build
				if (creep.build(constructionSite) === ERR_NOT_IN_RANGE) {
					creep.moveTo(constructionSite, {
						visualizePathStyle: { stroke: '#2c0276ff' },
					});
				}
			} else {
				// no construction sites so upgrade the controller
				roleUpgrader.run(creep);
				return;
			}
		}
		// creep should get energy
		else {
			creep.getEnergy(true, true);
		}
	},
};
