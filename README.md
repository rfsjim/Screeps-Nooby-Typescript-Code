Whilst it is old now, thPion's Screeps Nooby Guide inspired me to work a different version of this codebase.

I selected [thPion's code](https://github.com/thPion/Screeps-Nooby-Guide) as a fork for this because it is very easy to understand and simple. It gives some good ideas about basic play that can be expanded upon. Other ideas have been heavily influenced by [jerroydmoore's screeps ai](https://github.com/jerroydmoore/screeps-ai). Both are licenced under MIT licence.

If you want to learn more about Screeps I recommend watching thPion's YouTube videos - [Screeps Nooby Guide video series](https://www.youtube.com/playlist?list=PL0EZQ169YGlor5rzeJEYYPE3tGYT2zGT2). Please check out other branches than master for code that relates to a specific video.

Initial Steps
----

Tidied up code was performed for the deprecated properties that are used in the current codebase.

- The Screeps API has changed since the original code base was written and further changes are on the way.
- Function to spawn creep with memory has changed FIXED
- Some properties, mostly around energy and making all resources handled in a standard way are deprecated and will be removed soon FIXED
- Code needs to be refactored further

Project Plan (Big Picture Idea of Code)
----
- Be able to survive by itself to some degree,
- Responsive to game stage and grow appropriately as room controller level, GCL/GPL increase
- Dynamic spawning of creeps depending on available energy in room
- Automated construction of roads, towers, extensions, containers, storage, extractor, terminal, factories, labs.
- Transition to container harvesting and then multi room harvesting and expansion to further rooms as GCL increases.
- Move away from search/find functions and utilise memory as much as possible information about rooms and objects (anything that can't/won't change should be stored in memory, anything that won't change in the near future should be checked periodically and updated, definately minimise what gets checked every tick)

Wiki
----
About the project, will grow with more details about my reasons for making choices and documentation of the code - [Scrreps Noobdy Code Wiki](https://github.com/rfsjim/Screeps-Nooby-Code/wiki)

- Well documented code makes for happy creeps

License
----

MIT, for details see [license file](LICENSE).
