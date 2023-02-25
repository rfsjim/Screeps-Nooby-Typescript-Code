export {};

declare global {
    interface RoomMemory {
        exits: ExitsInformation;
    }
    interface CreepMemory {
        role: string;
        building: boolean;
    }
}