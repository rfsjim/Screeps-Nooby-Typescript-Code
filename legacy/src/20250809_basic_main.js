'use strict';

/**
 * Shared creep behaviours
 *
 * @param creep
 * @returns result as boolean
 */
function tryHarvest(creep) {
    const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    if (source) {
        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
        return true;
    }
    return false;
}

/**
 * Run Harvester
 * A quick and dirty simple energy harvester performing basic direct-drop harvesting
 * For initial phases of screeps to quickly get upgraded to RCL 2
 * @param creep
 */
function runHarvester(creep) {
    const memory = creep.memory;
    if (memory.working && creep.store[RESOURCE_ENERGY] === 0) {
        memory.working = false;
        creep.say('🚜 harvest');
    }
    if (!memory.working && creep.store.getFreeCapacity() === 0) {
        memory.working = true;
        creep.say('🪣 fill');
    }
    if (!memory.working) {
        tryHarvest(creep);
    }
    else {
        const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: structure => (structure.structureType == STRUCTURE_EXTENSION ||
                structure.structureType == STRUCTURE_SPAWN ||
                structure.structureType == STRUCTURE_TOWER) &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });
        if (target) {
            if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
            }
        }
    }
}

/**
 * Run Upgrader
 * Quick and dirty upgrader to upgrade the controller in inital phase of the game
 */
function runUpgrader(creep) {
    const memory = creep.memory;
    if (memory.working && creep.store[RESOURCE_ENERGY] === 0) {
        memory.working = false;
        creep.say('🚜 harvest');
    }
    if (!memory.working && creep.store.getFreeCapacity() === 0) {
        memory.working = true;
        creep.say('⚡ upgrade');
    }
    if (!memory.working) {
        tryHarvest(creep);
    }
    else {
        if (creep.room.controller) {
            if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, { visualizePathStyle: { stroke: '#ffffff' } });
            }
        }
    }
}

/*
 * Control spawning of creeps
 */
function manageSpawning() {
    const harvesters = Object.values(Game.creeps).filter((c) => c.memory.role === 'harvester');
    const upgraders = Object.values(Game.creeps).filter((c) => c.memory.role === 'upgrader');
    const spawn = Game.spawns['Spawn1'];
    if (!spawn.spawning) {
        if (harvesters.length < 2) {
            spawn.spawnCreep([WORK, CARRY, MOVE], `harvester-${Game.time}`, {
                memory: { role: "harvester", working: false }
            });
        }
        else if (upgraders.length < 1) {
            spawn.spawnCreep([WORK, CARRY, MOVE], `upgrader - ${Game.time}`, {
                memory: { role: "upgrader", working: false }
            });
        }
    }
    else {
        const spawningCreep = Game.creeps[spawn.spawning.name];
        spawn.room.visual.text('🛠️' + spawningCreep.memory.role, spawn.pos.x + 1, spawn.pos.y, { align: 'left', opacity: 0.8 });
    }
}

/*
    Typescript Screeps Code for Noobs

    Starting 19th February 2023
    Last Updated 27th July 2025
*/
if (Game.cpu.bucket < 500) {
    throw new Error('Extremely low bucket - aborting script run at top level');
}
const loop = () => {
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        const memory = creep.memory;
        switch (memory.role) {
            case "harvester":
                runHarvester(creep);
                break;
            case "upgrader":
                runUpgrader(creep);
                break;
        }
    }
    manageSpawning();
};

exports.loop = loop;