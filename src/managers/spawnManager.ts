/*
 * Control spawning of creeps
 */

import { getCreepMemory, getInitialCreepMemory, getInitialEnergyMinerMemory, getRoomMemory } from "managers/memoryManager";
import { Role, RoleComposition, RoomPhase } from "types";

export const desiredCreepsByName: Record<keyof typeof RoomPhase, RoleComposition> =
{
    DeathSpiral: {harvester : 2},
    InitialBootstrap: {harvester : 3, upgrader: 1},
    StableEarlyGame: {energyMiner : 2, upgrader: 2},
    MidGame: {energyMiner: 2, upgrader: 2, builder: 1, lorry: 2},
    NearMax: {energyMiner: 2, upgrader: 3, builder: 2, lorry: 2, repairer: 1},
    MaxSingleRoom: {energyMiner: 2, upgrader: 1, lorry: 3, repairer: 2},
    ExpansionCandidate: {claimer: 1},
};

const desiredCreeps: Record<RoomPhase, RoleComposition> =
{
    [RoomPhase.DeathSpiral]: {harvester : 2},
    [RoomPhase.InitialBootstrap]: {harvester : 3, upgrader: 1},
    [RoomPhase.StableEarlyGame]: {energyMiner : 2, upgrader: 2},
    [RoomPhase.MidGame]: {energyMiner: 2, upgrader: 2, builder: 1, lorry: 2},
    [RoomPhase.NearMax]: {energyMiner: 2, upgrader: 3, builder: 2, lorry: 2, repairer: 1},
    [RoomPhase.MaxSingleRoom]: {energyMiner: 2, upgrader: 1, lorry: 3, repairer: 2},
    [RoomPhase.ExpansionCandidate]: {claimer: 1},
};

function getDesiredCreepsForPhase(phase: RoomPhase): RoleComposition
{
    return desiredCreeps[phase];
}

export function getDesiredCountForRole(phase: RoomPhase, role: Role): number
{
    const composition = getDesiredCreepsForPhase(phase);
    return composition[role] ?? 0;
}

/**
 * Manage Spawning, create required spawns
 * @param room 
 * @returns 
 */
export function manageSpawning(room: Room): void
{
    if (!room.controller) return;
    const spawn = Object.values(Game.spawns).filter(spawn => spawn.room.name === room.name)[0];
    if (!spawn) return;

    const harvesters = Object.values(Game.creeps).filter((c) => (getCreepMemory(c)).role === 'harvester' satisfies Role);
    const upgraders = Object.values(Game.creeps).filter((c) => (getCreepMemory(c)).role === 'upgrader' satisfies Role);

    const roomMemory = getRoomMemory(room);
    const maxUpgraders = (room.controller.level + 1) | 1;

    if (!spawn.spawning)
    {
        if (harvesters.length < roomMemory.maxHarvesters)
            {
                spawn.spawnCreep([WORK, CARRY, MOVE], `harvester-${Game.time}`, {
                    memory: { role: "harvester", working: false}
                });
            } else if (upgraders.length < maxUpgraders)
            {
                spawn.spawnCreep([WORK, CARRY, MOVE], `upgrader - ${Game.time}`, {
                    memory: {role: "upgrader", working: false}
                });
            }
    } else
    {
        const spawningCreep = Game.creeps[spawn.spawning.name];
        spawn.room.visual.text(
            '🛠️' + (getCreepMemory(spawningCreep)).role,
            spawn.pos.x + 1,
            spawn.pos.y,
            {align: 'left', opacity: 0.8});
    }
}

/**
 * Build Creep - Select function by role type
 * @param role
 * @param spawn 
 * @param energy
 * @param [sourceId=null] 
 */
export function buildCreep(role: Role, spawn: StructureSpawn, energy: number, sourceId: Id<Source> | null = null): number
{
    switch (role)
    {
        case 'builder':
        case 'harvester':
        case 'upgrader':
            return buildGeneralCreep(role, spawn, energy);
        case 'energyMiner':
            if (!sourceId) return ERR_INVALID_TARGET;
            return buildEnergyMinerCreep(sourceId, spawn, energy);
        case 'lorry':
            return buildLorryCreep(spawn, energy);
        default:
            return ERR_INVALID_ARGS;
    }
}

/**
 * Build a general creep for building, harvesting, upgrading
 * Creates balance creep as large as possible with the given energy
 * Min parts group is a work move, move carry
 * @param role 
 * @param spawn 
 * @param energy 
 * @returns 
 */
