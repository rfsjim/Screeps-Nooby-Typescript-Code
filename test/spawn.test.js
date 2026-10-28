'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const STRUCTURE_HITS = 5000;

function installScreepsGlobals() {
	const constants = {
		OK: 0,
		ERR_NOT_ENOUGH_ENERGY: -6,
		ERR_BUSY: -4,
		FIND_EXIT_TOP: 1,
		FIND_EXIT_RIGHT: 3,
		FIND_EXIT_BOTTOM: 5,
		FIND_EXIT_LEFT: 7,
		FIND_MY_CREEPS: 101,
		FIND_MY_STRUCTURES: 102,
		FIND_HOSTILE_CREEPS: 103,
		FIND_STRUCTURES: 104,
		FIND_SOURCES: 105,
		FIND_SOURCES_ACTIVE: 106,
		FIND_CONSTRUCTION_SITES: 107,
		FIND_DROPPED_RESOURCES: 108,
		FIND_TOMBSTONES: 109,
		FIND_RUINS: 110,
		FIND_MINERALS: 111,
		LOOK_SOURCES: 'source',
		RESOURCE_ENERGY: 'energy',
		RESOURCE_HYDROGEN: 'H',
		STRUCTURE_SPAWN: 'spawn',
		STRUCTURE_EXTENSION: 'extension',
		STRUCTURE_TOWER: 'tower',
		STRUCTURE_CONTAINER: 'container',
		STRUCTURE_STORAGE: 'storage',
		STRUCTURE_WALL: 'constructedWall',
		STRUCTURE_RAMPART: 'rampart',
		STRUCTURE_EXTRACTOR: 'extractor',
		STRUCTURE_TERMINAL: 'terminal',
		ORDER_BUY: 'buy',
		WORK: 'work',
		CARRY: 'carry',
		MOVE: 'move',
		CLAIM: 'claim',
		ATTACK: 'attack',
		RANGED_ATTACK: 'ranged_attack',
		HEAL: 'heal',
		CONTAINER_HITS: 250000,
	};

	Object.assign(global, constants);
	global.BODYPART_COST = { work: 100, carry: 50, move: 50, claim: 600 };
	global.RAMPART_HITS_MAX = { 2: 300000 };

	global._ = {
		filter(collection, predicate) {
			return Object.values(collection).filter(predicate);
		},
		some(collection, predicate) {
			return Object.values(collection).some(predicate);
		},
		sum(collection, predicate) {
			const values = Object.values(collection || {});
			return predicate
				? values.reduce(
						(total, value) => total + Number(predicate(value) || 0),
						0,
					)
				: values.reduce(
						(total, value) => total + Number(value || 0),
						0,
					);
		},
		isString(value) {
			return typeof value === 'string';
		},
		max(values) {
			return Math.max(...values);
		},
	};

	global.Creep = class Creep {};
	global.StructureSpawn = class StructureSpawn {};
	global.StructureTower = class StructureTower {};
	global.StructureTerminal = class StructureTerminal {};
}

installScreepsGlobals();

// Load the unchanged production prototypes after installing the Screeps API shim.
require('../src/prototype.creep');
require('../src/prototype.spawn');

function createMockRoom({
	creeps = [],
	sources = [],
	structures = [],
	constructionSites = [],
	controller = {
		my: true,
		level: 1,
	},
	energy,
	energyCapacity = energy,
}) {
	const storage = structures.find(
		(structure) => structure.structureType === STRUCTURE_STORAGE,
	);
	const terminal = structures.find(
		(structure) => structure.structureType === STRUCTURE_TERMINAL,
	);
	return {
		name: 'W1N1',
		energyAvailable: energy,
		energyCapacityAvailable: energyCapacity,
		controller,
		storage,
		terminal,

		find(type, options = {}) {
			let results = [];
			if (type === FIND_MY_CREEPS) {
				results = creeps;
			}
			if (type === FIND_SOURCES) {
				results = sources;
			}
			if (type === FIND_STRUCTURES) {
				results = structures;
			}
			if (type === FIND_MY_STRUCTURES) {
				results = structures.filter(
					(structure) => structure.my !== false,
				);
			}
			if (type === FIND_CONSTRUCTION_SITES) {
				results = constructionSites;
			}
			return options.filter ? results.filter(options.filter) : results;
		},
	};
}

