extends Node3D
var progress=Progression.new()
var world:VoxelWorld
var hero:Node3D
var followers:Array=[]
var camera:Camera3D
var camera_target=Vector3(0,1,0)
var yaw=0.72
var pitch=0.8
var distance=48.0
var route=PackedVector3Array()
var intent=""
var state="camp"
var battle:Combat
var danger:Node3D
var falling=0.0
var selected_floor=2
var effects:Array=[]
var clock=0.0
var sound=false
var ui:Control
var modal:Control
var content:VBoxContainer
var hud:Label
var heading:Label
var hint:Label
var hotbar:HBoxContainer
var coins_label:Label
var notice:Label
var notice_time=0.0
var refresh=0.0
var audio:AudioStreamPlayer
var dragging_camera=false
var test_mode=false
const GOLD=Color("dbc396")
func _ready():
 test_mode=OS.get_cmdline_user_args().has("--smoke-test") or OS.get_cmdline_user_args().has("--simulation-test")
 if test_mode:progress.file_path="user://voxel-smoke-test.json"
 else:progress.load_progress()
 var environment=WorldEnvironment.new();var env=Environment.new();env.background_mode=Environment.BG_COLOR;env.background_color=Color("273e4e");env.ambient_light_source=Environment.AMBIENT_SOURCE_COLOR;env.ambient_light_color=Color("a3bdd0");env.ambient_light_energy=.4;env.tonemap_mode=Environment.TONE_MAPPER_FILMIC;environment.environment=env;add_child(environment)
 var sun=DirectionalLight3D.new();sun.rotation_degrees=Vector3(-52,-35,0);sun.light_color=Color("ffe7ba");sun.light_energy=1.0;sun.shadow_enabled=true;sun.shadow_bias=0.12;sun.shadow_normal_bias=2.0;sun.directional_shadow_max_distance=110;add_child(sun)
 camera=Camera3D.new();camera.fov=43;camera.near=.1;camera.far=180;add_child(camera)
 audio=AudioStreamPlayer.new();add_child(audio)
 make_ui();camp()
 if OS.get_cmdline_user_args().has("--smoke-test"):call_deferred("smoke_test")
 if OS.get_cmdline_user_args().has("--simulation-test"):call_deferred("simulation_test")
 for arg in OS.get_cmdline_user_args():
  if arg.begins_with("--capture="):call_deferred("capture",arg.trim_prefix("--capture="))
  if arg.begins_with("--visual-test="):call_deferred("visual_test",arg.trim_prefix("--visual-test="))
func colored_cube(color:Color,size:Vector3)->MeshInstance3D:
 var node=MeshInstance3D.new();var mesh=BoxMesh.new();mesh.size=size;var material=StandardMaterial3D.new();material.albedo_color=color;material.roughness=.8;mesh.material=material;node.mesh=mesh;return node
func health_label(parent:Node3D)->Label3D:
 var label=Label3D.new();label.position=Vector3(0,34,0);label.billboard=BaseMaterial3D.BILLBOARD_ENABLED;label.font_size=28;label.pixel_size=.09;label.outline_size=7;parent.add_child(label);return label
func beep(freq=500.0):
 if not sound:return
 var stream=AudioStreamWAV.new();stream.mix_rate=22050;stream.format=AudioStreamWAV.FORMAT_16_BITS
 var bytes=PackedByteArray();bytes.resize(4410)
 for i in 2205:bytes.encode_s16(i*2,int(sin(i*freq*TAU/22050.0)*1800*(1-i/2205.0)))
 stream.data=bytes;audio.stream=stream;audio.play()
func clear_world():
 if is_instance_valid(world):remove_child(world);world.queue_free()
 world=VoxelWorld.new();add_child(world);followers.clear();effects.clear();route.clear();intent="";battle=null
 hero=Vox.model("hero",.073);world.add_child(hero)
func camp():
 close_panel();state="camp";falling=0;progress.vitals.clear();clear_world();world.make_camp();hero.position=Vector3(-13,0,9)
 for i in progress.members().size():
  var model=Vox.model(progress.members()[i].species,.095);model.position=hero.position+Vector3(-1-i,0,1);world.add_child(model);followers.append(model)
 camera_target=Vector3(1,0,2);distance=54
 build_hotbar();update_hud()
