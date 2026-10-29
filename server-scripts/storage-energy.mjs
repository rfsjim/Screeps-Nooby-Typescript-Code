const [operation, room, amountText] = process.argv.slice(2);
const amount = Number(amountText);

if (
  !["set", "add"].includes(operation) ||
  !room ||
  !Number.isSafeInteger(amount) ||
  amount < 0
) {
  console.error(
    "Usage: node server-scripts/storage-energy.mjs <set|add> <room> <amount>"
  );
  process.exit(1);
}

const operator = operation === "set" ? "$set" : "$inc";

console.log(
  `storage.db['rooms.objects'].update({ type: 'storage', room: ${JSON.stringify(room)} }, { ${operator}: { 'store.energy': ${amount} } })`
);