'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { installScreepsGlobals } = require('./helpers/screeps');

installScreepsGlobals();

test('the main loop survives when no spawn is named Spawn1', () => {
	global.Memory = { creeps: {}, rooms: {}, spawns: {} };
	global.Game = {
		spawns: {},
		rooms: {},
		creeps: {},
		structures: {},
		time: 1,
		cpu: { tickLimit: 500, limit: 20, bucket: 1000, getUsed: () => 0 },
		map: { describeExits: () => ({}) },
	};

	const main = require('../src/main');
	assert.doesNotThrow(() => main.loop());
});

test('an unknown creep role does not throw from role dispatch', () => {
	const creep = new Creep();
	creep.memory = { role: 'roleThatDoesNotExist' };

	assert.doesNotThrow(() => creep.runRole());
});

test('the main loop discovers mineral metadata once for a room with multiple spawns', () => {
	let mineralSearches = 0;
	let spawnRuns = 0;
	const mineral = {
		id: 'mineral-1',
		mineralType: RESOURCE_ZYNTHIUM,
		density: 4,
		pos: { x: 12, y: 34 },
	};
	const room = {
		name: 'W1N1',
		controller: { my: true },
		memory: {
			phase: 3,
			spawnPolicy: {
				phase: 3,
				minCreeps: {},
				minLongDistanceHarvesters: {},
				migrationComplete: true,
			},
		},
		find(type) {
			if (type === FIND_MINERALS) {
				mineralSearches++;
				return [mineral];
			}
			return [];
		},
		getTerrain() {
			return { get: () => 0 };
		},
	};
	mineral.room = room;
	global.RoomPosition = class RoomPosition {
		constructor(x, y, roomName) {
			this.x = x;
			this.y = y;
			this.roomName = roomName;
		}
	};
	const createSpawn = (name) => ({
		name,
		room,
		memory: {},
		spawnCreepsIfNecessary() {
			spawnRuns++;
		},
	});
	const firstSpawn = createSpawn('Spawn1');
	const secondSpawn = createSpawn('Spawn2');

	global.Memory = {
		creeps: {},
		rooms: { W1N1: room.memory },
		spawns: { Spawn1: firstSpawn.memory, Spawn2: secondSpawn.memory },
	};
	global.Game = {
		spawns: { Spawn1: firstSpawn, Spawn2: secondSpawn },
		rooms: { W1N1: room },
		creeps: {},
		structures: {},
		gcl: { level: 1 },
		time: 1,
		cpu: { tickLimit: 500, limit: 20, bucket: 1000, getUsed: () => 0 },
		map: { describeExits: () => ({}) },
	};

	const main = require('../src/main');
	main.loop();

	assert.equal(mineralSearches, 1);
	assert.equal(spawnRuns, 2);
	assert.deepEqual(room.memory.mineral, {
		id: 'mineral-1',
		mineralType: RESOURCE_ZYNTHIUM,
		density: 4,
		harvestPositions: 8,
		x: 12,
		y: 34,
	});
});
