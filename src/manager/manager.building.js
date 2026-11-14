/**
 * Building Manager
 * Original Implementation of a building manager, has some work prior to being implemented.
 * an early attempt at a complete automated construction system, combining planning, placement,
 * construction priorities, dependency management and memory tracking.
 *
 * Responsibility	Functions
 * Construction policy	buildingManager, dependenciesMet
 * Position planning	getPlannedPositions, planExtensionPositions, planContainerPositions
 * Placement validation and execution	canBuildAt, placeConstructionSite
 * Construction tracking	countStructures, countConstructionSites, scanSites
 *
 * Hierarchy of construction strategies
 * First Choice - Preferred bunker stamp
 * Second Choice - Modular stamps
 * Third Choice - Dynamic layout generation
 *
 * Use the simplest strategy that satisfies the room's constraints.
 * Fast candidate selection: Use the distance transform to find large, open areas.
 * Exact stamp validation: Check the actual required positions against terrain,
 * existing structures, controller, sources, minerals and other restrictions.
 * test rotations and reflections of a stamp without changing its fundamental design
 *
 * candidate positions could be scored for travel distance as well as clearance
 *
 * Defence Structure Placement
 * Once other construction strategy and building placement is decided
 * Use minimum cut to Model traversable terrain as a graph,
 * with room exits on one side and protected assets on the other.
 * Find a low-cost set of tiles whose fortification would separate the two.
 * Reduce the number of ramparts or walls required.
 *
 * Test reachability with flood fill, once candidate wall construction is available
 * Starting from room exits, identify which walkable tiles an attacker could reach.
 * This is useful for checking whether a proposed defensive perimeter actually seals off the protected area
 *
 * Screeps-specific complications
 * Movement is eight-directional, so diagonal gaps matter when validating a perimeter.
 * The cheapest perimeter by tile count isn't necessarily the best defensive perimeter.
 * preserve access to sources, protect the controller, avoid exposed ramparts, and consider repair logistics.
 * Friendly creeps need to move through the defenses.
 * Ramparts and controlled access points can be preferable to completely blocking routes.
 * Ramparts have an ongoing cost though
 * Walls and Ramparts have initial energy costs to bring up HP
 *
 * A minimum cut produces a candidate barrier;
 * a flood fill can then verify whether that barrier actually isolates the intended area under movement rules.
 */

const FULL_BUNKER_DISTANCE_REQUIRED = 7;

// TODO: Build Plan implementation treats counts as cumulative totals
// However, the plan itself describes incremental additions
// RETAIN - Retain concept; correct count semantics
const buildPlan = {
	2: [
		{ type: STRUCTURE_EXTENSION, count: 5, priority: 1 }, // RCL 2 limit
		{ type: STRUCTURE_CONTAINER, count: 2, priority: 2 }, // for container mining
		{ type: STRUCTURE_ROAD, count: Infinity, priority: 3 }, // roads to connect sources to spawn
	],
	3: [
		{ type: STRUCTURE_EXTENSION, count: 5, priority: 1 }, // RCL 3 limit
		{ type: STRUCTURE_TOWER, count: 1, priority: 2 }, // for defense
	],
	4: [
		{ type: STRUCTURE_EXTENSION, count: 10, priority: 1 }, // RCL 4 limit
		{ type: STRUCTURE_STORAGE, count: 1, priority: 2 }, // storage
	],
	5: [
		{ type: STRUCTURE_EXTENSION, count: 10, priority: 1 }, // RCL 5 limit
		{ type: STRUCTURE_TOWER, count: 1, priority: 2 }, // additional tower for defense
		{ type: STRUCTURE_LINK, count: 2, priority: 3 }, // links for energy transfer
	],
	6: [
		{ type: STRUCTURE_EXTENSION, count: 10, priority: 1 }, // RCL 6 limit
		{ type: STRUCTURE_LINK, count: 1, priority: 2 }, // additional link for energy transfer
		{ type: STRUCTURE_EXTRACTOR, count: 1, priority: 3 }, // extractor for mineral harvesting
		{ type: STRUCTURE_TERMINAL, count: 1, priority: 4 }, // terminal for trading
		{ type: STRUCTURE_LAB, count: 3, priority: 5 }, // labs for chemical processing
	],
	7: [
		{ type: STRUCTURE_SPAWN, count: 1, priority: 1 }, // additional spawn for capacity
		{ type: STRUCTURE_EXTENSION, count: 10, priority: 2 }, // RCL 7 limit
		{ type: STRUCTURE_TOWER, count: 1, priority: 3 }, // additional tower for defense
		{ type: STRUCTURE_LINK, count: 1, priority: 4 }, // link for energy transfer
		{ type: STRUCTURE_LAB, count: 3, priority: 5 }, // additional labs for chemical processing
		{ type: STRUCTURE_FACTORY, count: 1, priority: 6 }, // factory for production
	],
	8: [
		{ type: STRUCTURE_SPAWN, count: 1, priority: 1 }, // additional spawn for capacity
		{ type: STRUCTURE_EXTENSION, count: 10, priority: 2 }, // RCL 8 limit
		{ type: STRUCTURE_TOWER, count: 3, priority: 3 }, // additional towers for defense
		{ type: STRUCTURE_LINK, count: 2, priority: 4 }, // links for energy transfer
		{ type: STRUCTURE_LAB, count: 4, priority: 5 }, // additional labs for chemical processing
		{ type: STRUCTURE_OBSERVER, count: 1, priority: 6 }, // observer for scouting
		{ type: STRUCTURE_NUKER, count: 1, priority: 7 }, // nuker for offensive operations
		{ type: STRUCTURE_POWER_SPAWN, count: 1, priority: 8 }, // power spawn for power processing
	],
};