func begin_floor(n:int)->bool:
 if n<2 or n>4 or n>int(progress.save.unlocked):return false
 close_panel();selected_floor=n;state="fall";falling=0;route.clear();intent="";dragging_camera=false;return true
func enter_floor(n:int):
 clear_world();state="run";world.make_floor(n);hero.position=VoxelWorld.path(0,n)
 danger=colored_cube(Color("705080"),Vector3(15,1.5,1.2));world.add_child(danger)
 battle=Combat.new(self);battle.start(n);distance=27;camera_target=hero.position+Vector3(0,1,-3)
 build_hotbar();update_hud()
func go_object(id:String):
 if state!="camp" or modal.visible:return
 for o in world.objects:
  if o.id!=id:continue
  var path=world.route(hero.position,o.entrance)
  if path.is_empty():toast("Нет свободного пути");return
  route=path;intent=id;return
func interact(id:String):
 if id=="pets":show_pets()
 elif id=="tree":show_tree()
 elif id=="workshop":show_workshop()
 elif id=="eggs":show_eggs()
 elif id=="portal":show_floors()
func _process(dt):
 clock+=dt
 if not modal.visible:
  if state=="camp":
   var movement=Vector2(float(Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT))-float(Input.is_physical_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_LEFT)),float(Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN))-float(Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP)))
   if movement.length()>0:
    route.clear();intent="";movement=movement.normalized()
    var direction=Vector3(movement.x,0,movement.y).rotated(Vector3.UP,yaw)
    var next=hero.position+direction*dt*5.5
    if world.camp_walkable(next.x,hero.position.z):hero.position.x=next.x
    if world.camp_walkable(hero.position.x,next.z):hero.position.z=next.z
    hero.rotation.y=lerp_angle(hero.rotation.y,atan2(-direction.x,-direction.z),dt*12)
   elif not route.is_empty():
    var destination=route[0];var delta=destination-hero.position
    hero.position=hero.position.move_toward(destination,dt*5.5)
    if delta.length()>.05:hero.rotation.y=lerp_angle(hero.rotation.y,atan2(-delta.x,-delta.z),dt*12)
    if hero.position.distance_to(destination)<.07:route.remove_at(0)
    if route.is_empty() and intent!="":var id=intent;intent="";interact(id)
   for i in followers.size():
    followers[i].position=followers[i].position.lerp(hero.position+Vector3(-1.2-i*.6,0,1+i*.5),minf(1,dt*3))
    followers[i].rotation.y=hero.rotation.y
  elif state=="fall":
   falling+=dt;var q=clampf(falling/1.4,0,1)
   hero.position=world.HOLE+Vector3(0,-q*q*12,0);hero.rotation.y+=dt*3
   camera_target=camera_target.lerp(world.HOLE+Vector3(0,-4,0),dt*3)
   if falling>=1.4:enter_floor(selected_floor)
  elif state=="run" and battle!=null:
   battle.tick(minf(dt,.1));camera_target=camera_target.lerp(hero.position+Vector3(0,1,-3),minf(1,dt*4))
 for e in effects.duplicate():
  if not is_instance_valid(e.node):effects.erase(e);continue
  e.life-=dt;e.node.scale=Vector3.ONE*(1+(1-e.life/e.max)*2)
  if e.life<=0:e.node.queue_free();effects.erase(e)
 camera.position=camera_target+Vector3(sin(yaw)*cos(pitch),sin(pitch),cos(yaw)*cos(pitch))*distance
 camera.look_at(camera_target,Vector3.UP)
 if notice_time>0:notice_time-=dt;notice.visible=notice_time>0
 refresh-=dt
 if refresh<=0:update_hud();refresh=.1
