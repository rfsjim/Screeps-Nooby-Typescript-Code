import { AnyTask, StoredTask } from "types";

declare global
{
  // Augment the NodeJS.Global interface so TS knows about allTasks

  interface Global
  {
    allTasks: AnyTask[];
    PLAYER_USERNAME: string;
    distanceTransform: { [roomName: string]: CostMatrix };
    getDistanceTransform(roomName: string): CostMatrix;
  }

  interface Memory
  {
    tasks: StoredTask[];
    debugVisuals?:
    {
      roomName?: string;
    };
  }

  // Get TypeScript to map that onto globalThis
  var global: Global;
}

export {};