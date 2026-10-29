'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { installScreepsGlobals } = require('./helpers/screeps');

installScreepsGlobals();

test('the main loop survives when no spawn is named Spawn1', () => {
	global.Memory = { creeps: {}, rooms: {}, spawns: {} };
	global.Game = {
		spawns: {},
		rooms: {},
		creeps: {},
		structures: {},
		time: 1,
		cpu: { tickLimit: 500, limit: 20, bucket: 1000, getUsed: () => 0 },
		map: { describeExits: () => ({}) },
	};

	const main = require('../src/main');
	assert.doesNotThrow(() => main.loop());
});

test('an unknown creep role does not throw from role dispatch', () => {
	const creep = new Creep();
	creep.memory = { role: 'roleThatDoesNotExist' };

	assert.doesNotThrow(() => creep.runRole());
});
