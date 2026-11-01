class ResourceManager {
	/**
	 * Resource Manager
	 * @param {Room} room - The room managing resources for.
	 */
	constructor(room) {
		this.room = room;
	}

	/**
	 * Find dropped resources of a particular type.
	 * @param {ResourceConstant} resourceType - They type of resource to find
	 * @returns {Resource[]} - An array of dropped resources
	 */
	getDroppedResources(resourceType) {
		return this.room.find(FIND_DROPPED_RESOURCES, {
			filter: (resource) => resource.resourceType === resourceType,
		});
	}

	/**
	 * Find structures containing a specified resource.
	 * Searches containers, storage and terminals.
	 * @param {ResourceConstant} resourceType
	 * @returns {(StructureContainer | StructureStorage | StructureTerminal)[]}
	 */
	getStructuresWithResources(resourceType) {
		return this.room.find(FIND_STRUCTURES, {
			filter: (structure) =>
				(structure.structureType === STRUCTURE_CONTAINER ||
					structure.structureType === STRUCTURE_STORAGE ||
					structure.structureType === STRUCTURE_TERMINAL) &&
				structure.store[resourceType] > 0,
		});
	}

	/**
	 * Find tombstones containing a specified resource.
	 * @param {ResourceConstant} resourceType
	 * @returns {Tombstone[]}
	 */
	getTombstonesWithResources(resourceType) {
		return this.room.find(FIND_TOMBSTONES, {
			filter: (tombstone) => tombstone.store[resourceType] > 0,
		});
	}

	/**
	 * Find ruins containing a specified resource.
	 * @param {ResourceConstant} resourceType
	 * @returns {Ruin[]}
	 */
	getRuinsWithResources(resourceType) {
		return this.room.find(FIND_RUINS, {
			filter: (ruin) => ruin.store[resourceType] > 0,
		});
	}
}

module.exports = ResourceManager;