func _unhandled_input(event):
 if event is InputEventKey and event.pressed and not event.echo:
  if event.physical_keycode==KEY_ESCAPE:
   if modal.visible and state!="result":close_panel()
   elif not modal.visible and state!="fall":show_settings()
  if modal.visible:return
  if event.physical_keycode==KEY_F11:
   DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED if DisplayServer.window_get_mode()==DisplayServer.WINDOW_MODE_FULLSCREEN else DisplayServer.WINDOW_MODE_FULLSCREEN)
  if state=="run":
   if event.physical_keycode>=KEY_1 and event.physical_keycode<=KEY_4:battle.skill(event.physical_keycode-KEY_1)
   elif event.physical_keycode==KEY_SPACE:battle.skill(0)
   elif event.physical_keycode==KEY_Q:battle.rally()
  elif state=="camp" and event.physical_keycode==KEY_E:
   var nearest=null;var length=4.0
   for o in world.objects:
    var d=hero.position.distance_to(o.entrance)
    if d<length:nearest=o;length=d
   if nearest!=null:interact(nearest.id)
 if modal.visible:return
 if event is InputEventMouseButton:
  if event.button_index==MOUSE_BUTTON_RIGHT or event.button_index==MOUSE_BUTTON_MIDDLE:dragging_camera=event.pressed
  if not event.pressed:return
  if event.button_index==MOUSE_BUTTON_WHEEL_UP:distance=clampf(distance-2,14,68)
  elif event.button_index==MOUSE_BUTTON_WHEEL_DOWN:distance=clampf(distance+2,14,68)
  elif event.button_index==MOUSE_BUTTON_LEFT:
   var origin=camera.project_ray_origin(event.position);var normal=camera.project_ray_normal(event.position)
   var query=PhysicsRayQueryParameters3D.create(origin,origin+normal*180);query.collide_with_areas=true;query.collide_with_bodies=false
   var hit=get_world_3d().direct_space_state.intersect_ray(query)
   if state=="camp":
    if not hit.is_empty() and hit.collider.has_meta("building"):go_object(hit.collider.get_meta("building"))
    else:
     var point=Plane(Vector3.UP,0).intersects_ray(origin,normal)
     if point!=null:route=world.route(hero.position,point);intent=""
   elif state=="run":
    for gem in battle.gems:
     if not gem.taken and not camera.is_position_behind(gem.node.position) and camera.unproject_position(gem.node.position).distance_to(event.position)<30:battle.take_gem(gem)
 if event is InputEventMouseMotion and dragging_camera:
  yaw-=event.relative.x*.007;pitch=clampf(pitch+event.relative.y*.006,.3,1.25)
func _notification(what):
 if what==NOTIFICATION_APPLICATION_FOCUS_OUT:
  dragging_camera=false
  if is_instance_valid(modal) and state=="run" and not modal.visible:show_settings()
func burst(pos:Vector3,color:Color,radius:float):
 var node=MeshInstance3D.new();var mesh=TorusMesh.new();mesh.inner_radius=radius*.85;mesh.outer_radius=radius;mesh.rings=24;mesh.ring_segments=4
 var material=StandardMaterial3D.new();material.albedo_color=color;material.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED;mesh.material=material;node.mesh=mesh;node.position=pos+Vector3(0,.12,0);world.add_child(node);effects.append({"node":node,"life":.5,"max":.5})
func toast(text:String):notice.text=text;notice.visible=true;notice_time=3.5
func style(fill:Color,border:Color)->StyleBoxFlat:
 var s=StyleBoxFlat.new();s.bg_color=fill;s.border_color=border;s.set_border_width_all(1);s.set_corner_radius_all(7);s.set_content_margin_all(12);return s
func label(text:String,parent:Node,size=18)->Label:
 var node=Label.new();node.text=text;node.add_theme_font_size_override("font_size",size);parent.add_child(node);return node
func button(text:String,parent:Node,action:Callable,disabled=false)->Button:
 var b=Button.new();b.text=text;b.custom_minimum_size.y=43;b.disabled=disabled;b.pressed.connect(func():beep();action.call());parent.add_child(b);return b