function createSpawnScenario({
	room,
	minCreeps = {},
	spawnResults = {},
	game = {},
}) {
	const spawnAttempts = [];
	const spawn = new StructureSpawn();
	spawn.name = 'Spawn1';
	spawn.my = true;
	spawn.spawning = null;
	spawn.room = room;
	spawn.memory = {
		minCreeps: {
			harvester: 0,
			lorry: 0,
			miner: 0,
			claimer: 0,
			upgrader: 0,
			repairer: 0,
			builder: 0,
			wallRepairer: 0,
			extractor: 0,
			...minCreeps,
		},
		minLongDistanceHarvesters: {},
	};
	spawn.spawnCreep = (body, name, options) => {
		spawnAttempts.push({
			body,
			name,
			memory: options.memory,
			role: options.memory.role,
		});
		return spawnResults[options.memory.role] ?? OK;
	};
	global.Game = {
		creeps: {},
		rooms: {},
		gcl: {
			level: 1,
			progress: 0,
			progressTotal: 1000000,
		},
		time: 42,
		...game,
	};

	return { spawn, spawnAttempts };
}

function createRecoveryScenario({
	creeps = [],
	energy,
	containerEnergy = 0,
	spawnResults = {},
}) {
	const structures = [
		{
			structureType: STRUCTURE_CONTAINER,
			store: { [RESOURCE_ENERGY]: containerEnergy },
		},
		{
			structureType: STRUCTURE_EXTENSION,
			store: { [RESOURCE_ENERGY]: 1000 },
		},
	];

	return createSpawnScenario({
		room: createMockRoom({ creeps, structures, energy }),
		spawnResults,
	});
}

function createSource(id = 'source-1') {
	return {
		id,
		pos: {
			inRangeTo(position, range) {
				return position.sourceId === id && range === 1;
			},
		},
	};
}

function createSourceContainer({
	adjacentToSourceId = 'source-1',
	energy = 0,
	hits = CONTAINER_HITS,
	hitsMax = CONTAINER_HITS,
} = {}) {
	return {
		structureType: STRUCTURE_CONTAINER,
		pos: { sourceId: adjacentToSourceId },
		store: { [RESOURCE_ENERGY]: energy },
		hitsMax,
		hits,
	};
}

function createStructure({
	id = 'structure-1',
	hits = STRUCTURE_HITS,
	hitsMax = STRUCTURE_HITS,
	structureType,
	my = true,
	store = {},
} = {}) {
	return {
		id,
		my,
		structureType: structureType,
		hits,
		hitsMax,
		store,
	};
}

function createConstructionSite(id = 'construction-site-1', progress = 0) {
	return {
		id,
		my: true,
		structureType: STRUCTURE_CONTAINER,
		progress,
		progressTotal: 5000,
	};
}

function createProductiveCreeps() {
	return [
		{ memory: { role: 'harvester' } },
		{ memory: { role: 'lorry' } },
		{
			memory: {
				role: 'miner',
				sourceId: 'source-1',
			},
		},
	];
}

function createGrowingRoomScenario({
	creeps = [{ memory: { role: 'harvester' } }, { memory: { role: 'lorry' } }],
	sources = [createSource()],
	structures = [createSourceContainer()],
	constructionSites = [],
	controller = {
		my: true,
		level: 1,
	},
	energy = 600,
	energyCapacity = energy,
	minCreeps = {},
	spawnResults = {},
} = {}) {
	return createSpawnScenario({
		room: createMockRoom({
			creeps,
			sources,
			structures,
			constructionSites,
			controller,
			energy,
			energyCapacity,
		}),
		minCreeps,
		spawnResults,
	});
}

