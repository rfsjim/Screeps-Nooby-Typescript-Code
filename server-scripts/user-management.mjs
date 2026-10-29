const [username, property, operation, valueText, ...extra] =
  process.argv.slice(2);

const properties = new Set(["gcl", "power", "money", "cpu", "active"]);
const operations = new Set(["set", "add"]);

function usage() {
  console.error(
    "Usage: node server-scripts/user-management.mjs <username> <gcl|power|money|cpu|active> <set|add> <non-negative-integer>"
  );
  console.error("Example: node server-scripts/user-management.mjs Alice gcl set 38000000");
  console.error("Example: node server-scripts/user-management.mjs Alice money add 5000");
  console.error("Example: node server-scripts/user-management.mjs Alice active set 0");
}

const value = Number(valueText);

if (
  !username ||
  username.trim() !== username ||
  !property ||
  !properties.has(property) ||
  !operation ||
  !operations.has(operation) ||
  extra.length > 0 ||
  valueText === undefined ||
  !/^\d+$/.test(valueText) ||
  !Number.isSafeInteger(value) ||
  (property === "active" && operation !== "set")
) {
  usage();
  process.exit(1);
}

const operator = operation === "set" ? "$set" : "$inc";

console.log(
  `storage.db.users.update({ username: ${JSON.stringify(username)} }, { ${operator}: { ${JSON.stringify(property)}: ${value} } })`
);