func make_ui():
 var canvas_layer=CanvasLayer.new();add_child(canvas_layer)
 ui=Control.new();ui.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT);ui.mouse_filter=Control.MOUSE_FILTER_IGNORE;canvas_layer.add_child(ui)
 var theme=Theme.new();theme.default_font_size=17;theme.set_color("font_color","Label",Color("eee4cc"));theme.set_stylebox("normal","Button",style(Color("243e49"),Color("81988a")));theme.set_stylebox("hover","Button",style(Color("3a5862"),GOLD));theme.set_stylebox("pressed","Button",style(Color("536d73"),GOLD));theme.set_stylebox("disabled","Button",style(Color("23353c"),Color("475658")));theme.set_color("font_disabled_color","Button",Color("748381"));ui.theme=theme
 var top=HBoxContainer.new();top.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE);top.offset_left=20;top.offset_right=-20;top.offset_top=18;top.add_theme_constant_override("separation",14);ui.add_child(top)
 hud=label("",top,17);hud.custom_minimum_size=Vector2(320,50)
 heading=label("ЛЕСНОЕ УБЕЖИЩЕ",top,20);heading.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER;heading.size_flags_horizontal=Control.SIZE_EXPAND_FILL
 coins_label=label("◆ 0",top,22);coins_label.custom_minimum_size=Vector2(90,0)
 button("Бестиарий",top,show_bestiary);button("Меню · Esc",top,show_settings)
 var footer=Panel.new();footer.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE);footer.offset_top=-125;footer.add_theme_stylebox_override("panel",style(Color(0.07,.13,.17,.9),Color(.4,.5,.5,.6)));ui.add_child(footer)
 var bottom=VBoxContainer.new();bottom.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE);bottom.offset_left=20;bottom.offset_right=-20;bottom.offset_top=-114;bottom.offset_bottom=-16;ui.add_child(bottom)
 hint=label("ПКМ / средняя кнопка — вращение · Колесо — приближение",bottom,14);hint.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
 hotbar=HBoxContainer.new();hotbar.alignment=BoxContainer.ALIGNMENT_CENTER;hotbar.add_theme_constant_override("separation",10);bottom.add_child(hotbar)
 notice=label("",ui,21);notice.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP);notice.offset_top=95;notice.offset_left=-420;notice.offset_right=420;notice.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER;notice.visible=false
 modal=Control.new();modal.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT);ui.add_child(modal);modal.visible=false
 var shade=ColorRect.new();shade.color=Color(0.025,.045,.07,.85);shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT);modal.add_child(shade)
func show_panel(title:String,result=false):
 dragging_camera=false;modal.visible=true
 for child in modal.get_children():
  if not child is ColorRect:modal.remove_child(child);child.queue_free()
 var center=CenterContainer.new();center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT);modal.add_child(center)
 var panel=PanelContainer.new();panel.add_theme_stylebox_override("panel",style(Color("192e3a"),GOLD));panel.custom_minimum_size=Vector2(820,0);center.add_child(panel)
 var box=VBoxContainer.new();box.add_theme_constant_override("separation",12);panel.add_child(box)
 var row=HBoxContainer.new();box.add_child(row);var title_label=label(title,row,27);title_label.size_flags_horizontal=Control.SIZE_EXPAND_FILL
 if not result:button("Закрыть · Esc",row,close_panel)
 var scroll=ScrollContainer.new();scroll.custom_minimum_size=Vector2(790,420);scroll.size_flags_horizontal=Control.SIZE_EXPAND_FILL;box.add_child(scroll)
 content=VBoxContainer.new();content.size_flags_horizontal=Control.SIZE_EXPAND_FILL;content.add_theme_constant_override("separation",9);scroll.add_child(content)
func close_panel():
 if is_instance_valid(modal):modal.visible=false
 dragging_camera=false
func build_hotbar():
 for child in hotbar.get_children():hotbar.remove_child(child);child.queue_free()
 if state=="camp":
  for pair in [["Отряд","pets"],["Яйца","eggs"],["Дерево навыков","tree"],["Мастерская","workshop"],["В бездну","portal"]]:
   button(pair[0],hotbar,go_object.bind(pair[1]))
 elif state=="run":
  for i in battle.pets.size():button(str(i+1)+" · "+progress.data.species[battle.pets[i].member.species].skill,hotbar,use_skill.bind(i))
  button("Q · Сбор отряда",hotbar,use_rally)
func use_skill(index:int):
 if state=="run" and not modal.visible:battle.skill(index)
func use_rally():
 if state=="run" and not modal.visible:battle.rally()
