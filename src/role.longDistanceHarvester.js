module.exports = {
	/**
	 * Run Long Distance Harvester Creep Logic
	 * @param {Creep} creep
	 */
	run: function (creep) {
		// record trip time analytics to assist with future optimisation of body parts
		if (
			creep.memory.working === false &&
			creep.memory.tripMetric === undefined
		) {
			beginTrip(creep);
		}
		// if creep is bringing energy to a structure but has no energy left
		if (
			creep.memory.working === true &&
			creep.store[RESOURCE_ENERGY] === 0
		) {
			const trip = creep.memory.tripMetric;

			if (trip) {
				trip.unloadedAt = Game.time;
				updateDeliveredEnergy(creep);
				recordCompletedTrip(creep);
			}

			// switch state
			creep.memory.working = false;
			creep.memory.tripSequence = (creep.memory.tripSequence ?? 1) + 1;
			beginTrip(creep);
		}
		// if creep is harvesting energy but is full
		else if (
			creep.memory.working === false &&
			creep.store[RESOURCE_ENERGY] ===
				creep.store.getCapacity(RESOURCE_ENERGY)
		) {
			// mark inventory full
			const trip = creep.memory.tripMetric;

			if (trip && trip.fullAt === undefined) {
				trip.fullAt = Game.time;
				trip.carriedEnergy = creep.store[RESOURCE_ENERGY];
			}
			// switch state
			creep.memory.working = true;
		}

		// if creep is supposed to transfer energy to a structure
		if (creep.memory.working === true) {
			updateDeliveredEnergy(creep);
			// if in home room
			if (creep.room.name === creep.memory.home) {
				// find closest spawn, extension or tower which is not full
				let structure = creep.pos.findClosestByPath(
					FIND_MY_STRUCTURES,
					{
						// the second argument for findClosestByPath is an object which takes
						// a property called filter which can be a function
						// we use the arrow operator to define it
						filter: (s) =>
							(s.structureType === STRUCTURE_SPAWN ||
								s.structureType === STRUCTURE_EXTENSION ||
								s.structureType === STRUCTURE_TOWER) &&
							s.store[RESOURCE_ENERGY] <
								s.store.getCapacity(RESOURCE_ENERGY),
					},
				);

				if (structure === null && creep.room.storage) {
					structure = creep.room.storage;
				}

				if (structure === null) {
					const homeSpawn = creep.room.find(FIND_MY_SPAWNS)[0];

					if (homeSpawn && !creep.pos.isNearTo(homeSpawn)) {
						creep.moveTo(homeSpawn, { range: 1 });
					}
				}

				// if we found one
				if (structure !== null) {
					const transferResult = creep.transfer(
						structure,
						RESOURCE_ENERGY,
					);

					if (transferResult === OK) {
						const trip = creep.memory.tripMetric;

						if (trip && trip.arrivedDeliveryAt === undefined) {
							trip.arrivedDeliveryAt = Game.time;
							trip.deliveryId = structure.id;
							trip.deliveryType = structure.structureType;
						}
					} else if (transferResult === ERR_NOT_IN_RANGE) {
						creep.moveTo(structure);
					}
				}
			}
			// if not in home room...
			else {
				// find exit to home room
				const exit = creep.room.findExitTo(creep.memory.home);
				// and move to exit
				creep.moveTo(creep.pos.findClosestByRange(exit));
			}
		}
		// if creep is supposed to harvest energy from source
		else {
			// if in target room
			if (creep.room.name === creep.memory.target) {
				// find source
				const source =
					creep.room.find(FIND_SOURCES)[creep.memory.sourceIndex];

				// mark arrival based on adjacency
				const trip = creep.memory.tripMetric;

				if (
					trip &&
					source &&
					creep.pos.isNearTo(source) &&
					trip.arrivedSourceAt === undefined
				) {
					trip.arrivedSourceAt = Game.time;
					trip.sourceId = source.id;
				}

				// try to harvest energy, if the source is not in range
				if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
					// move towards the source
					creep.moveTo(source);
				}
			}
			// if not in target room
			else {
				// find exit to target room
				const exit = creep.room.findExitTo(creep.memory.target);
				// move to exit
				creep.moveTo(creep.pos.findClosestByRange(exit));
			}
		}
	},
};