const recoveryCases = [
	{
		name: 'no creeps with 200 spawn energy and no reserves spawns a harvester',
		energy: 200,
		expectedRoles: ['harvester'],
	},
	{
		name: 'no creeps with 800 spawn energy and no reserves spawns a harvester',
		energy: 800,
		expectedRoles: ['harvester'],
	},
	{
		name: 'no transport with 200 spawn energy and 1,000 container energy spawns a lorry',
		energy: 200,
		containerEnergy: 1000,
		expectedRoles: ['lorry'],
	},
	{
		name: 'no transport with 100 spawn energy and 1,000 container energy waits',
		energy: 100,
		containerEnergy: 1000,
		expectedRoles: [],
	},
	{
		name: 'a lorry with no miner or harvester and empty containers spawns a harvester',
		energy: 200,
		creeps: [{ memory: { role: 'lorry' } }],
		expectedRoles: ['harvester'],
	},
];

for (const scenario of recoveryCases) {
	test(scenario.name, () => {
		const { spawn, spawnAttempts } = createRecoveryScenario(scenario);

		spawn.spawnCreepsIfNecessary();

		assert.deepEqual(
			spawnAttempts.map((attempt) => attempt.role),
			scenario.expectedRoles,
		);
	});
}

test('a miner with recoverable container energy spawns a lorry before priority two', () => {
	const { spawn, spawnAttempts } = createRecoveryScenario({
		energy: 200,
		containerEnergy: 1000,
		creeps: [{ memory: { role: 'miner' } }],
	});
	spawn.memory.minCreeps.upgrader = 1;

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		['lorry'],
		'a successful recovery spawn should prevent priority-two spawning in the same operation',
	);
});

test('a lorry energy failure falls back to a harvester', () => {
	const { spawn, spawnAttempts } = createRecoveryScenario({
		energy: 200,
		containerEnergy: 1000,
		spawnResults: {
			lorry: ERR_NOT_ENOUGH_ENERGY,
			harvester: OK,
		},
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		['lorry', 'harvester'],
	);
});

test('a busy lorry attempt stops the recovery pipeline', () => {
	const { spawn, spawnAttempts } = createRecoveryScenario({
		energy: 200,
		containerEnergy: 1000,
		spawnResults: { lorry: ERR_BUSY },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		['lorry'],
	);
});

test('a miner and lorry exit the recovery gate', () => {
	const { spawn, spawnAttempts } = createRecoveryScenario({
		energy: 300,
		creeps: [{ memory: { role: 'miner' } }, { memory: { role: 'lorry' } }],
	});
	spawn.memory.minCreeps.upgrader = 1;

	spawn.spawnCreepsIfNecessary();

	assert.equal(
		spawnAttempts[0]?.role,
		'upgrader',
		'legacy priority-two processing should be reachable after recovery is satisfied',
	);
});

test('a growing room without a source container does not spawn a miner', () => {
	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		structures: [],
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(spawnAttempts, []);
});

test('a growing room does not spawn a miner for an already assigned source', () => {
	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: [
			{ memory: { role: 'harvester' } },
			{ memory: { role: 'lorry' } },
			{ memory: { role: 'miner', sourceId: 'source-1' } },
		],
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(spawnAttempts, []);
});

test('a growing room waits when it cannot afford a miner', () => {
	const { spawn, spawnAttempts } = createGrowingRoomScenario({ energy: 549 });

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(spawnAttempts, []);
});

test('an unaffordable miner reserves energy from optional roles', () => {
	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		energy: 549,
		minCreeps: { upgrader: 1 },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(spawnAttempts, []);
});

test('a busy miner attempt stops growing-room spawning', () => {
	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		spawnResults: { miner: ERR_BUSY },
		minCreeps: { upgrader: 1 },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		['miner'],
	);
});

test('a growing room spawns a miner for an unassigned source with a container', () => {
	const { spawn, spawnAttempts } = createGrowingRoomScenario();

	spawn.spawnCreepsIfNecessary();

	assert.equal(spawnAttempts.length, 1);
	assert.equal(spawnAttempts[0].role, 'miner');
	assert.equal(spawnAttempts[0].memory.sourceId, 'source-1');
	assert.deepEqual(spawnAttempts[0].body, [
		WORK,
		WORK,
		WORK,
		WORK,
		WORK,
		MOVE,
	]);
});

test('a builder spawns when there is a construction site', () => {
	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		constructionSites: [createConstructionSite()],
		minCreeps: { builder: 1 },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		['builder'],
	);
});

