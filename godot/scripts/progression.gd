class_name Progression
extends RefCounted
var file_path = "user://voxel-progress.json"
var data: Dictionary
var save: Dictionary
var vitals: Dictionary = {}
func _init(path="user://voxel-progress.json"):
 file_path=path
 data=JSON.parse_string(FileAccess.get_file_as_string("res://assets/balance.json"))
 reset()
func reset():
 save={"schema":1,"coins":0,"level":0,"unlocked":2,"completed":[],"nodes":{},"pets":[{"id":"starter-cat","species":"cat","rarity":"common","level":1,"xp":0,"itemId":""}],"squad":["starter-cat"],"items":[],"nextId":1,"bestiary":{},"remainder":0}
 vitals.clear()
func load_progress():
 for path in [file_path,file_path+".bak"]:
  if not FileAccess.file_exists(path):continue
  var parsed=JSON.parse_string(FileAccess.get_file_as_string(path))
  if parsed is Dictionary and parsed.get("schema",0)==1 and parsed.get("pets",null) is Array and not parsed.pets.is_empty() and parsed.get("nodes",null) is Dictionary:
   save=parsed
   save.coins=clampi(int(save.get("coins",0)),0,100000000)
   save.unlocked=clampi(int(save.get("unlocked",2)),2,4)
   return
func persist():
 var f=FileAccess.open(file_path+".tmp",FileAccess.WRITE)
 if not f:return false
 f.store_string(JSON.stringify(save,"  "));f.flush();f.close()
 if FileAccess.file_exists(file_path):DirAccess.copy_absolute(file_path,file_path+".bak")
 return DirAccess.rename_absolute(file_path+".tmp",file_path)==OK
func rank(id:String)->int:return int(save.nodes.get(id,0))
func capacity()->int:return 4 if rank("slot4") else 3 if rank("slot3") else 2 if rank("slot2") else 1
func members()->Array:
 return save.pets.filter(func(p):return save.squad.has(p.id)).slice(0,capacity())
func bonus(p:Dictionary,key:String)->float:
 for item in save.items:
  if item.id==p.get("itemId",""):return float(data.items[item.type][key][int(item.tier)-1])
 return 0.0
func max_hp(p:Dictionary)->float:
 return round(({"cat":64,"wolf":90,"bat":44}[p.species]+(p.level-1)*12)*sqrt(data.rarities[p.rarity].mult)*(1+0.1*rank("health"))*(1+bonus(p,"hp")))
func damage(p:Dictionary,ability=false)->float:
 var spec=data.species[p.species]
 var base=spec.skillDamage+save.level*8+(p.level-1)*4 if ability else spec.damage+save.level*4+(p.level-1)*5
 return round(base*data.rarities[p.rarity].mult*(1+0.1*rank("damage"))*(1+0.1*rank("skillPower") if ability else 1+bonus(p,"damage")))
func cooldown(p:Dictionary)->float:return data.species[p.species].cooldown*(1-0.05*rank("cooldown"))
func interval(p:Dictionary)->float:return data.species[p.species].interval/(1+0.05*rank("attackSpeed"))
func all_nodes()->Array:
 var result=[]
 for branch in data.branches:
  for i in branch.nodes.size():
   var node=branch.nodes[i].duplicate()
   node.branch=branch.name
   if not node.has("prerequisite"):node.prerequisite=branch.nodes[i-1].id if i else ""
   if node.prerequisite==null:node.prerequisite=""
   result.append(node)
 return result
func node_cost(node:Dictionary)->int:
 var base=node.cost if node.id.begins_with("slot") else 50 if node.id=="magnet" else ceil(node.cost*0.8)
 return int(ceil(base*(1+0.15*rank(node.id))))
func can_upgrade(node:Dictionary)->bool:
 return rank(node.id)<(1 if node.id.begins_with("slot") else 5) and (node.prerequisite=="" or rank(node.prerequisite)>0) and save.coins>=node_cost(node)
