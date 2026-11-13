// TODO: Currently uses the extractor, and terminal - consider labs boosts etc and other uses for minerals
// Revisit mineral availability, workforce demand, and mineral processing (labs, boosts and commodities).

'use strict';

module.exports = {
	/**
	 * Run Extractor Role
	 * @param {Creep} creep
	 */
	run: function (creep) {
		const mineral = Game.getObjectById(creep.memory.mineralId);
		const destination = Game.getObjectById(creep.memory.destinationId);

		if (!mineral || !destination) {
			console.log(`[ERROR] ${creep.name}: Invalid extractor assignment`);
			return;
		}

		const mineralType = mineral.mineralType;

		if (creep.memory.extracting) {
			if (creep.store.getFreeCapacity() === 0) {
				creep.memory.extracting = false;
			}
		} else if (creep.store.getUsedCapacity(mineralType) === 0) {
			creep.memory.extracting = true;
		}

		if (creep.memory.extracting) {
			const result = creep.harvest(mineral);

			if (result === ERR_NOT_IN_RANGE) {
				creep.moveTo(mineral);
			}
		} else {
			const result = creep.transfer(destination, mineralType);

			if (result === ERR_NOT_IN_RANGE) {
				creep.moveTo(destination);
			}
		}
	},
};
