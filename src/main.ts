/*
    Typescript Screeps Code for Noobs

    Starting 19th February 2023
    Last Updated 9th August 2025

    Version:  0.0.6
    Build:    29
*/

// Import functions etc
import { getRoomMemory, getRoomPhase } from "managers/memoryManager";
import { initRoom } from "init/initRoom";
import { manageSpawning } from "managers/spawnManager";
import { taskManager } from "managers/taskManager";

export const loop = () =>
{
  if (Game.cpu.bucket < 500)
  {
    throw new Error('Extremely low bucket - aborting script run at top level')
  }

  taskManager.run();

  for (const roomName in Game.rooms)
  {
    const room = Game.rooms[roomName];

    // init memory for room
    const memory = getRoomMemory(room);
    if (!memory) continue;

    // find and track sources
    if (!memory.sources || Object.keys(memory.sources).length === 0) initRoom(room);

    // manage spawning for each room
    manageSpawning(room);
  }
  
  if (Game.cpu.bucket >= 10000 && getRoomPhase(Game.rooms[0]) > 0)
  {
    Game.cpu.generatePixel();
  }
};