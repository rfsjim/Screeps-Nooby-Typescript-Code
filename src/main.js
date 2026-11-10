//import modules
require('./prototype.creep'); // common code for all creeps
require('./prototype.spawn'); // common code for all spawns
require('./prototype.terminal'); // common code for all terminals
require('./version'); // check script version

const init = require('./init'); // game init details
const towerManager = require('./manager.tower');

module.exports.loop = function () {
	// get phase and initGame details
	const firstSpawn = Object.values(Game.spawns)[0];
	if (firstSpawn) {
		const phaseNumber = init.getCurrentPhaseNumber(firstSpawn.room);
		init.initGame(phaseNumber);
	}

	if (Game.cpu.tickLimit < 50) {
		console.log('Game CPU dangerously low ' + JSON.stringify(Game.cpu));
		return;
	}

	// check for memory entries of dead creeps by iterating over Memory.creeps
	for (const name in Memory.creeps) {
		// and checking if the creep is still alive
		if (Game.creeps[name] === undefined) {
			// if not, delete the memory entry
			delete Memory.creeps[name];
		}
	}

	// Tell the current creeps what to do - for each creeps
	for (const name in Game.creeps) {
		// run creep logic
		Game.creeps[name].runRole();
	}

	// Coordinate towers once per room so their combined power can be considered.
	const towerRooms = new Set(
		_.filter(
			Game.structures,
			(structure) => structure.structureType === STRUCTURE_TOWER,
		).map((tower) => tower.room),
	);
	for (const room of towerRooms) {
		towerManager.run(room);
	}

	// for each spawn
	for (const spawnName in Game.spawns) {
		// run spawn logic
		Game.spawns[spawnName].spawnCreepsIfNecessary();
		//console.log("Available Energy: " + Game.spawns[spawnName].room.energyAvailable + ", energy capacity: " + Game.spawns[spawnName].room.energyCapacityAvailable);

		// run terminal trades
		if (Game.spawns[spawnName].room.terminal && Game.time % 10 === 0) {
			Game.spawns[spawnName].room.terminal.findTrade();
		}
	}

	if (!Memory.SCRIPT_VERSION || Memory.SCRIPT_VERSION !== SCRIPT_VERSION) {
		Memory.SCRIPT_VERSION = SCRIPT_VERSION;
		console.log('New code updated');
	}

	if (!Memory.stats) {
		Memory.stats = {};
		Memory.stats.getUsed = Game.cpu.getUsed();
		Memory.stats.limit = Game.cpu.limit;
		Memory.stats.bucket = Game.cpu.bucket;
	}

	Memory.stats.cpu = {
		getUsed: Game.cpu.getUsed(),
		limit: Game.cpu.limit,
		bucket: Game.cpu.bucket,
	};

	// if (Game.cpu.bucket >= 10000)
	// {
	//     Game.cpu.generatePixel();
	// }
};
