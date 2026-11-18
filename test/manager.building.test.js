'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { buildSync } = require('esbuild');
const { installScreepsGlobals } = require('./helpers/screeps');

installScreepsGlobals();

Object.assign(global, {
	STRUCTURE_LINK: 'link',
	STRUCTURE_LAB: 'lab',
	STRUCTURE_FACTORY: 'factory',
	STRUCTURE_OBSERVER: 'observer',
	STRUCTURE_NUKER: 'nuker',
	STRUCTURE_POWER_SPAWN: 'powerSpawn',
	CONSTRUCTION_COST: {},
});

function loadBuildingManager() {
	const result = buildSync({
		entryPoints: ['src/manager/manager.building.js'],
		bundle: false,
		format: 'cjs',
		platform: 'node',
		write: false,
	});
	const module = { exports: {} };
	const evaluate = new Function(
		'module',
		'exports',
		'require',
		result.outputFiles[0].text,
	);
	const isolatedRequire = (request) => {
		if (request === './manager.memory') {
			return { getRoomMemory: (room) => room.memory };
		}
		if (request === '../helper/roomPositions') {
			return require('../src/helper/roomPositions');
		}
		if (request === '../helper/roomTerrain') {
			return require('../src/helper/roomTerrain');
		}
		return require(request);
	};
	evaluate(module, module.exports, isolatedRequire);
	return module.exports;
}

const {
	planContainerPositions,
	makeStructureCostMatrix,
	placeConstructionSite,
} = loadBuildingManager();

class CostMatrix {
	constructor() {
		this.values = new Uint8Array(50 * 50);
	}

	get(x, y) {
		return this.values[y * 50 + x];
	}

	set(x, y, value) {
		this.values[y * 50 + x] = value;
	}
}

function applyFindFilter(values, filter) {
	if (!filter) {
		return values;
	}
	if (typeof filter === 'function') {
		return values.filter(filter);
	}
	return values.filter((value) =>
		Object.entries(filter).every(
			([key, expected]) => value[key] === expected,
		),
	);
}

function createRoom({ structures = [], sites = [], memory = {} } = {}) {
	return {
		name: 'W1N1',
		controller: { my: true },
		memory,
		find(type, options = {}) {
			if (type === FIND_STRUCTURES) {
				return applyFindFilter(structures, options.filter);
			}
			if (type === FIND_CONSTRUCTION_SITES) {
				return applyFindFilter(sites, options.filter);
			}
			throw new Error(`Unexpected room.find type: ${type}`);
		},
		getTerrain() {
			return { get: () => 0 };
		},
	};
}

function structure(structureType, x, y, properties = {}) {
	return { structureType, pos: { x, y }, ...properties };
}

test('placeConstructionSite creates the requested structure and returns OK', (t) => {
	const log = t.mock.method(console, 'log', () => {});
	const requestedTypes = [];
	const position = {
		createConstructionSite(structureType) {
			requestedTypes.push(structureType);
			return OK;
		},
	};

	const result = placeConstructionSite(position, STRUCTURE_CONTAINER);

	assert.equal(result, OK);
	assert.deepEqual(requestedTypes, [STRUCTURE_CONTAINER]);
	assert.equal(log.mock.callCount(), 0);
});

test('placeConstructionSite returns and logs a failed placement result', (t) => {
	const log = t.mock.method(console, 'log', () => {});
	const position = {
		createConstructionSite: () => ERR_INVALID_TARGET,
		toString: () => '[room W1N1 pos 12,34]',
	};

	const result = placeConstructionSite(position, STRUCTURE_TOWER);

	assert.equal(result, ERR_INVALID_TARGET);
	assert.equal(log.mock.callCount(), 1);
	assert.deepEqual(log.mock.calls[0].arguments, [
		`Failed to place ${STRUCTURE_TOWER} at ${position}: ${ERR_INVALID_TARGET}`,
	]);
});