function buildGeneralCreep(role: Role, spawn: StructureSpawn, energy: number): number
{
    // each move is 50 energy, work is 100 energy, carry is 50 energy - four part group is 250 energy
    // spawn capacity is 300 energy
    const partGroupCost = BODYPART_COST[WORK] + BODYPART_COST[CARRY] + (2 * BODYPART_COST[MOVE]);
    const maxNumberOfGroups = Math.floor(energy / partGroupCost);
    const partGroupCount = Math.min(maxNumberOfGroups, Math.floor(MAX_CREEP_SIZE/4));

    if (partGroupCost < 1 )
    {
        console.log(`[${spawn.name}] Not enough energy to spawn ${role}`);
        return ERR_NOT_ENOUGH_ENERGY;
    }

    let body: BodyPartConstant[] = [];

    for (let i = 0; i < partGroupCount; i++) body.push(WORK);
    for (let i = 0; i < partGroupCount; i++) body.push(CARRY);
    for (let i = 0; i < partGroupCount; i++) body.push(MOVE, MOVE);

    // create a creep with created body part for the given role
    const creepMemory = getInitialCreepMemory(role);
    const result = spawn.spawnCreep(body, `${role}-${Game.time}`, 
        { memory: creepMemory }); 
    if (result !== OK) console.log(`[${spawn.name}] Failed to spawn (${role}): ${result}`);
    return result;
}

/**
 * Build Container Energy Miner Creep
 * @param sourceId 
 * @param spawn 
 * @param energy 
 */
function buildEnergyMinerCreep(sourceId: Id<Source>, spawn: StructureSpawn, energy: number): number
{
    /**
     * WORK part harvests 2 energy / tick for owned or reserved room
     * 3000 energy in owned or reserved room
     * energy regeneration every 300 ticks
     * 600 ticks per WORK part per 300 ticks
     * Five work parts will empty a source in the refresh timeframe
     * Never build with more than five work parts
     * Work and Move energy cost is 150, max energy cost is 750
     * Spawn capacity is 300 energy, early game extensions provide capacity of 50 energy
     * Initial energy miner at RCL 2 is 3 work group, (5 extensions & spawn)
     * by RCL 3 max sized energy miner is available  (10 extensions & spawn)
     */

    const maxWorkParts = 5;
    const partGroupCost = BODYPART_COST[WORK] + BODYPART_COST[MOVE];
    const maxNumberOfGroups = Math.floor(energy / partGroupCost);
    const partGroupCount = Math.min(maxNumberOfGroups, maxWorkParts);

    if (partGroupCost < 1 )
    {
        console.log(`[${spawn.name}] Not enough energy to spawn Energy Miner`);
        return ERR_NOT_ENOUGH_ENERGY;
    }

    let body: BodyPartConstant[] = [];

    for (let i = 0; i < partGroupCount; i++) body.push(WORK);
    for (let i = 0; i < partGroupCount; i++) body.push(MOVE);

    const creepMemory = getInitialEnergyMinerMemory(sourceId);
    const result = spawn.spawnCreep(body, `energy miner-${Game.time}`,
         {memory: creepMemory });
    if (result !== OK) console.log(`[${spawn.name}] Failed to spawn (energy miner): ${result}`);
    return result;
}

/**
 * Build lorry that provides logistics for room
 * Filling and transfering resources
 * @param spawn 
 * @param energy 
 */
function buildLorryCreep(spawn: StructureSpawn, energy: number): number
{
    /**
     * each move is 50 energy, carry is 50 energy - three part group is 150 energy
     * Spawn capacity is 300 energy, RCL extensions provide capacity of 50 energy x 5 extensions
     * Lorry has twice the move parts to carry parts
     * make sure that the lorry isn't too big (considering max size of 50 parts)
     * then build Lorry
     */
    // 
    // 
    const partGroupCost = BODYPART_COST[CARRY] + (2 * BODYPART_COST[MOVE]);
    const maxNumberOfGroups = Math.floor(energy / partGroupCost);
    const partGroupCount = Math.min(maxNumberOfGroups, Math.floor(MAX_CREEP_SIZE/3));

    if (partGroupCost < 1 )
    {
        console.log(`[${spawn.name}] Not enough energy to spawn Lorry`);
        return ERR_NOT_ENOUGH_ENERGY;
    }

    let body: BodyPartConstant[] = [];

    for (let i = 0; i < partGroupCount; i++) body.push(CARRY);
    for (let i = 0; i < partGroupCount; i++) body.push(MOVE, MOVE);

    const creepMemory = getInitialCreepMemory('lorry');
    const result = spawn.spawnCreep(body, `lorry-${Game.time}`,
         {memory: creepMemory });
    if (result !== OK) console.log(`[${spawn.name}] Failed to spawn (Lorry): ${result}`);
    return result;
}