'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { installScreepsGlobals } = require('./helpers/screeps');

installScreepsGlobals();

const {
	getCoords,
	getAdjacentWalkablePositions,
} = require('../src/helper/roomPositions');

function positionKey(x, y) {
	return `${x},${y}`;
}

function createRoomObject(x, y, walls = []) {
	const wallPositions = new Set(
		walls.map(([wallX, wallY]) => positionKey(wallX, wallY)),
	);
	const room = {
		name: 'W1N1',
		getTerrain() {
			return {
				get(terrainX, terrainY) {
					return wallPositions.has(positionKey(terrainX, terrainY))
						? TERRAIN_MASK_WALL
						: 0;
				},
			};
		},
	};

	global.RoomPosition = class RoomPosition {
		constructor(positionX, positionY, roomName) {
			this.x = positionX;
			this.y = positionY;
			this.roomName = roomName;
		}
	};

	return { pos: { x, y }, room };
}

const adjacentScenarios = [
	['centre tile with all surrounding terrain walkable', 25, 25, [], 8],
	[
		'centre tile with three adjacent walls',
		25,
		25,
		[
			[24, 24],
			[25, 24],
			[26, 24],
		],
		5,
	],
	['corner with all surrounding terrain walkable', 0, 0, [], 3],
	['edge with all surrounding terrain walkable', 0, 25, [], 5],
	[
		'all adjacent terrain walls',
		25,
		25,
		[
			[24, 24],
			[25, 24],
			[26, 24],
			[24, 25],
			[26, 25],
			[24, 26],
			[25, 26],
			[26, 26],
		],
		0,
	],
];

for (const [name, x, y, walls, expectedCount] of adjacentScenarios) {
	test(`${name} returns ${expectedCount} positions`, () => {
		const roomObject = createRoomObject(x, y, walls);

		const positions = getAdjacentWalkablePositions(roomObject);

		assert.equal(positions.length, expectedCount);
		assert.equal(
			positions.some((position) => position.x === x && position.y === y),
			false,
		);
	});
}

test('invalid room object throws', () => {
	assert.throws(() => getAdjacentWalkablePositions({ pos: { x: 1, y: 1 } }), {
		message: 'Invalid RoomObject',
	});
});

test('getCoords returns the room object coordinates', () => {
	const roomObject = createRoomObject(13, 37);

	assert.deepEqual(getCoords(roomObject), { x: 13, y: 37 });
});