func update_hud():
 if not is_instance_valid(hud):return
 coins_label.text="◆ "+str(int(progress.save.coins))
 if state=="run" and battle!=null:
  var lines=[]
  for p in battle.pets:lines.append(progress.data.species[p.member.species].name+"  "+str(ceili(p.hp))+" / "+str(int(p.max))+"  ["+str(ceili(p.cd))+" с]")
  hud.text="\n".join(lines);heading.text="ЭТАЖ "+str(battle.stage)+"   ·   00:"+str(maxi(0,ceili(45-battle.time))).pad_zeros(2)
  hint.text="1–4 / пробел — способности · Q — щит отряда · ЛКМ — собрать кристалл"
  for i in battle.pets.size():
   var p=battle.pets[i];var b=hotbar.get_child(i);b.disabled=p.hp<=0 or p.cd>0
   b.text=str(i+1)+" · "+progress.data.species[p.member.species].skill+(" · "+str(ceili(p.cd))+" с" if p.cd>0 else "")
  var rally_button=hotbar.get_child(hotbar.get_child_count()-1);rally_button.disabled=battle.rally_cd>0;rally_button.text="Q · Сбор отряда"+(" · "+str(ceili(battle.rally_cd))+" с" if battle.rally_cd>0 else "")
 else:
  hud.text="ОТРЯД  "+str(progress.members().size())+" / "+str(progress.capacity());heading.text="ЛЕСНОЕ УБЕЖИЩЕ" if state=="camp" else "СПУСК В БЕЗДНУ";hint.text="ЛКМ — идти / подойти к объекту · WASD — ходьба · E — взаимодействие\nПКМ / средняя кнопка — вращение · Колесо — приближение · F11 — полный экран"
func show_floors():
 show_panel("Спуск в бездну")
 label("Руины · лагерем восстанавливается здоровье отряда",content,17)
 for n in [2,3,4]:button(str(n)+" · "+["Забытый проход","Сломанные арки","Шёпот стражей"][n-2]+("   ✓" if progress.save.completed.has(n) else ""),content,begin_floor.bind(n),n>progress.save.unlocked)
 label("Этажи 5–10 остаются в 2D-версии и здесь недоступны.",content,16)
func show_pets():
 show_panel("Отряд и коллекция · "+str(progress.members().size())+" / "+str(progress.capacity()))
 for p in progress.save.pets:
  var spec=progress.data.species[p.species];var mark="✓ " if progress.save.squad.has(p.id) else "+ "
  button(mark+spec.name+" · "+progress.data.rarities[p.rarity].name+" · Ур. "+str(int(p.level)),content,toggle_member.bind(p.id))
  label("HP "+str(int(progress.max_hp(p)))+" · Урон "+str(int(progress.damage(p)))+" · "+str(progress.interval(p))+" с · XP "+str(int(p.xp))+" / "+str(int(35+(p.level-1)*100)),content,16)
  label(spec.skill+" · "+str(int(progress.damage(p,true)))+" урона · "+str(progress.cooldown(p))+" с",content,15)
  label(progress.data.passives[p.species].text,content,15)
func toggle_member(id:String):
 if not progress.toggle_pet(id):toast("Нужен хотя бы один питомец; дополнительные места открываются у дерева")
 refresh_followers();show_pets()
func refresh_followers():
 for node in followers:node.queue_free()
 followers.clear()
 for member in progress.members():
  var node=Vox.model(member.species,.095);node.position=hero.position;world.add_child(node);followers.append(node)
func show_tree():
 show_panel("Дерево навыков · ◆ "+str(int(progress.save.coins)))
 var branch=""
 for node in progress.all_nodes():
  if node.branch!=branch:branch=node.branch;label(branch.to_upper(),content,22)
  var max_rank=1 if node.id.begins_with("slot") else 5
  button(node.name+" · "+str(progress.rank(node.id))+" / "+str(max_rank)+" · ◆ "+str(progress.node_cost(node)),content,upgrade.bind(node),not progress.can_upgrade(node))
  var requirement=""
  if node.prerequisite!="" and not progress.rank(node.prerequisite):
   for other in progress.all_nodes():
    if other.id==node.prerequisite:requirement=" · Требуется: "+other.name
  label(progress.node_effect(node)+requirement,content,14)
func upgrade(node:Dictionary):progress.buy_node(node);show_tree();update_hud()
func show_eggs():
 show_panel("Яйца питомцев")
 label("Кошка · Волк · Крылан",content,23)
 var odds=progress.odds();var keys=progress.data.rarities.keys()
 for i in keys.size():label(progress.data.rarities[keys[i]].name+" · "+str(snappedf(odds[i],.1))+"%",content,18)
 button("Купить и открыть · ◆ "+str(progress.egg_price()),content,hatch,progress.save.coins<progress.egg_price())
func hatch():
 var p=progress.hatch()
 if p.is_empty():return
 show_panel("Получен питомец!");label(progress.data.species[p.species].name,content,28);label(progress.data.rarities[p.rarity].name,content,23);button("Отряд",content,show_pets);button("Ещё одно яйцо",content,show_eggs)