test('a builder does not spawn when there is no construction site', () => {
	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		constructionSites: [],
		minCreeps: { builder: 1 },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		[],
	);
});

test("a builder does not spawn for another player's construction site", () => {
	const site = createConstructionSite();
	site.my = false;

	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		constructionSites: [site],
		minCreeps: { builder: 1 },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		[],
	);
});

test('a repairer spawns when there is a damaged building', () => {
	const damagedStructure = createSourceContainer({
		hits: CONTAINER_HITS * 0.5,
	});

	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		structures: [damagedStructure],
		minCreeps: { repairer: 1 },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		['repairer'],
	);
});

test('a repairer does not spawn when there are no damaged buildings', () => {
	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		structures: [createSourceContainer()],
		minCreeps: { repairer: 1 },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		[],
	);
});

test('a repairer does not spawn to repair a wall', () => {
	const damagedWall = createStructure({
		structureType: STRUCTURE_WALL,
		hits: STRUCTURE_HITS * 0.01,
	});

	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		structures: [damagedWall],
		minCreeps: { repairer: 1 },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		[],
	);
});

test('a repairer does not spawn to repair a rampart', () => {
	const damagedRampart = createStructure({
		structureType: STRUCTURE_RAMPART,
		hits: STRUCTURE_HITS * 0.000000000000001,
	});

	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		structures: [damagedRampart],
		minCreeps: { repairer: 1 },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		[],
	);
});

test('a wall repairer spawns when wall is damaged below 50% threshold', () => {
	const damagedWall = createStructure({
		structureType: STRUCTURE_WALL,
		hits: STRUCTURE_HITS * 0.49,
	});

	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		structures: [damagedWall],
		minCreeps: { wallRepairer: 1 },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		['wallRepairer'],
	);
});

test('a wall repairer spawns when rampart is damaged below 50% threshold', () => {
	const damagedRampart = createStructure({
		structureType: STRUCTURE_RAMPART,
		hits: STRUCTURE_HITS * 0.49,
	});

	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		structures: [damagedRampart],
		minCreeps: { wallRepairer: 1 },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		['wallRepairer'],
	);
});

test('a wall repairer does not spawn when rampart is not damaged below 50% threshold', () => {
	const damagedRampart = createStructure({
		structureType: STRUCTURE_RAMPART,
		hits: STRUCTURE_HITS * 0.51,
	});

	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		structures: [damagedRampart],
		minCreeps: { wallRepairer: 1 },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		[],
	);
});

test('a wall repairer does not spawn when wall is not damaged below 50% threshold', () => {
	const damagedWall = createStructure({
		structureType: STRUCTURE_WALL,
		hits: STRUCTURE_HITS * 0.51,
	});

	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		structures: [damagedWall],
		minCreeps: { wallRepairer: 1 },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		[],
	);
});

test('a wall repairer does not spawn when there are no ramparts or walls', () => {
	const damagedTower = createStructure({
		structureType: STRUCTURE_TOWER,
		hits: STRUCTURE_HITS * 0.51,
	});

	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		structures: [damagedTower],
		minCreeps: { wallRepairer: 1 },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		[],
	);
});

test('a wall repairer does not spawn when wall is damaged at 50% threshold', () => {
	const damagedWall = createStructure({
		structureType: STRUCTURE_WALL,
		hits: STRUCTURE_HITS * 0.5,
	});

	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		structures: [damagedWall],
		minCreeps: { wallRepairer: 1 },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		[],
	);
});

