class resourceManager {
    constructor(room, energyType) {
      this.room = room;
      this.energyType = energyType;
      this.droppedResources = Game.rooms[this.room].find(FIND_DROPPED_RESOURCES);
      this.tombstoneWithResources = Game.rooms[this.room].find(FIND_TOMBSTONES, {
        filter: (s) => (s.store.getUsedCapacity() > 0)
      });
      this.resourceContainers = Game.rooms[this.room].find(FIND_STRUCTURES, {
        filter: (s) => (s.structureType == STRUCTURE_CONTAINER
                        || s.structureType == STRUCTURE_STORAGE)
                        && s.store.getUsedCapacity(this.energyType) > 0
      });
      this.foundResources = new Map();
      for (const resource of this.resourceContainers) {
        this.foundResources.set(resource.id, resource.store[this.energyType]);
      }
      for (const droppedResource of this.droppedResources) {
        this.foundResources.set(droppedResource.id, droppedResource.amount);
      }
    }

    allocateResources() {
      // creep, amount
      // get largest pile of droppedResources
      const mostResources = _.sortBy(this.droppedResources, 'amount', 'desc');
      let target = mostResources[0];
      if (target) {
        console.log("Dropped Resource: " + target);
      }

      if (target == undefined || target == null) {
        // no droppedResources get resources from a structure
        if (this.resourceContainers) {
          const biggestContainers = _.sortBy(this.resourceContainers, 'store[this.energyType]', 'desc')
          let target = biggestContainers[0];
          if (target) {
            console.log("Container: " + target);
          }
        }
      }
  }
}

module.exports = new resourceManager()
