export const GENERAL_CREEP_MAX_COST: number = 3200; // maximum cost of creeps
export const HANDOVER_TTL_THRESHOLD: number = 50;   // ticks before death
export const MULT_CREEP_FATIGUE_REDUCTION: number = -2; // Creep fatigue removal multiplier. It works like this in the engine: newFatigue = Math.max(0, oldFatigue - ( MOVEparts * multiplier))
export const MAX_CPU_BUCKET: number = 10000; // Max bucket value. The CPU bucket fills up to 10000
export const CREEP_HITS_PER_PART: number = 100; // Hits (Health/HitPoints) per-part of a creep
export const PLAYER_USERNAME: string = global.PLAYER_USERNAME; // Username
export const INVADER_USERNAME: string = 'Invader'; // username for the Invader NPCs
export const SOURCE_KEEPER_USERNAME: string = 'Source Keeper'; // username for Source Keeper NPCs
export const CARAVAN_USERNAME: string = 'Screeps'; // username for the Caravan NPCs & unclaimed ruins
export const CONSTRUCTION_SITE_STOMP_RATIO: number = 0.5; // Rate at which energy (progress) is dropped from construction sties, when stomped (moved onto) by creeps
export const RANGED_MASS_ATTACK_POWER = { 1: 10, 2: 4, 3: 1}; // Power of RANGED_MASS_ATTACK, dependent on range.
export const MAX_CPU_PER_TICK: number = 500; // The max amount of CPU that can be used in one game tick, any CPU over the user's assigned amount comes out of the bucket
export const CREEP_ACTION_RANGES = {
    attack: 1,
    attackController: 1,
    build: 3,
    claimController: 1,
    dismantle: 1,
    generateSafeMode: 1,
    harvest: 1,
    heal: 1,
    pickup: 1,
    pull: 1,
    rangedAttack: 3,
    rangedHeal: 3,
    rangedMassAttack: 3,
    repair: 3,
    reserveController: 1,
    transfer: 1,
    upgradeController: 3,
    withdraw: 1
};  // The ranges creeps have to be within to execute certain actions.
export const MEMORY_SIZE: number = 2097152; // Maximum size of the default memory (per shard) in characters
export const MEMORY_INTERSHARD_SIZE: number = 1024; // Maximum size of an intershard memory (per shard) in characters
export const MEMORY_RAW_SEGMENT_SIZE: number = 102400; // Maximum size of a rawMemory segment (per shard) in characters
export const MEMORY_RAW_TOTAL_SIZE: number = 10240; // Maximum size of a rawMemory total (per shard, 10 active segments) in characters
export const POWER_CREEP_HITS_PER_LEVEL: number = 1000; // Hits (Health/HitPoints) per power creep level
export const TERRAIN_MASK_PLAIN: number = 0; // 'value' of plains terrain (Note: absence of value could always be considered a 'plains' since its 0)
export const CREEP_BUILD_RANGE: number = 3; // build range
export const CREEP_RANGED_ATTACK_RANGE: number = 3; // ranged attack range
export const CREEP_UPGRADE_RANGE: number = 3; // upgrade range
export const CREEP_REPAIR_RANGE: number = 3; // repair range
export const CREEP_RANGED_HEAL_RANGE: number = 3; // ranged heal
export const CREEP_HARVEST_RANGE: number = 1; // harvest range
export const CREEP_WITHDRAW_RANGE: number = 1; // withdraw range
export const CONST_COST: number = 0.2; // Base cost of any successful action that changes game state
export const LAB_REACT_RANGE: number = 2; // The distance labs need to be within to beable to runReaction() or reverseReaction()
export const LAB_BOOST_RANGE: number = 1; // The distance a creep and a lab need to be to boostCreep() or unboostCreep()
export const MARKET_MAX_DEALS_PER_TICK: number = 10; // The maximum amount of deals that can be done on the market in one tick.
export const CONTROLLER_SIGN_MAX_LENGTH: number = 100; // The maximum amount of characters a controller sign can have.
export const CREEP_NAME_MAX_LENGTH: number = 100; // The maximum amount of characters a creep name can have.
export const POWER_CREEP_NAME_MAX_LENGTH: number = 100; // The maximum amount of characters a power-creep name can have.
export const FLAG_NAME_MAX_LENGTH: number = 60; // The maximum amount of characters a flag name can have.
export const SPAWN_NAME_MAX_LENGTH: number = 100; // The maximum amount of characters a spawn name can have.
export const SAY_MAX_LENGTH: number = 10; // The maximum amount of characters a creep can say()
export const MOVE_POWER: number = 2; // The fatigue reduction of a move part per tick when hits > 0
export const ROOM_VIS_MAX_SIZE: number = 512000; // The maximum amount of RoomVisuals per room (in bytes)
export const MAP_VIS_MAX_SIZE: number = 1024000; // The maximum amount of MapVisuals allowed (in bytes)
export const ROOM_BOUNDARY_VALUES = { minX: 0, minY: 0, maxX:49, maxY:49 }  // Min and max values for room x y position
export const SOURCE_GOAL_OWNED: number = SOURCE_ENERGY_CAPACITY / ENERGY_REGEN_TIME; // Energy-per-tick income for a owned source
export const SOURCE_GOAL_NEUTRAL: number = SOURCE_ENERGY_NEUTRAL_CAPACITY / ENERGY_REGEN_TIME; // Energy-per-tick income for a neutral source
export const SOURCE_GOAL_KEEPER: number = SOURCE_ENERGY_KEEPER_CAPACITY / ENERGY_REGEN_TIME; // Energy-per-tick income for a keeper source
export const SOURCE_HARVEST_PARTS: number = SOURCE_ENERGY_CAPACITY / HARVEST_POWER / ENERGY_REGEN_TIME; // Optimal number of owned work parts
export const SOURCE_HARVEST_PARTS_NEUTRAL: number = SOURCE_ENERGY_NEUTRAL_CAPACITY / HARVEST_POWER / ENERGY_REGEN_TIME; // Optimal number of neutral harvest work parts
export const SOURCE_HARVEST_PARTS_KEEPER: number = SOURCE_ENERGY_KEEPER_CAPACITY / HARVEST_POWER / ENERGY_REGEN_TIME; // Optimal number of keeper work parts
export const SOURCE_CARRY_PARTS_PER_DISTANCE_OWNED: number = SOURCE_GOAL_OWNED / CARRY_CAPACITY; // Optimal number of carry parts
export const SOURCE_CARRY_PARTS_PER_DISTANCE_KEEPER: number = SOURCE_GOAL_KEEPER / CARRY_CAPACITY; // Optimal number of carry
export const RAMPART_UPKEEP: number = RAMPART_DECAY_AMOUNT / REPAIR_POWER / RAMPART_DECAY_TIME; // Average energy per tick rampart upkeep cost
export const ROAD_UPKEEP: number = ROAD_DECAY_AMOUNT / REPAIR_POWER / ROAD_DECAY_TIME; // Average energy per road upkeep cost
export const ROAD_UPKEEP_SWAMP: number = (ROAD_DECAY_AMOUNT * CONSTRUCTION_COST_ROAD_SWAMP_RATIO) / REPAIR_POWER / ROAD_DECAY_TIME; // Average energy per tick swamp road upkeep cost
export const ROAD_UPKEEP_TUNNEL: number = (ROAD_DECAY_AMOUNT * CONSTRUCTION_COST_ROAD_WALL_RATIO) / REPAIR_POWER / ROAD_DECAY_TIME; // Average energy per tick tunnel upkeep cost
export const CONTAINER_UPKEEP: number = CONTAINER_DECAY / REPAIR_POWER / CONTAINER_DECAY_TIME_OWNED; // Average energy per tick container upkeep cost
export const REMOTE_CONTAINER_UPKEEP: number = CONTAINER_DECAY / REPAIR_POWER / CONTAINER_DECAY_TIME; // Average energy per tick remote container cost
export const IS_PTR = !!(Game.shard && Game.shard.ptr); // Boolean PTR world type indicator
export const IS_SIM = !!Game.rooms['sim']; // Boolean simulation indicator
export const IS_MMO = !!(Game.shard && Game.shard.name && Game.shard.name.startsWith('shard'));  // Boolean MMO world type indicator