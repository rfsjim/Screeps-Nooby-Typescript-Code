'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { installScreepsGlobals } = require('./helpers/screeps');

installScreepsGlobals();

const targetCapabilities = require('../src/helper/targetCapabilities');

function creepWithBody(body) {
	return {
		body,
		getActiveBodyparts(type) {
			return this.body.filter(
				(part) => part.type === type && part.hits > 0,
			).length;
		},
	};
}

test('hasCarry returns false for a creep with no CARRY parts', () => {
	const creep = creepWithBody([
		{ type: WORK, hits: 100 },
		{ type: MOVE, hits: 100 },
	]);

	assert.equal(targetCapabilities.hasCarry(creep), false);
});

test('hasWork returns false when all WORK parts are destroyed', () => {
	const creep = creepWithBody([
		{ type: WORK, hits: 0 },
		{ type: WORK, hits: 0 },
		{ type: CARRY, hits: 100 },
	]);

	assert.equal(targetCapabilities.hasWork(creep), false);
});
