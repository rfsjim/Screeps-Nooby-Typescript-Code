'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const task = require('../src/helper/task');

const taskTypeChecks = [
	['resource_collection', task.isResourceCollectionTask],
	['harvest', task.isHarvestTask],
	['build', task.isBuildTask],
	['upgrade', task.isUpgradeTask],
	['repair', task.isRepairTask],
	['fill', task.isFillTask],
];

for (const [expectedType, isExpectedTask] of taskTypeChecks) {
	test(`${isExpectedTask.name} returns true for type ${expectedType}`, () => {
		assert.equal(isExpectedTask({ type: expectedType }), true);
	});

	test(`${isExpectedTask.name} returns false for other task types`, () => {
		const otherTypes = taskTypeChecks
			.map(([type]) => type)
			.filter((type) => type !== expectedType);

		for (const type of otherTypes) {
			assert.equal(isExpectedTask({ type }), false, type);
		}
	});
}
