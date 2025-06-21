/*
    Typescript Screeps Code for Noobs

    Starting 19th February 2023
*/

if (Game.cpu.bucket < 500) {
  throw new Error('Extremely low bucket - aborting script run at top level')
}

// Define Modules
import filter from "lodash/filter";
// import { ErrorMapper } from "utils/ErrorMapper";
import roleHarvester from "role.harvester";
import roleUpgrader, { Upgrader } from "role.upgrader";
import roleBuilder, { Builder } from "role.builder";
import "spawnManager";
import towerManager from "towerManager";
import clearMemory from "helper";
import initRoom from "initRoom";
import init from "init";

declare global {
  /*
    Example types, expand on these or remove them and add your own.
    Note: Values, properties defined here do no fully *exist* by this type definiton alone.
          You must also give them an implemention if you would like to use them. (ex. actually setting a `role` property in a Creeps memory)

    Types added in this `global` block are in an ambient, global context. This is needed because `main.ts` is a module file (uses import or export).
    Interfaces matching on name from @types/screeps will be merged. This is how you can extend the 'built-in' interfaces from @types/screeps.
  */
  // Memory extension samples
  interface Memory {
    uuid: number;
    gcl: GlobalControlLevel;
    log: any;
    towers: { [id: Id<StructureTower>]: TowerMemory};
  }

  interface CreepMemory {
    role: string;
    room: string;
    working: boolean;
  }

  interface TowerMemory {
    room: string;
    id: Id<StructureTower> | string;
  }

  // Syntax for adding proprties to `global` (ex "global.log")
  namespace NodeJS {
    interface Global {
      log: any;
      clearMemory: void;
    }
  }
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = () => {
  // Get my username if required
  if (!Memory.username) {
    const roomName = Object.keys(Game.rooms)[0];
    let initalise = new init(roomName);
    Memory.username = initalise.getUserName(roomName);
  }

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
      console.log(`Clearing non-existing creep memory: ${name}`);
    }
  }

  // Ensure Room Memory is Initalised
  for (const roomName in Game.rooms) {
    const roomInit = new initRoom(roomName);
    
    if (!Memory.rooms[roomName]) Memory.rooms[roomName] = {} as RoomMemory;
    if (!Memory.rooms[roomName].roomName) roomInit.initMemory(roomName);
    if (Memory.rooms[roomName].lastChecked % 100 === 5) roomInit.getMemoryUpdates(roomName);
  }

  // Get Current Progress
  Memory.gcl = Game.gcl;

  // Run Tick Logic
  for (const name in Game.creeps) {
    let creep = Game.creeps[name];
    if (creep.memory.role === 'harvester') {
      roleHarvester.run(creep);
    }
    if (creep.memory.role === 'upgrader') {
      roleUpgrader.run(creep as Upgrader);
    }
    if (creep.memory.role === 'builder') {
      roleBuilder.run(creep as Builder);
    }
  }

  // Run Spawn Logic
  for (const name in Game.spawns) {
    let spawn = Game.spawns[name];
    if (!spawn.spawning && (spawn.room.energyAvailable >= 
      (BODYPART_COST['move'] + BODYPART_COST['carry'] + BODYPART_COST['work']))) {
        spawn.spawnHarvesterIfRequired();
      }
  }

  // Run Tower Logic
  if (!Memory.towers) {
    Memory.towers = {};
    const towers = filter(Game.structures,
      (s) => s.structureType == STRUCTURE_TOWER) as StructureTower[];
    
    if (towers) {
        for (let tower of towers) {
          Memory.towers[tower.id] = {} as TowerMemory;
          Memory.towers[tower.id].id = tower.id;
          Memory.towers[tower.id].room = tower.room.name;
        }
    }
  }
  
  if (Memory.towers) {
    const manageTower = new towerManager();

    for (let i = 0; i < Object.keys(Memory.towers).length; i++) {
      const towerId = Object.keys(Memory.towers)[i] as Id<StructureTower>;
      const tower = Game.getObjectById(towerId) as StructureTower;
      manageTower.attackClosestHostile(tower);
      manageTower.repairClosestStructure(tower);
      manageTower.healClosestCreep(tower);
    }
  }
};