test('a claimer does not spawn when all GCL claim slots are used', () => {
	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		game: {
			gcl: { level: 1 },
			rooms: {
				W1N1: {
					controller: { my: true },
				},
			},
		},
	});

	spawn.memory.claimRoom = 'W2N2';

	spawn.spawnCreepsIfNecessary();

	assert.equal(
		spawnAttempts.some((attempt) => attempt.role === 'claimer'),
		false,
	);
});

test('a claimer spawns when GCL has an available claim slot', () => {
	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		energy: 650,
		energyCapacity: 650,
		game: {
			gcl: { level: 2 },
			rooms: {
				W1N1: {
					controller: { my: true },
				},
			},
		},
	});

	spawn.memory.claimRoom = 'W2N2';

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		['claimer'],
		'a claimer should be spawned when GCL is available',
	);

	assert.equal(
		Object.hasOwn(spawn.memory, 'claimRoom'),
		false,
		'a successful claimer spawn should remove the claim order',
	);
});

test('a claimer does not spawn without a claim order', () => {
	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		energy: 1000,
		energyCapacity: 1000,
		game: {
			gcl: { level: 2 },
			rooms: {
				W1N1: {
					controller: { my: true },
				},
			},
		},
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		[],
		'a claimer should not be spawned when no claim exists',
	);
});

test('a claimer does not spawn without sufficient energy GCL has an available claim slot the claim order remains', () => {
	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		energy: 649,
		energyCapacity: 1000,
		game: {
			gcl: { level: 2 },
			rooms: {
				W1N1: {
					controller: { my: true },
				},
			},
		},
	});

	spawn.memory.claimRoom = 'W2N2';

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		[],
		'a claimer should not be spawned when energy is not available',
	);

	assert.equal(
		Object.hasOwn(spawn.memory, 'claimRoom'),
		true,
		'an unsuccessful claimer spawn should retain the claim order',
	);

	assert.equal(
		spawn.memory.claimRoom,
		'W2N2',
		'an unsuccessful claimer spawn should retain the original claim order',
	);
});

test('a busy claimer spawn attempt retains the claimer order', () => {
	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		energy: 650,
		containerEnergy: 1000,
		spawnResults: { claimer: ERR_BUSY },
	});

	spawn.memory.claimRoom = 'W2N2';

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		['claimer'],
	);

	assert.equal(
		Object.hasOwn(spawn.memory, 'claimRoom'),
		true,
		'an unsuccessful claimer spawn should retain the claim order',
	);

	assert.equal(
		spawn.memory.claimRoom,
		'W2N2',
		'an unsuccessful claimer spawn should retain the original claim order',
	);
});

test('an error in claimer spawn attempt retains the claimer order', () => {
	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		energy: 650,
		containerEnergy: 1000,
		// Force an API failure after the energy eligibility check passes.
		spawnResults: { claimer: ERR_NOT_ENOUGH_ENERGY },
	});

	spawn.memory.claimRoom = 'W2N2';

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		['claimer'],
	);

	assert.equal(
		Object.hasOwn(spawn.memory, 'claimRoom'),
		true,
		'an unsuccessful claimer spawn should retain the claim order',
	);

	assert.equal(
		spawn.memory.claimRoom,
		'W2N2',
		'an unsuccessful claimer spawn should retain the original claim order',
	);
});

test('an extractor role is not spawned before RCL6', () => {
	const extractor = createStructure({
		id: 'extractor-1',
		structureType: STRUCTURE_EXTRACTOR,
	});
	const storage = createStructure({
		id: 'storage-1',
		structureType: STRUCTURE_STORAGE,
		store: { [RESOURCE_ENERGY]: 0 },
	});
	const terminal = createStructure({
		id: 'terminal-01',
		structureType: STRUCTURE_TERMINAL,
		store: {},
	});

	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		structures: [extractor, storage, terminal],
		controller: {
			my: true,
			level: 5,
		},
		minCreeps: { extractor: 1 },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		[],
	);
});

