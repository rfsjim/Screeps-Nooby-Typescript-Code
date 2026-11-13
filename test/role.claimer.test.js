'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { installScreepsGlobals } = require('./helpers/screeps');

installScreepsGlobals();

const roleClaimer = require('../src/role/role.claimer');

function createClaimerScenario({
	controllerAction = 'claim',
	controllerResult = OK,
	exit = FIND_EXIT_RIGHT,
	roomName = 'W1N1',
	target = 'W2N2',
} = {}) {
	const controller = { id: 'controller-1' };
	const exitPosition = { id: 'exit-position' };
	const calls = {
		claimController: [],
		findClosestByRange: [],
		findExitTo: [],
		moveTo: [],
		reserveController: [],
	};
	const creep = {
		name: 'claimer1',
		memory: { controllerAction, target },
		pos: {
			findClosestByRange(exitDirection) {
				calls.findClosestByRange.push(exitDirection);
				return exitPosition;
			},
		},
		claimController(targetController) {
			calls.claimController.push(targetController);
			return controllerResult;
		},
		reserveController(targetController) {
			calls.reserveController.push(targetController);
			return controllerResult;
		},
		moveTo(destination) {
			calls.moveTo.push(destination);
			return OK;
		},
		room: {
			name: roomName,
			controller,
			findExitTo(destination) {
				calls.findExitTo.push(destination);
				return exit;
			},
		},
	};

	return { calls, controller, creep, exitPosition };
}

function captureLogs(callback) {
	const originalLog = console.log;
	const logs = [];
	console.log = (message) => logs.push(message);
	try {
		callback();
	} finally {
		console.log = originalLog;
	}
	return logs;
}

test('invalid claimer configurations are rejected before any action', async (t) => {
	const configurations = [
		{ name: 'missing target', deleteField: 'target' },
		{ name: 'non-string target', target: 42, controllerAction: 'claim' },
		{ name: 'empty target', target: '', controllerAction: 'claim' },
		{ name: 'missing controller action', deleteField: 'controllerAction' },
		{
			name: 'unsupported controller action',
			target: 'W2N2',
			controllerAction: 'attack',
		},
	];

	for (const configuration of configurations) {
		await t.test(configuration.name, () => {
			const { calls, creep } = createClaimerScenario(configuration);
			if (configuration.deleteField) {
				delete creep.memory[configuration.deleteField];
			}
			const logs = captureLogs(() => roleClaimer.run(creep));

			assert.deepEqual(logs, [
				'[ERROR] claimer1: Invalid claimer configuration',
			]);
			assert.deepEqual(calls.findExitTo, []);
			assert.deepEqual(calls.claimController, []);
			assert.deepEqual(calls.reserveController, []);
			assert.deepEqual(calls.moveTo, []);
		});
	}
});

test('a claimer outside the target room moves toward the closest exit', () => {
	const { calls, creep, exitPosition } = createClaimerScenario();

	roleClaimer.run(creep);

	assert.deepEqual(calls.findExitTo, ['W2N2']);
	assert.deepEqual(calls.findClosestByRange, [FIND_EXIT_RIGHT]);
	assert.deepEqual(calls.moveTo, [exitPosition]);
	assert.deepEqual(calls.claimController, []);
});

test('a claimer safely stops when no route to the target room exists', () => {
	const { calls, creep } = createClaimerScenario({ exit: -2 });

	const logs = captureLogs(() => roleClaimer.run(creep));

	assert.deepEqual(logs, [
		'[ERROR] claimer1: Cannot find exit towards W2N2 (-2)',
	]);
	assert.deepEqual(calls.findExitTo, ['W2N2']);
	assert.deepEqual(calls.findClosestByRange, []);
	assert.deepEqual(calls.moveTo, []);
});

test('a claimer in the target room claims its controller', () => {
	const { calls, controller, creep } = createClaimerScenario({
		roomName: 'W2N2',
	});

	roleClaimer.run(creep);

	assert.deepEqual(calls.claimController, [controller]);
	assert.deepEqual(calls.reserveController, []);
	assert.deepEqual(calls.moveTo, []);
});

test('a reserver in the target room reserves its controller', () => {
	const { calls, controller, creep } = createClaimerScenario({
		controllerAction: 'reserve',
		roomName: 'W2N2',
	});

	roleClaimer.run(creep);

	assert.deepEqual(calls.reserveController, [controller]);
	assert.deepEqual(calls.claimController, []);
	assert.deepEqual(calls.moveTo, []);
});

test('a claimer moves toward the controller when it is out of range', () => {
	const { calls, controller, creep } = createClaimerScenario({
		controllerResult: ERR_NOT_IN_RANGE,
		roomName: 'W2N2',
	});

	roleClaimer.run(creep);

	assert.deepEqual(calls.claimController, [controller]);
	assert.deepEqual(calls.moveTo, [controller]);
});

test('a reserver moves toward the controller when out of range', () => {
	const { calls, controller, creep } = createClaimerScenario({
		controllerAction: 'reserve',
		controllerResult: ERR_NOT_IN_RANGE,
		roomName: 'W2N2',
	});

	roleClaimer.run(creep);

	assert.deepEqual(calls.reserveController, [controller]);
	assert.deepEqual(calls.claimController, []);
	assert.deepEqual(calls.moveTo, [controller]);
});