test('makeStructureCostMatrix assigns costs by structure traversability', () => {
	global.PathFinder = { CostMatrix };
	const room = createRoom({
		structures: [
			structure(STRUCTURE_EXTENSION, 10, 10),
			structure(STRUCTURE_ROAD, 11, 10),
			structure(STRUCTURE_CONTAINER, 12, 10),
			structure(STRUCTURE_RAMPART, 13, 10, { my: true }),
			structure(STRUCTURE_RAMPART, 14, 10, { isPublic: true }),
			structure(STRUCTURE_RAMPART, 15, 10),
		],
	});

	const costs = makeStructureCostMatrix(room);

	assert.equal(costs.get(10, 10), 255);
	assert.equal(costs.get(11, 10), 1);
	assert.equal(costs.get(12, 10), 0);
	assert.equal(costs.get(13, 10), 0);
	assert.equal(costs.get(14, 10), 0);
	assert.equal(costs.get(15, 10), 255);
});

test('makeStructureCostMatrix lets construction sites override road costs', () => {
	global.PathFinder = { CostMatrix };
	const room = createRoom({
		structures: [structure(STRUCTURE_ROAD, 21, 20)],
		sites: [
			structure(STRUCTURE_EXTENSION, 20, 20),
			structure(STRUCTURE_ROAD, 21, 20),
		],
	});

	const costs = makeStructureCostMatrix(room);

	assert.equal(costs.get(20, 20), 255);
	assert.equal(costs.get(21, 20), 255);
});

function positionKey(x, y) {
	return `${x},${y}`;
}

function installPlanningGlobals({
	pathCosts = {},
	incomplete = [],
	occupied = {},
} = {}) {
	const incompletePositions = new Set(incomplete);
	const searchCalls = [];
	global.PathFinder = {
		CostMatrix,
		search(_origin, goal, options) {
			searchCalls.push({
				goal,
				options,
				matrix: options.roomCallback('W1N1'),
				otherRoomResult: options.roomCallback('W2N2'),
			});
			const key = positionKey(goal.pos.x, goal.pos.y);
			return {
				cost: pathCosts[key] ?? 50,
				incomplete: incompletePositions.has(key),
			};
		},
	};
	global.RoomPosition = class RoomPosition {
		constructor(x, y, roomName) {
			this.x = x;
			this.y = y;
			this.roomName = roomName;
		}

		getRangeTo(other) {
			return Math.max(
				Math.abs(this.x - other.x),
				Math.abs(this.y - other.y),
			);
		}

		lookFor(type) {
			const contents = occupied[positionKey(this.x, this.y)] ?? {};
			if (type === LOOK_STRUCTURES) {
				return contents.structures ?? [];
			}
			if (type === LOOK_CONSTRUCTION_SITES) {
				return contents.sites ?? [];
			}
			throw new Error(`Unexpected position.lookFor type: ${type}`);
		}
	};
	return searchCalls;
}

function createSource(
	id,
	x,
	y,
	room,
	{ servicedByStructure = false, servicedBySite = false } = {},
) {
	return {
		id,
		room,
		pos: {
			x,
			y,
			findInRange(type, range, options) {
				assert.equal(range, 1);
				assert.deepEqual(options, {
					filter: { structureType: STRUCTURE_CONTAINER },
				});
				if (type === FIND_STRUCTURES && servicedByStructure) {
					return [structure(STRUCTURE_CONTAINER, x + 1, y)];
				}
				if (type === FIND_CONSTRUCTION_SITES && servicedBySite) {
					return [structure(STRUCTURE_CONTAINER, x + 1, y)];
				}
				if (
					type === FIND_STRUCTURES ||
					type === FIND_CONSTRUCTION_SITES
				) {
					return [];
				}
				throw new Error(`Unexpected findInRange type: ${type}`);
			},
		},
	};
}

test('planContainerPositions returns no positions without required room or spawn state', () => {
	installPlanningGlobals();
	global.Game = { spawns: {}, getObjectById: () => null };
	const room = createRoom();

	assert.deepEqual(planContainerPositions(room, 0), []);
	assert.deepEqual(planContainerPositions(room, 2), []);

	room.memory.spawns = { remembered: {} };
	assert.deepEqual(planContainerPositions(room, 2), []);

	room.controller = undefined;
	assert.deepEqual(planContainerPositions(room, 2), []);
});

