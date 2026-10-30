'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
	createMockRoom,
	createSource,
	createSourceContainer,
	installScreepsGlobals,
} = require('./helpers/screeps');

installScreepsGlobals();

const roleMiner = require('../src/role.miner');

function createMinerScenario({
	assignedSourceId = 'source-1',
	creeps = [],
	knownObjects = {},
	onContainer = true,
	sources = [],
	structures = [],
	time = 1,
} = {}) {
	for (const source of sources) {
		source.pos.findInRange = (type, range, options = {}) => {
			if (type !== FIND_STRUCTURES || range !== 1) {
				return [];
			}

			const nearbyStructures = structures.filter((structure) =>
				source.pos.inRangeTo(structure.pos, range),
			);

			return options.filter
				? nearbyStructures.filter(options.filter)
				: nearbyStructures;
		};
	}

	const calls = {
		harvest: [],
		moveTo: [],
	};
	const creep = {
		id: 'miner-1',
		name: 'miner1',
		memory: {
			role: 'miner',
			sourceId: assignedSourceId,
		},
		pos: {
			isEqualTo(position) {
				return onContainer && position !== undefined;
			},
		},
		harvest(source) {
			calls.harvest.push(source);
			return OK;
		},
		moveTo(target) {
			calls.moveTo.push(target);
			return OK;
		},
	};

	creep.room = createMockRoom({
		creeps: [creep, ...creeps],
		sources,
		structures,
	});

	global.Game = {
		time,
		getObjectById(id) {
			return knownObjects[id] ?? null;
		},
	};
	global.Memory = {};

	return { calls, creep };
}

test('a miner on its source container harvests its assigned source', () => {
	const source = createSource();
	const container = createSourceContainer();
	const { calls, creep } = createMinerScenario({
		knownObjects: { [source.id]: source },
		sources: [source],
		structures: [container],
	});

	roleMiner.run(creep);

	assert.deepEqual(calls.harvest, [source]);
	assert.deepEqual(calls.moveTo, []);
});

test('a miner moves to its source container before harvesting', () => {
	const source = createSource();
	const container = createSourceContainer();
	const { calls, creep } = createMinerScenario({
		knownObjects: { [source.id]: source },
		onContainer: false,
		sources: [source],
		structures: [container],
	});

	roleMiner.run(creep);

	assert.deepEqual(calls.harvest, []);
	assert.deepEqual(calls.moveTo, [container]);
});

test('a miner with a missing source adopts an unassigned container source', () => {
	const replacementSource = createSource('source-2');
	const replacementContainer = createSourceContainer({
		adjacentToSourceId: replacementSource.id,
	});
	const { calls, creep } = createMinerScenario({
		assignedSourceId: 'missing-source',
		sources: [replacementSource],
		structures: [replacementContainer],
	});

	roleMiner.run(creep);

	assert.equal(creep.memory.sourceId, replacementSource.id);
	assert.deepEqual(calls.harvest, [replacementSource]);
	assert.deepEqual(calls.moveTo, []);
});

test('source reassignment skips sources assigned to other miners', () => {
	const assignedSource = createSource('source-1');
	const availableSource = createSource('source-2');
	const assignedContainer = createSourceContainer({
		adjacentToSourceId: assignedSource.id,
	});
	const availableContainer = createSourceContainer({
		adjacentToSourceId: availableSource.id,
	});
	const otherMiner = {
		id: 'miner-2',
		memory: { role: 'miner', sourceId: assignedSource.id },
	};
	const { calls, creep } = createMinerScenario({
		assignedSourceId: 'missing-source',
		creeps: [otherMiner],
		sources: [assignedSource, availableSource],
		structures: [assignedContainer, availableContainer],
	});

	roleMiner.run(creep);

	assert.equal(creep.memory.sourceId, availableSource.id);
	assert.deepEqual(calls.harvest, [availableSource]);
});

test('source reassignment skips sources without containers', () => {
	const containerlessSource = createSource('source-1');
	const availableSource = createSource('source-2');
	const availableContainer = createSourceContainer({
		adjacentToSourceId: availableSource.id,
	});
	const { calls, creep } = createMinerScenario({
		assignedSourceId: 'missing-source',
		sources: [containerlessSource, availableSource],
		structures: [availableContainer],
	});

	roleMiner.run(creep);

	assert.equal(creep.memory.sourceId, availableSource.id);
	assert.deepEqual(calls.harvest, [availableSource]);
});

