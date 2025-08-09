module.exports = {
    /** @param {Creep} creep */
    run: function(creep) {

        // --- State toggling ---
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
        }
        else if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
        }

        const storage = creep.room.storage;

        // --- Priority 1: dump any carried non-energy into storage (never drop it elsewhere) ---
        const carriedNonEnergy = Object.keys(creep.store).find(r => r !== RESOURCE_ENERGY && creep.store[r] > 0);
        if (carriedNonEnergy && storage) {
            if (creep.transfer(storage, carriedNonEnergy) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storage);
            }
            return;
        }

        // --- Delivery mode: standard energy delivery (fallback to storage if no sinks) ---
        if (creep.memory.working) {
            let structure = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                filter: (s) => (s.structureType === STRUCTURE_SPAWN
                             || s.structureType === STRUCTURE_EXTENSION
                             || s.structureType === STRUCTURE_TOWER)
                             && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });

            if (!structure) structure = storage;

            if (structure) {
                if (creep.transfer(structure, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(structure);
                }
            }
            return;
        }

        // --- Gather mode: pull from tombstones/ruins/containers/dropped (NOT from storage) ---
        const targets = [];

        // Tombstones
        targets.push(...creep.room.find(FIND_TOMBSTONES, {
            filter: t => _.sum(t.store) > 0
        }));

        // Ruins
        targets.push(...creep.room.find(FIND_RUINS, {
            filter: r => _.sum(r.store) > 0
        }));

        // Containers
        targets.push(...creep.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER && _.sum(s.store) > 0
        }));

        // Dropped resources
        targets.push(...creep.room.find(FIND_DROPPED_RESOURCES));

        if (targets.length > 0) {
            // Sort by largest single stack (amount for dropped; max(store) for others)
            targets.sort((a, b) => {
                const aMax = a.amount !== undefined
                    ? a.amount
                    : _.max(Object.values(a.store));
                const bMax = b.amount !== undefined
                    ? b.amount
                    : _.max(Object.values(b.store));
                return bMax - aMax;
            });

            const target = targets[0];

            if (target.amount !== undefined) {
                // Dropped resource
                if (creep.pickup(target) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                }
                return;
            } else {
                // Structure-like with a store (tombstone/ruin/container)
                const resourceType = Object.keys(target.store)
                    .reduce((best, r) => target.store[r] > (best ? target.store[best] : 0) ? r : best, null);
                if (resourceType) {
                    const res = creep.withdraw(target, resourceType);
                    if (res === ERR_NOT_IN_RANGE) {
                        creep.moveTo(target);
                    }
                }
                return;
            }
        }

        // --- Final fallback: if nothing else to pick up, you MAY pull ENERGY from storage ---
        if (storage && storage.store[RESOURCE_ENERGY] > 0 && creep.store.getFreeCapacity() > 0) {
            if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storage);
            }
        }
    }
};