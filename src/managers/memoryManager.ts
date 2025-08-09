import { RoomMemory, CreepMemory, Role, EnergyMinerMemory, RoomPhase} from "types";

/**
 * Clear Controller Progress for testing purposes
 * @param room 
 */
export function resetControllerProgress(room: Room): void {
    const roomMemory = getRoomMemory(room);
    if (roomMemory === null) return;
    delete roomMemory.controllerProgress;
}

/**
 * Returns the room memory
 * Guards Against Memory Corruption & avoid accidental overwrites or undefined situations
 * @param room 
 * @returns
 */
export function getRoomMemory(room: Room): RoomMemory | null
{
    if (!room || !room.controller || !room.controller.my) return null; 

    if (!room.memory) room.memory = {} as RoomMemory;
    
    const memory = room.memory as RoomMemory;
    
    if (!memory.controllerProgress) memory.controllerProgress = {level: 0, totalEnergyHarvested: 0};
    if (!memory.creepCounts) memory.creepCounts = {};
    if (!memory.creeps) memory.creeps = {};
    if (!memory.maxHarvesters) memory.maxHarvesters = 0;
    if (!memory.owner)
    {
        if (!room.controller?.owner) memory.owner = 'None';
        else memory.owner = room.controller.owner;
    }
    if (!memory.phase) memory.phase = -1;
    if (!memory.rcl)
    {
        if (!room.controller?.level) memory.rcl = -1;
        else memory.rcl = room.controller?.level;
    }
    if (!memory.spawns) memory.spawns = {};
    if (!memory.sources) memory.sources = {};
    return memory;
}

/**
 * Returns the creep memory
 * Guards Against Memory Corruption & avoid accidental overwrites or undefined situations
 * @param creep 
 * @returns 
 */
export function getCreepMemory(creep: Creep): CreepMemory
{
    if (!creep.memory)
    {
        creep.memory = {} as CreepMemory;
    }

    const memory = creep.memory as CreepMemory;

    if (!memory.role) memory.role = 'harvester';
    if (typeof memory.working === 'undefined') memory.working = false;

    return memory as CreepMemory;
}


export function getInitialCreepMemory(role: Role): CreepMemory
{
    return {
        role: role,
        working: false
    };
}

export function getInitialEnergyMinerMemory(sourceId: Id<Source>): EnergyMinerMemory
{
    return {
        role: 'energyMiner',
        working: false,
        sourceId: sourceId
    };
}

/**
 * Gets Number of Source Location[s] in room
 * Can be used to calculate max number of creeps per room
 * @param room 
 * @returns 
 */
export function getNumberOfSourceLocations(room: Room): number
{
  const roomMemory = getRoomMemory(room);
  if (!roomMemory) return 0;
  let totalNumPositions: number = 0;

  for (const sourceID in roomMemory.sources)
  {
    totalNumPositions += roomMemory.sources[sourceID].numPositions;
  }

  return totalNumPositions;
}

/**
 * Detects Room Phase
 * @param room 
 * @returns RoomPhase
 */
export function getRoomPhase(room: Room): RoomPhase {
  const roomMemory = getRoomMemory(room);
  if (!roomMemory) return RoomPhase.UnitiatedRoom;
  if (!roomMemory.creeps) return 0;
  const rcl = roomMemory.rcl ?? 0;
  const hasStorage = !!room.storage;
  const isEmergency = room.energyAvailable < 100 && Object.keys(roomMemory.creeps).length < 2;

  if (isEmergency) return 0;
  if (rcl < 2) return 1;
  if (rcl === 2 && !hasStorage) return 2;
  if (rcl >= 4 && hasStorage) return 3;
  if (rcl >= 6 && room.terminal) return 4;
  if (rcl === 8) return 5;
  return 6;
}