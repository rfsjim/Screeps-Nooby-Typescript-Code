import {
  getCreepMemory,
  getEnergyMinerMemory,
  getRoomMemory,
} from "managers/memoryManager";

export function runEnergyMiner(creep: Creep) {
  const creepMemory = getCreepMemory(creep);
  const roomMemory = getRoomMemory(creep.room);
  if (!roomMemory?.sources) return;

  // --- 1) resolve sourceId ---
  const minerMem = getEnergyMinerMemory(creepMemory);
  if (!minerMem) return; // not actually a miner
  const sourceId =
    minerMem.sourceId ?? (creepMemory.task?.targetId as Id<Source> | undefined);
  if (!sourceId) {
    creep.say("no-src");
    return;
  }

  const source = Game.getObjectById(sourceId);
  if (!source) {
    creep.say("bad-src");
    return;
  }

  // --- 2) locate container for this source ---
  const containerId = findContainerForSource(creep.room, sourceId);
  const container = containerId
    ? (Game.getObjectById(containerId) as StructureContainer | null)
    : null;

  // --- 3) main behaviour ---
  if (container) {
    // stay *on top* of the container if possible
    if (!creep.pos.isEqualTo(container.pos)) {
      creep.moveTo(container.pos, {
        visualizePathStyle: { stroke: "#ff00b3" },
      });
      return;
    }

    // Harvest as long as there's free capacity
    if (creep.store.getFreeCapacity() > 0) {
      creep.harvest(source);
    }

    // If carrying energy, do container duties
    if (creep.store[RESOURCE_ENERGY] > 0) {
      // 1) Repair container if hurt
      if (container.hits < container.hitsMax * 0.8) {
        creep.repair(container);
        return;
      }

      // 2) Transfer to container
      const transferResult = creep.transfer(container, RESOURCE_ENERGY);
      if (transferResult === ERR_FULL) {
        // 3) Container full -> drop
        creep.drop(RESOURCE_ENERGY);
      }
    }
    return;
  }

  // --- 4) no container: fallback drop mining ---
  if (!creep.pos.inRangeTo(source.pos, 1)) {
    creep.moveTo(source, { visualizePathStyle: { stroke: "#ff00b3" } });
    return;
  }

  if (creep.store.getFreeCapacity() > 0) {
    creep.harvest(source);
  } else {
    creep.drop(RESOURCE_ENERGY);
  }
}

/**
 * Find/persist a container assigned to a source.
 */
function findContainerForSource(
  room: Room,
  sourceId: Id<Source>
): Id<StructureContainer> | null {
  const memory = getRoomMemory(room);
  const sourceMem = memory.sources?.[sourceId];

  if (sourceMem?.containerId) {
    const obj = Game.getObjectById(sourceMem.containerId);
    if (obj) return sourceMem.containerId as Id<StructureContainer>;
    delete sourceMem.containerId; // stale
  }

  const src = Game.getObjectById(sourceId);
  if (!src) return null;

  const nearby = src.pos.findInRange(FIND_STRUCTURES, 1, {
    filter: (s) => s.structureType === STRUCTURE_CONTAINER,
  }) as StructureContainer[];

  if (nearby.length > 0) {
    const cid = nearby[0].id as Id<StructureContainer>;
    if (sourceMem) sourceMem.containerId = cid;
    return cid;
  }
  return null;
}
