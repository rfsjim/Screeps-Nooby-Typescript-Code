'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { installScreepsGlobals } = require('./helpers/screeps');

installScreepsGlobals();

const InitRoom = require('../src/init/init.room');

function positionKey(x, y) {
	return `${x},${y}`;
}

function createSource(id, x, y) {
	return {
		id,
		pos: { x, y },
	};
}

function createInitRoomScenario({
	mineralMemory,
	sourceMemory,
	minerals = [],
	sources = [createSource('source-1', 25, 25)],
	walls = [],
	structuresByPosition = {},
	constructionSitesByPosition = {},
} = {}) {
	const wallPositions = new Set(walls.map(([x, y]) => positionKey(x, y)));
	const findCalls = [];

	global.RoomPosition = class RoomPosition {
		constructor(x, y, roomName) {
			this.x = x;
			this.y = y;
			this.roomName = roomName;
		}

		lookFor(type) {
			const key = positionKey(this.x, this.y);
			if (type === LOOK_STRUCTURES) {
				return structuresByPosition[key] ?? [];
			}
			if (type === LOOK_CONSTRUCTION_SITES) {
				return constructionSitesByPosition[key] ?? [];
			}
			return [];
		}
	};

	const room = {
		name: 'W1N1',
		memory: { mineral: mineralMemory, sources: sourceMemory },
		find(type) {
			findCalls.push(type);
			if (type === FIND_SOURCES) {
				return sources;
			}
			if (type === FIND_MINERALS) {
				return minerals;
			}
			return [];
		},
		getTerrain() {
			return {
				get(x, y) {
					return wallPositions.has(positionKey(x, y))
						? TERRAIN_MASK_WALL
						: 0;
				},
			};
		},
	};

	for (const roomObject of [...sources, ...minerals]) {
		roomObject.room = room;
	}

	return { findCalls, initRoom: new InitRoom(room), room };
}

function candidateCoordinates(candidates) {
	return candidates.map(({ x, y }) => positionKey(x, y)).sort();
}

test('a source with eight empty adjacent tiles has eight candidates', () => {
	const { initRoom } = createInitRoomScenario();

	const candidates = initRoom.ensureContainers();

	assert.equal(candidates.get('source-1').length, 8);
});

test('a source with walls on three adjacent tiles has five candidates', () => {
	const { initRoom } = createInitRoomScenario({
		walls: [
			[24, 24],
			[25, 24],
			[26, 24],
		],
	});

	const candidates = initRoom.ensureContainers();

	assert.equal(candidates.get('source-1').length, 5);
});

test('a source with an adjacent container is omitted', () => {
	const { initRoom } = createInitRoomScenario({
		structuresByPosition: {
			[positionKey(24, 25)]: [{ structureType: STRUCTURE_CONTAINER }],
		},
	});

	const candidates = initRoom.ensureContainers();

	assert.equal(candidates.has('source-1'), false);
});

test('a source with an adjacent container construction site is omitted', () => {
	const { initRoom } = createInitRoomScenario({
		constructionSitesByPosition: {
			[positionKey(24, 25)]: [{ structureType: STRUCTURE_CONTAINER }],
		},
	});

	const candidates = initRoom.ensureContainers();

	assert.equal(candidates.has('source-1'), false);
});

test('an adjacent extension tile is excluded from source candidates', () => {
	const extensionPosition = positionKey(24, 25);
	const { initRoom } = createInitRoomScenario({
		structuresByPosition: {
			[extensionPosition]: [{ structureType: STRUCTURE_EXTENSION }],
		},
	});

	const candidates = initRoom.ensureContainers();
	const coordinates = candidateCoordinates(candidates.get('source-1'));

	assert.equal(coordinates.length, 7);
	assert.equal(coordinates.includes(extensionPosition), false);
});

test('two sources requiring containers have independent map entries', () => {
	const { initRoom } = createInitRoomScenario({
		sources: [
			createSource('source-1', 10, 10),
			createSource('source-2', 30, 30),
		],
	});

	const candidates = initRoom.ensureContainers();

	assert.equal(candidates.size, 2);
	assert.equal(candidates.get('source-1').length, 8);
	assert.equal(candidates.get('source-2').length, 8);
	assert.notStrictEqual(
		candidates.get('source-1'),
		candidates.get('source-2'),
	);
});