// full sized bunker centre position relative to spawn
const positions = [
	{ x: -2, y: 0 }, // left of spawn
	{ x: 0, y: 2 }, // right of spawn
	{ x: 2, y: 0 }, // below the spawn
];

// extension offsets relative to extension anchor
const offsets = [
	{ x: 0, y: 0 }, // anchor
	{ x: 0, y: -1 }, // above
	{ x: 0, y: 1 }, // below
	{ x: -1, y: 0 }, // left
	{ x: 1, y: 0 }, // right
];

/**
 * Building Manager
 * Handles building tasks in the room
 * Determine RCL and construction plan
 * Count existing structures and sites
 * Check dependencies
 * Calculate construction positions
 * Place sites and update tracking
 * @param {Room} room
 * @param {number} roomMaxLocationDistance
 * @returns {void} - works as side effects
 */
export function buildingManager(room, roomMaxLocationDistance) {
	// TODO: Get large bunker placement worked out then move on to
	// Stamp tile sets and dynamic structure placements
	// RETAIN redesign

	if (roomMaxLocationDistance < FULL_BUNKER_DISTANCE_REQUIRED) {
		return;
	} // room not big enough for one large bunker
	const rcl = room.controller?.level || 0;
	const plan = buildPlan[rcl];

	const roomMemory = getRoomMemory(room);

	if (!roomMemory) {
		return;
	}

	if (!plan) {
		return;
	} // No build plan for this RCL

	if (roomMemory.bunker) {
		const scanPos1 = new RoomPosition(
			roomMemory.bunker?.centre.x - FULL_BUNKER_DISTANCE_REQUIRED,
			roomMemory.bunker?.centre.y + FULL_BUNKER_DISTANCE_REQUIRED,
			room.name,
		); // top-left
		const scanPos2 = new RoomPosition(
			roomMemory.bunker?.centre.x + FULL_BUNKER_DISTANCE_REQUIRED,
			roomMemory.bunker?.centre.y - FULL_BUNKER_DISTANCE_REQUIRED,
			room.name,
		); // bottom-right
		// The bunker scan supplies only two positions representing opposite corners:
		// The bounding box covers the bunker area, but the allowed set contains only those two corners.
		// Construction sites elsewhere inside the bunker won't be recorded.
		scanSites(room, [scanPos1, scanPos2]);
	}

	if (roomMemory.sources) {
		const sources = Object.keys(roomMemory.sources || {}).map(
			(sourceId) => (Game.getObjectById < Source) > sourceId,
		);

		for (const source of sources) {
			if (!source) {
				continue;
			}
			const scanPos1 = new RoomPosition(
				source.pos.x - 1,
				source.pos.y - 1,
				room.name,
			); // top-left
			const scanPos2 = new RoomPosition(
				source.pos.x + 1,
				source.pos.y + 1,
				room.name,
			); // bottom-right
			scanSites(room, [scanPos1, scanPos2]);
		}
	}

	for (const task of plan.sort((a, b) => a.priority - b.priority)) {
		// TODO: counting functions depend entirely on room memory
		// This is interlinked and have a circular dependency
		// memory is populated by scanSites()
		// skip if task already satisfied
		const existing = countStructures(room, task.type);
		const underConstruction = countConstructionSites(room, task.type);
		if (existing + underConstruction >= task.count) {
			continue;
		}

		// Check if dependencies are met (eg don't place storage until extensions are built)
		if (task.dependsOn && !dependenciesMet(room, task.dependsOn)) {
			continue;
		}

		// ask dependency module for positions
		const positions = getPlannedPositions(
			room,
			task.type,
			task.count - (existing + underConstruction),
		);

		let placed = false; // flag to indicate if intent was created for construction sites this tick

		// place as many as possible
		for (const pos of positions) {
			if (canBuildAt(pos)) {
				placeConstructionSite(pos, task.type, room.name);
				placed = true; // intent for construction sites placed this tick skip scanning
			}
		}

		// update room memory with new sites only on second tick
		if (!placed) {
			scanSites(room, positions);
		}

		break; // only do one batch per tick to avoid clutter
	}
}

