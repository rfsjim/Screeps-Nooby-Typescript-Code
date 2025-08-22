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
export function getRoomMemory(room: Room): RoomMemory
{
    if (!room.memory) room.memory = {} as RoomMemory;
    
    const memory = room.memory as RoomMemory;
    
    if (memory.constructionSites === undefined) memory.constructionSites = {};
    if (memory.constructionQueue === undefined) memory.constructionQueue = [];
    if (!memory.controllerProgress) memory.controllerProgress = {level: 0, totalEnergyHarvested: 0};
    if (memory.creepCounts === undefined) memory.creepCounts = {};
    if (memory.creeps === undefined) memory.creeps = {};
    if (memory.maxHarvesters === undefined) memory.maxHarvesters = 0;
    if (memory.owner === undefined) memory.owner = room.controller?.owner ?? 'None'
    if (memory.phase === undefined) memory.phase = RoomPhase.UnitiatedRoom;
    if (memory.rcl === undefined) memory.rcl = room.controller?.level ?? -1;
    if (memory.spawns === undefined) memory.spawns = {};
    if (memory.sources === undefined) memory.sources = {};
    if (memory.mineral === undefined) memory.mineral ={};
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
  if (roomMemory === undefined) return RoomPhase.UnitiatedRoom;

  const rcl = room.controller?.level ?? -1;
  const hasStorage = !!room.storage;
  const creepCount = Object.keys(roomMemory.creeps ?? {}).length
  const isEmergency = room.energyAvailable < 100 && Object.keys(roomMemory.creeps ?? 0).length < 2;

  let phase: RoomPhase;

  if (rcl < 1) phase = RoomPhase.UnitiatedRoom;
  else if (isEmergency) phase = RoomPhase.DeathSpiral;
  else if (rcl < 2) phase = RoomPhase.InitialBootstrap;
  else if (rcl >= 2 && !hasStorage) phase = RoomPhase.StableEarlyGame;
  else if (rcl >= 4 && hasStorage) phase = RoomPhase.MidGame;
  else if (rcl >= 6 && room.terminal) phase = RoomPhase.NearMax;
  else if (rcl === 8) phase = RoomPhase.MaxSingleRoom;
  else phase = RoomPhase.ExpansionCandidate;

  if (roomMemory.phase !== phase)
  {
    console.log(`[${room.name}] Phase -> ${RoomPhase[phase]} (${phase}), RCL=${rcl}, creeps=${creepCount}, storage=${hasStorage}`);
    roomMemory.phase = phase;
  }

  return phase;
}