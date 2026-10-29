const args = process.argv.slice(2);

const roomPattern = /^[WE][1-9][NS][1-9]$/i;
const idPattern = /^[0-9a-f]+$/i;

function usage() {
	console.error('Usage:');
	console.error(
		'  node server-scripts/structure-modify-hits.mjs <room> <structure-type> <hits>',
	);
	console.error(
		'  node server-scripts/structure-modify-hits.mjs <structure-id> <hits>',
	);
	console.error('Examples:');
	console.error(
		'  node server-scripts/structure-modify-hits.mjs W1N1 rampart 1000000',
	);
	console.error(
		'  node server-scripts/structure-modify-hits.mjs acc164a51cbfb59 1000000',
	);
}

function parseHits(text) {
	if (text === undefined || !/^\d+$/.test(text)) {
		return null;
	}

	const hits = Number(text);
	return Number.isSafeInteger(hits) ? hits : null;
}

let selector;
let hits;

if (args.length === 3 && roomPattern.test(args[0])) {
	const [room, structureType, hitsText] = args;
	hits = parseHits(hitsText);

	if (!structureType || hits === null) {
		usage();
		process.exit(1);
	}

	selector = {
		type: structureType,
		room: room.toUpperCase(),
	};
} else if (args.length === 2 && idPattern.test(args[0])) {
	const [id, hitsText] = args;
	hits = parseHits(hitsText);

	if (hits === null) {
		usage();
		process.exit(1);
	}

	selector = { _id: id };
} else {
	usage();
	process.exit(1);
}

console.log(
	`storage.db['rooms.objects'].update(${JSON.stringify(selector)}, { $set: { hits: ${hits} } })`,
);
