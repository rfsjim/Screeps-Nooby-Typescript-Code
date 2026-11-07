'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { installScreepsGlobals } = require('./helpers/screeps');

installScreepsGlobals();
Object.assign(global, {
	TOWER_ENERGY_COST: 10,
	TOWER_POWER_ATTACK: 600,
	TOWER_POWER_HEAL: 400,
	TOWER_POWER_REPAIR: 800,
	TOWER_OPTIMAL_RANGE: 5,
	TOWER_FALLOFF_RANGE: 20,
	TOWER_FALLOFF: 0.75,
});

const towerManager = require('../src/manager.tower');

function position(range) {
	return {
		getRangeTo(target) {
			return typeof range === 'number' ? range : range[target.rangeKey];
		},
	};
}

function tower(range, actions, energy = 1000, options = {}) {
	return {
		name: options.name,
		structureType: STRUCTURE_TOWER,
		pos: position(range),
		store: {
			[RESOURCE_ENERGY]: energy,
			getCapacity: () => 1000,
		},
		heal(target) {
			actions.push(
				options.name
					? ['heal', target.name, options.name]
					: ['heal', target.name],
			);
			return options.healResult ?? OK;
		},
		attack(target) {
			actions.push(
				options.name
					? ['attack', target.name, options.name]
					: ['attack', target.name],
			);
			return options.attackResult ?? OK;
		},
		repair(target) {
			actions.push(['repair', target.name]);
			return OK;
		},
	};
}

function room({ towers, friendlies = [], hostiles = [], structures = [] }) {
	return {
		find(type, options = {}) {
			let found = [];
			if (type === FIND_MY_STRUCTURES) {
				found = towers;
			} else if (type === FIND_MY_CREEPS) {
				found = friendlies;
			} else if (type === FIND_HOSTILE_CREEPS) {
				found = hostiles;
			} else if (type === FIND_STRUCTURES) {
				found = structures;
			}
			return options.filter ? found.filter(options.filter) : found;
		},
	};
}

test('tower power uses optimal, linear falloff, and minimum ranges', () => {
	const target = { pos: {} };
	assert.equal(
		towerManager.getTowerPower(tower(5, []), target, TOWER_POWER_HEAL),
		400,
	);
	assert.equal(
		towerManager.getTowerPower(tower(10, []), target, TOWER_POWER_HEAL),
		300,
	);
	assert.equal(
		towerManager.getTowerPower(tower(20, []), target, TOWER_POWER_HEAL),
		100,
	);
});

test('multiple towers combine to save a defender and the remainder attacks', () => {
	const actions = [];
	const towers = [tower(5, actions), tower(5, actions), tower(5, actions)];
	const defender = {
		name: 'defender',
		pos: {},
		hits: 100,
		hitsMax: 1000,
		body: [{ type: ATTACK, hits: 100 }],
		memory: { towerManagerPreviousHits: 600 },
	};
	const hostile = {
		name: 'invader',
		pos: {},
		hits: 1000,
		body: [{ type: ATTACK, hits: 100 }],
	};

	towerManager.run(
		room({ towers, friendlies: [defender], hostiles: [hostile] }),
	);

	assert.deepEqual(actions, [
		['heal', 'defender'],
		['heal', 'defender'],
		['attack', 'invader'],
	]);
});

test('workers are not healed and low-energy towers do not repair', () => {
	const actions = [];
	const worker = {
		name: 'worker',
		pos: {},
		hits: 100,
		hitsMax: 1000,
		body: [{ type: WORK, hits: 100 }],
		memory: {},
	};
	const road = {
		name: 'road',
		pos: {},
		hits: 100,
		hitsMax: 5000,
		structureType: STRUCTURE_ROAD,
	};

	towerManager.run(
		room({
			towers: [tower(5, actions, 499)],
			friendlies: [worker],
			structures: [road],
		}),
	);
	assert.deepEqual(actions, []);
});

test('two endangered defenders both receive enough tower support to survive', () => {
	const actions = [];
	const towers = [tower(5, actions), tower(5, actions)];
	const defenders = ['alpha', 'bravo'].map((name) => ({
		name,
		pos: {},
		hits: 100,
		hitsMax: 1000,
		body: [{ type: ATTACK, hits: 100 }],
		memory: { towerManagerPreviousHits: 450 },
	}));

	towerManager.run(room({ towers, friendlies: defenders }));

	assert.deepEqual(actions, [
		['heal', 'alpha'],
		['heal', 'bravo'],
	]);
});

test('a boosted hostile healer is preferred over an unboosted equivalent', () => {
	const actions = [];
	const unboosted = {
		name: 'unboosted-healer',
		pos: {},
		hits: 1000,
		body: [{ type: HEAL, hits: 100 }],
	};
	const boosted = {
		name: 'boosted-healer',
		pos: {},
		hits: 1000,
		body: [{ type: HEAL, hits: 100, boost: 'XLHO2' }],
	};

	towerManager.run(
		room({
			towers: [tower(5, actions)],
			hostiles: [unboosted, boosted],
		}),
	);

	assert.deepEqual(actions, [['attack', 'boosted-healer']]);
});

