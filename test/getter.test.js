'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { installScreepsGlobals } = require('./helpers/screeps');

installScreepsGlobals();

global.Source = class Source {};
global.Mineral = class Mineral {
	constructor(mineralType) {
		this.mineralType = mineralType;
	}
};
global.Deposit = class Deposit {
	constructor(depositType) {
		this.depositType = depositType;
	}
};

const getter = require('../src/helper/getter');

function installGame({
	objectsById = {},
	structures = {},
	creeps = {},
	constructionSites = {},
} = {}) {
	global.Game = {
		structures,
		creeps,
		constructionSites,
		getObjectById(id) {
			return objectsById[id] ?? null;
		},
	};
}

test('getResourceTypeFromId identifies harvestable resource types', () => {
	const objectsById = {
		source: new Source(),
		mineral: new Mineral(RESOURCE_ZYNTHIUM),
		deposit: new Deposit('mist'),
		unsupported: new StructureSpawn(),
	};
	installGame({ objectsById });

	const scenarios = [
		['source', RESOURCE_ENERGY],
		['mineral', RESOURCE_ZYNTHIUM],
		['deposit', 'mist'],
		['unknown', null],
		['unsupported', null],
	];

	for (const [id, expected] of scenarios) {
		assert.equal(getter.getResourceTypeFromId(id), expected, id);
	}
});

test('getPlayerUsername returns the owner of a player structure', () => {
	installGame({
		structures: {
			spawn: { owner: { username: 'structure-owner' } },
		},
	});

	assert.equal(getter.getPlayerUsername(), 'structure-owner');
});

test('getPlayerUsername falls back to an owned creep', () => {
	installGame({
		creeps: {
			harvester: { owner: { username: 'creep-owner' } },
		},
	});

	assert.equal(getter.getPlayerUsername(), 'creep-owner');
});

test('getPlayerUsername falls back to an owned construction site', () => {
	installGame({
		constructionSites: {
			extension: { owner: { username: 'site-owner' } },
		},
	});

	assert.equal(getter.getPlayerUsername(), 'site-owner');
});

test('getPlayerUsername returns null when there are no owned objects', () => {
	installGame();

	assert.equal(getter.getPlayerUsername(), null);
});
