# Screeps Colony Baseline
An adventure into APIs and scripting using *Screeps: World* an open source MMO RTS sandbox game

	Creating an automated script that will  make an army of creeps  who will take over the screeps world

Whilst it is old now, thPion's Screeps Nooby Guide inspired me to work on a codebase of my own.

I selected [thPion's code](https://github.com/thPion/Screeps-Nooby-Guide) as a fork for this because it is very easy to understand and simple. It gives some good ideas about basic play that can be expanded upon. Other ideas have been influenced by [jerroydmoore's screeps ai](https://github.com/jerroydmoore/screeps-ai). Both are licenced under MIT licence.

![License](https://img.shields.io/github/license/rfsjim/Screeps-Nooby-Typescript-Code)
![Last Commit](https://img.shields.io/github/last-commit/rfsjim/Screeps-Nooby-Typescript-Code/development/colony-v2) 
![GitHub commit activity](https://img.shields.io/github/commit-activity/w/rfsjim/Screeps-Nooby-Typescript-Code/development/colony-v2)
![Build](https://github.com/rfsjim/Screeps-Nooby-Typescript-Code/development/colony-v2/actions/workflows/ci.yml/badge.svg)

Updating the codebase using a known stable baseline.

- [CHANGELOG](./CHANGELOG.md)
- [CODE OF CONDUCT](./CODE_OF_CONDUCT.md)
- [CONTRIBUTING](./CONTRIBUTING.md)

## Key Ideas
- Use this as a way to get comfortable using VS Code and CI/CD
    - Utilise the gang of four’s object oriented software design patterns.
        - Singleton - Central Manager Co-Ordinating Roles
        - Factory - Creep Generation
        - Observer - Event listeners / publish-subscribe as part of task issuing
        - Strategy - Base Creep Generation on behavioural abilities.
        - Decorator – Wrap Custom creeps behaviours
        - Flyweight – reuse shared objects to save memory
    - CI/CD In VS Code
    - Lint & type-check your Screeps code before pushing
- Modularise creeps' behaviour
- Memory optimisations structure config and cache data cleanly, reducing CPU usage.
- Central Manager Co-ordinating Roles

## Project Plan
- Be able to survive by itself to some degree,
- Responsive to game stage and grow appropriately as room controller level, GCL/GPL increase
- Dynamic spawning of creeps depending on available energy in room
- Automated construction of roads, towers, extensions, containers, storage, extractor, terminal, factories, labs.
- Transition to container harvesting and then multi room harvesting and expansion to further rooms as GCL increases.
- Move away from search/find functions and utilise memory as much as possible information about rooms and objects (anything that can't/won't change should be stored in memory, anything that won't change in the near future should be checked periodically and updated, definately minimise what gets checked every tick)

Includes a statistical data collector for Long Distance Harvester efficiency. Use `JSON.stringify(Memory.metrics)` to get a current version of the metrics.

CPU Monitoring is available from `JSON.stringify(Memory.stats)`

Helper scripts for developers to use when running a private server for testing and simulation setup are available at [server-scripts](./server-scripts/README.md)