test('a miner safely waits when no replacement source is suitable', () => {
	const containerlessSource = createSource();
	const { calls, creep } = createMinerScenario({
		assignedSourceId: 'missing-source',
		sources: [containerlessSource],
	});

	assert.doesNotThrow(() => roleMiner.run(creep));
	assert.equal(creep.memory.sourceId, 'missing-source');
	assert.deepEqual(calls.harvest, []);
	assert.deepEqual(calls.moveTo, []);
});

test('a miner safely waits when its assigned source container is missing', () => {
	const source = createSource();
	const { calls, creep } = createMinerScenario({
		knownObjects: { [source.id]: source },
		sources: [source],
	});

	assert.doesNotThrow(() => roleMiner.run(creep));
	assert.equal(creep.memory.sourceId, source.id);
	assert.deepEqual(calls.harvest, []);
	assert.deepEqual(calls.moveTo, []);
});

test('a miner waits when every suitable source is already assigned', () => {
	const source = createSource();
	const container = createSourceContainer();
	const otherMiner = {
		id: 'miner-2',
		memory: { role: 'miner', sourceId: source.id },
	};

	const { calls, creep } = createMinerScenario({
		assignedSourceId: 'missing-source',
		creeps: [otherMiner],
		sources: [source],
		structures: [container],
	});

	roleMiner.run(creep);

	assert.equal(creep.memory.sourceId, 'missing-source');
	assert.deepEqual(calls.harvest, []);
	assert.deepEqual(calls.moveTo, []);
});

test('successful harvest telemetry is counted directly from OK results', () => {
	const source = createSource();
	const container = createSourceContainer();
	const { creep } = createMinerScenario({
		knownObjects: { [source.id]: source },
		sources: [source],
		structures: [container],
		time: 10,
	});

	roleMiner.run(creep);
	Game.time = 11;
	roleMiner.run(creep);

	assert.equal(creep.memory.minerObservation.successfulHarvests, 2);
	assert.equal(creep.memory.lastSuccessfulHarvestAt, 11);
});

test('failed harvest actions do not increment successful harvest telemetry', () => {
	const source = createSource();
	const container = createSourceContainer();
	const { creep } = createMinerScenario({
		knownObjects: { [source.id]: source },
		sources: [source],
		structures: [container],
	});

	creep.harvest = () => ERR_NOT_ENOUGH_ENERGY;
	roleMiner.run(creep);

	assert.equal(creep.memory.minerObservation.successfulHarvests, 0);
	assert.equal(creep.memory.lastSuccessfulHarvestAt, undefined);
});

test('a completed observation records only the four requested miner measurements', () => {
	const source = createSource();
	const container = createSourceContainer({ energy: 100 });
	const { creep } = createMinerScenario({
		knownObjects: { [source.id]: source },
		sources: [source],
		structures: [container],
		time: 1,
	});

	roleMiner.run(creep);

	for (let time = 2; time <= 50; time++) {
		Game.time = time;

		if (time === 2) {
			container.store[RESOURCE_ENERGY] = 120;
		} else if (time === 3) {
			container.store[RESOURCE_ENERGY] = 105;
			creep.harvest = () => ERR_NOT_ENOUGH_ENERGY;
		}

		roleMiner.run(creep);
	}

	const [record] = Memory.metrics.miner.observations;

	assert.deepEqual(
		{
			successfulHarvests: record.successfulHarvests,
			lastSuccessfulHarvest: record.lastSuccessfulHarvest,
			containerPositiveDeltaObserved:
				record.containerPositiveDeltaObserved,
			containerNetEnergyDelta: record.containerNetEnergyDelta,
		},
		{
			successfulHarvests: 2,
			lastSuccessfulHarvest: 48,
			containerPositiveDeltaObserved: true,
			containerNetEnergyDelta: 5,
		},
	);
	assert.equal(creep.memory.minerObservation, undefined);
	assert.equal(Memory.metrics.miner.energyPerSuccessfulHarvest, 10);
	assert.equal(record.observedTicks, 50);
	assert.equal(record.outcome, 'completed');
	assert.equal(record.interruptionReason, null);
});

