'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { installScreepsGlobals } = require('./helpers/screeps');

installScreepsGlobals();

const {
	getDistanceTransform,
	drawDebugVisuals,
} = require('../src/helper/roomTerrain');

function positionKey(x, y) {
	return `${x},${y}`;
}

function installTerrainScenario(walls = []) {
	const wallPositions = new Set(walls.map(([x, y]) => positionKey(x, y)));

	global.PathFinder = {
		CostMatrix: class CostMatrix {
			constructor() {
				this.values = new Uint8Array(50 * 50);
			}

			get(x, y) {
				return this.values[y * 50 + x];
			}

			set(x, y, value) {
				this.values[y * 50 + x] = value;
			}
		},
	};
	global.Room = {
		Terrain: class Terrain {
			get(x, y) {
				return wallPositions.has(positionKey(x, y))
					? TERRAIN_MASK_WALL
					: 0;
			}
		},
	};
}

function matrixValues(matrix) {
	const values = [];
	for (let x = 0; x < 50; x++) {
		for (let y = 0; y < 50; y++) {
			values.push(matrix.get(x, y));
		}
	}
	return values;
}

test('an entirely open room has its highest values towards the centre', () => {
	installTerrainScenario();

	const costs = getDistanceTransform('W1N1');

	assert.equal(costs.get(25, 25), 24);
	assert.ok(costs.get(25, 25) > costs.get(10, 10));
	assert.ok(costs.get(10, 10) > costs.get(1, 1));
});

test('tiles adjacent to a single interior wall have distance one', () => {
	installTerrainScenario([[25, 25]]);

	const costs = getDistanceTransform('W1N1');

	for (const [x, y] of [
		[24, 24],
		[25, 24],
		[26, 24],
		[24, 25],
		[26, 25],
		[24, 26],
		[25, 26],
		[26, 26],
	]) {
		assert.equal(costs.get(x, y), 1);
	}
});

test('two adjacent walls use the distance to the nearest obstacle', () => {
	installTerrainScenario([
		[20, 20],
		[21, 20],
	]);

	const costs = getDistanceTransform('W1N1');

	assert.equal(costs.get(22, 20), 1);
	assert.equal(costs.get(23, 20), 2);
	assert.equal(costs.get(19, 20), 1);
});

test('an isolated three-by-three pocket measures distance from its enclosing walls', () => {
	const walls = [];
	for (let coordinate = 23; coordinate <= 27; coordinate++) {
		walls.push([coordinate, 23], [coordinate, 27]);
	}
	for (let coordinate = 24; coordinate <= 26; coordinate++) {
		walls.push([23, coordinate], [27, coordinate]);
	}
	installTerrainScenario(walls);

	const costs = getDistanceTransform('W1N1');

	assert.equal(costs.get(23, 25), 0);
	assert.equal(costs.get(27, 25), 0);
	assert.equal(costs.get(25, 25), 2);
	for (const [x, y] of [
		[24, 24],
		[25, 24],
		[26, 24],
		[24, 25],
		[26, 25],
		[24, 26],
		[25, 26],
		[26, 26],
	]) {
		assert.equal(costs.get(x, y), 1);
	}
});

test('room boundary tiles have distance zero', () => {
	installTerrainScenario();

	const costs = getDistanceTransform('W1N1');

	for (let coordinate = 0; coordinate < 50; coordinate++) {
		assert.equal(costs.get(coordinate, 0), 0);
		assert.equal(costs.get(coordinate, 49), 0);
		assert.equal(costs.get(0, coordinate), 0);
		assert.equal(costs.get(49, coordinate), 0);
	}
});

test('walkable interior tiles are never incorrectly initialised to zero', () => {
	installTerrainScenario();

	const costs = getDistanceTransform('W1N1');

	for (let x = 1; x < 49; x++) {
		for (let y = 1; y < 49; y++) {
			assert.ok(
				costs.get(x, y) > 0,
				`expected (${x}, ${y}) to be positive`,
			);
		}
	}
});

test('repeated calculations produce the same matrix', () => {
	installTerrainScenario([
		[12, 17],
		[30, 31],
	]);

	const first = getDistanceTransform('W1N1');
	const second = getDistanceTransform('W1N1');

	assert.deepEqual(matrixValues(first), matrixValues(second));
});

test('disabled debug visuals perform no drawing operations', () => {
	installTerrainScenario();
	global.Memory = {};
	let visualConstructions = 0;
	global.RoomVisual = class RoomVisual {
		constructor() {
			visualConstructions++;
		}
	};

	drawDebugVisuals('W1N1', getDistanceTransform('W1N1'));

	assert.equal(visualConstructions, 0);
});

test('enabled debug visuals draw values from the supplied matrix', () => {
	installTerrainScenario();
	global.Memory = { debugVisuals: { roomName: 'W1N1' } };
	const textCalls = [];
	const rectCalls = [];
	let visualRoomName;
	global.RoomVisual = class RoomVisual {
		constructor(roomName) {
			visualRoomName = roomName;
		}

		text(...args) {
			textCalls.push(args);
		}

		rect(...args) {
			rectCalls.push(args);
		}
	};
	const suppliedCosts = new PathFinder.CostMatrix();
	suppliedCosts.set(10, 10, 7);

	drawDebugVisuals('W1N1', suppliedCosts);

	assert.equal(visualRoomName, 'W1N1');
	assert.deepEqual(textCalls, [['7', 10, 10]]);
	assert.equal(rectCalls.length, 1);
	assert.deepEqual(rectCalls[0].slice(0, 4), [9.5, 9.5, 1, 1]);
});

test('debug visuals only draw for the selected room', () => {
	installTerrainScenario();
	global.Memory = { debugVisuals: { roomName: 'W2N2' } };
	let visualConstructions = 0;
	global.RoomVisual = class RoomVisual {
		constructor() {
			visualConstructions++;
		}
	};

	drawDebugVisuals('W1N1', getDistanceTransform('W1N1'));

	assert.equal(visualConstructions, 0);
});

test('an all-zero matrix produces no debug drawing operations', () => {
	installTerrainScenario();
	global.Memory = { debugVisuals: { roomName: 'W1N1' } };
	let drawingOperations = 0;
	global.RoomVisual = class RoomVisual {
		text() {
			drawingOperations++;
		}

		rect() {
			drawingOperations++;
		}
	};

	drawDebugVisuals('W1N1', new PathFinder.CostMatrix());

	assert.equal(drawingOperations, 0);
});
