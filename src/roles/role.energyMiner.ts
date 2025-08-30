import { getCreepMemory, getRoomMemory } from "managers/memoryManager";

export function runEnergyMiner(creep: Creep)
{
  const creepMemory = getCreepMemory(creep);
  const roomMemory = getRoomMemory(creep.room);

  if (!roomMemory.sources) return;
  const targetId = creepMemory.task?.targetId as Id<Source> | undefined;
  if (!targetId) return;
  if (creepMemory.task?.status === "tasked")
    creepMemory.task.status = "in_progress";
  const containerId = findContainerForSource(
    creep.room,
    targetId as Id<Source>
  );
  if (!containerId || containerId === undefined || containerId === null) return;

  const container = Game.getObjectById(containerId) as StructureContainer;
  const source = Game.getObjectById(targetId as Id<Source>);
  if (source === null) return;

  if (container)
  {
    // container exists so we will use it
    if (!creep.pos.isEqualTo(container.pos))
    {
        // not standing on top of the container for the energy source so move creep to container
        creep.moveTo(container, { visualizePathStyle: { stroke: "#ff00b3ff" } });
        return;
    }

    // always harvest when standing on top of the container for the energy source so can harvest source
    creep.harvest(source);

    // Opportunistic repair if damaged and creep has energy
    if (creep.store[RESOURCE_ENERGY] > 0 && container.hits < container.hitsMax * 0.8)
    {
        // container has decayed so repair it
        creep.repair(container);
    }
  } else
  {
    // container does not exist so drop mine from the source
    if (!creep.pos.inRangeTo(source, 1))
    {
        creep.moveTo(source, { visualizePathStyle: { stroke: "#ff00b3ff" } });
        return;
    }

    // Harvest and auto-drop when full
    creep.harvest(source);
    if (creep.store.getFreeCapacity() === 0)
    {
        creep.drop(RESOURCE_ENERGY);
    }
  }
}

function findContainerForSource(
  room: Room,
  sourceId: Id<Source>
): Id<StructureContainer> | null {
  const memory = getRoomMemory(room);
  const sourceMem = memory.sources?.[sourceId];
  if (!sourceMem) return null;

  const { x: sx, y: sy } = sourceMem;

  let closestContainer: Id<StructureContainer> | null = null;

  for (const [structId, struct] of Object.entries(memory.structures ?? {})) {
    if (struct.type !== STRUCTURE_CONTAINER) continue;

    const dx = struct.x - sx;
    const dy = struct.y - sy;
    const range = Math.max(Math.abs(dx), Math.abs(dy)); // Chebyshev distance

    if (range <= 1) {
      closestContainer = structId as Id<StructureContainer>;
      break; // only one should exist within range 1
    }
  }

  return closestContainer;
}