test('an unsalvageable defender leaves all towers available to attack', () => {
	const actions = [];
	const towers = [tower(5, actions), tower(5, actions)];
	const defender = {
		name: 'unsalvageable',
		pos: {},
		hits: 100,
		hitsMax: 1000,
		body: [{ type: ATTACK, hits: 100 }],
		memory: { towerManagerPreviousHits: 1000 },
	};
	const hostile = {
		name: 'invader',
		pos: {},
		hits: 2000,
		body: [{ type: ATTACK, hits: 100 }],
	};

	towerManager.run(
		room({ towers, friendlies: [defender], hostiles: [hostile] }),
	);

	assert.deepEqual(actions, [
		['attack', 'invader'],
		['attack', 'invader'],
	]);
});

test('towers stop healing once a defender is projected to be fully restored', () => {
	const actions = [];
	const defender = {
		name: 'defender',
		pos: {},
		hits: 900,
		hitsMax: 1000,
		body: [{ type: ATTACK, hits: 100 }],
		memory: {},
	};

	towerManager.run(
		room({
			towers: [tower(5, actions), tower(5, actions)],
			friendlies: [defender],
		}),
	);

	assert.deepEqual(actions, [['heal', 'defender']]);
});

test('repairing never takes priority over an available combat action', () => {
	const actions = [];
	const hostile = {
		name: 'invader',
		pos: {},
		hits: 1000,
		body: [{ type: ATTACK, hits: 100 }],
	};
	const road = {
		name: 'road',
		pos: {},
		hits: 100,
		hitsMax: 5000,
		structureType: STRUCTURE_ROAD,
	};

	towerManager.run(
		room({
			towers: [tower(5, actions)],
			hostiles: [hostile],
			structures: [road],
		}),
	);

	assert.deepEqual(actions, [['attack', 'invader']]);
});

test('allocation preserves a constrained tower so both defenders survive', () => {
	const actions = [];
	const flexible = tower(5, actions, 1000, { name: 'flexible' });
	const constrained = tower({ alpha: 20, bravo: 5 }, actions, 1000, {
		name: 'constrained',
	});
	const alpha = {
		name: 'alpha',
		pos: { rangeKey: 'alpha' },
		hits: 100,
		hitsMax: 1000,
		body: [{ type: ATTACK, hits: 100 }],
		memory: { towerManagerPreviousHits: 450 },
	};
	const bravo = {
		name: 'bravo',
		pos: { rangeKey: 'bravo' },
		hits: 100,
		hitsMax: 1000,
		body: [{ type: ATTACK, hits: 100 }],
		memory: { towerManagerPreviousHits: 450 },
	};

	towerManager.run(
		room({ towers: [constrained, flexible], friendlies: [alpha, bravo] }),
	);

	assert.deepEqual(actions, [
		['heal', 'alpha', 'flexible'],
		['heal', 'bravo', 'constrained'],
	]);
});

/**
 * Test is deliberately using synthetic input to verify the guard
 * May become obsolete with an independent incoming-damage prediction
 */
test('nominal tower power cannot rescue beyond a defender missing hits cap', () => {
	const actions = [];
	const defender = {
		name: 'defender',
		pos: {},
		hits: 950,
		hitsMax: 1000,
		body: [{ type: ATTACK, hits: 100 }],
		memory: { towerManagerPreviousHits: 1950 },
	};
	const hostile = {
		name: 'invader',
		pos: {},
		hits: 1000,
		body: [{ type: ATTACK, hits: 100 }],
	};

	towerManager.run(
		room({
			towers: [tower(5, actions)],
			friendlies: [defender],
			hostiles: [hostile],
		}),
	);

	assert.deepEqual(actions, [['attack', 'invader']]);
});

for (const [description, error] of [
	['not enough resources', ERR_NOT_ENOUGH_RESOURCES],
	['invalid target', ERR_INVALID_TARGET],
]) {
	test(`a failed heal (${description}) leaves the tower available to attack`, () => {
		const actions = [];
		const defender = {
			name: 'defender',
			pos: {},
			hits: 100,
			hitsMax: 1000,
			body: [{ type: ATTACK, hits: 100 }],
			memory: { towerManagerPreviousHits: 450 },
		};
		const hostile = {
			name: 'invader',
			pos: {},
			hits: 1000,
			body: [{ type: ATTACK, hits: 100 }],
		};

		towerManager.run(
			room({
				towers: [tower(5, actions, 1000, { healResult: error })],
				friendlies: [defender],
				hostiles: [hostile],
			}),
		);

		assert.deepEqual(actions, [
			['heal', 'defender'],
			['attack', 'invader'],
		]);
	});
}
