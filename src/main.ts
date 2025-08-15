/*
    Typescript Screeps Code for Noobs

    Starting 19th February 2023
    Last Updated 9th August 2025

    Version:  0.0.8
    Build:    38
*/

// Import functions etc
import { getRoomMemory } from "managers/memoryManager";
import { initRoom } from "init/initRoom";
import { manageSpawning } from "managers/spawnManager";
import { taskManager } from "managers/taskManager";
import { detectPlayerUsername } from "helper/helper";

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

  if (!global.PLAYER_USERNAME)
  {
    global.PLAYER_USERNAME = detectPlayerUsername();
  }
  
  // if (Game.cpu.bucket >= 10000 && getRoomPhase(Game.rooms[0]) > 0)
  // {
  //   Game.cpu.generatePixel();
  // }
};