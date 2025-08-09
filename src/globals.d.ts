import { AnyTask, StoredTask } from "types";

declare global
{
  // Augment the NodeJS.Global interface so TS knows about allTasks

  interface Global
  {
    allTasks: AnyTask[];
  }

  interface Memory
  {
    tasks: StoredTask[];
  }

  // Get TypeScript to map that onto globalThis
  var global: Global;
}

export {};