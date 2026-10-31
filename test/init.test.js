'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createStructure, installScreepsGlobals } = require('./helpers/screeps');

installScreepsGlobals();

const init = require('../src/init');

function createPhaseSource(id, adjacentStructures = []) {
	return {
		id,
		pos: {
			findInRange(type, range, options = {}) {
				if (type !== FIND_STRUCTURES || range !== 1) {
					return [];
				}

				return options.filter
					? adjacentStructures.filter(options.filter)
					: adjacentStructures;
			},
		},
	};
}

function createPhaseOneRoom({
	phase = 1,
	lastChecked = 0,
	secondSourceHasContainer = true,
} = {}) {
	const firstContainer = createStructure({
		id: 'container-1',
		structureType: STRUCTURE_CONTAINER,
	});
	const secondContainer = createStructure({
		id: 'container-2',
		structureType: STRUCTURE_CONTAINER,
	});
	const sources = [
		createPhaseSource('source-1', [firstContainer]),
		createPhaseSource(
			'source-2',
			secondSourceHasContainer ? [secondContainer] : [],
		),
	];
	const extensions = Array.from({ length: 5 }, (_, index) =>
		createStructure({
			id: `extension-${index + 1}`,
			structureType: STRUCTURE_EXTENSION,
		}),
	);
	const structures = [...extensions, firstContainer];
	if (secondSourceHasContainer) {
		structures.push(secondContainer);
	}

	return {
		name: 'W1N1',
		memory: { phase, lastChecked },
		find(type) {
			if (type === FIND_STRUCTURES) {
				return structures;
			}
			if (type === FIND_SOURCES) {
				return sources;
			}
			return [];
		},
	};
}

test('a phase-one room with required infrastructure advances after 1,001 ticks', () => {
	global.Game = { time: 1001 };
	const room = createPhaseOneRoom();

	const phase = init.determineCurrentPhaseNumber(room);

	assert.equal(phase, 2);
	assert.equal(room.memory.phase, 2);
	assert.equal(room.memory.lastChecked, 1001);
});

test('a phase-one room missing one source container remains in phase one', () => {
	global.Game = { time: 1001 };
	const room = createPhaseOneRoom({
		secondSourceHasContainer: false,
	});

	const phase = init.determineCurrentPhaseNumber(room);

	assert.equal(phase, 1);
	assert.equal(room.memory.phase, 1);
	assert.equal(room.memory.lastChecked, 1001);
});

test('a phase-three room remains in phase three without evaluating another goal', () => {
	global.Game = { time: 100000 };
	const room = {
		name: 'W1N1',
		memory: {
			phase: 3,
			lastChecked: 0,
		},
		find() {
			throw new Error('a terminal phase must not evaluate another goal');
		},
	};

	const phase = init.determineCurrentPhaseNumber(room);

	assert.equal(phase, 3);
	assert.deepEqual(room.memory, {
		phase: 3,
		lastChecked: 0,
	});
});

test('a room without phase memory initialises phase and lastChecked safely', () => {
	global.Game = { time: 4321 };
	const room = {
		name: 'W1N1',
		memory: {},
		find() {
			throw new Error(
				'a newly initialised room must not evaluate a goal',
			);
		},
	};

	const phase = init.determineCurrentPhaseNumber(room);

	assert.equal(phase, 1);
	assert.deepEqual(room.memory, {
		phase: 1,
		lastChecked: 4321,
	});
});

test('phase progression waits for the configured interval', () => {
	global.Game = { time: 1000 };
	const room = createPhaseOneRoom();

	const phase = init.determineCurrentPhaseNumber(room);

	assert.equal(phase, 1);
	assert.equal(room.memory.lastChecked, 0);
});

test('phase checks use elapsed ticks rather than absolute game time', () => {
	global.Game = { time: 1500 };

	const room = createPhaseOneRoom({
		lastChecked: 1000,
	});

	assert.equal(init.determineCurrentPhaseNumber(room), 1);
	assert.equal(room.memory.lastChecked, 1000);

	global.Game.time = 2001;

	assert.equal(init.determineCurrentPhaseNumber(room), 2);
	assert.equal(room.memory.lastChecked, 2001);
});
