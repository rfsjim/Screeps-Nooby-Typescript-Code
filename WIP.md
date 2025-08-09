# Screeps Typescript Edition
Work in progress

## TODO
- [ ] `taskManager` tasking code
    - [x] `AssignTask`
    - [ ] `ExecuteTask`
        - [ ] `Lorry` Pickup logic (`runCreep(creep, 'pickup');`)
        - [ ] `Lorry` Withdraw logic (`runCreep(creep, 'withdraw');`)
        - [ ] `Lorry` Fill logic (`runCreep(creep, 'withdraw');` `runCreep(creep, 'transfer');`)
    - [x] `ShouldHandOverTask`
    - [x] class `SustainabilityPlanner`
    - [ ] `update` task assignment

## Lint
- [x] src\main.ts
    - [x] `allTasks` is assigned a value but never used
- [ ] src\managers\roomManager.ts
    - [ ] `setRoadRequirements` is defined but never used
    - [ ] `wallRepairThreshold` is assigned a value but never used
    - [ ] `storageTarget` is assigned a value but never used
- [x] src\managers\taskManager.ts
    - [x] `NoneTask` is defined but never used
    - [x] `HarvestableTarget` is defined but never used
    - [X] `isHarvestable` is defined but never used          
    - [x] `hasWork` is defined but never used                
    - [x] `isHarvestTask` is defined but never used          
    - [x] `isBuildTask` is defined but never used            
    - [X] `isRepairTask` is defined but never used           
    - [x] `isUpgradeTask` is defined but never used          
    - [x] `createHarvestTask` is defined but never used      
    - [x] `SustainabilityPlanner` is defined but never used  