/**
 * Get Planned Room Positions
 * @param {Room} room
 * @param {BuildableStructureConstant} type
 * @param {number} count
 * @returns {RoomPosition[]} Array of RoomPositions where the structure can be built
 */
function getPlannedPositions(room, type, count) {
	// TODO RETAIN Useful dispatcher concept
	// Has no handling for roads
	const positions = [];

	switch (type) {
		case STRUCTURE_EXTENSION:
			planExtensionPositions(room, count).forEach((pos) =>
				positions.push(pos),
			);
			break;
		case STRUCTURE_CONTAINER:
			planContainerPositions(room, count).forEach((pos) =>
				positions.push(pos),
			);
			break;
		case STRUCTURE_TOWER:
		case STRUCTURE_STORAGE:
		case STRUCTURE_LINK:
		case STRUCTURE_LAB:
		case STRUCTURE_EXTRACTOR:
		case STRUCTURE_TERMINAL:
		case STRUCTURE_SPAWN:
		case STRUCTURE_FACTORY:
		case STRUCTURE_OBSERVER:
		case STRUCTURE_POWER_SPAWN:
		case STRUCTURE_NUKER:
			break;
		default:
			console.log(`No placement algorithm for ${type}`);
			return [];
	}
	return positions;
}

/**
 * Check if can build at position
 * @param {RoomPosition} pos
 * @returns {boolean} - true if can build, false if can't
 */
function canBuildAt(pos) {
	// TODO: Currently rejects positions containing any structure
	// Not all structures need their own space
	// Roads and ramparts, for example, can overlap some other structures.
	// Currently does not account for the structure attempting to be built
	// Retain concept; needs structure-aware checks
	if (
		new Room.Terrain(pos.roomName).get(pos.x, pos.y) === TERRAIN_MASK_WALL
	) {
		return false;
	} // can't build on walls
	if (pos.lookFor(LOOK_CONSTRUCTION_SITES).length > 0) {
		return false;
	} // can't build on existing construction sites
	if (pos.lookFor(LOOK_STRUCTURES).length > 0) {
		return false;
	} // can't build on existing structures
	return true;
}

/**
 * Count structures of given type in room memory
 * @param {Room} room
 * @param {BuildableStructureConstant} structureType
 * @returns {number} of structures of given type
 */
function countStructures(room, structureType) {
	// TODO Reconsider source of truth - circular dependencies
	let count = 0;
	const roomMemory = getRoomMemory(room);
	if (!roomMemory.structures) {
		return 0;
	}

	for (const id in roomMemory.structures) {
		if (roomMemory.structures[id].type === structureType) {
			count++;
		}
	}

	return count;
}

/**
 * Count construction sites of given type in room memory
 * @param {Room} room
 * @param {BuildableStructureConstant} structureType
 * @returns {number} of construction sites of given type
 */
function countConstructionSites(room, structureType) {
	// TODO Reconsider source of truth
	let count = 0;
	const roomMemory = getRoomMemory(room);
	if (!roomMemory.constructionSites) {
		return 0;
	}
	for (const id in roomMemory.constructionSites) {
		if (roomMemory.constructionSites[id].type === structureType) {
			count++;
		}
	}

	return count;
}

/**
 * Check if dependencies are met
 * @param {Room} room
 * @param {BuildableStructureConstant[]} dependencies
 * @returns {boolean} - true if dependencies are met, false if not
 */
function dependenciesMet(room, dependencies) {
	// RETAIN Simple, potentially reusable
	for (const dep of dependencies) {
		const existing = countStructures(room, dep);
		if (existing === 0) {
			return false;
		} // dependency not met
	}

	return true; // all dependencies are met
}

