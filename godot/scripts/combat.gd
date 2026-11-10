class_name Combat
extends RefCounted
var game
var stage=2
var rules:Dictionary
var time=0.0
var p=0.0
var abyss=-600.0
var pets:Array=[]
var enemies:Array=[]
var gems:Array=[]
var shots:Array=[]
var boss:Dictionary={}
var rally_cd=0.0
var starting_coins=0
var finished=false
func _init(root):game=root
func start(n:int):
 stage=n;rules=game.progress.data.floors[str(n)];starting_coins=game.progress.save.coins
 for member in game.progress.members():
  var hp=game.progress.max_hp(member)
  var node=Vox.model(member.species,.095);game.world.add_child(node)
  pets.append({"member":member,"hp":minf(hp,game.progress.vitals.get(member.id,hp)),"max":hp,"shield":hp*.05*game.progress.rank("shield"),"rally":0.0,"rally_time":0.0,"cd":0.0,"attack":0.0,"hits":0,"node":node,"wait":0.0,"target":{},"hp_label":game.health_label(node)})
 for group in 4:
  for j in int(rules.count):
   spawn_enemy(350+group*350+j*25,(1 if j%2 else -1)*(24+j*12),"guard" if j==int(rules.count)-1 and (group%2 or stage>=4) else "shadow")
  for j in 3:drop_gem(230+group*350+j*60,(1 if j%2 else -1)*110,3)
 for i in pets.size():pets[i].node.position=position(65+i*19,20*i)
func position(value:float,offset:float=0)->Vector3:return VoxelWorld.path(value,stage)+Vector3(offset*.028,0,0)
func spawn_enemy(value:float,offset:float,kind:String,summoned=false):
 var hp=rules.bossHealth if kind=="boss" else (rules.guardHealth if kind=="guard" else rules.health)*(.65 if summoned else 1)
 var node=Vox.model("boss"+str(stage) if kind=="boss" else kind,.16 if kind=="boss" else .08);node.position=position(value,offset);node.rotation.y=PI;game.world.add_child(node)
 var e={"p":value,"off":offset,"hp":float(hp),"max":float(hp),"kind":kind,"armor":.2 if kind=="guard" else 0.0,"frozen":0.0,"brace":0.0,"brace_cd":4.0,"node":node,"hp_label":game.health_label(node),"pulse":3.8,"windup":0.0,"summon":rules.summonPeriod,"recorded":false}
 enemies.append(e)
 if kind=="boss":boss=e
func drop_gem(value:float,offset:float,amount:int):
 var node=Vox.model("crystal",.035);node.position=position(value,offset)+Vector3(0,.2,0);game.world.add_child(node)
 gems.append({"node":node,"value":amount,"taken":false})
func take_gem(g:Dictionary):
 if g.taken:return
 g.taken=true;g.node.visible=false;game.progress.award(g.value,stage);game.progress.persist()
func record(e:Dictionary,killed=false):
 var key="boss-"+str(stage) if e.kind=="boss" else "ruins-"+e.kind
 if not game.progress.save.bestiary.has(key):game.progress.save.bestiary[key]={"kills":0,"floor":stage}
 if killed:game.progress.save.bestiary[key].kills+=1
func hurt(entry:Dictionary,amount:float,area=false):
 if entry.hp<=0:return
 amount*=1-game.progress.bonus(entry.member,"resist") if area else (1-.05*game.progress.rank("armor"))*(.88 if entry.member.species=="wolf" else 1)
 var soak=minf(entry.rally,amount);entry.rally-=soak;amount-=soak
 soak=minf(entry.shield,amount);entry.shield-=soak;amount-=soak
 entry.hp=maxf(0,entry.hp-amount);game.progress.vitals[entry.member.id]=entry.hp
 if entry.hp<=0:entry.node.rotation.z=PI*.5
func heal(entry:Dictionary,amount:float):
 if entry.hp>0:entry.hp=minf(entry.max,entry.hp+amount);game.progress.vitals[entry.member.id]=entry.hp
func hit(e:Dictionary,amount:float,ability=false):
 if e.is_empty() or e.hp<=0:return
 e.hp-=amount*(1-e.armor if not ability else 1)
 game.burst(e.node.position+Vector3.UP,Color("d6bded"),.7)
 if e.hp>0:return
 e.node.visible=false;record(e,true)
 var alive=pets.filter(func(a):return a.hp>0)
 var raw_xp=18+stage*6 if e.kind=="boss" else (6 if e.kind=="guard" else 4)+stage
 for entry in alive:
  var before=entry.max
  game.progress.xp(entry.member,maxi(1,floori(raw_xp*(1+.1*game.progress.rank("trained"))/maxi(1,alive.size()))))
  entry.max=game.progress.max_hp(entry.member);heal(entry,entry.max-before)
 if game.progress.rank("bounty"):game.progress.award(game.progress.rank("bounty"),stage)
 for i in (6 if e.kind=="boss" else 2):drop_gem(e.p+randf_range(-30,30),e.off+randf_range(-42,42),5 if e.kind=="boss" else 2)
 game.progress.persist()
