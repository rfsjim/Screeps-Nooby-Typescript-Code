module.exports = {
	// a function to run the logic for this role
	run: function (creep) {
		// get source
		let source = Game.getObjectById(creep.memory.sourceId);

		if (source === null) {
			const assignedSourceIds = creep.room
				.find(FIND_MY_CREEPS)
				.filter(
					(other) =>
						other.id !== creep.id &&
						other.memory.role === 'miner' &&
						other.memory.sourceId,
				)
				.map((other) => other.memory.sourceId);

			source = creep.room.find(FIND_SOURCES).find((candidate) => {
				if (assignedSourceIds.includes(candidate.id)) {
					return false;
				}

				const containers = candidate.pos.findInRange(
					FIND_STRUCTURES,
					1,
					{
						filter: (s) => s.structureType === STRUCTURE_CONTAINER,
					},
				);

				return containers.length > 0;
			});

			if (!source) {
				return;
			}

			creep.memory.sourceId = source.id;
		}
		// find container next to source
		const container = source.pos.findInRange(FIND_STRUCTURES, 1, {
			filter: (s) => s.structureType === STRUCTURE_CONTAINER,
		})[0];

		if (!container) {
			return;
		}

		// if creep is on top of the container
		if (creep.pos.isEqualTo(container.pos)) {
			// harvest source
			creep.harvest(source);
		}
		// if creep is not on top of the container
		else {
			// move towards it
			creep.moveTo(container);
		}
	},
};
