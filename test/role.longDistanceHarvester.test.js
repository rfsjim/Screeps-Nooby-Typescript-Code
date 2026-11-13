'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { installScreepsGlobals } = require('./helpers/screeps');

installScreepsGlobals();

const roleLongDistanceHarvester = require('../src/role/role.longDistanceHarvester');

function createDeliveryStructure({
	id = 'delivery-1',
	structureType = STRUCTURE_EXTENSION,
	energy = 0,
	capacity = 1000,
} = {}) {
	return {
		id,
		structureType,
		store: {
			[RESOURCE_ENERGY]: energy,
			getCapacity() {
				return capacity;
			},
		},
	};
}

function createLongDistanceHarvesterScenario({
	energy = 0,
	capacity = 100,
	harvestResult = OK,
	home = 'W1N1',
	nearSource = false,
	roomName = home,
	sourceIndex = 0,
	target = 'W2N2',
	transferResult = OK,
	working = false,
} = {}) {
	const source = { id: 'source-1' };
	const homeSpawn = { id: 'spawn-1', structureType: STRUCTURE_SPAWN };
	const exitTarget = { id: 'exit-target' };
	const state = {
		deliveryStructure: null,
		harvestResult,
		nearHomeSpawn: false,
		nearSource,
		storage: undefined,
		transferResult,
	};
	const calls = {
		findExitTo: [],
		harvest: [],
		moveTo: [],
		transfer: [],
	};
	const store = {
		[RESOURCE_ENERGY]: energy,
		getCapacity() {
			return capacity;
		},
	};
	const creep = {
		name: 'longDistanceHarvester1',
		body: [
			{ type: WORK },
			{ type: WORK },
			{ type: CARRY },
			{ type: CARRY },
			{ type: MOVE },
			{ type: MOVE },
			{ type: MOVE },
			{ type: MOVE },
		],
		memory: {
			role: 'longDistanceHarvester',
			home,
			target,
			sourceIndex,
			working,
		},
		store,
		pos: {
			findClosestByPath(type, options = {}) {
				const structure = state.deliveryStructure;
				if (
					type === FIND_MY_STRUCTURES &&
					structure &&
					(!options.filter || options.filter(structure))
				) {
					return structure;
				}
				return null;
			},
			findClosestByRange() {
				return exitTarget;
			},
			isNearTo(object) {
				if (object === source) {
					return state.nearSource;
				}
				if (object === homeSpawn) {
					return state.nearHomeSpawn;
				}
				return false;
			},
		},
		harvest(object) {
			calls.harvest.push(object);
			return state.harvestResult;
		},
		moveTo(object, options) {
			calls.moveTo.push({ object, options });
			return OK;
		},
		transfer(object, resourceType) {
			calls.transfer.push({ object, resourceType });
			return state.transferResult;
		},
	};

	creep.room = {
		name: roomName,
		get storage() {
			return state.storage;
		},
		find(type) {
			if (type === FIND_SOURCES) {
				return [source];
			}
			if (type === FIND_MY_SPAWNS) {
				return [homeSpawn];
			}
			return [];
		},
		findExitTo(room) {
			calls.findExitTo.push(room);
			return ['exit'];
		},
	};

	global.Game = { time: 1 };
	global.Memory = {};

	return {
		calls,
		creep,
		exitTarget,
		homeSpawn,
		source,
		state,
	};
}

function completedTripMetric(overrides = {}) {
	return {
		sequence: 1,
		departedAt: 10,
		arrivedSourceAt: 20,
		fullAt: 30,
		arrivedDeliveryAt: undefined,
		unloadedAt: undefined,
		home: 'W1N1',
		target: 'W2N2',
		sourceIndex: 0,
		sourceId: 'source-1',
		deliveryId: undefined,
		deliveryType: undefined,
		carriedEnergy: 100,
		deliveredEnergy: 0,
		...overrides,
	};
}

