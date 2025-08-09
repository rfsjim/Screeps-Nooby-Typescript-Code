import { getRoomMemory } from "managers/memoryManager";

/**
 * Shared creep behaviours
 * 
 * @param creep 
 * @returns result as boolean
 */
export function tryHarvest(creep: Creep, targetId: Id<Source>): boolean
{
    const source = Game.getObjectById(targetId);
    if (source)
    {
        const result = creep.harvest(source); 
        if (result === ERR_NOT_IN_RANGE)
        {
            creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
        else if (result < OK)
        {
            return false;
        }
        else if (result === OK)
        {
            addHarvestedEnergy(creep.room, creep.store.getCapacity());
            return true;
        }
    }
    return false;
}

/**
 * Add Energy Harvested to memory tracker
 * @param amount 
 */
export function addHarvestedEnergy(room: Room, amount: number): void
{
    const controllerProgressMemory = getRoomMemory(room);
    if (!controllerProgressMemory) return;
    controllerProgressMemory.controllerProgress!.totalEnergyHarvested += amount;
}