func strike(entry:Dictionary,e:Dictionary):
 if entry.hp<=0 or e.hp<=0:return
 hit(e,game.progress.damage(entry.member));entry.hits+=1
 if entry.member.species=="cat" and entry.hits%5==0:heal(entry,entry.max*.06)
 if entry.member.species=="bat" and entry.hits%4==0:e.frozen=maxf(e.frozen,.25 if e.kind=="boss" else .7)
 heal(entry,game.progress.damage(entry.member)*(.01*game.progress.rank("lifesteal")+game.progress.bonus(entry.member,"heal")))
func skill(index:int):
 if index<0 or index>=pets.size() or finished:return false
 var entry=pets[index]
 if entry.hp<=0 or entry.cd>0:return false
 var targets=enemies.filter(func(e):return e.hp>0 and e.node.position.distance_to(entry.node.position)<7)
 if targets.is_empty():return false
 targets.sort_custom(func(a,b):return a.node.position.distance_squared_to(entry.node.position)<b.node.position.distance_squared_to(entry.node.position))
 entry.cd=game.progress.cooldown(entry.member)
 game.burst(entry.node.position,Color("a3e5f5") if entry.member.species=="bat" else Color("d3b2eb"),5)
 for e in targets.slice(0,3 if entry.member.species=="wolf" else targets.size()):
  hit(e,game.progress.damage(entry.member,true),true)
  if entry.member.species=="bat":e.frozen=maxf(e.frozen,3)
  if e.kind=="guard":e.brace=0;e.armor=.2;e.brace_cd=6
  if e.kind=="boss" and e.windup>0:e.windup=0;e.pulse=rules.pulsePeriod;e.frozen=maxf(e.frozen,.65)
 return true
func rally():
 if rally_cd>0:return
 rally_cd=18
 for entry in pets:
  if entry.hp>0:entry.rally=entry.max*.2;entry.rally_time=3
 game.burst(game.hero.position,Color("f3d78c"),4)