test('an outbound harvester begins a trip and moves toward its target room', () => {
	const { calls, creep, exitTarget } = createLongDistanceHarvesterScenario();
	Game.time = 100;

	roleLongDistanceHarvester.run(creep);

	assert.equal(creep.memory.tripSequence, 1);
	assert.equal(creep.memory.tripMetric.sequence, 1);
	assert.equal(creep.memory.tripMetric.departedAt, 100);
	assert.deepEqual(calls.findExitTo, ['W2N2']);
	assert.deepEqual(calls.moveTo, [
		{ object: exitTarget, options: undefined },
	]);
});

test('a harvester in the target room moves to its assigned source', () => {
	const { calls, creep, source } = createLongDistanceHarvesterScenario({
		harvestResult: ERR_NOT_IN_RANGE,
		roomName: 'W2N2',
	});

	roleLongDistanceHarvester.run(creep);

	assert.deepEqual(calls.harvest, [source]);
	assert.deepEqual(calls.moveTo, [{ object: source, options: undefined }]);
	assert.equal(creep.memory.tripMetric.arrivedSourceAt, undefined);
});

test('source arrival is recorded only when adjacent to the assigned source', () => {
	const { calls, creep, source } = createLongDistanceHarvesterScenario({
		nearSource: true,
		roomName: 'W2N2',
	});
	Game.time = 25;

	roleLongDistanceHarvester.run(creep);

	assert.deepEqual(calls.harvest, [source]);
	assert.equal(creep.memory.tripMetric.arrivedSourceAt, 25);
	assert.equal(creep.memory.tripMetric.sourceId, source.id);
	assert.deepEqual(calls.moveTo, []);
});

test('a full harvester records the load and begins its loaded return', () => {
	const { calls, creep, exitTarget } = createLongDistanceHarvesterScenario({
		energy: 100,
		capacity: 100,
		roomName: 'W2N2',
	});
	creep.memory.tripMetric = completedTripMetric({
		fullAt: undefined,
		carriedEnergy: undefined,
	});
	creep.memory.tripSequence = 1;
	Game.time = 30;

	roleLongDistanceHarvester.run(creep);

	assert.equal(creep.memory.working, true);
	assert.equal(creep.memory.tripMetric.fullAt, 30);
	assert.equal(creep.memory.tripMetric.carriedEnergy, 100);
	assert.deepEqual(calls.findExitTo, ['W1N1']);
	assert.deepEqual(calls.moveTo, [
		{ object: exitTarget, options: undefined },
	]);
});

test('a loaded harvester moves toward a home delivery structure when out of range', () => {
	const delivery = createDeliveryStructure();
	const { calls, creep, state } = createLongDistanceHarvesterScenario({
		energy: 100,
		working: true,
		transferResult: ERR_NOT_IN_RANGE,
	});
	creep.memory.tripMetric = completedTripMetric();
	creep.memory.tripSequence = 1;
	state.deliveryStructure = delivery;

	roleLongDistanceHarvester.run(creep);

	assert.deepEqual(calls.transfer, [
		{ object: delivery, resourceType: RESOURCE_ENERGY },
	]);
	assert.deepEqual(calls.moveTo, [{ object: delivery, options: undefined }]);
	assert.equal(creep.memory.tripMetric.arrivedDeliveryAt, undefined);
});

test('a loaded harvester falls back to storage when energy structures are full', () => {
	const storage = createDeliveryStructure({
		id: 'storage-1',
		structureType: STRUCTURE_STORAGE,
	});
	const { calls, creep, state } = createLongDistanceHarvesterScenario({
		energy: 100,
		working: true,
	});
	creep.memory.tripMetric = completedTripMetric();
	creep.memory.tripSequence = 1;
	state.storage = storage;

	roleLongDistanceHarvester.run(creep);

	assert.deepEqual(calls.transfer, [
		{ object: storage, resourceType: RESOURCE_ENERGY },
	]);
});

