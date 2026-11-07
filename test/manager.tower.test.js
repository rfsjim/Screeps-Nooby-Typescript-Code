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
	BOOSTS: {},
});

const towerManager = require('../src/manager.tower');

function position(range) {
	return { getRangeTo: () => range };
}

function tower(range, actions, energy = 1000) {
	return {
		structureType: STRUCTURE_TOWER,
		pos: position(range),
		store: {
			[RESOURCE_ENERGY]: energy,
			getCapacity: () => 1000,
		},
		heal(target) {
			actions.push(['heal', target.name]);
			return OK;
		},
		attack(target) {
			actions.push(['attack', target.name]);
			return OK;
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
