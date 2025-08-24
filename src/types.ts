/**
 * Custom Interfaces
 */

// Role, Tasks, and Target Definitions

export type Role =
  | "harvester"
  | "upgrader"
  | "builder"
  | "energyMiner"
  | "lorry"
  | "repairer"
  | "claimer"
  | "kungFuFighter"
  | "idle";

export const RoleDescriptions: Record<Role, string> = {
  harvester: "Gathers energy from sources",
  upgrader: "Upgrades the room controller",
  builder: "Builds construction sites",
  energyMiner: "Container mines sources",
  lorry: "Moves energy from containers and fills buildings",
  repairer: "Repairs buildings",
  claimer: "Claims new rooms",
  kungFuFighter: "Defends room",
  idle: "No task allocated, needs to be allocated task and role",
};

/**
 * Map Task to Task Type
 */
export interface TaskToTypeMap {
  harvest: HarvestTask;
  upgrade: UpgradeTask;
  build: BuildTask;
  repair: RepairTask;
  resourceCollection: ResourceCollectionTask;
  fill: FillTask;
  none: NoneTask;
}

export const AllRoles: Role[] = [
  "harvester",
  "upgrader",
  "builder",
  "energyMiner",
  "lorry",
  "repairer",
  "claimer",
  "kungFuFighter",
  "idle",
];
export type RoleComposition = Partial<Record<Role, number>>;

export type StoredPosition = { x: number; y: number };

export type TaskStatus =
  | "untasked"
  | "tasked"
  | "in_progress"
  | "completed"
  | "hand_over"
  | "error";
export const AllTaskStatuses: TaskStatus[] = [
  "untasked",
  "tasked",
  "in_progress",
  "completed",
  "hand_over",
  "error",
];

export type TaskType =
  | "harvest"
  | "upgrade"
  | "build"
  | "resource_collection"
  | "repair"
  | "fill"
  | "none";
export const AllTaskTypes: TaskType[] = [
  "harvest",
  "upgrade",
  "build",
  "resource_collection",
  "repair",
  "fill",
  "none",
];

export type TaskExecutor<T extends AnyTask = AnyTask> = (
  creep: Creep,
  task: T
) => ScreepsReturnCode;

export type AnyTask =
  | HarvestTask
  | ResourceCollectionTask
  | BuildTask
  | UpgradeTask
  | RepairTask
  | FillTask
  | NoneTask;

export type ResourceTask = HarvestTask | ResourceCollectionTask;

export type HarvestableTarget = Source | Mineral | Deposit;

export type WithdrawableTarget =
  | Tombstone
  | StructureContainer
  | StructureStorage
  | StructureLink
  | StructureLab
  | Ruin;

export type PickupTarget = Resource;

export enum ResourceAcquisitionMethod {
  Harvest = "harvest",
  Withdraw = "withdraw",
  Pickup = "pickup",
  Transfer = "transfer",
}

export enum RoomPhase {
  UnitiatedRoom = -1, // Only accessible when memory initially set must be updated
  DeathSpiral = 0, // Storage empty, <2 harvesters, critical fallback mode
  InitialBootstrap = 1, // No storage, no roads, minimal income, early energy unlock
  StableEarlyGame = 2, // First container/storage, extensions built, basic roads start,
  MidGame = 3, // Links, upgrading RCL 6+, towers and defense online, roads to controllers
  NearMax = 4, // Room stabilized, economic surplus, slow infrastructure upgrades, high traffic roads reinforced
  MaxSingleRoom = 5, // Level 8, full storage, defense and power structures, highways and wide arteries
  ExpansionCandidate = 6, // Time to get another room
  // Specialised = 7           // Power processing, nuker ops, pixel generation, market trader
}

