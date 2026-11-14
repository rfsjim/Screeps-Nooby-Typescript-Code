/**
 * Memory Manager
 * TODO: Needs separation and cleanup
 * provide a consistent interface to Screeps memory,
 * initialise missing properties, and
 * make common questions about the colony easy to answer.
 * Currently performing multiple roles
 * memory initialisation, memory access, and colony state interpretation.
 */

// import { RoomMemory, CreepMemory, Role, EnergyMinerMemory, RoomPhase} from "types";

/**
 * Clear Controller Progress for testing purposes
 * @param {Room} room
 * @returns {void}
 */
export function resetControllerProgress(room) {
	// TODO: Development utility; retain only if still useful
	const roomMemory = getRoomMemory(room);
	if (roomMemory === null) {
		return;
	}
	delete roomMemory.controllerProgress;
}

/**
 * Returns the room memory
 * Guards Against Memory Corruption & avoid accidental overwrites or undefined situations
 * @param {Room} room
 * @returns {RoomMemory}
 */
export function getRoomMemory(room) {
	// TODO: Currently guarantees that various memory properties exist before returning them
	// there's an important distinction between reading memory and initialising memory
	// As a getter it shouldn't be doing both
	// Useful concept; initialisation side effects need reconsideration
	if (!room.memory) {
		room.memory = {};
	}

	const memory = room.memory;

	if (memory.constructionSites === undefined) {
		memory.constructionSites = {};
	}
	if (memory.constructionQueue === undefined) {
		memory.constructionQueue = [];
	}
	if (!memory.controllerProgress) {
		memory.controllerProgress = { level: 0, totalEnergyHarvested: 0 };
	}
	if (memory.creepCounts === undefined) {
		memory.creepCounts = {};
	}
	if (memory.creeps === undefined) {
		memory.creeps = {};
	}
	if (memory.maxHarvesters === undefined) {
		memory.maxHarvesters = 0;
	}
	if (memory.owner === undefined) {
		memory.owner = room.controller?.owner?.username ?? 'None';
	} // TODO: Dynamic information can get stale
	if (memory.phase === undefined) {
		memory.phase = RoomPhase.UninitiatedRoom;
	}
	if (memory.rcl === undefined) {
		memory.rcl = room.controller?.level ?? -1;
	}
	if (memory.spawns === undefined) {
		memory.spawns = {};
	}
	if (memory.sources === undefined) {
		memory.sources = {};
	} // TODO: This has the potential to make init room memory not fire
	if (memory.mineral === undefined) {
		memory.mineral = {};
	} // TODO: This has the potential to make init room memory not fire
	// TODO: retain the idea of centralised initialisation but
	// be careful about using property existence to represent discovery completion
	return memory;
}

/**
 * Returns the creep memory
 * Guards Against Memory Corruption & avoid accidental overwrites or undefined situations
 * @param {Creep} creep
 * @returns {CreepMemory}
 */
export function getCreepMemory(creep) {
	// TODO: Simple and potentially reusable
	if (!creep.memory) {
		creep.memory = {};
	}

	const memory = creep.memory;

	// TODO the working boolean describes a simple creep-centric state
	// that doesn't consider any tasks
	if (typeof memory.working === 'undefined') {
		memory.working = false;
	}

	return memory;
}

/**
 * Get Initial Creep Memory
 * @param {*} role
 * @returns {CreepMemory}
 */
export function getInitialCreepMemory(role) {
	// RETAIN Useful memory factory
	return {
		role: role,
		working: false,
	};
}

/**
 * Get Initial Energy Miner Memory
 * @param {Id<Source>} sourceId
 * @returns {*} Energy Miner Memory
 */
export function getInitialEnergyMinerMemory(sourceId) {
	// RETAIN Useful specialist memory factory
	return {
		role: 'energyMiner',
		working: false,
		sourceId: sourceId,
	};
}

/**
 * Superseded by newer source metadata
 * Gets Number of Source Location[s] in room
 * Can be used to calculate max number of creeps per room
 * @deprecated init.room performs same function no longer required in memory manager.
 * @param {Room} room
 * @returns {number}
 */