test('an extractor role is spawned at RCL6 with required structures', () => {
	const extractor = createStructure({
		id: 'extractor-1',
		structureType: STRUCTURE_EXTRACTOR,
	});
	const storage = createStructure({
		id: 'storage-1',
		structureType: STRUCTURE_STORAGE,
		store: { [RESOURCE_ENERGY]: 0 },
	});
	const terminal = createStructure({
		id: 'terminal-01',
		structureType: STRUCTURE_TERMINAL,
		store: {},
	});

	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		structures: [extractor, storage, terminal],
		controller: {
			my: true,
			level: 6,
		},
		minCreeps: { extractor: 1 },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		['extractor'],
	);
});

test('an extractor role is not spawned without an extractor', () => {
	const storage = createStructure({
		id: 'storage-1',
		structureType: STRUCTURE_STORAGE,
		store: { [RESOURCE_ENERGY]: 0 },
	});
	const terminal = createStructure({
		id: 'terminal-01',
		structureType: STRUCTURE_TERMINAL,
		store: {},
	});

	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		structures: [storage, terminal],
		controller: {
			my: true,
			level: 6,
		},
		minCreeps: { extractor: 1 },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		[],
	);
});

test('an extractor role is not spawned without a storage', () => {
	const extractor = createStructure({
		id: 'extractor-1',
		structureType: STRUCTURE_EXTRACTOR,
	});
	const terminal = createStructure({
		id: 'terminal-01',
		structureType: STRUCTURE_TERMINAL,
		store: {},
	});

	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		structures: [extractor, terminal],
		controller: {
			my: true,
			level: 6,
		},
		minCreeps: { extractor: 1 },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		[],
	);
});

test('an extractor role is not spawned without a terminal', () => {
	const extractor = createStructure({
		id: 'extractor-1',
		structureType: STRUCTURE_EXTRACTOR,
	});
	const storage = createStructure({
		id: 'storage-1',
		structureType: STRUCTURE_STORAGE,
		store: { [RESOURCE_ENERGY]: 0 },
	});

	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		structures: [extractor, storage],
		controller: {
			my: true,
			level: 6,
		},
		minCreeps: { extractor: 1 },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		[],
	);
});

test('an extractor role is spawned at RCL7 with required structures', () => {
	const extractor = createStructure({
		id: 'extractor-1',
		structureType: STRUCTURE_EXTRACTOR,
	});
	const storage = createStructure({
		id: 'storage-1',
		structureType: STRUCTURE_STORAGE,
		store: { [RESOURCE_ENERGY]: 0 },
	});
	const terminal = createStructure({
		id: 'terminal-01',
		structureType: STRUCTURE_TERMINAL,
		store: {},
	});

	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		structures: [extractor, storage, terminal],
		controller: {
			my: true,
			level: 7,
		},
		minCreeps: { extractor: 1 },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		['extractor'],
	);
});

test('an extractor role is not spawned at RCL7 with an unowned extractor', () => {
	const extractor = createStructure({
		id: 'extractor-1',
		structureType: STRUCTURE_EXTRACTOR,
		my: false,
	});
	const storage = createStructure({
		id: 'storage-1',
		structureType: STRUCTURE_STORAGE,
		store: { [RESOURCE_ENERGY]: 0 },
	});
	const terminal = createStructure({
		id: 'terminal-01',
		structureType: STRUCTURE_TERMINAL,
		store: {},
	});

	const { spawn, spawnAttempts } = createGrowingRoomScenario({
		creeps: createProductiveCreeps(),
		structures: [extractor, storage, terminal],
		controller: {
			my: true,
			level: 7,
		},
		minCreeps: { extractor: 1 },
	});

	spawn.spawnCreepsIfNecessary();

	assert.deepEqual(
		spawnAttempts.map((attempt) => attempt.role),
		[],
	);
});

/**
 * TODO:
Verify that the extractor lookup isn't performed below RCL6.

You could use a mock room.find() that throws if asked to search for extractors at RCL5, although that may be more mocking machinery than this warrants.
 */