/**
 * Plan Extension Positions
 * @param {Room} room
 * @param {number} count
 * @returns {RoomPosition[]} Array of RoomPositions for extensions
 */
function planExtensionPositions(room, count) {
	// TODO: extension placement is calculated separately, using an anchor chosen from the controller's
	// horizontal position relative to the spawn
	// the chosen extension anchor doesn't depend on which candidate bunker position passed the clearance test.
	// the loop can generate the same extension positions multiple times.
	// roomMemory.bunker is assigned after the position-generation loop,
	// but the function can return early when it has enough positions.
	// That means the bunker metadata may never be saved.
	// the clearance check is for the proposed bunker centre,
	// not for the individual extension positions.
	// Retain bunker-planning concept
	const roomPositions = [];
	const roomMemory = getRoomMemory(room);
	if (!room.controller) {
		return roomPositions;
	} // room has no controller

	if (!roomMemory.spawns) {
		return roomPositions;
	} // if room has no spawn then we dont need to be building

	const initialSpawn = Object.keys(roomMemory.spawns)[0]; // get first spawn created in room as anchor for bunker
	if (!initialSpawn) {
		return roomPositions;
	}

	const spawnMemory = roomMemory.spawns[initialSpawn]; // get room memory details
	if (!spawnMemory) {
		return roomPositions;
	}

	const spawnPos = new RoomPosition(spawnMemory.x, spawnMemory.y, room.name);
	const controller = room.controller;

	// TODO: a mismatch in the implementation this calculates candidates
	for (const position of positions) {
		const testPos = new RoomPosition(
			spawnPos.x + position.x,
			spawnPos.y + position.y,
			room.name,
		);

		if (
			global.getDistanceTransform(room.name).get(testPos.x, testPos.y) >=
			FULL_BUNKER_DISTANCE_REQUIRED
		) {
			// create extension anchor relative to controller & spawn position
			let extensionAnchor;

			if (controller.pos.x === spawnPos.x) {
				extensionAnchor = new RoomPosition(
					spawnPos.x + 2,
					spawnPos.y - 1,
					room.name,
				);
			} else if (controller.pos.x > spawnPos.x) {
				extensionAnchor = new RoomPosition(
					spawnPos.x + 1,
					spawnPos.y - 2,
					room.name,
				);
			} else {
				extensionAnchor = new RoomPosition(
					spawnPos.x - 1,
					spawnPos.y - 2,
					room.name,
				);
			}

			// place anchor and neighbours
			for (const { x, y } of offsets) {
				const pos = new RoomPosition(
					extensionAnchor.x + x,
					extensionAnchor.y + y,
					room.name,
				);
				roomPositions.push(pos);
				if (roomPositions.length >= count) {
					return roomPositions;
				} // stop when we have enough positions
			}

			// TODO Mismatch - records candidates
			// However, the extension positions are calculated using a separate extensionAnchor,
			// based on the spawn and controller positions.
			// the distance-transform check and
			// the extension placement aren't necessarily evaluating the same footprint.
			roomMemory.bunker = {
				centre: { x: testPos.x, y: testPos.y },
				planned: false,
			};
		}
	}
	return roomPositions;
}

/**
 * Plan Container Positions
 * @param {Room} room
 * @param {number} count
 * @returns {RoomPosition[]} Room Position for Containers
 */
function planContainerPositions(room, count) {
	// TODO Replace placement algorithm
	const positions = [];
	const roomMemory = getRoomMemory(room);
	if (!room.controller) {
		return positions;
	} // room has no controller

	if (!roomMemory.spawns) {
		return positions;
	} // if room has no spawn then we dont need to be building

	const initialSpawn = Object.keys(roomMemory.spawns)[0]; // get first spawn created in room as anchor for bunker
	if (!initialSpawn) {
		return positions;
	}

	const spawnMemory = roomMemory.spawns[initialSpawn]; // get room memory details
	if (!spawnMemory) {
		return positions;
	}
	const sources = Object.keys(roomMemory.sources || {}).map(
		(sourceId) => (Game.getObjectById < Source) > sourceId,
	);
	// TODO Incorrectly ignores one source rooms
	if (sources.length >= 2) {
		for (const source of sources) {
			if (!source) {
				continue;
			} // skip if source is undefined

			// TODO offsets contains: { x: 0, y: 0 } the source's own position,
			// no container can be built on the source
			// uses the same five-position cross pattern intended for extensions,
			// rather than examining the actual walkable neighbouring terrain.
			// getAdjacentWalkablePositions() helper is conceptually relevant here
			for (const { x, y } of offsets) {
				const pos = new RoomPosition(
					source.pos.x + x,
					source.pos.y + y,
					room.name,
				);
				positions.push(pos);
				if (positions.length >= count) {
					return positions;
				} // stop when we have enough positions
			}
		}
	}
	return positions;
}

