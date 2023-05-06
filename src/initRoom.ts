declare global {
    interface RoomMemory {
        roomName: string;
        roomOwner: string;
        roomStatus: string;
        exits: ExitsInformation;
        sources: Id<Source>[];
        harvesters: number;
        containers: number;
        level: number;
        phase: number;
        lastChecked: number;
    }
}

export default class initRoom {
    roomName: string;
    roomOwner: string;
    roomStatus: string;
    exits: ExitsInformation;
    sources: Id<Source>[];
    harvesters: number;
    containers: number;
    level: number;
    phase: number;
    lastChecked: number;

    constructor(roomName:string) {
        this.roomName = roomName;
        this.roomOwner = this.getRoomOwner(roomName);
        this.roomStatus = this.getRoomStatus(roomName);
        this.exits = Game.map.describeExits(roomName);
        this.sources = this.getSources(roomName);
        this.harvesters = this.getHarvesters(roomName);
        this.containers = this.getContainers(roomName);
        this.level = this.getLevel(roomName);
        this.phase = this.getPhase(roomName);
        this.lastChecked = Game.time;   
    }

    initMemory(roomName = this.roomName): void {
        Memory.rooms[roomName].roomName = roomName;
        Memory.rooms[roomName].roomOwner = this.roomOwner;
        Memory.rooms[roomName].roomStatus = this.roomStatus;
        Memory.rooms[roomName].exits = this.exits;
        Memory.rooms[roomName].sources = this.sources;
        Memory.rooms[roomName].harvesters = this.harvesters;
        Memory.rooms[roomName].containers = this.containers;
        Memory.rooms[roomName].level = this.level;
        Memory.rooms[roomName].phase = this.phase;
        Memory.rooms[roomName].lastChecked = this.lastChecked;
    }

    /**
     * 
     * @param {string} roomName - The name of the room 
     * @returns {string} The username of the room owner, None if the room isn't owned, or Neutral if there is no controller
     */
    getRoomOwner(roomName:string) {
        let owner;
        if (Game.rooms[roomName].controller) {
            if (Game.rooms[roomName].controller?.owner) {
                owner = Game.rooms[roomName].controller?.owner?.username || "None";
            } owner = "None";
        } owner = "Neutral";
        this.roomOwner = owner;
        return this.roomOwner;
    }

    /**
     * 
     * @param {string} roomName - The name of the room
     * @returns {string} The status of the room either "Mine" if user owns, "Hostile" if other user owns or has reserved room, "Reserved" if user has it reserved, "Available" if room has controller but no owner, "Neutral" if room has no controller
     */
    getRoomStatus(roomName:string) {
        let status;
        if (Game.rooms[roomName].controller) {
            if (Game.rooms[roomName].controller?.my) {
                status = "Mine";
            } else if (Game.rooms[roomName].controller?.owner?.username) {
                status = "Hostile";
            } else if (Game.rooms[roomName].controller?.reservation?.username) {
                if (Game.rooms[roomName].controller?.reservation?.username === Memory.username) {
                    status = "Reserved";
                } else status = "Hostile";
            } status = "Available";
        } status = "Neutral";
        this.roomStatus = status;
        return this.roomStatus;
    }

    getSources(roomName:string) {
        const sources = Game.rooms[roomName].find(FIND_SOURCES);
        let sourceId:Id<Source>[] = [];
        for (let source of sources) {          
            sourceId.push(source.id);
        }
        
        this.sources = sourceId
        return this.sources;
    }

    getHarvesters(roomName:string) {
        let harvesterCount = 0;
        for(let source of this.sources) {
            harvesterCount = harvesterCount + this.getFreeSpacesAroundSource(source).length;
        }
        this.harvesters = harvesterCount;
        return this.harvesters;
    }

    getContainers(roomName:string) {
        const containers = Game.rooms[roomName].find(FIND_STRUCTURES, {
            filter: { structureType: STRUCTURE_CONTAINER}
        });

        const buildingContainers = Game.rooms[roomName].find(FIND_CONSTRUCTION_SITES, {
            filter: { structureType: STRUCTURE_CONTAINER}
        });

        this.containers = containers.length + buildingContainers.length;
        return this.containers;
    }

    getLevel(roomName:string) {
        this.level = Game.rooms[roomName].controller?.level || 0; 
        return this.level;
    }

    getPhase(roomName:string) {
        this.phase = 0;
        return this.phase;
    }

    getLastChecked(roomName:string) {
        this.lastChecked = Game.time;
        return this.lastChecked;
    }

    getFreeSpacesAroundSource(sourceId:Id<Source>) {
        let source = Game.getObjectById(sourceId);
        let freeSpaces = [];
    
        if (source) {
            for (let x = (source.pos.x -1); x < (source.pos.x + 2); x++) {
                for (let y = (source.pos.y -1); y < (source.pos.y +2); y++) {
                    if ((source.pos.x === x) && (source.pos.y === y)) {continue;}
                    let terrrain = source.room.getTerrain();
                    if (terrrain.get(x,y) !== TERRAIN_MASK_WALL) {
                        freeSpaces.push([x,y]);
                    }
                }
            }
        }
    
        return freeSpaces;
    }

    getMemoryUpdates(roomName:string) {      
        Memory.rooms[roomName].roomOwner = this.getRoomOwner(roomName);
        Memory.rooms[roomName].roomStatus = this.getRoomStatus(roomName);
        Memory.rooms[roomName].containers = this.getContainers(roomName);
        Memory.rooms[roomName].level = this.getLevel(roomName);
        Memory.rooms[roomName].phase = this.getPhase(roomName);
        Memory.rooms[roomName].lastChecked = this.getLastChecked(roomName);
    }
}