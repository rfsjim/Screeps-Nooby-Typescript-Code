/*
    Typescript Screeps Code for Noobs

    Starting 19th February 2023
    Last Updated 27th July 2025
*/

if (Game.cpu.bucket < 500) {
  throw new Error('Extremely low bucket - aborting script run at top level')
}

// Define Modules
import filter from "lodash/filter";

// import { ErrorMapper } from "utils/ErrorMapper";
import { runHarvester } from "roles/role.harvester";
import { runUpgrader } from "roles/role.upgrader";
import { manageSpawning } from "managers/spawnManager";
import { CreepMemory } from "types";

export const loop = () =>
{
  for (const name in Game.creeps)
  {
    const creep = Game.creeps[name];
    const memory = creep.memory as CreepMemory;

    switch (memory.role)
    {
      case "harvester":
        runHarvester(creep);
        break;

      case "upgrader":
        runUpgrader(creep);
        break;
    }
  }

  manageSpawning();
};