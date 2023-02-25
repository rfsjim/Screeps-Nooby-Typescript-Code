export {};

declare global {
    interface RoomMemory {
        exits: ExitsInformation;
        name: string;
    }
    interface CreepMemory {
        role: string;
        building?: boolean;  // state building optional depending on creep type
        upgrading?: boolean; // state upgrading optional depending on creep type
    }
}