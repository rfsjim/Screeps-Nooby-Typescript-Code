/**
 * Custom Interfaces
 */
export const RoleDescriptions = {
    harvester: 'Gathers energy from sources',
    upgrader: 'Upgrades the room controller',
    builder: 'Builds construction sites',
    energyMiner: 'Container mines sources',
    lorry: 'Moves energy from containers and fills buildings',
    repairer: 'Repairs buildings',
    claimer: 'Claims new rooms',
    kungFuFighter: 'Defends room',
    idle: 'No task allocated, needs to be allocated task and role',
};
export const AllRoles = ['harvester', 'upgrader', 'builder', 'energyMiner', 'lorry', 'repairer', 'claimer', 'kungFuFighter', 'idle'];
export const AllTaskStatuses = ['untasked', 'tasked', 'in_progress', 'completed', 'hand_over', 'error'];
export const AllTaskTypes = ['harvest', 'upgrade', 'build', 'resource_collection', 'repair', 'fill', 'none'];
export var ResourceAcquisitionMethod;
(function (ResourceAcquisitionMethod) {
    ResourceAcquisitionMethod["Harvest"] = "harvest";
    ResourceAcquisitionMethod["Withdraw"] = "withdraw";
    ResourceAcquisitionMethod["Pickup"] = "pickup";
    ResourceAcquisitionMethod["Transfer"] = "transfer";
})(ResourceAcquisitionMethod || (ResourceAcquisitionMethod = {}));
export var RoomPhase;
(function (RoomPhase) {
    RoomPhase[RoomPhase["UnitiatedRoom"] = -1] = "UnitiatedRoom";
    RoomPhase[RoomPhase["DeathSpiral"] = 0] = "DeathSpiral";
    RoomPhase[RoomPhase["InitialBootstrap"] = 1] = "InitialBootstrap";
    RoomPhase[RoomPhase["StableEarlyGame"] = 2] = "StableEarlyGame";
    RoomPhase[RoomPhase["MidGame"] = 3] = "MidGame";
    RoomPhase[RoomPhase["NearMax"] = 4] = "NearMax";
    RoomPhase[RoomPhase["MaxSingleRoom"] = 5] = "MaxSingleRoom";
    RoomPhase[RoomPhase["ExpansionCandidate"] = 6] = "ExpansionCandidate";
    // Specialised = 7           // Power processing, nuker ops, pixel generation, market trader
})(RoomPhase || (RoomPhase = {}));
;
export const AllPhases = [
    RoomPhase.UnitiatedRoom,
    RoomPhase.DeathSpiral,
    RoomPhase.InitialBootstrap,
    RoomPhase.StableEarlyGame,
    RoomPhase.MidGame,
    RoomPhase.NearMax,
    RoomPhase.MaxSingleRoom,
    RoomPhase.ExpansionCandidate,
    // RoomPhase.Specialised
];
//# sourceMappingURL=types.js.map