test('a trip records first delivery, waits for empty inventory, and persists complete metrics', () => {
	const firstDelivery = createDeliveryStructure({ id: 'extension-1' });
	const secondDelivery = createDeliveryStructure({
		id: 'tower-1',
		structureType: STRUCTURE_TOWER,
	});
	const { creep, state } = createLongDistanceHarvesterScenario({
		energy: 100,
		working: true,
	});
	creep.memory.tripMetric = completedTripMetric();
	creep.memory.tripSequence = 1;

	state.deliveryStructure = firstDelivery;
	Game.time = 40;
	roleLongDistanceHarvester.run(creep);

	assert.equal(creep.memory.tripMetric.arrivedDeliveryAt, 40);
	assert.equal(creep.memory.tripMetric.deliveryId, firstDelivery.id);
	assert.equal(Memory.metrics, undefined);

	creep.store[RESOURCE_ENERGY] = 40;
	state.deliveryStructure = secondDelivery;
	Game.time = 41;
	roleLongDistanceHarvester.run(creep);

	assert.equal(creep.memory.tripMetric.arrivedDeliveryAt, 40);
	assert.equal(creep.memory.tripMetric.deliveryId, firstDelivery.id);
	assert.equal(creep.memory.tripMetric.deliveredEnergy, 60);
	assert.equal(Memory.metrics, undefined);

	creep.store[RESOURCE_ENERGY] = 0;
	Game.time = 42;
	roleLongDistanceHarvester.run(creep);

	const [record] = Memory.metrics.longDistanceHarvester.trips;
	assert.deepEqual(record, {
		creepName: 'longDistanceHarvester1',
		tripSequence: 1,
		home: 'W1N1',
		target: 'W2N2',
		sourceIndex: 0,
		sourceId: 'source-1',
		deliveryId: 'extension-1',
		deliveryType: STRUCTURE_EXTENSION,
		body: {
			work: 2,
			carry: 2,
			move: 4,
			signature: 'W2C2M4',
		},
		departedAt: 10,
		arrivedSourceAt: 20,
		fullAt: 30,
		arrivedDeliveryAt: 40,
		unloadedAt: 42,
		outboundTicks: 10,
		harvestingTicks: 10,
		returnToFirstDeliveryTicks: 10,
		unloadingTicks: 2,
		fullToEmptyTicks: 12,
		sourceToDeliveryTicks: 22,
		completeCycleTicks: 32,
		carriedEnergy: 100,
		deliveredEnergy: 100,
		tripThroughput: 3.125,
	});
	assert.equal(creep.memory.working, false);
	assert.equal(creep.memory.tripSequence, 2);
	assert.equal(creep.memory.tripMetric.sequence, 2);
	assert.equal(creep.memory.tripMetric.departedAt, 42);
});

test('an incomplete empty trip is not added to historical metrics', () => {
	const { creep } = createLongDistanceHarvesterScenario({
		energy: 0,
		working: true,
	});
	creep.memory.tripMetric = completedTripMetric({
		arrivedDeliveryAt: undefined,
	});
	creep.memory.tripSequence = 1;
	Game.time = 50;

	roleLongDistanceHarvester.run(creep);

	assert.equal(Memory.metrics, undefined);
	assert.equal(creep.memory.tripSequence, 2);
	assert.equal(creep.memory.tripMetric.sequence, 2);
});

test('historical long-distance harvester metrics retain only the newest 200 trips', () => {
	const { creep } = createLongDistanceHarvesterScenario({
		energy: 0,
		working: true,
	});
	creep.memory.tripMetric = completedTripMetric({
		arrivedDeliveryAt: 40,
		deliveryId: 'extension-1',
		deliveryType: STRUCTURE_EXTENSION,
	});
	creep.memory.tripSequence = 1;
	Memory.metrics = {
		longDistanceHarvester: {
			trips: Array.from({ length: 200 }, (_, index) => ({ index })),
		},
	};
	Game.time = 42;

	roleLongDistanceHarvester.run(creep);

	const trips = Memory.metrics.longDistanceHarvester.trips;
	assert.equal(trips.length, 200);
	assert.equal(trips[0].index, 1);
	assert.equal(trips.at(-1).creepName, 'longDistanceHarvester1');
});
