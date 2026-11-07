// create a new function for StructureTower
StructureTower.prototype.busy = 0;

/**
 * Logic for the tower to defend heal and repair in the room
 * @returns {void}
 */
StructureTower.prototype.defend = function () {
	// find closest hostile mob
	this.busy = 0;
	const room = this.room;
	if (!room) {
		return;
	}

	let target = null;

	target = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
	// if hostile creep exists
	if (target && OK === this.attack(target)) {
		return;
	}

	const ratio =
		this.store[RESOURCE_ENERGY] / this.store.getCapacity(RESOURCE_ENERGY);
	if (ratio >= 0.5 && !this.busy) {
		for (const name in Game.creeps) {
			const creep = Game.creeps[name];
			if (creep.hits < creep.hitsMax) {
				this.heal(creep);
			}
		}
		const closestDamagedStructure = this.pos.findClosestByRange(
			FIND_STRUCTURES,
			{
				filter: (s) =>
					s.hits < s.hitsMax * 0.6 &&
					s.structureType !== STRUCTURE_WALL &&
					s.structureType !== STRUCTURE_RAMPART,
			},
		);
		if (closestDamagedStructure) {
			this.repair(closestDamagedStructure);
		}
	}
};
