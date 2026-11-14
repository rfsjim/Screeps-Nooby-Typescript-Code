/**
 * Room Manager
 * connect room-level strategy to the task and spawn managers
 * Logic based on room phase
 * Has dependency on RoomPhase Record<RoomPhase, number>
 * RoomPhase concept
 * Development stage: How advanced is the room's infrastructure?
 * Operational condition: Is the room healthy, struggling or recovering?
 * Strategic readiness: Can the room afford to expand or specialise?
 * export enum RoomPhase {
  UninitiatedRoom = -1, // Only accessible when memory initially set must be updated
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
  RoomPhase.UninitiatedRoom,
  RoomPhase.DeathSpiral,
  RoomPhase.InitialBootstrap,
  RoomPhase.StableEarlyGame,
  RoomPhase.MidGame,
  RoomPhase.NearMax,
  RoomPhase.MaxSingleRoom,
  RoomPhase.ExpansionCandidate,
  // RoomPhase.Specialised
];
 */

// import { getRoomMemory } from "./manager.memory";
// import { RoomPhase } from "types";
// import { shouldUpgradeController, getMaximumRoomEnergy } from "./taskManager";
// import { buildCreep } from "./spawnManager";

/**
 * Set Room Tasks
 * @param {Room} room
 */
export function setRoomTasks(room) {
	// TODO: a workforce-management function than a task-management function
	// Doesn't do what it says on the box
	// room might need controller upgrading without immediately needing another upgrader
	// What work needs doing? The room needs its controller upgraded.
	// Who should perform it? An available creep, or perhaps a newly spawned one.
	// Functional concept, but conflates task demand and spawning
	if (!room.controller) {
		return;
	}
	const roomMemory = getRoomMemory(room);
	if (!roomMemory) {
		return;
	}
	if (!roomMemory.spawns) {
		return;
	}
	// TODO: calling getObjectById with strings is deprecated
	// This assumes that the first entry in roomMemory.spawns is a valid spawn ID.
	// It also assumes that this spawn is the appropriate one to use.
	// newer room-wide spawn scheduling work is a much better fit for coordinating that decision.
	const spawn = Game.getObjectById(Object.keys(roomMemory.spawns)[0]);
	if (!spawn) {
		return;
	}

	if (shouldUpgradeController(room, room.controller?.level)) {
		return buildCreep('upgrader', spawn, getMaximumRoomEnergy(room));
	}

	return;
}

/**
 * Set Road Requirements
 * @param {Room} room
 * @returns {void}
 */
export function setRoadRequirements(room) {
	// TODO is placeholder needs to be completed
	// What do the enum numbers relate to?
	// Policy outline only
	const roomMemory = getRoomMemory(room);
	if (!roomMemory) {
		return;
	}
	switch (roomMemory.phase) {
		case 1:
			// No roads
			break;
		case 2:
			// Basic roads to sources
			break;
		case 3:
			// Roads to controller and spawn
			break;
		case 4:
			// High-traffic roads are reinforced
			break;
		case 5:
			// Highways and wide arteries
			break;
	}
}

// TODO: There's also a distinction between a repair threshold and a desired hit-point target.
// Potentially useful configuration
export const wallRepairThreshold = {
	'-1': 0,
	0: 100,
	1: 500,
	2: 1000,
	3: 5000,
	4: 10000,
	5: 50000,
	6: 100000,
};

// TODO: what does storage mean?
// express desired energy reserves by colony phase
// Potentially useful configuration; meaning needs defining
export const storageTarget = {
	'-1': 0,
	0: 0,
	1: 300,
	2: 1000,
	3: 3000,
	4: 6000,
	5: 10000,
	6: 10000,
};