test('planContainerPositions chooses the cheapest valid candidate for each source', () => {
	const searchCalls = installPlanningGlobals({
		pathCosts: {
			[positionKey(9, 10)]: 8,
			[positionKey(11, 10)]: 3,
			[positionKey(29, 30)]: 2,
			[positionKey(31, 30)]: 6,
		},
		incomplete: [positionKey(10, 9)],
		occupied: {
			[positionKey(10, 11)]: {
				structures: [{ structureType: STRUCTURE_EXTENSION }],
			},
			[positionKey(30, 29)]: {
				sites: [{ structureType: STRUCTURE_EXTENSION }],
			},
		},
	});
	const room = createRoom({
		memory: {
			spawns: { 'spawn-1': {} },
			sources: { 'source-1': {}, 'source-2': {} },
		},
	});
	const spawn = { id: 'spawn-1', room, pos: { x: 5, y: 5 } };
	const sources = {
		'source-1': createSource('source-1', 10, 10, room),
		'source-2': createSource('source-2', 30, 30, room),
	};
	global.Game = {
		spawns: { Spawn1: spawn },
		getObjectById(id) {
			return sources[id];
		},
	};

	const positions = planContainerPositions(room, 2);

	assert.deepEqual(
		positions.map(({ x, y }) => [x, y]),
		[
			[29, 30],
			[11, 10],
		],
	);
	assert.ok(searchCalls.length > 1);
	for (const { goal, options, matrix, otherRoomResult } of searchCalls) {
		assert.equal(goal.range, 0);
		assert.equal(options.maxRooms, 1);
		assert.ok(matrix instanceof CostMatrix);
		assert.equal(otherRoomResult, false);
	}
	assert.equal(new Set(searchCalls.map(({ matrix }) => matrix)).size, 1);
});

test('planContainerPositions excludes candidates adjacent to the spawn', () => {
	const searchCalls = installPlanningGlobals({
		pathCosts: {
			[positionKey(6, 5)]: 0,
			[positionKey(7, 4)]: 2,
			[positionKey(7, 6)]: 4,
			[positionKey(8, 4)]: 5,
			[positionKey(8, 5)]: 6,
			[positionKey(8, 6)]: 7,
		},
	});
	const room = createRoom({
		memory: {
			spawns: { 'spawn-1': {} },
			sources: { 'source-1': {} },
		},
	});
	const spawn = { room, pos: { x: 5, y: 5 } };
	const source = createSource('source-1', 7, 5, room);
	global.Game = {
		spawns: { Spawn1: spawn },
		getObjectById: () => source,
	};

	const positions = planContainerPositions(room, 1);

	assert.deepEqual(
		positions.map(({ x, y }) => [x, y]),
		[[7, 4]],
	);
	assert.equal(
		searchCalls.some(({ goal }) => goal.pos.x === 6 && goal.pos.y === 5),
		false,
	);
	assert.deepEqual(
		searchCalls
			.map(({ goal }) => positionKey(goal.pos.x, goal.pos.y))
			.sort(),
		[
			positionKey(7, 4),
			positionKey(7, 6),
			positionKey(8, 4),
			positionKey(8, 5),
			positionKey(8, 6),
		].sort(),
	);
});

test('planContainerPositions ignores serviced sources and respects the desired count', () => {
	const searchCalls = installPlanningGlobals({
		pathCosts: {
			[positionKey(11, 10)]: 1,
			[positionKey(31, 30)]: 2,
		},
	});
	const room = createRoom({
		memory: {
			spawns: { 'spawn-1': {} },
			sources: {
				servicedBySite: {},
				servicedByStructure: {},
				available: {},
				extra: {},
			},
		},
	});
	const spawn = { room, pos: { x: 5, y: 5 } };
	const sources = {
		servicedBySite: createSource('servicedBySite', 20, 20, room, {
			servicedBySite: true,
		}),
		servicedByStructure: createSource('servicedByStructure', 40, 40, room, {
			servicedByStructure: true,
		}),
		available: createSource('available', 10, 10, room),
		extra: createSource('extra', 30, 30, room),
	};
	global.Game = {
		spawns: { Spawn1: spawn },
		getObjectById(id) {
			return sources[id];
		},
	};

	const positions = planContainerPositions(room, 1);

	assert.equal(positions.length, 1);
	assert.deepEqual([positions[0].x, positions[0].y], [11, 10]);
	assert.equal(
		searchCalls.some(
			({ goal }) =>
				goal.pos.getRangeTo({ x: 20, y: 20 }) <= 1 ||
				goal.pos.getRangeTo({ x: 40, y: 40 }) <= 1,
		),
		false,
	);
});
