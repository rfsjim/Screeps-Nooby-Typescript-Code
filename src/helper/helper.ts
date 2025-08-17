import { HarvestableTarget, PickupTarget, WithdrawableTarget, Task, ResourceCollectionTask, HarvestTask, BuildTask, UpgradeTask, RepairTask, FillTask, OwnerLike } from "types";

// Typeguards

/**
 * Checks if creep can harvest from target
 * @param target 
 * @returns True or False
 */
export function isHarvestable(target: unknown): target is HarvestableTarget
{
    return (
    target instanceof Source ||
    target instanceof Mineral ||
    target instanceof Deposit
  );
}

/**
 * Checks if creep can withdraw from target
 * @param target 
 * @returns True or False
 */
export function isWithdrawable(target: unknown): target is WithdrawableTarget
{
    return (
    target instanceof StructureStorage ||
    target instanceof StructureContainer ||
    target instanceof StructureLink ||
    target instanceof StructureLab ||
    target instanceof Tombstone ||
    target instanceof Ruin
  );
}

/**
 * Checks if creep can pickup target
 * @param target 
 * @returns True or False
 */
export function isPickupable(target: unknown): target is PickupTarget
{
    return target instanceof Resource;
}

/**
 * Checks if task is a resource collection task
 * @param task 
 * @returns True or False
 */
export function isResourceCollectionTask(task: Task): task is ResourceCollectionTask
{
  return task.type === 'resource_collection';
}

/**
 * Checks if task is a Harvest task
 * @param task 
 * @returns True or False
 */
export function isHarvestTask(task: Task): task is HarvestTask
{
  return task.type === 'harvest';
}

/**
 * Checks if task is a build task
 * @param task 
 * @returns True or False
 */
export function isBuildTask(task: Task): task is BuildTask
{
  return task.type === 'build';
}

/**
 * Checks if task is an upgrade task
 * @param task 
 * @returns True or False
 */
export function isUpgradeTask(task: Task): task is UpgradeTask
{
  return task.type === 'upgrade';
}

/**
 * Checks if a task is a repair task
 * @param task 
 * @returns True or False
 */
export function isRepairTask(task: Task): task is RepairTask
{
  return task.type === 'repair';
}

/**
 * Checks if a task is a fill task
 * @param task 
 * @returns True or False
 */
export function isFillTask(task: Task): task is FillTask
{
  return task.type === 'fill';
}

// check creep body parts

/**
 * Checks if creep has WORK part
 * @param creep 
 * @returns True or False
 */
export function hasWork(creep: Creep): boolean
{
  return creep.body.some(p => p.type === WORK);
}

/**
 * Checks if creep has CARRY part
 * @param creep 
 * @returns True or False
 */
export function hasCarry(creep: Creep): boolean
{
  return creep.body.some(p => p.type === CARRY);
}

/**
 * Obtains Resource Type from a given Id
 * @param id 
 * @returns ResourceConstant or 'unknown'
 */
export function getResourceTypeFromId(id: Id<_HasId>): ResourceConstant | 'unknown'
{
  const obj = Game.getObjectById(id);
  if (!obj) return 'unknown';
  if (!isHarvestable(obj))
  {
    console.warn(`Unhandled object type for id ${id} (${obj.constructor.name})`);
    return 'unknown';    
  }
  
  if (isSource(obj)) return RESOURCE_ENERGY
  if (isMineral(obj)) return obj.mineralType
  if (isDeposit(obj)) return obj.depositType

  return 'unknown';
}

/**
 * As a HarvestableTargetID get the valid game object. 
 * @param id 
 * @returns 
 */
export function asHarvestableTargetId(id: string): Id<HarvestableTarget> | null
{
  const obj = Game.getObjectById(id as Id<_HasId>);
  if (isHarvestable(obj)) return id as Id<HarvestableTarget>;
  return null;
}

/**
 * Narrow Typeguard to sources
 * @param obj 
 * @returns boolean
 */
function isSource(obj: unknown): obj is Source
{
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'energy' in obj &&
    typeof (obj as { energy?: unknown}).energy === 'number' &&
    !('mineralType' in obj) &&
    !('depositType' in obj)
  );
}

/**
 * Narrow type guard to mineral
 * @param obj 
 * @returns boolean
 */
function isMineral(obj: unknown): obj is Mineral
{
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'mineralType' in obj &&
    typeof (obj as { mineralType?: unknown}).mineralType === 'string' &&
    !('energy' in obj) &&
    !('depositType' in obj)
  );
}

/**
 * Narrow type guard to deposit
 * @param obj 
 * @returns boolean
 */
function isDeposit(obj: unknown): obj is Deposit
{
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'depositType' in obj &&
    typeof (obj as { depositType?: unknown}).depositType === 'string' &&
    !('energy' in obj) &&
    !('mineralType' in obj)
  );
}

/**
 * Check if room storage is full
 * @param room 
 * @returns 
 */
export function isRoomStorageFull(room: Room): boolean
{
  if (!room.controller || !room.controller.my ) return false;
  return (room.energyCapacityAvailable - room.energyAvailable) === 0; 
}

/**
 * Detects Player Username
 * @returns 
 */
export function detectPlayerUsername(): string
{
  // Check structures first
  for (const obj of Object.values(Game.structures) as OwnerLike[])
  {
    if (obj.owner?.username) return obj.owner.username;
  }

  // Then creeps
  for (const obj of Object.values(Game.creeps) as OwnerLike[])
  {
    if (obj.owner?.username) return obj.owner.username;
  }

  // Finally construction sites
  for (const obj of Object.values(Game.constructionSites) as OwnerLike[])
  {
    if (obj.owner?.username) return obj.owner.username;
  }

  // Otherwise name is unknown
  return "Unknown";
}