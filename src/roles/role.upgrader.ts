/**
 * Run Upgrader
 * Quick and dirty upgrader to upgrade the controller in inital phase of the game 
 */

import { tryHarvest } from "./creepBehaviours";
import { getCreepMemory } from "managers/memoryManager";

export function runUpgrader(creep: Creep)
{
    const memory = getCreepMemory(creep);
    const targetId = memory.task?.targetId as Id<Source>;
    if (!targetId) return;
    if (memory.task?.status === 'tasked') memory.task.status = 'in_progress';

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
        tryHarvest(creep, targetId);
    } else
    {
        if (creep.room.controller)
        {
            if (creep.upgradeController(creep.room.controller!) === ERR_NOT_IN_RANGE)
            {
                creep.moveTo(creep.room.controller!, {visualizePathStyle: {stroke: '#ffffff'}});
            }
        }
    }
}