func show_workshop(member_id=""):
 show_panel("Мастерская · предметы")
 var member=progress.save.pets[0]
 for p in progress.save.pets:
  if p.id==member_id:member=p
 var row=HBoxContainer.new();content.add_child(row)
 for p in progress.save.pets:button(progress.data.species[p.species].name,row,show_workshop.bind(p.id))
 label(progress.data.species[member.species].name+" · HP "+str(int(progress.max_hp(member)))+" · Урон "+str(int(progress.damage(member))),content,21)
 var equipped={}
 for item in progress.save.items:
  if item.id==member.itemId:equipped=item
 label("Предмет: "+(progress.data.items[equipped.type].name+" · "+str(int(equipped.tier)) if not equipped.is_empty() else "пусто"),content,18)
 for type in progress.data.items:
  var recipe=progress.data.items[type];var tier=int(equipped.get("tier",0))+1 if equipped.get("type","")==type else 1
  var locked=tier>3 or recipe.gates[mini(tier-1,2)]>progress.save.unlocked or recipe.costs[mini(tier-1,2)]>progress.save.coins
  button(recipe.name+" · "+str(tier)+" · "+("Максимум" if tier>3 else "◆ "+str(recipe.costs[tier-1])+" · этаж "+str(recipe.gates[tier-1])),content,craft.bind(type,member),locked)
  var index=mini(tier-1,2);label("Урон +"+str(roundi(recipe.damage[index]*100))+"% · HP +"+str(roundi(recipe.hp[index]*100))+"% · Защита +"+str(roundi(recipe.resist[index]*100))+"%",content,14)
 for item in progress.save.items:button("Надеть: "+progress.data.items[item.type].name+" "+str(int(item.tier)),content,equip.bind(member,item.id))
 button("Снять предмет",content,equip.bind(member,""),member.itemId=="")
func craft(type:String,member:Dictionary):progress.craft(type,member);show_workshop(member.id)
func equip(member:Dictionary,id:String):progress.equip(member,id);show_workshop(member.id)
func show_bestiary():
 if state=="fall" or state=="result":return
 show_panel("Бестиарий")
 if progress.save.bestiary.is_empty():label("Встреченные враги появятся здесь после первого боя.",content)
 for id in progress.save.bestiary:
  var record=progress.save.bestiary[id];var rules=progress.data.floors[str(int(record.floor))]
  var boss=id.begins_with("boss");var guard=id.ends_with("guard")
  label(("Босс этажа "+str(int(record.floor)) if boss else "Страж руин" if guard else "Тень руин")+" · Убито: "+str(int(record.kills)),content,23)
  label("HP "+str(int(rules.bossHealth if boss else rules.guardHealth if guard else rules.health)),content)
  label("Разлом по всему отряду: прерывается навыком." if boss else "Укрепляет броню; навык сбивает защиту." if guard else "Атакует питомцев в ближнем бою.",content)
func show_settings():
 if state=="fall" or state=="result":return
 show_panel("Пауза" if state=="run" else "Меню")
 button("Продолжить",content,close_panel);button("Звук: "+("вкл." if sound else "выкл."),content,toggle_sound)
 button("Восстановить камеру",content,reset_camera)
 if state=="run":button("Вернуться в лагерь",content,camp)
 button("Сбросить прогресс…",content,confirm_reset)
 button("Выйти",content,func():get_tree().quit())
func reset_camera():yaw=.72;pitch=.8;distance=54 if state=="camp" else 27;close_panel()
func toggle_sound():sound=not sound;beep();show_settings()
func confirm_reset():
 show_panel("Сбросить прогресс?");label("Будут удалены питомцы, предметы и улучшения этой 3D-версии.",content);button("Отмена",content,show_settings);button("Подтвердить сброс",content,func():progress.reset();progress.persist();camp())
func show_result(win:bool,message:String):
 state="result";show_panel(message,true)
 label("Получено кристаллов: "+str(int(progress.save.coins-battle.starting_coins)),content,23)
 if win and battle.stage<4:button("Следующий этаж",content,begin_floor.bind(battle.stage+1))
 elif win:label("Все три этажа 3D-версии пройдены!",content,23)
 button("Повторить этаж",content,begin_floor.bind(battle.stage));button("Вернуться в лагерь",content,camp)
