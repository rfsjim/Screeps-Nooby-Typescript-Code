declare global {
    interface RoomMemory {
        roomName: string;
        exits: ExitsInformation;
        sources: Id<Source>[];
        harvesters: number;
        level: number;
        phase: number;
        lastChecked: number;
    }
}

const initRoom = (roomName:string) => {
    Memory.rooms[roomName].roomName = Game.rooms[roomName].name;
    Memory.rooms[roomName].exits = Game.map.describeExits(roomName);
    Memory.rooms[roomName].sources = getSources(roomName);
    Memory.rooms[roomName].harvesters = getHarvesters(roomName);
    Memory.rooms[roomName].level = getLevel(roomName);
    Memory.rooms[roomName].phase = getPhase(roomName);
    Memory.rooms[roomName].lastChecked = Game.time; 
};

const getSources = (roomName:string) => {
    let sources = Game.rooms[roomName].find(FIND_SOURCES);
    let sourceId:Id<Source>[] = [];
    for (let source of sources) {
        sourceId.push(source.id);
    }

    return sourceId;
};

const getHarvesters = (roomName:string) => {
    let harvesterCount = 0;
    for(let source of Memory.rooms[roomName].sources) {
        harvesterCount = harvesterCount + getFreeSpacesAroundSource(source).length;
    }

    return harvesterCount;
};

const getLevel = (roomName:string) => {
    return Game.rooms[roomName].controller?.level ||0;
};

const getPhase = (roomName:string) => {
    return 0;
};

const getFreeSpacesAroundSource = (sourceId:Id<Source>) => {
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
};

export default (initRoom);