export const AllPhases: RoomPhase[] = [
  RoomPhase.UnitiatedRoom,
  RoomPhase.DeathSpiral,
  RoomPhase.InitialBootstrap,
  RoomPhase.StableEarlyGame,
  RoomPhase.MidGame,
  RoomPhase.NearMax,
  RoomPhase.MaxSingleRoom,
  RoomPhase.ExpansionCandidate,
  // RoomPhase.Specialised
];

export interface StructureEnergyProfile {
  /**
   * energy is the lifeblood of a room
   * consider Construction Cost + Maintenance Tax
   * every structure has an initial cost
   * and there is a cost afterwards
   * A tower costs 5000 to build and 10 per tick to refill when active
   * A link or container requires refilling or repair over time
   */
  initialCost: number;
  upKeepCostPerTick: number; // estimate based on support tasks
}

// Task Interfaces
export interface Task {
  assignedCreepIds?: Id<Creep>[];
  id: string;
  maxCreeps?: number;
  status: TaskStatus;
  targetId?: Id<_HasId> | undefined;
  type: TaskType;
}

export type StoredTask<T extends AnyTask = AnyTask> = Omit<T, never>;

export interface ResourceCollectionTask extends Task {
  type: "resource_collection";
  targetId: Id<WithdrawableTarget | Resource>;
  method: ResourceAcquisitionMethod.Withdraw | ResourceAcquisitionMethod.Pickup;
  resourceType: ResourceConstant;
}

export interface HarvestTask extends Task {
  type: "harvest";
  targetId: Id<HarvestableTarget>;
  method: ResourceAcquisitionMethod.Harvest;
  resourceType: ResourceConstant;
}

export interface BuildTask extends Task {
  sourceId: Id<Source>;
  type: "build";
  targetId: Id<ConstructionSite>;
}

export interface UpgradeTask extends Task {
  type: "upgrade";
  targetId: Id<StructureController>;
  sourceId: Id<Source>;
}

export interface RepairTask extends Task {
  type: "repair";
  targetId: Id<Structure>;
}

export interface FillTask extends Task {
  type: "fill";
  resourceType: ResourceConstant;
  originId: Id<StructureStorage | StructureContainer>;
  destinationId: Id<StructureSpawn | StructureExtension | StructureTower>;
}

export interface NoneTask extends Task {
  type: "none";
  status: "untasked";
  maxCreeps?: 0;
  targetId?: undefined;
}

export interface ConstructionTask {
  type: BuildableStructureConstant;
  count: number; // how many of this structure to build
  priority: number; // priority of this task for ordering, lower is higher priority
  dependsOn?: BuildableStructureConstant[]; // structures that must be built before this one
}

// Memory Interfaces

export interface RoomMemory {
  bunker?: {
    centre: StoredPosition;
    planned: boolean;
  };
  constructionSites?: {
    [id: string]: {
      x: number;
      y: number;
      type: BuildableStructureConstant;
    };
  };
  constructionQueue?: string[];
  structures?: {
    [id: string]: {
      x: number;
      y: number;
      type: BuildableStructureConstant;
    };
  };
  controllerProgress?: {
    level: number;
    totalEnergyHarvested: number;
  };
  creeps?: {
    [creepName: string]: {
      id: string;
      role: Role;
    };
  };
  creepCounts: {
    [role: string]: number;
  };
  exits: Partial<Record<ExitKey, string>>;
  lastCleanupTick?: number;
  maxHarvesters: number;
  owner: Owner | string;
  phase: RoomPhase;
  rcl: number;
  sources?: {
    [sourceId: string]: {
      x: number;
      y: number;
      numPositions: number;
    };
  };
  spawns?: {
    [spawnId: string]: {
      x: number;
      y: number;
    };
  };
  mineral?: {
    [mineralId: string]: {
      x: number;
      y: number;
      type: string;
    };
  };
}

export interface CreepMemory {
  role: Role;
  working: boolean;
  lastRoleChange?: number;
  task?: Task;
}

export interface EnergyMinerMemory extends CreepMemory {
  sourceId: Id<Source>;
}

export type OwnerLike = { owner?: { username: string } };
