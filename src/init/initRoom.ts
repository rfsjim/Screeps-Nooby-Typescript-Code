import { getRoomMemory, getNumberOfSourceLocations, getRoomPhase } from "managers/memoryManager";

export class roomObjectAnalyser<T extends RoomObject>
{
  constructor(public object: T)
  {
    // constructor
  }

  getCoords(): { x: number; y: number }
  {
    this.assertValid();
    const {x, y} = this.object.pos;
    return {x, y};
  }

  getFreeAdjacentPositions(): RoomPosition[]
  {
    this.assertValid();
    const terrain = Game.map.getRoomTerrain(this.object.room.name);
    const positions: RoomPosition[] = [];

    for (let dx = -1; dx <= 1; dx++)
    {
      for (let dy = -1; dy <= 1; dy++)
      {
        if (dx === 0 && dy === 0) continue; // Skip source's own tile
        
        const x = this.object.pos.x + dx;
        const y = this.object.pos.y + dy;
        
        if (terrain.get(x, y) !== TERRAIN_MASK_WALL)
        {
          positions.push(new RoomPosition(x, y, this.object.room.name));
        }
      }
    }
  return positions;
  }

  countFreeAdjacentPositions(): number
  {
    return this.getFreeAdjacentPositions().length;
  }

  isOccupied(pos: RoomPosition): boolean
  {
    this.assertValid();
    const objects = this.object.room.lookAt(pos);
    return objects.some(o => o.type === "creep" || o.type === "structure");
  }

  getUnoccupiedAdjacentPositions(): RoomPosition[]
  {
    return this.getFreeAdjacentPositions().filter(pos => !this.isOccupied(pos));
  }

  getId(): Id<_HasId> | undefined
  {
    if ("id" in this.object)
    {
      return (this.object as {id : Id<_HasId>}).id;
    }
    return undefined;
  }

  private assertValid(): asserts this is { object: T & {pos: RoomPosition, room: Room}}
  {
    if (!this.object?.room || !this.object?.pos)
    {
      throw new Error("Invalid RoomObject passed to roomObjectAnalyser");
    }
  }
}

/**
 * Initalises the Room Memory with details on sources
 * @param room 
 */
export function initRoom(room: Room): void
{
  const roomMemory = getRoomMemory(room);
  if (!roomMemory) return;

  roomMemory.phase = getRoomPhase(room);
  roomMemory.maxHarvesters = getNumberOfSourceLocations(room);
  
  const sources = room.find(FIND_SOURCES);
  if (sources.length === 0) return;

  roomMemory.sources ??= {};

  for (const source of sources)
  {
    if (!source) continue;
    const sourceAnalyser = new roomObjectAnalyser(source);
    
    const sourceID = sourceAnalyser.getId();
    const {x, y} = sourceAnalyser.getCoords();
    const numPositions = sourceAnalyser.countFreeAdjacentPositions();

    if (sourceID)
    {
      roomMemory.sources[sourceID] =
      {
        x,
        y,
        numPositions
      };
    }
  }

  const minerals = room.find(FIND_MINERALS);
  if (minerals.length ===  0) return;

  roomMemory.mineral ??= {};

  for (const mineral of minerals)
  {
    if (!mineral) continue;
    const mineralAnalyser = new roomObjectAnalyser(mineral);

    const mineralID = mineralAnalyser.getId();
    const {x, y} = mineralAnalyser.getCoords();
    const mineralType = mineral.mineralType;

    if (mineralID)
    {
      roomMemory.mineral[mineralID] =
      {
        x,
        y,
        type: mineralType
      };
    }
  }

  roomMemory.maxHarvesters = getNumberOfSourceLocations(room);
  
  const spawns = room.find(FIND_MY_SPAWNS);
  if (spawns.length === 0) return;

  roomMemory.spawns ??= {};

  for (const spawn of spawns)
  {
    if (!spawn) continue;
    const spawnAnalyser = new roomObjectAnalyser(spawn);

    const spawnId = spawnAnalyser.getId();
    const {x, y} = spawnAnalyser.getCoords();

    if (spawnId)
    {
      roomMemory.spawns[spawnId] = 
      {
        x,
        y
      };
    }
  }
}