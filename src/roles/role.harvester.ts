/**
 * Run Harvester
 * A quick and dirty simple energy harvester performing basic direct-drop harvesting
 * For initial phases of screeps to quickly get upgraded to RCL 2
 * @param creep 
 */

import { tryHarvest } from "./creepBehaviours";
import { CreepMemory } from "../types";

export function runHarvester(creep: Creep)
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
        creep.say('🪣 fill');
    }

    if (!memory.working)
    {
        tryHarvest(creep);
    } else
    {
        const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: structure =>
                (structure.structureType == STRUCTURE_EXTENSION ||
                    structure.structureType == STRUCTURE_SPAWN ||
                    structure.structureType == STRUCTURE_TOWER) &&
                    structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });

        if (target)
        {
            if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
            {
                creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
            }
        }
    }
}