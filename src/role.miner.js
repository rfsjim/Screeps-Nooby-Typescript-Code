const OBSERVATION_WINDOW_TICKS = 50;
const MAXIMUM_OBSERVATIONS = 200;
const ENERGY_PER_SUCCESSFUL_HARVEST = 10;

module.exports = {
	/**
	 * Run the role miner logic
	 * @param {Creep} creep
	 * @returns {void}
	 */
	run: function (creep) {
		// get source
		let source = Game.getObjectById(creep.memory.sourceId);

		if (source === null) {
			const assignedSourceIds = creep.room
				.find(FIND_MY_CREEPS)
				.filter(
					(other) =>
						other.id !== creep.id &&
						other.memory.role === 'miner' &&
						other.memory.sourceId,
				)
				.map((other) => other.memory.sourceId);

			source = creep.room.find(FIND_SOURCES).find((candidate) => {
				if (assignedSourceIds.includes(candidate.id)) {
					return false;
				}

				const containers = candidate.pos.findInRange(
					FIND_STRUCTURES,
					1,
					{
						filter: (s) => s.structureType === STRUCTURE_CONTAINER,
					},
				);

				return containers.length > 0;
			});

			if (!source) {
				interruptObservation(creep, 'sourceUnavailable');
				return;
			}

			creep.memory.sourceId = source.id;
		}
		// find container next to source
		const container = source.pos.findInRange(FIND_STRUCTURES, 1, {
			filter: (s) => s.structureType === STRUCTURE_CONTAINER,
		})[0];

		if (!container) {
			interruptObservation(creep, 'containerUnavailable');
			return;
		}

		const observation = getOrBeginObservation(creep, source, container);

		observeContainerEnergy(container, observation);

		// if creep is on top of the container
		if (creep.pos.isEqualTo(container.pos)) {
			// harvest source
			const harvestResult = creep.harvest(source);

			if (harvestResult === OK) {
				observation.successfulHarvests++;
				creep.memory.lastSuccessfulHarvestAt = Game.time;
			}
		}
		// if creep is not on top of the container
		else {
			// move towards it
			creep.moveTo(container);
		}

		if (observation.observedTicks >= OBSERVATION_WINDOW_TICKS) {
			recordObservation(creep, observation, {
				outcome: 'completed',
				interruptionReason: null,
			});
		}
	},
};

function getOrBeginObservation(creep, source, container) {
	const current = creep.memory.minerObservation;

	if (
		current &&
		current.sourceId === source.id &&
		current.containerId === container.id
	) {
		return current;
	}

	if (current) {
		const interruptionReason =
			current.sourceId !== source.id
				? 'sourceChanged'
				: 'containerChanged';

		recordObservation(creep, current, {
			outcome: 'interrupted',
			interruptionReason,
		});
	}

	const containerEnergy = container.store[RESOURCE_ENERGY] ?? 0;

	creep.memory.minerObservation = {
		startedAt: Game.time,
		sourceId: source.id,
		containerId: container.id,
		observedTicks: 0,
		successfulHarvests: 0,
		containerEnergyStart: containerEnergy,
		containerEnergyPrevious: containerEnergy,
		containerPositiveDeltaObserved: false,
	};

	return creep.memory.minerObservation;
}

function observeContainerEnergy(container, observation) {
	const containerEnergy = container.store[RESOURCE_ENERGY] ?? 0;

	if (containerEnergy > observation.containerEnergyPrevious) {
		observation.containerPositiveDeltaObserved = true;
	}

	observation.containerEnergyPrevious = containerEnergy;
	observation.observedTicks++;
}

function interruptObservation(creep, interruptionReason) {
	const observation = creep.memory.minerObservation;

	if (!observation) {
		return;
	}

	recordObservation(creep, observation, {
		outcome: 'interrupted',
		interruptionReason,
	});
}

function recordObservation(
	creep,
	observation,
	{ outcome, interruptionReason },
) {
	Memory.metrics ??= {};
	Memory.metrics.miner ??= {};
	Memory.metrics.miner.energyPerSuccessfulHarvest ??=
		ENERGY_PER_SUCCESSFUL_HARVEST;
	Memory.metrics.miner.observations ??= [];

	const lastSuccessfulHarvestAt = creep.memory.lastSuccessfulHarvestAt;
	const record = {
		creepName: creep.name,
		roomName: creep.room.name,
		sourceId: observation.sourceId,
		containerId: observation.containerId,
		startedAt: observation.startedAt,
		endedAt: Game.time,
		observedTicks: observation.observedTicks,
		outcome,
		interruptionReason,
		successfulHarvests: observation.successfulHarvests,
		lastSuccessfulHarvest:
			lastSuccessfulHarvestAt === undefined
				? null
				: Game.time - lastSuccessfulHarvestAt,
		containerPositiveDeltaObserved:
			observation.containerPositiveDeltaObserved,
		containerNetEnergyDelta:
			observation.containerEnergyPrevious -
			observation.containerEnergyStart,
	};

	const observations = Memory.metrics.miner.observations;

	observations.push(record);

	if (observations.length > MAXIMUM_OBSERVATIONS) {
		observations.splice(0, observations.length - MAXIMUM_OBSERVATIONS);
	}

	delete creep.memory.minerObservation;
}
