const [room, rclText, amountText] = process.argv.slice(2);
let amount = Number(amountText);
const rcl = Number(rclText);

if (
	!room ||
	!Number.isSafeInteger(rcl) ||
	rcl < 2 ||
	rcl > 8 ||
	!Number.isSafeInteger(amount) ||
	amount < 0
) {
	console.error(
		'Usage: node server-scripts/extension-energy.mjs <room> <rcl 2-8> <amount>',
	);
	process.exit(1);
}

const extensionCapacity = {
	2: 50,
	3: 50,
	4: 50,
	5: 50,
	6: 50,
	7: 100,
	8: 200,
};

amount = Math.min(amount, extensionCapacity[rcl]);

console.log(
	`storage.db['rooms.objects'].update({ type: 'extension', room: ${JSON.stringify(room)} }, { $set: { 'store.energy': ${amount} } })`,
);
