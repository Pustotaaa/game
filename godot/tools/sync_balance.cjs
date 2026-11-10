// Preserve numerical data from the 2D source rather than maintaining a second balance table.
const fs=require('fs'),vm=require('vm'),path=require('path');const root=path.resolve(__dirname,'../..');
const context=vm.createContext({document:{addEventListener(){}},window:{addEventListener(){}}});for(const file of ['progression.js','systems.js','balance.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',file),'utf8'),context);
const data=vm.runInContext('({species:SPECIES,rarities:RARITIES,branches:BRANCHES,items:ITEM_TYPES,passives:PET_PASSIVES,floors:Object.fromEntries([2,3,4].map(n=>[n,FLOOR_RULES[n]])),runSeconds:RUN_SECONDS})',context);
fs.writeFileSync(path.join(root,'godot/assets/balance.json'),JSON.stringify(data,null,2)+'\n');
