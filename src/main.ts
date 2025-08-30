/*
    Typescript Screeps Code for Noobs

    Starting 19th February 2023
    Last Updated 30th August 2025

    Version:  0.0.10
    Build:    46
*/

// Import functions etc
import { getRoomMemory } from "managers/memoryManager";
import { initRoom } from "init/initRoom";
import { manageSpawning } from "managers/spawnManager";
import { taskManager } from "managers/taskManager";
import { detectPlayerUsername } from "helper/helper";
import { drawDebugVisuals, getDistanceTransform } from "helper/util";
import { buildingManager } from "managers/buildingManager";

export const loop = () =>
{
  if (Game.cpu.bucket < 500)
  {
    throw new Error('Extremely low bucket - aborting script run at top level')
  }

  // setup globals
  if (!global.PLAYER_USERNAME)
  {
    global.PLAYER_USERNAME = detectPlayerUsername();
  }

  if (!global.distanceTransform)
  {
    global.distanceTransform = {};
  }
  
  global.getDistanceTransform = function (roomName: string): CostMatrix
  {
    if (!global.distanceTransform[roomName])
    {
      global.distanceTransform[roomName] = getDistanceTransform(roomName);
    }
    return global.distanceTransform[roomName];
  };

  if (Memory.debugVisuals?.roomName) drawDebugVisuals();

  taskManager.run();

  for (const roomName in Game.rooms)
  {
    const room = Game.rooms[roomName];

    // init memory for room
    const memory = getRoomMemory(room);
    if (!memory) continue;

    // find and track sources
    if (!memory.sources || Object.keys(memory.sources).length === 0) initRoom(room);

    if ((!memory.constructionSites || Object.keys(memory.constructionSites).length === 0)) buildingManager(room, 10);

    // manage spawning for each room
    manageSpawning(room);
  }

  // if (Game.cpu.bucket >= 10000 && getRoomPhase(Game.rooms[0]) > 0)
  // {
  //   Game.cpu.generatePixel();
  // }
};