func tick(dt:float):
 if finished:return
 time=minf(45,time+dt);rally_cd=maxf(0,rally_cd-dt)
 var threats=enemies.filter(func(e):return e.hp>0 and absf(e.p-p)<115 and e.frozen<=0)
 if p<1830:p=minf(1830,p+dt*(24 if not threats.is_empty() else 97.5)*(1+.05*game.progress.rank("speed")))
 if p>=1830 and boss.is_empty():
  spawn_enemy(1910,0,"boss")
  for j in mini(4,1+stage/2):spawn_enemy(1850+j*24,91 if j%2 else -91,"shadow",true)
 game.hero.position=position(p)
 for e in enemies:
  if e.hp<=0:continue
  e.frozen=maxf(0,e.frozen-dt)
  e.hp_label.text=("❄ " if e.frozen>0 else "")+str(ceili(maxf(0,e.hp)))+" / "+str(int(e.max))
  if absf(e.p-p)<650 and not e.recorded:record(e);e.recorded=true
  if e.frozen>0:continue
  if e.kind=="guard" and absf(e.p-p)<220:
   if e.brace>0:e.brace=maxf(0,e.brace-dt);e.armor=.55 if e.brace>0 else .2
   else:
    e.brace_cd-=dt
    if e.brace_cd<=0:e.brace=2.5;e.brace_cd=6;e.armor=.55
  if e.kind=="boss":
   var enraged=1.2 if e.hp<e.max*.5 else 1.0
   e.summon-=dt
   if e.summon<=0:
    var near=enemies.filter(func(a):return a.hp>0 and a.kind!="boss" and absf(a.p-p)<300).size()
    for j in mini(2,maxi(0,6-near)):spawn_enemy(1850+j*24,91 if j%2 else -91,"shadow",true)
    e.summon=rules.summonPeriod/enraged
   if e.windup>0:
    e.windup=maxf(0,e.windup-dt)
    if e.windup==0:
     for entry in pets:hurt(entry,rules.pulseDamage*enraged*(1-.05*game.progress.rank("blastResist")),true)
     e.pulse=rules.pulsePeriod/enraged;game.burst(e.node.position,Color("e57fa7"),8)
   else:
    e.pulse-=dt
    if e.pulse<=0:e.windup=1.2;game.toast("РАЗЛОМ! Прерви навыком питомца");game.burst(e.node.position,Color("cf89c2"),6)
 for entry in pets:
  entry.hp_label.text=str(ceili(entry.hp))+" / "+str(int(entry.max))
  if entry.hp<=0:continue
  entry.cd=maxf(0,entry.cd-dt);entry.attack-=dt;entry.rally_time=maxf(0,entry.rally_time-dt)
  if entry.rally_time==0:entry.rally=0
  if entry.wait>0:
   entry.wait=maxf(0,entry.wait-dt)
   if entry.wait==0 and not entry.target.is_empty() and entry.target.hp>0:
    if entry.member.species=="bat":
     var projectile=game.colored_cube(Color("b5e6f0"),Vector3.ONE*.18);game.world.add_child(projectile);projectile.position=entry.node.position+Vector3.UP;shots.append({"node":projectile,"owner":entry,"target":entry.target})
    elif entry.node.position.distance_to(entry.target.node.position)<2.7:strike(entry,entry.target)
  var targets=enemies.filter(func(e):return e.hp>0 and e.node.position.distance_to(entry.node.position)<8)
  targets.sort_custom(func(a,b):return a.node.position.distance_squared_to(entry.node.position)<b.node.position.distance_squared_to(entry.node.position))
  var destination=position(p+65+pets.find(entry)*19,20*pets.find(entry))
  if not targets.is_empty():
   var target=targets[0];var reach=4.6 if entry.member.species=="bat" else 1.65
   if entry.node.position.distance_to(target.node.position)>reach:
    destination=target.node.position
   else:
    destination=entry.node.position
    if entry.attack<=0 and entry.wait<=0:entry.attack=game.progress.interval(entry.member);entry.wait=.16;entry.target=target
  var delta=destination-entry.node.position
  if delta.length()>.1:
   entry.node.position=entry.node.position.move_toward(destination,dt*6.8)
   entry.node.rotation.y=lerp_angle(entry.node.rotation.y,atan2(-delta.x,-delta.z),dt*10)
  entry.node.position.y=(.4+sin(time*8)*.15) if entry.member.species=="bat" else (sin((.16-entry.wait)/.16*PI)*.35 if entry.wait>0 else 0)
 for shot in shots.duplicate():
  if shot.owner.hp<=0 or shot.target.hp<=0:
   shot.node.queue_free();shots.erase(shot);continue
  shot.node.position=shot.node.position.move_toward(shot.target.node.position+Vector3.UP,dt*19)
  if shot.node.position.distance_to(shot.target.node.position+Vector3.UP)<.3:strike(shot.owner,shot.target);shot.node.queue_free();shots.erase(shot)
 for e in enemies:
  if e.hp<=0 or e.frozen>0:continue
  var alive=pets.filter(func(a):return a.hp>0 and a.node.position.distance_to(e.node.position)<2)
  if alive.is_empty():continue
  alive.sort_custom(func(a,b):return a.member.species=="wolf" and b.member.species!="wolf")
  hurt(alive[0],dt*(rules.bossDps if e.kind=="boss" else (2.1 if e.kind=="guard" else 1.25)*rules.damage))
 if time>rules.abyssDelay+game.progress.rank("abyss"):abyss+=dt*rules.abyssSpeed
 game.danger.position=position(abyss)+Vector3(0,.5,0)
 if p<abyss+45:
  for entry in pets:hurt(entry,dt*(8+maxf(0,abyss-p)*.04),true)
 for gem in gems:
  if gem.taken:continue
  gem.node.rotation.y+=dt
  if game.progress.rank("magnet") and gem.node.position.distance_to(game.hero.position)<(135+maxi(0,game.progress.rank("magnet")-1)*15+game.progress.rank("magnet2")*14)*.028:take_gem(gem)
 if pets.all(func(a):return a.hp<=0):finish(false,"Отряд пал")
 elif not boss.is_empty() and boss.hp<=0:finish(true,"Этаж пройден")
 elif time>=45:finish(false,"Время вышло")
func finish(win:bool,message:String):
 if finished:return
 finished=true
 if win:
  game.progress.award(25+stage*5+maxi(0,floori(45-time)),stage)
  for gem in gems:
   if not gem.taken and gem.node.position.distance_to(boss.node.position)<3:take_gem(gem)
  if not game.progress.save.completed.has(stage):game.progress.save.completed.append(stage)
  game.progress.save.unlocked=mini(4,maxi(game.progress.save.unlocked,stage+1))
 game.progress.persist();game.show_result(win,message)