export function getNumberOfSourceLocations(room) {
	// TODO: Superseded by newer source metadata
	const roomMemory = getRoomMemory(room);
	if (!roomMemory) {
		return 0;
	}
	let harvestPositions = 0;

	for (const sourceID in roomMemory.sources) {
		harvestPositions += roomMemory.sources[sourceID].harvestPositions;
	}

	return harvestPositions;
}

/**
 * Detects Room Phase
 * @param {Room} room
 * @returns RoomPhase
 */
export function getRoomPhase(room) {
	// TODO: this is attempting to build a colony state machine
	// a colony's priorities should change as its infrastructure and economic capacity develop.
	// implementation contains logic errors - an ordered-condition problem
	// the order makes some phases unreachable
	// An RCL 6 room with storage and a terminal will match MidGame before reaching NearMax
	// An RCL 8 room with storage will also match MidGame before reaching MaxSingleRoom
	// Conditions need to be tightened and memory manager isn't the place for it
	// design is worth preserving conceptually
	// REDESIGN - Valuable strategic concept; logic needs redesign
	const roomMemory = getRoomMemory(room);
	if (roomMemory === undefined) {
		return RoomPhase.UninitiatedRoom;
	}

	const rcl = room.controller?.level ?? -1;
	const hasStorage = !!room.storage;
	// TODO: creeps recorded in room memory is possible to get stale
	// needs more reliable evidence of recovery capability
	const creepCount = Object.keys(roomMemory.creeps).length;
	const isEmergency =
		room.energyAvailable < 100 && Object.keys(roomMemory.creeps).length < 2;

	let phase;

	// TODO Needs work a colony can be mature and simultaneously experiencing an emergency
	if (rcl < 1) {
		phase = RoomPhase.UninitiatedRoom;
	} else if (isEmergency) {
		phase = RoomPhase.DeathSpiral;
	} else if (rcl < 2) {
		phase = RoomPhase.InitialBootstrap;
	} else if (rcl >= 2 && !hasStorage) {
		phase = RoomPhase.StableEarlyGame;
	} else if (rcl >= 4 && hasStorage) {
		phase = RoomPhase.MidGame;
	} else if (rcl >= 6 && room.terminal) {
		phase = RoomPhase.NearMax;
	} else if (rcl === 8) {
		phase = RoomPhase.MaxSingleRoom;
	}
	// TODO: Currently ExpansionCandidate is effectively a fallback
	// any room that doesn't fit the preceding conditions becomes an expansion candidate
	// expansion readiness is really a strategic decision
	// depend on available resources, economic stability, CPU capacity, GCL and nearby opportunities
	else {
		phase = RoomPhase.ExpansionCandidate;
	}

	/**
	 * Legacy phase	Underlying question
	 * UninitiatedRoom	Is this room established?
	 * InitialBootstrap	Can it sustain its first workforce?
	 * StableEarlyGame	Has basic energy production stabilised?
	 * MidGame	Does it have established storage and infrastructure?
	 * NearMax	Is advanced infrastructure available?
	 * MaxSingleRoom	Has it reached maximum controller level?
	 * ExpansionCandidate	Is it ready to support expansion?
	 * DeathSpiral	Can the colony recover from its current condition?
	 *
	 * These are all useful questions.
	 * But they're not necessarily answers to one question.
	 * For example, a room could simultaneously be:
	 * - RCL 8.
	 * - Economically stable.
	 * - Ready to expand.
	 * - Temporarily experiencing a workforce shortage.
	 * A single enum can't represent those conditions independently.
	 */

	const currentPhase = Number(roomMemory.phase);

	if (currentPhase !== phase) {
		console.log(
			`[${room.name}] Phase -> ${RoomPhase[phase]} (${phase}), RCL=${rcl}, creeps=${creepCount}, storage=${hasStorage}`,
		);
		roomMemory.phase = phase;
	}

	return phase;
}
