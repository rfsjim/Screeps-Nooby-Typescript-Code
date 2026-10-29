const [operation, controllerId, levelText] = process.argv.slice(2);
const level = Number(levelText);

if (
	!['set', 'add'].includes(operation) ||
	!controllerId ||
	!Number.isSafeInteger(level) ||
	level < 0 ||
	level > 8
) {
	console.error(
		'Usage: node server-scripts/room-rcl.mjs <set|add> <controllerId> <level>',
	);
	process.exit(1);
}

const operator = operation === 'set' ? '$set' : '$inc';

console.log(
	`storage.db['rooms.objects'].update({ _id: ${JSON.stringify(controllerId)} }, { ${operator}: { level: ${level} } })`,
);