/**
 * Creates Construction Site, and logs result
 * A simple reusable wrapper
 * @param {RoomPosition} roomPosition
 * @param {BuildableStructureConstant} structureType
 * @param {string} roomName
 * @returns {ScreepReturnConstant}
 */
function placeConstructionSite(roomPosition, structureType, roomName) {
	// TODO : Straightforward reusable wrapper
	const roomMemory = getRoomMemory(Game.rooms[roomName]);
	if (!roomMemory) {
		return ERR_INVALID_ARGS;
	}

	const result = roomPosition.createConstructionSite(structureType);

	if (result !== OK) {
		console.log(
			`Failed to place ${structureType} at ${roomPosition}: ${result}`,
		);
		return result;
	}

	return OK;
}

/**
 * Scan Given Area for Construction Sites or Structures and add to room memory
 * @param {Room} room
 * @param {RoomPosition[]} positions
 * @returns {void}
 */
function scanSites(room, positions) {
	// TODO: scanSites() is called selectively,
	// often only after a construction-placement attempt fails or
	// during the limited bunker/source scans.
	// scanSites() only adds entries.
	// It doesn't remove stale entries when a construction site is completed, cancelled or destroyed.
	// calculates a bounding box around the supplied positions.
	// But it also creates an allowed set containing only the original coordinates.
	// For construction sites, it checks that the result is in allowed.
	// For completed structures, it doesn't.
	// Consequently, the construction-site and structure scans have different inclusion rules.
	// Redesign tracking and scanning contracts
	// const sites = room.lookForAtArea(type, area.y1, area.x1, area.y2, area.x2, true);
	const roomMemory = getRoomMemory(room);
	if (!roomMemory) {
		return;
	}
	if (!positions || positions.length === 0) {
		return;
	}

	// Build a bounding box around the positions to minimize area scanned
	const minX = Math.min(...positions.map((p) => p.x));
	const minY = Math.min(...positions.map((p) => p.y));
	const maxX = Math.max(...positions.map((p) => p.x));
	const maxY = Math.max(...positions.map((p) => p.y));

	// Create lookup set for filtering out existing sites
	const allowed = new Set(positions.map((p) => `${p.x},${p.y}`));

	// construction sites
	const sites = room.lookForAtArea(
		LOOK_CONSTRUCTION_SITES,
		minY,
		minX,
		maxY,
		maxX,
		true,
	);
	if (roomMemory.constructionSites === undefined) {
		roomMemory.constructionSites = {};
	}
	if (roomMemory.constructionQueue === undefined) {
		roomMemory.constructionQueue = [];
	}

	for (const s of sites) {
		const id = s.constructionSite.id;

		// Skip if already in memory
		if (id in roomMemory.constructionSites) {
			continue;
		}

		// Optional: only add if it’s in your planned positions
		if (allowed.has(`${s.x},${s.y}`)) {
			roomMemory.constructionSites[id] = {
				x: s.x,
				y: s.y,
				type: s.constructionSite.structureType,
			};

			if (!roomMemory.constructionQueue.includes(id)) {
				roomMemory.constructionQueue.push(id);
			}

			console.log(
				`Found site ${id} at (${s.x},${s.y}) type ${s.constructionSite.structureType}`,
			);
		}
	}

	// built structures
	const structures = room.lookForAtArea(
		LOOK_STRUCTURES,
		minY,
		minX,
		maxY,
		maxX,
		true,
	);
	if (roomMemory.structures === undefined) {
		roomMemory.structures = {};
	}

	for (const s of structures) {
		const id = s.structure.id;

		// Skip if we've already tracked it
		if (id in roomMemory.structures) {
			continue;
		}

		// Only track buildable structures
		if (s.structure.structureType in CONSTRUCTION_COST) {
			roomMemory.structures[id] = {
				x: s.x,
				y: s.y,
				type: s.structure.structureType,
			};
			console.log(
				`Found structure ${id} at (${s.x},${s.y}) type ${s.structure.structureType}`,
			);
		}
	}
}