test('a source with no available adjacent tiles has an empty entry', () => {
	const { initRoom } = createInitRoomScenario({
		walls: [
			[24, 24],
			[25, 24],
			[26, 24],
			[24, 25],
			[26, 25],
			[24, 26],
			[25, 26],
			[26, 26],
		],
	});

	const candidates = initRoom.ensureContainers();

	assert.equal(candidates.has('source-1'), true);
	assert.deepEqual(candidates.get('source-1'), []);
});

test('container site is detected alongside another structure', () => {
	const { initRoom } = createInitRoomScenario({
		structuresByPosition: {
			[positionKey(24, 25)]: [{ structureType: STRUCTURE_ROAD }],
		},
		constructionSitesByPosition: {
			[positionKey(24, 25)]: [{ structureType: STRUCTURE_CONTAINER }],
		},
	});

	const candidates = initRoom.ensureContainers();

	assert.equal(candidates.has('source-1'), false);
});

test('a source with an adjacent container construction site at the end of the loop is omitted', () => {
	const { initRoom } = createInitRoomScenario({
		constructionSitesByPosition: {
			[positionKey(26, 26)]: [{ structureType: STRUCTURE_CONTAINER }],
		},
	});

	const candidates = initRoom.ensureContainers();

	assert.equal(candidates.has('source-1'), false);
});

test('mineral metadata is saved to room memory', () => {
	const mineral = {
		id: 'mineral-1',
		mineralType: RESOURCE_HYDROGEN,
		density: 3,
		pos: { x: 17, y: 29 },
	};
	const { initRoom, room } = createInitRoomScenario({ minerals: [mineral] });

	initRoom.storeMineral();

	assert.deepEqual(room.memory.mineral, {
		id: 'mineral-1',
		mineralType: RESOURCE_HYDROGEN,
		density: 3,
		harvestPositions: 8,
		x: 17,
		y: 29,
	});
});

test('sources are stored by ID with coordinates and harvest positions', () => {
	const sources = [
		createSource('source-1', 10, 10),
		createSource('source-2', 20, 20),
	];
	const { initRoom, room } = createInitRoomScenario({
		sources,
		walls: [
			[9, 9],
			[10, 9],
			[11, 9],
		],
	});

	initRoom.storeSources();

	assert.deepEqual(room.memory.sources, {
		'source-1': { x: 10, y: 10, harvestPositions: 5 },
		'source-2': { x: 20, y: 20, harvestPositions: 8 },
	});
});

test('existing source memory is preserved without searching the room again', () => {
	const existingSources = {
		'known-source': { x: 4, y: 7, harvestPositions: 6 },
	};
	const { findCalls, initRoom, room } = createInitRoomScenario({
		sourceMemory: existingSources,
	});
	const searchesBeforeStore = findCalls.length;

	initRoom.storeSources();

	assert.strictEqual(room.memory.sources, existingSources);
	assert.equal(findCalls.length, searchesBeforeStore);
});

test('repeated source initialisation does not repeat the room search', () => {
	const { findCalls, initRoom } = createInitRoomScenario();

	initRoom.storeSources();
	const searchesAfterInitialisation = findCalls.length;
	initRoom.storeSources();

	assert.equal(findCalls.length, searchesAfterInitialisation);
});

test('existing mineral memory is preserved without searching the room again', () => {
	const existingMineral = {
		id: 'known-mineral',
		mineralType: RESOURCE_OXYGEN,
		density: 2,
		x: 10,
		y: 20,
	};
	const { findCalls, initRoom, room } = createInitRoomScenario({
		mineralMemory: existingMineral,
	});

	initRoom.storeMineral();

	assert.strictEqual(room.memory.mineral, existingMineral);
	assert.equal(findCalls.includes(FIND_MINERALS), false);
});

test('room memory is unchanged when no mineral is found', () => {
	const { initRoom, room } = createInitRoomScenario();

	initRoom.storeMineral();

	assert.equal(room.memory.mineral, undefined);
});
