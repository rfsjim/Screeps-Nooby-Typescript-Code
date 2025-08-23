import { getCreepMemory, getRoomMemory } from "managers/memoryManager";
import { tryHarvest } from "./creepBehaviours";

export function runBuilder(creep: Creep)
{
    const creepMemory = getCreepMemory(creep);
    const roomMemory = getRoomMemory(creep.room);

    if (!roomMemory.sources) return;
    if (!creepMemory.task || !creepMemory.task.targetId) return;
    const sourceId = roomMemory.sources && Object.keys(roomMemory.sources)[1] as Id<Source>;
    const target = Game.getObjectById(creepMemory.task?.targetId as Id<ConstructionSite>);
    if (target === null)
    {
        creepMemory.task.status = 'completed';
        return;
    }

    if (creepMemory.task?.status === 'tasked') creepMemory.task.status = 'in_progress';

    if (creepMemory.working && creep.store[RESOURCE_ENERGY] === 0)
    {
        creepMemory.working = false;
        creep.say('🚜 harvest');
    }
    if (!creepMemory.working && creep.store.getFreeCapacity() === 0)
    {
        creepMemory.working = true;
        creep.say('🏗️ build');
    }

    if (!creepMemory.working)
    {
        tryHarvest(creep, sourceId);
    }
    else
    {
        if (target)
        {
            if ( creep.build(target) === ERR_NOT_IN_RANGE)
            {
                creep.moveTo(target, {visualizePathStyle: {stroke: '#2c0276ff'}});
            }
        }
    }
}