func buy_node(node:Dictionary)->bool:
 if not can_upgrade(node):return false
 save.coins-=node_cost(node);save.nodes[node.id]=rank(node.id)+1;persist();return true
func egg_price()->int:return maxi(10,roundi(30*(1-0.1*rank("discount")))-rank("discount2"))
func odds()->Array:
 var a=rank("rarity");var b=rank("rarity2")
 return [60-3*a-3*b,28+1.4*a+0.6*b,10+1.2*a+1.6*b,2+0.4*a+0.8*b]
func hatch()->Dictionary:
 if save.coins<egg_price():return {}
 save.coins-=egg_price()
 var roll=randf()*100;var cumulative=0.0;var rarity="common";var keys=data.rarities.keys()
 for i in keys.size():
  cumulative+=odds()[i]
  if roll<cumulative:rarity=keys[i];break
 var p={"id":"pet-"+str(save.nextId),"species":["cat","wolf","bat"].pick_random(),"rarity":rarity,"level":1,"xp":0,"itemId":""}
 save.nextId+=1;save.pets.append(p);persist();return p
func toggle_pet(id:String)->bool:
 if save.squad.has(id):
  if save.squad.size()==1:return false
  save.squad.erase(id)
 elif save.squad.size()<capacity():save.squad.append(id)
 else:return false
 persist();return true
func craft(type:String,member:Dictionary)->bool:
 var recipe=data.items[type];var existing={}
 for item in save.items:
  if item.id==member.itemId and item.type==type:existing=item
 var tier=int(existing.get("tier",0))+1
 if tier>3 or recipe.gates[tier-1]>save.unlocked or save.coins<recipe.costs[tier-1]:return false
 save.coins-=recipe.costs[tier-1]
 if existing.is_empty():
  existing={"id":"item-"+str(save.nextId),"type":type,"tier":tier};save.nextId+=1;save.items.append(existing)
 else:existing.tier=tier
 member.itemId=existing.id;persist();return true
func equip(member:Dictionary,id:String):
 for p in save.pets:
  if p.itemId==id:p.itemId=""
 member.itemId=id;persist()
func award(raw:int,stage:int=1)->int:
 # Schema 7 income: raw * 2 * (floor + 3), carried remainder / 15.
 var total=int(save.remainder)+maxi(0,raw)*2*(stage+3 if stage>=2 else 5)
 var amount=total/15
 save.remainder=total%15;save.coins+=int(amount);return int(amount)
func xp(p:Dictionary,total:int):
 p.xp+=total
 while p.level<save.unlocked and p.xp>=35+(p.level-1)*100:
  p.xp-=35+(p.level-1)*100;p.level+=1
 if p.level>=save.unlocked:p.xp=mini(p.xp,34+(p.level-1)*100)

func node_effect(node:Dictionary)->String:
 var r=mini(5,rank(node.id)+1)
 var effects={"health":"Здоровье +%d%%"%[r*10],"damage":"Весь урон +%d%%"%[r*10],"skillPower":"Урон навыков +%d%%"%[r*10],"cooldown":"Перезарядка −%d%%"%[r*5],"armor":"Защита в ближнем бою %d%%"%[r*5],"attackSpeed":"Скорость атак +%d%%"%[r*5],"lifesteal":"Лечение от атак %d%%"%[r],"blastResist":"Защита от области %d%%"%[r*5],"rarity":"Редкие и выше: +%d п.п."%[r*3],"rarity2":"Шанс эпических и легендарных +%.1f п.п."%[r*2.4],"discount":"Цена яйца −%d%%"%[r*10],"discount2":"Дополнительная скидка: %d крист."%[r],"trained":"Опыт +%d%%"%[r*10],"speed":"Скорость героя +%d%%"%[r*5],"abyss":"Наступление бездны на %d с позже"%[r],"magnet":"Автосбор рядом с героем","bounty":"За врага +%d крист. до пересчёта дохода"%[r],"magnet2":"Радиус сбора +%d"%[r*14],"shield":"Щит в начале этажа: %d%% HP"%[r*5]}
 return effects.get(node.id,node.effect)
