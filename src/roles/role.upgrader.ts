/**
 * Run Upgrader
 * Quick and dirty upgrader to upgrade the controller in inital phase of the game 
 */

import { tryHarvest } from "./creepBehaviours";
import { CreepMemory } from "../types";

export function runUpgrader(creep: Creep)
{
    const memory = creep.memory as CreepMemory;

    if (memory.working && creep.store[RESOURCE_ENERGY] === 0)
    {
        memory.working = false;
        creep.say('🚜 harvest');
    }
    if (!memory.working && creep.store.getFreeCapacity() === 0)
    {
        memory.working = true;
        creep.say('⚡ upgrade');
    }

    if (!memory.working)
    {
        tryHarvest(creep);
    } else
    {
        if (creep.room.controller)
        {
            if (creep.upgradeController(creep.room.controller!) == ERR_NOT_IN_RANGE)
            {
                creep.moveTo(creep.room.controller!, {visualizePathStyle: {stroke: '#ffffff'}});
            }
        }
    }
}