test('lastSuccessfulHarvest is null when the miner has never harvested successfully', () => {
	const source = createSource();
	const container = createSourceContainer();
	const { creep } = createMinerScenario({
		knownObjects: { [source.id]: source },
		sources: [source],
		structures: [container],
		time: 1,
	});

	creep.harvest = () => ERR_NOT_ENOUGH_ENERGY;

	for (let time = 1; time <= 50; time++) {
		Game.time = time;
		roleMiner.run(creep);
	}

	assert.equal(
		Memory.metrics.miner.observations[0].lastSuccessfulHarvest,
		null,
	);
});

test('a missing source records the partial window as interrupted', () => {
	const source = createSource();
	const container = createSourceContainer();
	const sources = [source];
	const knownObjects = { [source.id]: source };
	const { creep } = createMinerScenario({
		knownObjects,
		sources,
		structures: [container],
	});

	roleMiner.run(creep);
	delete knownObjects[source.id];
	sources.length = 0;
	Game.time = 2;
	roleMiner.run(creep);

	const [record] = Memory.metrics.miner.observations;

	assert.equal(record.outcome, 'interrupted');
	assert.equal(record.interruptionReason, 'sourceUnavailable');
	assert.equal(record.observedTicks, 1);
	assert.equal(record.successfulHarvests, 1);
	assert.equal(creep.memory.minerObservation, undefined);
});

test('a missing container records the partial window as interrupted', () => {
	const source = createSource();
	const container = createSourceContainer();
	const structures = [container];
	const { creep } = createMinerScenario({
		knownObjects: { [source.id]: source },
		sources: [source],
		structures,
	});

	roleMiner.run(creep);
	structures.length = 0;
	Game.time = 2;
	roleMiner.run(creep);

	const [record] = Memory.metrics.miner.observations;

	assert.equal(record.outcome, 'interrupted');
	assert.equal(record.interruptionReason, 'containerUnavailable');
	assert.equal(record.observedTicks, 1);
	assert.equal(creep.memory.minerObservation, undefined);
});

test('changing source records the old window before starting a new one', () => {
	const oldSource = createSource('source-1');
	const newSource = createSource('source-2');
	const oldContainer = createSourceContainer({
		adjacentToSourceId: oldSource.id,
	});
	const newContainer = createSourceContainer({
		adjacentToSourceId: newSource.id,
	});
	const sources = [oldSource, newSource];
	const knownObjects = { [oldSource.id]: oldSource };
	const { creep } = createMinerScenario({
		knownObjects,
		sources,
		structures: [oldContainer, newContainer],
	});

	roleMiner.run(creep);
	delete knownObjects[oldSource.id];
	sources.splice(0, 1);
	Game.time = 2;
	roleMiner.run(creep);

	const [record] = Memory.metrics.miner.observations;

	assert.equal(record.outcome, 'interrupted');
	assert.equal(record.interruptionReason, 'sourceChanged');
	assert.equal(record.sourceId, oldSource.id);
	assert.equal(creep.memory.minerObservation.sourceId, newSource.id);
	assert.equal(creep.memory.minerObservation.observedTicks, 1);
});

test('changing container records the old window before starting a new one', () => {
	const source = createSource();
	const oldContainer = createSourceContainer({ id: 'container-old' });
	const newContainer = createSourceContainer({ id: 'container-new' });
	const structures = [oldContainer];
	const { creep } = createMinerScenario({
		knownObjects: { [source.id]: source },
		sources: [source],
		structures,
	});

	roleMiner.run(creep);
	structures.splice(0, 1, newContainer);
	Game.time = 2;
	roleMiner.run(creep);

	const [record] = Memory.metrics.miner.observations;

	assert.equal(record.outcome, 'interrupted');
	assert.equal(record.interruptionReason, 'containerChanged');
	assert.equal(record.containerId, oldContainer.id);
	assert.equal(creep.memory.minerObservation.containerId, newContainer.id);
	assert.equal(creep.memory.minerObservation.observedTicks, 1);
});