func capture(path:String):
 await get_tree().process_frame
 await get_tree().process_frame
 get_viewport().get_texture().get_image().save_png(path)
 print("CAPTURE "+path)
func smoke_test():
 await get_tree().process_frame
 var target=world.objects.filter(func(o):return o.id=="workshop")[0]
 assert(not world.route(hero.position,target.entrance).is_empty(),"Workshop must be reachable")
 assert(not world.camp_walkable(world.HOLE.x,world.HOLE.z),"Abyss must be solid to navigation")
 assert(not world.camp_walkable(world.stream(8),8),"River must only be crossed at bridge")
 for o in world.objects:assert(not world.route(hero.position,o.entrance).is_empty(),"Every building must have a path: "+o.id)
 assert(not begin_floor(5),"Excluded floors cannot start")
 progress.save.coins=3000
 for id in ["slot2","health","damage"]:
  var node=progress.all_nodes().filter(func(n):return n.id==id)[0];assert(progress.buy_node(node))
 var pet=progress.hatch();assert(not pet.is_empty());assert(progress.toggle_pet(pet.id));assert(progress.craft("fang",progress.save.pets[0]))
 assert(progress.persist());var loaded=Progression.new(progress.file_path);loaded.load_progress();assert(loaded.save.coins==progress.save.coins)
 var baseline=progress.max_hp(progress.save.pets[0]);assert(baseline>64)
 for n in [2,3,4]:
  progress.vitals.clear();enter_floor(n)
  assert(battle.enemies.size()==int(battle.rules.count)*4)
  for i in 40:battle.tick(.05)
  assert(battle.time>1 and hero.position.z<0)
  battle.spawn_enemy(battle.p+60,0,"shadow");var enemy=battle.enemies[-1]
  assert(battle.skill(0));assert(battle.pets[0].cd>0)
  var hp=enemy.hp;battle.hit(enemy,99999);assert(enemy.hp<hp)
  battle.spawn_enemy(1910,0,"boss");battle.hit(battle.boss,999999);battle.finish(true,"Test");assert(state=="result")
  camp();assert(progress.vitals.is_empty())
 print("SMOKE PASS: VOX mesh, navigation, progression, persistence, abilities, floors 2–4, result, camp reset; 5–10 excluded")
 get_tree().quit()

func visual_test(folder:String):
 await get_tree().process_frame
 var initial=yaw
 var press=InputEventMouseButton.new();press.button_index=MOUSE_BUTTON_RIGHT;press.pressed=true;_unhandled_input(press)
 var motion=InputEventMouseMotion.new();motion.relative=Vector2(65,12);_unhandled_input(motion)
 assert(yaw!=initial and pitch>.8)
 press.pressed=false;_unhandled_input(press)
 var wheel=InputEventMouseButton.new();wheel.button_index=MOUSE_BUTTON_WHEEL_UP;wheel.pressed=true
 var previous_distance=distance;_unhandled_input(wheel);assert(distance<previous_distance)
 reset_camera()
 await capture(folder+"/camp.png")
 show_pets();await capture(folder+"/pets.png");close_panel()
 for stage in [2,3,4]:
  enter_floor(stage)
  for i in 120:battle.tick(.05)
  camera_target=hero.position+Vector3(0,1,-3)
  await capture(folder+"/floor-"+str(stage)+".png")
  battle.spawn_enemy(battle.p+100,0,"boss")
  battle.boss.windup=1.2
  await capture(folder+"/boss-"+str(stage)+".png")
  camp()
 print("VISUAL PASS: mouse camera rotation and zoom, camp, pets panel, all three floors and bosses")
 get_tree().quit()

func simulation_test():
 await get_tree().process_frame
 for n in [2,3,4]:
  progress.save.unlocked=4;progress.vitals.clear();enter_floor(n)
  for i in 920:
   if state!="run":break
   for index in battle.pets.size():battle.skill(index)
   battle.rally()
   for gem in battle.gems:
    if not gem.taken and gem.node.position.distance_to(hero.position)<4:battle.take_gem(gem)
   battle.tick(.05)
  assert(state=="result","Run must complete within 45 seconds")
  print("SIMULATION floor ",n," time=",battle.time," progress=",battle.p," coins=",progress.save.coins," hp=",battle.pets[0].hp)
  camp()
 print("SIMULATION PASS: real combat reaches a terminal result on all three floors")
 get_tree().quit()
