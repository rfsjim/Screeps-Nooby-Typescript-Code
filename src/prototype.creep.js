const roles = {
	harvester: require('./role.harvester'),
	upgrader: require('./role.upgrader'),
	builder: require('./role.builder'),
	repairer: require('./role.repairer'),
	wallRepairer: require('./role.wallRepairer'),
	longDistanceHarvester: require('./role.longDistanceHarvester'),
	claimer: require('./role.claimer'),
	miner: require('./role.miner'),
	lorry: require('./role.lorry'),
	roleExtractor: require('./role.extractor'),
	carlDouglas: require('./role.carlDouglas'),
};

/**
 * For a creep with a given role, run the role code.
 * @returns {void}
 */
Creep.prototype.runRole = function () {
	const role = roles[this.memory.role];

	if (!role || typeof role.run !== 'function') {
		console.log(`Unknown role: ${this.memory.role} for creep ${this.name}`);
		return;
	}
	role.run(this);
};

/**
 * Creeps can obtain energy either from containers or sources
 * @param {boolean} useContainer
 * @param {boolean} useSource
 * @returns {void}
 */
Creep.prototype.getEnergy = function (useContainer, useSource) {
	let container = null;
	// if the Creep should look for containers
	if (useContainer) {
		// find closest container
		container = this.pos.findClosestByPath(FIND_STRUCTURES, {
			filter: (s) =>
				(s.structureType === STRUCTURE_CONTAINER ||
					s.structureType === STRUCTURE_STORAGE) &&
				s.store[RESOURCE_ENERGY] > 0,
		});
		// if one was found
		if (container !== null) {
			// try to withdraw energy, if the container is not in range
			if (
				this.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE
			) {
				// move towards it
				this.moveTo(container);
			}

			return;
		}
	}
	// if no container was found and the Creep should look for Sources
	if (useSource) {
		// find closest source
		const source = this.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
		// try to harvest energy, if the source is in range
		if (source !== null) {
			if (this.harvest(source) === ERR_NOT_IN_RANGE) {
				// move towards it
				this.moveTo(source);
				return;
			}

			return;
		}
	}
};

/**
 * Pick up any resource dropped in the room
 * @returns {void}
 */
Creep.prototype.pickUpResource = function () {
	const target = this.pos.findClosestByPath(FIND_DROPPED_RESOURCES);

	if (target === null) {
		return;
	}

	if (this.pickup(target) === ERR_NOT_IN_RANGE) {
		this.moveTo(target);
	}
};

// TODO: Implement threat-aware movement.
// - Flee when survival takes priority over the assigned task.
// - Kite when ranged combat can be maintained at a safer distance.
// - Coordinate movement with existing healing and attack objectives.
