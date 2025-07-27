/**
 * Shared creep behaviours
 * 
 * @param creep 
 * @returns result as boolean
 */

export function tryHarvest(creep: Creep): boolean
{
    const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    if (source)
    {
        if (creep.harvest(source) === ERR_NOT_IN_RANGE)
        {
            creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
        return true;
    }
    return false;
}