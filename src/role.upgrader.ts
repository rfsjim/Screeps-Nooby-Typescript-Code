export interface Upgrader extends Creep {
    memory: UpgraderMemory;
}

export interface UpgraderMemory extends CreepMemory {
    role: 'upgrader';
    working: boolean;
}

const roleUpgrader = {
    run: function(creep : Upgrader) {
        if (creep.room.controller) {

            // upgrader is a state machine working or harvesting
            if (creep.memory.working && creep.store[RESOURCE_ENERGY] == 0 ) {
                creep.memory.working = false;
                creep.say('🔄 harvest');
            }
            if (!creep.memory.working && creep.store.getFreeCapacity() == 0) {
                creep.memory.working = true;
                creep.say('⚡ upgrade');
            }

            if (creep.memory.working) {
                if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
                }
            }
            else {
                let sources = creep.room.find(FIND_SOURCES);
                if (creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(sources[0], {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            }
        }
    }
};

export default roleUpgrader;