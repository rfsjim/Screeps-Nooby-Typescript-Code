// create a new function for StructureTower
StructureTower.prototype.busy = 0;

StructureTower.prototype.defend =
  function() {
    // find closest hostile mob
    const target = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    // if hostile creep exists
    if (OK === this.attack(target)) {
      this.busy = 1;
    }

    const ratio = this.store[RESOURCE_ENERGY] / this.store.getCapacity(RESOURCE_ENERGY);
    if (ratio >= 0.5 && !this.busy) {
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            if (creep.hits < creep.hitsMax){
                this.heal(creep);
            }
        }
        const closestDamagedStructure = 
			this.pos.findClosestByRange(
				FIND_STRUCTURES, {
					filter: (s) => s.hits < s.hitsMax &&
					s.structureType !== STRUCTURE_WALL &&
					s.structureType !== STRUCTURE_RAMPART
			});
        if (closestDamagedStructure) {
            this.repair(closestDamagedStructure);
        }
    }
  };