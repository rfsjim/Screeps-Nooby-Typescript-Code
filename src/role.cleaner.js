module.exports = {
    // a function to run the logic for this role
    // pick up any dropped resources prior to being a normal harvester
    /** @param {Creep} creep */
    run: function(creep) {
        // if creep is bringing energy to a structure but has no energy left
        if (creep.memory.working == true && creep.store[RESOURCE_ENERGY] == 0) {
            // switch state
            creep.memory.working = false;
        }
        // if creep is harvesting energy but is full
        else if (creep.memory.working == false && creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
            // switch state
            creep.memory.working = true;
        }

        // if creep is supposed to transfer energy to a structure
        if (creep.memory.working == true) {
            // find closest spawn, extension or tower which is not full
            var structure = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                // the second argument for findClosestByPath is an object which takes
                // a property called filter which can be a function
                // we use the arrow operator to define it
                filter: (s) => (s.structureType == STRUCTURE_SPAWN
                             || s.structureType == STRUCTURE_EXTENSION
                             || s.structureType == STRUCTURE_TOWER)
                             && s.store[RESOURCE_ENERGY] < s.store.getCapacity(RESOURCE_ENERGY)
            });

            if (structure == undefined) {
                structure = creep.room.storage;
            }

            // if we found one
            if (structure != undefined) {
                // try to transfer energy, if it is not in range
                if (creep.transfer(structure, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    // move towards it
                    creep.moveTo(structure);
                }
            }
        }
        // if creep is supposed to harvest energy from source
        else {
            var target = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES);
            if (target != undefined) {
              // try to pick up dropped resources
              if (creep.pickup(target) == ERR_NOT_IN_RANGE) {
                // move to resource
                creep.moveTo(target);
              }
            } else if (creep.pos.findClosestByRange(FIND_TOMBSTONES) != undefined) {
              // try to find any tombstones
              target = creep.pos.findClosestByRange(FIND_TOMBSTONES);
                if (creep.withdraw(target) == ERR_NOT_IN_RANGE) {
                  creep.moveTo(target);
                }
            } else
            creep.getEnergy(false, true);
        }
    }
};
