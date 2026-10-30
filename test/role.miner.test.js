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
		getObjectById(id) {
			return knownObjects[id] ?? null;
		},
	};

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
