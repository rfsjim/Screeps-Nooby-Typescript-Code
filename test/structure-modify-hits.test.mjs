import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(
	new URL('../server-scripts/structure-modify-hits.mjs', import.meta.url),
);

function runScript(...args) {
	return spawnSync(process.execPath, [scriptPath, ...args], {
		encoding: 'utf8',
	});
}

function assertRejected(...args) {
	const result = runScript(...args);

	assert.notEqual(result.status, 0);
	assert.match(result.stderr, /Usage:/);
}

test('structure modify hits tools generates an update for all structures of a type in a room', () => {
	const result = runScript('W1N1', 'rampart', '1000000');

	assert.equal(result.status, 0);
	assert.equal(
		result.stdout.trim(),
		'storage.db[\'rooms.objects\'].update({"type":"rampart","room":"W1N1"}, { $set: { hits: 1000000 } })',
	);
	assert.equal(result.stderr, '');
});

test('structure modify hits tools normalizes lowercase room names to uppercase', () => {
	const result = runScript('w1n1', 'rampart', '1000000');

	assert.equal(result.status, 0);
	assert.match(result.stdout, /"room":"W1N1"/);
});

test('structure modify hits tools generates an update for a structure ID', () => {
	const result = runScript('acc164a51cbfb59', '1000000');

	assert.equal(result.status, 0);
	assert.equal(
		result.stdout.trim(),
		'storage.db[\'rooms.objects\'].update({"_id":"acc164a51cbfb59"}, { $set: { hits: 1000000 } })',
	);
	assert.equal(result.stderr, '');
});

test('structure modify hits tools accepts uppercase hexadecimal IDs', () => {
	const result = runScript('ACC164A51CBFB59', '10');

	assert.equal(result.status, 0);
	assert.match(result.stdout, /"_id":"ACC164A51CBFB59"/);
});

test('structure modify hits tools JSON-escapes a structure type in room mode', () => {
	const result = runScript('W1N1', 'type\'with"quotes', '10');

	assert.equal(result.status, 0);
	assert.match(result.stdout, /"type":"type'with\\"quotes"/);
});

test('structure modify hits tools rejects invalid room names', () => {
	assertRejected('W0N1', 'rampart', '100');
	assertRejected('W10N1', 'rampart', '100');
	assertRejected('W1X1', 'rampart', '100');
	assertRejected('1W1N', 'rampart', '100');
});

test('structure modify hits tools rejects IDs containing non-hexadecimal characters', () => {
	assertRejected('acc164a51cbfb5g', '100');
});

test('structure modify hits tools rejects missing or extra arguments', () => {
	assertRejected();
	assertRejected('W1N1', 'rampart');
	assertRejected('acc164a51cbfb59');
	assertRejected('W1N1', 'rampart', '100', 'extra');
	assertRejected('acc164a51cbfb59', '100', 'extra');
});

test('structure modify hits tools rejects non-integer, negative, and unsafe hit values', () => {
	assertRejected('W1N1', 'rampart', '1.5');
	assertRejected('W1N1', 'rampart', '-1');
	assertRejected('W1N1', 'rampart', '9007199254740992');
	assertRejected('acc164a51cbfb59', 'abc');
});

test('structure modify hits tools accepts zero hits for fault injection', () => {
	const result = runScript('W1N1', 'road', '0');

	assert.equal(result.status, 0);
	assert.match(result.stdout, /hits: 0/);
});
