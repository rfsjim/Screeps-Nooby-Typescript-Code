const [operation, controllerId, amountText] = process.argv.slice(2);
const amount = Number(amountText);

if (
  !["set", "add"].includes(operation) ||
  !controllerId ||
  !Number.isSafeInteger(amount) ||
  amount < 0
) {
  console.error(
    "Usage: node server-scripts/controller-progress.mjs <set|add> <controllerId> <amount>"
  );
  process.exit(1);
}

const operator = operation === "set" ? "$set" : "$inc";

console.log(
  `storage.db['rooms.objects'].update({ _id: ${JSON.stringify(controllerId)} }, { ${operator}: { progress: ${amount} } })`
);