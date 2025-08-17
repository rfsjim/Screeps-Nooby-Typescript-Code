import { getRoomMemory } from "managers/memoryManager";
import { PLAYER_USERNAME } from "consts";

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

/**
 * Signs Controller if Required
 * @param creep 
 * @param controller 
 * @param text 
 * @returns 
 */
export function signControllerIfNeeded(creep: Creep, controller: StructureController, text = "007 was here"): boolean
{
  // Skip hostile controllers
  const ownerName = controller.owner?.username;
  if (ownerName && ownerName !== PLAYER_USERNAME) return false;

  // Only sign if text differs or no sign exists
  if (controller.sign?.text !== text || controller.sign.username !== PLAYER_USERNAME)
  {
    const result = creep.signController(controller, text);
    if (result === OK) return true;
    else return false;
  }

  return false;
}