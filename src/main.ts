/*
    Typescript Screeps Code for Noobs

    Starting 19th February 2023
*/

// Define Modules
import filter from "lodash/filter";
// import { ErrorMapper } from "utils/ErrorMapper";
import roleHarvester from "role.harvester";
import roleUpgrader, { Upgrader } from "role.upgrader";
import roleBuilder, { Builder } from "role.builder";
import "prototype.spawn";
import towerManager from "towerManager";
import initRoom from "initRoom";
import clearMemory from "helper";

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
  }

  interface CreepMemory {
    role: string;
    room: string;
    working: boolean;
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

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
      console.log(`Clearing non-existing creep memory: ${name}`);
    }
  }

  // Ensure Room Memory is Initalised
  for (const name in Game.rooms) {
    if (!Memory.rooms[name].roomName) {
      initRoom(name);
    }
  }

  // Get Current Progress
  Memory.gcl = Game.gcl;

  // Run Tick Logic
  for (let name in Game.creeps) {
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
  for (let name in Game.spawns) {
    let spawn = Game.spawns[name];
    if (!spawn.spawning && (spawn.room.energyAvailable >= 
      (BODYPART_COST['move'] + BODYPART_COST['carry'] + BODYPART_COST['work']))) {
        spawn.spawnHarvesterIfRequired();
      }
  }

  // Run Tower Logic
  let towers = filter(Game.structures, (s:Structure) => s.structureType == STRUCTURE_TOWER) as StructureTower[];
  for (let tower of towers) {
    towerManager.attackClosestHostile(tower);
    towerManager.repairClosestStructure(tower);
    towerManager.healClosestCreep(tower);
  }
};