/**
 * Run Upgrader
 * Quick and dirty upgrader to upgrade the controller in inital phase of the game 
 */

import { PLAYER_USERNAME } from "consts";
import { signControllerIfNeeded, tryHarvest } from "./creepBehaviours";
import { getCreepMemory, getRoomMemory } from "managers/memoryManager";

export function runUpgrader(creep: Creep)
{
    const memory = getCreepMemory(creep);
    const roomMemory = getRoomMemory(creep.room);
    if (!roomMemory.sources) return; 
    const sourceId = roomMemory.sources && Object.keys(roomMemory.sources)[0] as Id<Source>;
    const controllerId = memory.task?.targetId as Id<StructureController>;
    const controller = Game.getObjectById(controllerId);

    if (!controllerId) return;
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
        tryHarvest(creep, sourceId);
    } else
    {
        if (controller)
        { 
            if (creep.upgradeController(controller!) === ERR_NOT_IN_RANGE)
            {
                creep.moveTo(controller!, {visualizePathStyle: {stroke: '#8B0000'}});
            }
            // if (controller.sign === undefined || controller.sign?.text.length <= 0 || controller.sign.username !== PLAYER_USERNAME)
            // {
            //     if (signControllerIfNeeded(creep, controller!))
            //     {
            //         creep.moveTo(controller!, {visualizePathStyle: {stroke: '#8B0000'}});
            //     }
            // } else
            // {
            //      if (creep.upgradeController(controller!) === ERR_NOT_IN_RANGE)
            //     {
            //         creep.moveTo(controller!, {visualizePathStyle: {stroke: '#ffffff'}});
            //     }
            // }
        }
    }
}