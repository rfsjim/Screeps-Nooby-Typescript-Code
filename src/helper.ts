declare global {
    namespace NodeJS {
        interface Global {
            clearMemory(): void;
        }
    }
}

export default function clearMemory() {
       // clear all memory to empty object
       RawMemory.set("{}");

       // recreate standard memory tree
       Memory.creeps = {};
       Memory.rooms = {};
       Memory.spawns = {};
       Memory.flags = {};
       Memory.powerCreeps = {};
   
       // console log
       console.log('Memory Cleared to inital state');
}

(global as any).clearMemory = clearMemory();