/**
 * Begin Trip Metrics
 * @param {Creep} creep
 */
function beginTrip(creep) {
	if (creep.memory.tripSequence === undefined) {
		creep.memory.tripSequence = 1;
	}

	creep.memory.tripMetric = {
		sequence: creep.memory.tripSequence,

		departedAt: Game.time,
		arrivedSourceAt: undefined,
		fullAt: undefined,
		arrivedDeliveryAt: undefined,
		unloadedAt: undefined,

		home: creep.memory.home,
		target: creep.memory.target,
		sourceIndex: creep.memory.sourceIndex,
		sourceId: undefined,

		deliveryId: undefined,
		deliveryType: undefined,

		carriedEnergy: undefined,
		deliveredEnergy: 0,
	};
}

/**
 * Get Creep Body Profile
 * @param {Creep} creep
 */
function getBodyProfile(creep) {
	const profile = {
		work: creep.body.filter((part) => part.type === WORK).length,
		carry: creep.body.filter((part) => part.type === CARRY).length,
		move: creep.body.filter((part) => part.type === MOVE).length,
	};

	return {
		...profile,
		signature:
			`W${profile.work}` + `C${profile.carry}` + `M${profile.move}`,
	};
}

/**
 * Update Delivered Energy Track
 * @param {Creep} creep
 */
function updateDeliveredEnergy(creep) {
	const trip = creep.memory.tripMetric;

	if (!trip || trip.carriedEnergy === undefined) {
		return;
	}

	trip.deliveredEnergy = trip.carriedEnergy - creep.store[RESOURCE_ENERGY];
}

/**
 * Record Completed Trip
 * @param {Creep} creep
 */
function recordCompletedTrip(creep) {
	const trip = creep.memory.tripMetric;

	if (
		!trip ||
		trip.arrivedSourceAt === undefined ||
		trip.fullAt === undefined ||
		trip.arrivedDeliveryAt === undefined ||
		trip.unloadedAt === undefined
	) {
		return;
	}

	Memory.metrics ??= {};
	Memory.metrics.longDistanceHarvester ??= {
		trips: [],
	};

	const record = {
		creepName: creep.name,
		tripSequence: trip.sequence,

		home: trip.home,
		target: trip.target,
		sourceIndex: trip.sourceIndex,
		sourceId: trip.sourceId,

		deliveryId: trip.deliveryId,
		deliveryType: trip.deliveryType,

		body: getBodyProfile(creep),

		departedAt: trip.departedAt,
		arrivedSourceAt: trip.arrivedSourceAt,
		fullAt: trip.fullAt,
		arrivedDeliveryAt: trip.arrivedDeliveryAt,
		unloadedAt: trip.unloadedAt,

		outboundTicks: trip.arrivedSourceAt - trip.departedAt,

		harvestingTicks: trip.fullAt - trip.arrivedSourceAt,

		returnToFirstDeliveryTicks: trip.arrivedDeliveryAt - trip.fullAt,

		unloadingTicks: trip.unloadedAt - trip.arrivedDeliveryAt,

		fullToEmptyTicks: trip.unloadedAt - trip.fullAt,

		sourceToDeliveryTicks: trip.unloadedAt - trip.arrivedSourceAt,

		completeCycleTicks: trip.unloadedAt - trip.departedAt,

		carriedEnergy: trip.carriedEnergy,
		deliveredEnergy: trip.deliveredEnergy,

		tripThroughput:
			trip.deliveredEnergy / (trip.unloadedAt - trip.departedAt),
	};

	const trips = Memory.metrics.longDistanceHarvester.trips;

	trips.push(record);

	const maximumRecords = 200;

	if (trips.length > maximumRecords) {
		trips.splice(0, trips.length - maximumRecords);
	}
}
