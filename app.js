(function(){
'use strict';

const DEFAULT_GROUPS = ['Chest','Back','Shoulders','Arms','Legs','Core','Other'];
const FEEL = ['Easy','Good','Solid','Hard','Max'];
const KEY = 'machine-log-v1';

/* Typical machine types and the adjustments they usually have. Not confirmed for any specific club. */
const DEFAULT_PRESETS = [
  {id:'p-chest-press',  name:'Chest press',      group:'Chest',     settings:['Seat height','Handle position']},
  {id:'p-pec-fly',      name:'Pec fly',          group:'Chest',     settings:['Seat height','Arm start position']},
  {id:'p-lat-pulldown', name:'Lat pulldown',     group:'Back',      settings:['Seat height','Thigh pad','Grip']},
  {id:'p-seated-row',   name:'Seated row',       group:'Back',      settings:['Seat height','Chest pad']},
  {id:'p-back-ext',     name:'Back extension',   group:'Back',      settings:['Seat position','Back pad']},
  {id:'p-shoulder-press',name:'Shoulder press',  group:'Shoulders', settings:['Seat height']},
  {id:'p-lateral-raise',name:'Lateral raise',    group:'Shoulders', settings:['Seat height','Arm pad']},
  {id:'p-rear-delt',    name:'Rear delt fly',    group:'Shoulders', settings:['Seat height','Arm start position']},
  {id:'p-bicep-curl',   name:'Bicep curl',       group:'Arms',      settings:['Seat height','Arm pad']},
  {id:'p-tricep',       name:'Tricep extension', group:'Arms',      settings:['Seat height','Start position']},
  {id:'p-leg-press',    name:'Leg press',        group:'Legs',      settings:['Seat position','Back angle']},
  {id:'p-leg-ext',      name:'Leg extension',    group:'Legs',      settings:['Seat back','Shin pad']},
  {id:'p-leg-curl',     name:'Leg curl',         group:'Legs',      settings:['Seat back','Ankle pad']},
  {id:'p-hip-abd',      name:'Hip abductor',     group:'Legs',      settings:['Seat position','Start width']},
  {id:'p-hip-add',      name:'Hip adductor',     group:'Legs',      settings:['Seat position','Start width']},
  {id:'p-glute',        name:'Glute kickback',   group:'Legs',      settings:['Chest pad','Foot pad']},
  {id:'p-calf',         name:'Calf raise',       group:'Legs',      settings:['Seat position','Shoulder pad']},
  {id:'p-ab-crunch',    name:'Ab crunch',        group:'Core',      settings:['Seat height','Pad position']},
  {id:'p-smith',        name:'Smith machine',    group:'Other',     settings:['Bar height','Safety stop height']},
  {id:'p-cable',        name:'Cable tower',      group:'Other',     settings:['Pulley height','Attachment']}
];
const clonePresets = () => DEFAULT_PRESETS.map(p => ({id:p.id, name:p.name, group:p.group, settings:p.settings.slice()}));

/* ---------- state ---------- */
function seed(){
  return { v:1, unit:'lb', collapsed:[], notes:{}, sets:[], machines:[
    {id:'chest-press',   name:'Chest press',    group:'Chest'},
    {id:'pec-fly',       name:'Pec fly',        group:'Chest'},
    {id:'lat-pulldown',  name:'Lat pulldown',   group:'Back'},
    {id:'seated-row',    name:'Seated row',     group:'Back'},
    {id:'shoulder-press',name:'Shoulder press', group:'Shoulders'},
    {id:'leg-press',     name:'Leg press',      group:'Legs'},
    {id:'leg-curl',      name:'Leg curl',       group:'Legs'}
  ]};
}
function cleanSettings(a){
  if(!Array.isArray(a)) return [];
  return a.filter(x => x && typeof x === 'object').slice(0,30).map(x => ({
    id: String(x.id || Math.random().toString(36).slice(2,9)),
    name: x.name == null ? '' : String(x.name).slice(0,30),
    value: x.value == null ? '' : String(x.value).slice(0,30)
  }));
}
function cleanPresets(a){
  return a.filter(x => x && typeof x === 'object').slice(0,100).map(x => ({
    id: String(x.id || Math.random().toString(36).slice(2,9)),
    name: x.name == null ? '' : String(x.name).slice(0,40),
    group: (typeof x.group === 'string' && x.group.trim()) ? x.group.trim().slice(0,20) : 'Other',
    settings: Array.isArray(x.settings) ? x.settings.filter(t => typeof t === 'string').map(t => t.slice(0,30)).slice(0,30) : []
  }));
}
function cleanNotes(n){
  const out = {};
  if(n && typeof n === 'object' && !Array.isArray(n)){
    Object.keys(n).forEach(k => { if(typeof n[k] === 'string' && n[k].trim()) out[k] = n[k].slice(0,1000); });
  }
  return out;
}
function cleanGroups(a, machines){
  const out = [];
  const add = g => {
    const name = typeof g === 'string' ? g.trim().replace(/\s+/g,' ').slice(0,20) : '';
    if(name && !out.some(x => x.toLowerCase() === name.toLowerCase())) out.push(name);
  };
  (Array.isArray(a) ? a : DEFAULT_GROUPS).forEach(add);
  machines.forEach(m => add(m.group));            // never hide a machine whose body part is missing from the list
  if(!out.length) DEFAULT_GROUPS.forEach(add);
  return out.slice(0,30);
}
function normalize(d){
  d = JSON.parse(JSON.stringify(d || {}));
  const s = seed();
  const machines = (Array.isArray(d.machines) ? d.machines : s.machines).map(m => Object.assign({}, m, {settings: cleanSettings(m.settings)}));
  const groups = cleanGroups(d.groups, machines);
  return {
    v:1,
    unit: d.unit === 'kg' ? 'kg' : 'lb',
    groups,
    collapsed: Array.isArray(d.collapsed) ? d.collapsed.filter(g => groups.includes(g)) : [],
    machines,
    sets: Array.isArray(d.sets) ? d.sets : [],
    notes: cleanNotes(d.notes),
    presets: Array.isArray(d.presets) ? cleanPresets(d.presets) : null
  };
}
function loadLocal(){
  try{ const raw = localStorage.getItem(KEY); if(raw) return normalize(JSON.parse(raw)); }catch(e){}
  return null;
}
function cacheLocal(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); return true; }catch(e){ return false; } }

let state = loadLocal() || normalize(seed());
const ui = {
  tab:'log', selected:null, draft:null, error:'', adding:false, confirmRemove:false, editing:false, armedId:null, metric:'top', logDate:null,
  histMachine:null, flashId:null, editNote:null, editSettings:false, armedGroup:null, groupMsg:'', dragging:false, importPending:null, importMsg:'', presetView:false, presetEdit:false, presetSel:{}, armedPreset:null, armedReset:false
};

/* ---------- helpers ---------- */
const rid = () => Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4);
const dk = ts => { const d=new Date(ts); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
const tsFor = key => { const [y,m,d] = key.split('-').map(Number), n = new Date(); return new Date(y, m-1, d, n.getHours(), n.getMinutes(), n.getSeconds()).getTime(); };
const fmtDate = ts => new Date(ts).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
const fmtShort = ts => new Date(ts).toLocaleDateString(undefined,{month:'short',day:'numeric'});
const fmtNum = n => String(Math.round(n*10)/10);
const sortedGroups = extra => state.groups.concat(extra && !state.groups.includes(extra) ? [extra] : [])
  .sort((a,b) => a.localeCompare(b, undefined, {sensitivity:'base'}));   // dropdowns only: A to Z. The main screen keeps your own order.
const machineById = id => state.machines.find(m => m.id === id);
const setsFor = id => state.sets.filter(s => s.machineId === id);

function h(tag, attrs, ...kids){
  const el = document.createElement(tag);
  for(const [k,v] of Object.entries(attrs || {})){
    if(v == null || v === false) continue;
    if(k === 'class') el.className = v;
    else if(k === 'text') el.textContent = v;
    else if(k === 'value') el.value = v;
    else if(k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if(v === true) el.setAttribute(k,'');
    else el.setAttribute(k, v);
  }
  for(const kid of kids.flat(Infinity)){
    if(kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
function ticks(f){
  return h('span',{class:'ticks',role:'img','aria-label':'Felt '+FEEL[f-1]},
    [1,2,3,4,5].map(i => h('i',{class: i<=f ? 'on' : ''})));
}
function sessionsFor(mid){
  const by = new Map();
  setsFor(mid).sort((a,b)=>a.ts-b.ts).forEach(s=>{
    const k = dk(s.ts);
    if(!by.has(k)) by.set(k,{key:k,ts:s.ts,sets:[]});
    by.get(k).sets.push(s);
  });
  return [...by.values()];
}

/* ---------- saving: everything stays on this device ---------- */
let noteTimer = null;
const syncEl = document.getElementById('sync');
function setSync(text, warn){ syncEl.textContent = text; syncEl.className = 'sync' + (warn ? ' warn' : ''); }

function commit(){
  if(cacheLocal()) setSync('Saved on this device');
  else setSync('Could not save. Free up space, then export a backup.', true);
}
function setNote(key, val){
  const v = String(val).slice(0,1000);
  if(v.trim()) state.notes[key] = v; else delete state.notes[key];
  typed();
}
function typed(){
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => { noteTimer = null; commit(); }, 500);
}
function flushNote(){ if(noteTimer){ clearTimeout(noteTimer); noteTimer = null; commit(); } }
function purgeNotes(mid){ Object.keys(state.notes).forEach(k => { if(k.startsWith(mid + '@')) delete state.notes[k]; }); }
window.addEventListener('pagehide', flushNote);
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden') flushNote(); });

/* ---------- log tab ---------- */
function logView(){
  if(!ui.selected) ui.editSettings = false;
  if(ui.presetView && !ui.selected) return presetView();
  return ui.selected && machineById(ui.selected) ? entryView(machineById(ui.selected)) : pickerView();
}

function pickerView(){
  const today = dk(Date.now());
  const wrap = h('div');
  const armed = ui.armedId && machineById(ui.armedId);
  wrap.append(h('div',{class:'picker-bar'},
    h('p',{class:'lede',text: ui.editing
      ? (armed ? 'Removing ' + armed.name + ' also deletes its logged sets.' : 'Rename, reorder or remove body parts, and remove exercises you no longer do.')
      : 'Pick a machine or exercise.'}),
    h('button',{type:'button',class:'btn ghost small',onclick:()=>{ ui.editing = !ui.editing; ui.armedId = null; ui.armedGroup = null; ui.groupMsg = ''; render(false); }}, ui.editing ? 'Done' : 'Edit list')));
  if(ui.editing && ui.groupMsg) wrap.append(h('p',{class:'err',role:'alert',text:ui.groupMsg}));
  const usedGroups = state.groups.filter(g => state.machines.some(m => m.group === g));
  if(!ui.editing && usedGroups.length > 1){
    const allCollapsed = usedGroups.every(g => state.collapsed.includes(g));
    wrap.append(h('div',{style:'margin-top:2px'}, h('button',{type:'button',class:'linkbtn',onclick:()=>{
      state.collapsed = allCollapsed ? [] : usedGroups.slice();
      commit(); render(false);
    }}, allCollapsed ? 'Expand all' : 'Collapse all')));
  }
  if(!state.machines.length) wrap.append(h('p',{class:'empty',text:'Nothing here yet. Add the machines and exercises you do.'}));
  const list = h('div',{class:'groups'});
  state.groups.forEach((g, i) => {
    const ms = state.machines.filter(m => m.group === g);
    if(!ms.length && !ui.editing) return;
    if(ui.editing){
      list.append(h('section',{class:'group','data-g':g},
        groupEditHeader(i, ms.length),
        ms.length ? h('div',{class:'machines'}, ms.map(m => machineCard(m, today))) : null));
      return;
    }
    const collapsed = state.collapsed.includes(g);
    const count = h('span',{class:'count',text: ms.length + (ms.length === 1 ? ' item' : ' items')});
    const handle = usedGroups.length > 1 ? h('button',{type:'button',class:'drag-handle','aria-label':'Reorder '+g+'. Drag, or use the up and down arrow keys.',
      onpointerdown:e => startDrag(e, list),
      onkeydown:e => { if(e.key === 'ArrowUp' || e.key === 'ArrowDown'){ e.preventDefault(); moveVisible(g, e.key === 'ArrowUp' ? -1 : 1); } }}) : null;
    if(handle) handle.innerHTML = GRIP;
    list.append(h('section',{class:'group','data-g':g},
      h('h2',{}, h('button',{type:'button',class:'gh','aria-expanded':String(!collapsed),onclick:()=>toggleGroup(g)},
        h('span',{class:'l'}, g, count), chevDown()), handle),
      collapsed ? null : h('div',{class:'machines'}, ms.map(m => machineCard(m, today)))
    ));
  });
  wrap.append(list);
  if(ui.editing) wrap.append(addGroupForm());
  wrap.append(addMachine());
  if(!ui.adding && !ui.editing){
    wrap.append(h('button',{type:'button',class:'add-btn tight',onclick:()=>{
      ui.presetView = true; ui.presetEdit = false; ui.presetSel = {}; ui.editing = false; render(false);
    }},'Add from preset list'));
  }
  return wrap;
}
function toggleGroup(g){
  const i = state.collapsed.indexOf(g);
  if(i >= 0) state.collapsed.splice(i,1); else state.collapsed.push(g);
  commit(); render();
}
function chevDown(){
  const s = h('span',{class:'chev','aria-hidden':'true'});
  s.innerHTML = '<svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 7.5 10 13l5.5-5.5"/></svg>';
  return s;
}
function removeMachine(id){
  if(ui.armedId !== id){ ui.armedId = id; render(); return; }
  state.machines = state.machines.filter(x => x.id !== id);
  state.sets = state.sets.filter(x => x.machineId !== id);
  purgeNotes(id);
  if(ui.selected === id) ui.selected = null;
  ui.armedId = null; commit(); render();
}
function machineCard(m, today){
  const all = setsFor(m.id);
  const n = all.filter(s => dk(s.ts) === today).length;
  let meta = 'Not logged yet';
  if(n) meta = n + (n === 1 ? ' set today' : ' sets today');
  else if(all.length) meta = 'Last done ' + fmtShort(Math.max(...all.map(s=>s.ts)));
  if(ui.editing){
    const armed = ui.armedId === m.id;
    return h('div',{class:'machine edit'+(n?' done':'')},
      h('span',{class:'name',text:m.name}),
      h('span',{class:'meta',text: all.length + (all.length === 1 ? ' set logged' : ' sets logged')}),
      h('button',{type:'button',class:'rm'+(armed?' armed':''),'aria-label':(armed?'Confirm remove ':'Remove ')+m.name,onclick:()=>removeMachine(m.id)}, armed ? 'Tap again to confirm' : 'Remove'));
  }
  return h('button',{type:'button',class:'machine'+(n?' done':''),onclick:()=>selectMachine(m.id)},
    h('span',{class:'name',text:m.name}),
    h('span',{class:'meta',text:meta})
  );
}
function selectMachine(id){
  const last = setsFor(id).sort((a,b)=>b.ts-a.ts)[0];
  ui.selected = id; ui.editSettings = false;
  ui.draft = { weight: last ? last.weight : 0, reps: last ? last.reps : 10, feeling: last ? last.feeling : 3 };
  ui.error = ''; ui.confirmRemove = false;
  render(false);
}
function addMachine(){
  if(!ui.adding) return h('button',{type:'button',class:'add-btn',onclick:()=>{ ui.adding = true; render(); setTimeout(()=>{ const i=document.getElementById('new-name'); if(i) i.focus(); },0); }},'Add a machine/exercise');
  const err = h('p',{class:'err',role:'alert'});
  const name = h('input',{id:'new-name',class:'txt',type:'text',maxlength:'40',placeholder:'Name, like Hack squat or Push-ups','aria-label':'Machine or exercise name'});
  const grp = h('select',{class:'txt','aria-label':'Body part'}, sortedGroups().map(g => h('option',{value:g,selected:g === state.groups[0]}, g)));
  const save = () => {
    const n = name.value.trim();
    if(!n){ err.textContent = 'Give it a name.'; name.focus(); return; }
    state.machines.push({id:rid(), name:n.slice(0,40), group:grp.value, settings:[]});
    ui.adding = false; commit(); render();
  };
  name.addEventListener('keydown', e => { if(e.key === 'Enter') save(); });
  return h('div',{class:'form'}, name, grp, err,
    h('div',{class:'row'},
      h('button',{type:'button',class:'btn ghost',onclick:()=>{ ui.adding = false; render(); }},'Cancel'),
      h('button',{type:'button',class:'btn',onclick:save},'Save')));
}

function entryView(m){
  const today = dk(Date.now());
  const day = ui.logDate || today;
  const todays = setsFor(m.id).filter(s => dk(s.ts) === day).sort((a,b)=>a.ts-b.ts);
  const prev = sessionsFor(m.id).filter(s => s.key < day).pop();
  const step = state.unit === 'kg' ? 2.5 : 5;
  const wrap = h('div');

  wrap.append(
    h('button',{type:'button',class:'back',onclick:()=>{ ui.selected = null; ui.error=''; render(false); }},
      chevron(), 'All machines/exercises'),
    h('h2',{class:'m-title',text:m.name}),
    h('div',{class:'m-group'}, h('select',{class:'txt gsel','aria-label':'Body part',onchange:e => {
      m.group = e.target.value; state.collapsed = state.collapsed.filter(g => g !== m.group); commit(); render();
    }}, sortedGroups(m.group).map(g => h('option',{value:g,selected:g === m.group}, g))))
  );
  wrap.append(settingsBlock(m));

  wrap.append(h('div',{class:'lbl',text:'Date'}),
    h('div',{class:'daterow'+(day !== today ? ' past' : '')},
      h('input',{class:'txt',type:'date',value:day,max:today,'aria-label':'Date of this workout',
        onchange:e=>{ const v = e.target.value; ui.logDate = (!v || v >= today) ? null : v; render(); }}),
      day !== today ? h('button',{type:'button',class:'btn ghost',onclick:()=>{ ui.logDate = null; render(); }},'Today') : null));
  wrap.append(h('div',{class:'lbl',text:'Weight, '+state.unit}), stepper('weight', step, 'weight', 0));
  wrap.append(h('div',{class:'lbl',text:'Reps'}), stepper('reps', 1, 'reps', 0));

  wrap.append(h('div',{class:'lbl',text:'How it felt'}),
    h('div',{class:'feel',role:'group','aria-label':'How it felt'},
      FEEL.map((label,i)=>{
        const lvl = i+1;
        return h('button',{type:'button',class: lvl <= ui.draft.feeling ? 'fill' : '','aria-pressed': String(lvl === ui.draft.feeling),
          onclick:()=>{ ui.draft.feeling = lvl; render(); }},
          h('span',{class:'bar',style:'height:'+(8+lvl*6)+'px'}), label);
      })));

  if(ui.error) wrap.append(h('p',{class:'err',role:'alert',text:ui.error}));
  wrap.append(h('button',{type:'button',class:'log',onclick:()=>logSet(m)},'Log set '+(todays.length+1)+(day !== today ? ' on '+fmtShort(tsFor(day)) : '')));

  wrap.append(h('div',{class:'list-h'}, h('h3',{text: day === today ? 'Today' : fmtDate(tsFor(day))}), h('span',{text: todays.length ? todays.length+(todays.length===1?' set':' sets') : ''})));
  if(!todays.length) wrap.append(h('p',{class:'note',text:'No sets yet. Log your first one above.'}));
  else wrap.append(h('ul',{class:'sets'}, todays.map((s,i)=>
    h('li',{class:'setrow'+(s.id === ui.flashId ? ' flash' : '')},
      h('span',{class:'sn',text:'Set '+(i+1)}),
      h('span',{class:'sv',text:fmtNum(s.weight)+' '+state.unit+' × '+s.reps}),
      ticks(s.feeling),
      h('button',{type:'button',class:'x','aria-label':'Delete set '+(i+1),onclick:()=>{
        state.sets = state.sets.filter(x => x.id !== s.id); commit(); render();
      }},'×')))));
  ui.flashId = null;

  wrap.append(h('div',{class:'lbl',text:'Notes for this session'}), noteBox(m.id, day));

  if(prev){
    wrap.append(h('div',{class:'last',text:'Last session, '+fmtDate(prev.ts)}),
      h('div',{class:'chips'}, prev.sets.map(s => h('div',{class:'chip'}, h('b',{text:fmtNum(s.weight)+' × '+s.reps}), ticks(s.feeling)))),
      state.notes[m.id + '@' + prev.key] ? h('p',{class:'note-text',text:state.notes[m.id + '@' + prev.key]}) : null);
  }

  if(setsFor(m.id).length) wrap.append(h('div',{style:'margin-top:8px'}, progressBlock(m.id)));

  const hasDemo = setsFor(m.id).some(x => x.demo);
  wrap.append(h('div',{class:'sample'},
    h('button',{type:'button',class:'remove',onclick:()=>addSample(m)},'Add sample sessions'),
    hasDemo ? h('button',{type:'button',class:'remove',onclick:()=>{
      state.sets = state.sets.filter(x => !(x.machineId === m.id && x.demo)); commit(); render();
    }},'Remove sample sessions') : null),
    h('p',{class:'note',text:'Sample sessions fill in six past weeks so you can preview the graph. They use the weight above, or reps only if it is 0.'}));

  wrap.append(h('button',{type:'button',class:'remove'+(ui.confirmRemove?' armed':''),onclick:()=>{
    if(!ui.confirmRemove){ ui.confirmRemove = true; render(); return; }
    state.machines = state.machines.filter(x => x.id !== m.id);
    state.sets = state.sets.filter(x => x.machineId !== m.id);
    purgeNotes(m.id);
    ui.selected = null; ui.confirmRemove = false; commit(); render(false);
  }}, ui.confirmRemove ? 'Tap again to remove this and its history' : 'Remove this machine/exercise'));
  return wrap;
}
function tidySettings(m){
  m.settings = m.settings.filter(x => x.name.trim() || x.value.trim())
    .map(x => Object.assign({}, x, {name:x.name.trim(), value:x.value.trim()}));
  clearTimeout(noteTimer); noteTimer = null;
  commit();
}
function focusLastSettingName(){
  setTimeout(() => {
    const els = document.querySelectorAll('.setting-row input[aria-label="Setting name"]');
    if(els.length) els[els.length - 1].focus();
  }, 0);
}
function settingsBlock(m){
  const box = h('div',{class:'settings'});
  const editing = ui.editSettings;
  const shown = m.settings.filter(x => x.name.trim() || x.value.trim());
  box.append(h('div',{class:'set-h'},
    h('span',{class:'t',text:'Settings'}),
    h('button',{type:'button',class:'linkbtn',onclick:()=>{
      if(editing){ tidySettings(m); ui.editSettings = false; render(); return; }
      ui.editSettings = true;
      if(!m.settings.length) m.settings.push({id:rid(), name:'', value:''});
      render(); focusLastSettingName();
    }}, editing ? 'Done' : (shown.length ? 'Edit' : 'Add settings'))));

  if(!editing){
    if(shown.length){
      box.append(h('div',{class:'chips'}, shown.map(x => h('div',{class:'chip'},
        h('span',{class:'sname',text:x.name || 'Setting'}), h('b',{text:x.value || '–'})))));
    }else{
      box.append(h('p',{class:'note',text:'Save seat height, pad position or anything else you adjust on this one.'}));
    }
    return box;
  }

  m.settings.forEach(st => box.append(h('div',{class:'setting-row'},
    h('input',{class:'txt',type:'text',maxlength:'30',placeholder:'Name, like Seat','aria-label':'Setting name',value:st.name,
      oninput:e => { st.name = e.target.value; typed(); }, onblur:() => flushNote()}),
    h('input',{class:'txt',type:'text',maxlength:'30',placeholder:'Value','aria-label':'Value for '+(st.name || 'setting'),value:st.value,
      oninput:e => { st.value = e.target.value; typed(); }, onblur:() => flushNote()}),
    h('button',{type:'button',class:'x','aria-label':'Remove setting '+(st.name || ''),onclick:()=>{
      m.settings = m.settings.filter(x => x.id !== st.id); clearTimeout(noteTimer); noteTimer = null; commit(); render();
    }},'×'))));
  box.append(h('button',{type:'button',class:'btn ghost',style:'width:100%;margin-top:10px',onclick:()=>{
    m.settings.push({id:rid(), name:'', value:''}); render(); focusLastSettingName();
  }},'Add another setting'));
  return box;
}
function noteBox(mid, day, autofocus){
  const key = mid + '@' + day;
  const ta = h('textarea',{class:'txt note-box',rows:'3',maxlength:'1000','aria-label':'Notes for this session',
    placeholder:'Seat setting, grip, what to change next time',value:state.notes[key] || '',
    oninput:e => setNote(key, e.target.value), onblur:() => flushNote()});
  if(autofocus) setTimeout(() => ta.focus(), 0);
  return ta;
}
function noteRow(mid, day){
  const key = mid + '@' + day, text = state.notes[key];
  if(ui.editNote === key){
    return h('div',{style:'margin-top:10px'}, noteBox(mid, day, true),
      h('button',{type:'button',class:'linkbtn',onclick:()=>{ flushNote(); ui.editNote = null; render(); }},'Done'));
  }
  const edit = () => { ui.editNote = key; render(); };
  return text
    ? h('div',{}, h('p',{class:'note-text',text}), h('button',{type:'button',class:'linkbtn',onclick:edit},'Edit note'))
    : h('button',{type:'button',class:'linkbtn',onclick:edit},'Add note');
}
function chevron(){
  const s = h('span',{'aria-hidden':'true'});
  s.innerHTML = '<svg width="26" height="26" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M12.5 4.5 7 10l5.5 5.5"/></svg>';
  return s;
}
function stepper(key, step, label, min){
  const input = h('input',{type:'text',inputmode: key === 'weight' ? 'decimal' : 'numeric',autocomplete:'off',
    'aria-label':label, value: ui.draft[key],
    onfocus:e=>e.target.select(),
    oninput:e=>{
      const v = parseFloat(String(e.target.value).replace(',','.'));
      ui.draft[key] = isNaN(v) ? '' : v; ui.error = '';
    }});
  const bump = d => {
    const cur = Number(ui.draft[key]) || 0;
    ui.draft[key] = Math.max(min, Math.round((cur + d) * 10) / 10);
    input.value = ui.draft[key];
  };
  return h('div',{class:'stepper'},
    h('button',{type:'button','aria-label':'Decrease '+label,onclick:()=>bump(-step)},'−'),
    h('div',{class:'val'}, input),
    h('button',{type:'button','aria-label':'Increase '+label,onclick:()=>bump(step)},'+'));
}
function addSample(m){
  const w0 = Number(ui.draft.weight) || 0, step = state.unit === 'kg' ? 2.5 : 5, weeks = 6, n = new Date();
  for(let i = 0; i < weeks; i++){
    const daysAgo = (weeks - i) * 7 - (i % 2);
    const base = new Date(n.getFullYear(), n.getMonth(), n.getDate() - daysAgo, 18, 0, 0).getTime();
    const w = w0 > 0 ? Math.max(step, Math.round(w0 * (0.85 + 0.03 * i) / step) * step) : 0;
    const reps = w0 > 0 ? [10, 10, 9] : [8 + i * 2, 7 + i * 2, 6 + i * 2];
    [3, 4, 4].forEach((f, j) => state.sets.push({id:rid(), machineId:m.id, ts:base + j * 150000,
      weight:w, reps:reps[j], feeling:f, demo:true}));
  }
  commit(); render();
}
function logSet(m){
  const w = Number(ui.draft.weight), r = Math.round(Number(ui.draft.reps));
  if(ui.draft.weight === '' || isNaN(w) || w < 0){ ui.error = 'Enter the weight you used. Zero is fine for bodyweight.'; render(); return; }
  if(ui.draft.reps === '' || !(r >= 1)){ ui.error = 'Enter how many reps you did.'; render(); return; }
  const s = {id:rid(), machineId:m.id, ts:tsFor(ui.logDate || dk(Date.now())), weight:w, reps:r, feeling:ui.draft.feeling};
  state.sets.push(s);
  ui.flashId = s.id; ui.error = '';
  commit(); render();
  try{ if(navigator.vibrate) navigator.vibrate(12); }catch(e){}
}

/* ---------- reorder body parts on the main screen ---------- */
const GRIP = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><circle cx="7" cy="5" r="1.7"/><circle cx="13" cy="5" r="1.7"/><circle cx="7" cy="10" r="1.7"/><circle cx="13" cy="10" r="1.7"/><circle cx="7" cy="15" r="1.7"/><circle cx="13" cy="15" r="1.7"/></svg>';
function applyVisibleOrder(names){
  let k = 0;
  const next = state.groups.map(g => names.includes(g) ? names[k++] : g);   // empty body parts keep their slots
  if(next.join('\u0000') === state.groups.join('\u0000')) return false;
  state.groups = next; commit(); return true;
}
function visibleGroups(){ return state.groups.filter(g => state.machines.some(m => m.group === g)); }
function moveVisible(g, d){
  const vis = visibleGroups(), i = vis.indexOf(g), j = i + d;
  if(i < 0 || j < 0 || j >= vis.length) return;
  [vis[i], vis[j]] = [vis[j], vis[i]];
  applyVisibleOrder(vis); render();
  const el = document.querySelector('.groups section[data-g="' + CSS.escape(g) + '"] .drag-handle');
  if(el) el.focus();
}
function startDrag(e, box){
  const handle = e.currentTarget, sec = handle.closest('section.group');
  if(!sec || (e.pointerType === 'mouse' && e.button !== 0)) return;
  e.preventDefault();
  try{ handle.setPointerCapture(e.pointerId); }catch(err){}
  ui.dragging = true;
  box.classList.add('reordering');          // fold every body part down to its header so they are easy to shuffle
  sec.classList.add('drag');
  // The dragged node is never moved in the DOM (that would drop the pointer); everything is shifted with transforms.
  const secs = [...box.children], n = secs.length, from = secs.indexOf(sec);
  const rects = secs.map(x => x.getBoundingClientRect());
  const tops = rects.map(r => r.top), mids = rects.map(r => r.top + r.height / 2);
  const step = n > 1 ? (from < n - 1 ? tops[from + 1] - tops[from] : tops[from] - tops[from - 1]) : 0;
  const grab = rects[from].height / 2;
  secs.forEach(x => { if(x !== sec) x.style.transition = 'transform .15s'; });
  let to = from;
  const place = y => {
    to = 0; secs.forEach((x, i) => { if(i !== from && mids[i] < y) to++; });
    sec.style.transform = 'translateY(' + (y - grab - tops[from]) + 'px)';
    secs.forEach((x, i) => {
      if(i === from) return;
      let dy = 0;
      if(from < to && i > from && i <= to) dy = -step;
      if(from > to && i < from && i >= to) dy = step;
      x.style.transform = dy ? 'translateY(' + dy + 'px)' : '';
    });
  };
  place(e.clientY);
  const move = ev => place(ev.clientY);
  const finish = (ev, apply) => {
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', up);
    handle.removeEventListener('pointercancel', cancel);
    try{ handle.releasePointerCapture(ev.pointerId); }catch(err){}
    ui.dragging = false;
    if(apply && to !== from){
      const names = secs.map(x => x.getAttribute('data-g'));
      const moved = names.splice(from, 1)[0];
      names.splice(to, 0, moved);
      applyVisibleOrder(names);
    }
    render();
  };
  const up = ev => finish(ev, true), cancel = ev => finish(ev, false);
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', up);
  handle.addEventListener('pointercancel', cancel);
}

/* ---------- body parts (edited inside Edit list) ---------- */
const normGroupName = v => String(v).trim().replace(/\s+/g,' ').slice(0,20);
const groupTaken = (name, except) => state.groups.some(g => g !== except && g.toLowerCase() === name.toLowerCase());
function withPresets(){ if(!state.presets) state.presets = clonePresets(); }
function renameGroupAt(i, raw){
  const old = state.groups[i], name = normGroupName(raw);
  if(old === undefined || name === old) return;
  if(!name){ ui.groupMsg = 'A body part needs a name.'; render(); return; }
  if(groupTaken(name, old)){ ui.groupMsg = 'You already have a body part called ' + name + '.'; render(); return; }
  withPresets();
  state.groups = state.groups.map(g => g === old ? name : g);
  state.machines.forEach(m => { if(m.group === old) m.group = name; });
  state.presets.forEach(x => { if(x.group === old) x.group = name; });
  state.collapsed = state.collapsed.map(g => g === old ? name : g);
  ui.groupMsg = ''; ui.armedGroup = null;
  commit();   // no redraw: the field already shows the new name, and a redraw could swallow the tap that caused this blur
}
function addGroup(raw){
  const name = normGroupName(raw);
  if(!name){ ui.groupMsg = 'Type a name first.'; render(); return; }
  if(groupTaken(name)){ ui.groupMsg = 'You already have a body part called ' + name + '.'; render(); return; }
  if(state.groups.length >= 30){ ui.groupMsg = 'That is the maximum of 30 body parts.'; render(); return; }
  state.groups.push(name); ui.groupMsg = ''; commit(); render();
}
function moveGroup(i, d){
  const j = i + d;
  if(j < 0 || j >= state.groups.length) return;
  const a = state.groups.slice(); [a[i], a[j]] = [a[j], a[i]];
  state.groups = a; commit(); render();
}
function groupTarget(g){ return (state.groups.includes('Other') && g !== 'Other') ? 'Other' : state.groups.find(x => x !== g); }
function deleteGroupAt(i){
  const g = state.groups[i];
  if(g === undefined) return;
  if(state.groups.length <= 1){ ui.groupMsg = 'Keep at least one body part.'; render(); return; }
  const n = state.machines.filter(m => m.group === g).length, target = groupTarget(g);
  if(n && ui.armedGroup !== g){ ui.armedGroup = g; ui.groupMsg = ''; render(); return; }
  withPresets();
  state.machines.forEach(m => { if(m.group === g) m.group = target; });
  state.presets.forEach(x => { if(x.group === g) x.group = target; });
  state.groups = state.groups.filter(x => x !== g);
  state.collapsed = state.collapsed.filter(x => x !== g);
  ui.armedGroup = null; ui.groupMsg = ''; commit(); render();
}
function groupEditHeader(i, n){
  const g = state.groups[i];
  const armed = ui.armedGroup === g;
  const up = chevDown(); up.style.transform = 'rotate(180deg)';
  const header = h('div',{class:'grow'},
    h('input',{class:'txt ghead',type:'text',maxlength:'20','aria-label':'Body part name',value:g,
      onchange:e => renameGroupAt(i, e.target.value),
      onkeydown:e => { if(e.key === 'Enter') e.target.blur(); }}),
    h('button',{type:'button',class:'x',disabled:i === 0,'aria-label':'Move body part up',onclick:()=>moveGroup(i,-1)}, up),
    h('button',{type:'button',class:'x',disabled:i === state.groups.length-1,'aria-label':'Move body part down',onclick:()=>moveGroup(i,1)}, chevDown()),
    h('button',{type:'button',class:'x'+(armed?' armed':''),'aria-label':'Remove body part',onclick:()=>deleteGroupAt(i)},'×'),
    h('span',{class:'gcount',text: n + (n === 1 ? ' item' : ' items')}));
  const box = h('div',{}, header);
  if(armed) box.append(h('p',{class:'err',style:'margin:2px 0 0',text:'Tap × again to move '+n+(n === 1 ? ' item' : ' items')+' to '+groupTarget(g)+' and remove '+g+'.'}));
  return box;
}
function addGroupForm(){
  const newName = h('input',{class:'txt',type:'text',maxlength:'20',placeholder:'New body part, like Glutes','aria-label':'New body part',
    onkeydown:e => { if(e.key === 'Enter') addGroup(e.target.value); }});
  return h('div',{class:'form',style:'margin-top:22px'}, newName,
    h('button',{type:'button',class:'btn',onclick:()=>addGroup(newName.value)},'Add body part'));
}

/* ---------- preset list ---------- */
const CHECK = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10.5l4 4 8-9"/></svg>';
function tidyPresets(){
  if(!state.presets) return;
  state.presets = state.presets
    .map(x => ({id:x.id, name:x.name.trim(), group:x.group, settings:x.settings.map(t => t.trim()).filter(Boolean)}))
    .filter(x => x.name);
  clearTimeout(noteTimer); noteTimer = null;
  commit();
}
function leavePresets(){
  if(ui.presetEdit) tidyPresets();
  ui.presetView = false; ui.presetEdit = false; ui.presetSel = {}; ui.armedPreset = null; ui.armedReset = false;
}
function presetInfo(x){
  const key = x.name.trim().toLowerCase();
  const existing = key ? state.machines.find(m => m.name.trim().toLowerCase() === key) : null;
  const wanted = x.settings.map(t => t.trim()).filter(Boolean);
  const missing = existing ? wanted.filter(t => !existing.settings.some(z => z.name.trim().toLowerCase() === t.toLowerCase())) : wanted;
  return {existing, missing, done: !key || (!!existing && !missing.length)};
}

function presetView(){
  const list = state.presets || clonePresets();
  const wrap = h('div');
  wrap.append(
    h('button',{type:'button',class:'back',onclick:()=>{ leavePresets(); render(false); }}, chevron(), 'Back to my list'),
    h('h2',{class:'m-title',text:'Preset list'}),
    h('div',{class:'picker-bar',style:'margin-top:8px'},
      h('p',{class:'lede',text: ui.presetEdit
        ? 'Change names, groups and setting names. Delete what your club does not have.'
        : 'Typical Planet Fitness machines. The setting names are common adjustments, not confirmed for your club.'}),
      h('button',{type:'button',class:'btn ghost small',onclick:()=>{
        if(ui.presetEdit){ tidyPresets(); ui.presetEdit = false; ui.armedPreset = null; ui.armedReset = false; }
        else{ if(!state.presets){ state.presets = clonePresets(); commit(); } ui.presetEdit = true; ui.presetSel = {}; }
        render(false);
      }}, ui.presetEdit ? 'Done' : 'Edit presets')));
  return ui.presetEdit ? presetEditor(wrap) : presetPicker(wrap, list);
}

function presetPicker(wrap, list){
  const info = new Map(list.map(x => [x.id, presetInfo(x)]));
  const addable = list.filter(x => !info.get(x.id).done);
  const chosen = addable.filter(x => ui.presetSel[x.id]);
  if(addable.length){
    wrap.append(h('div',{style:'margin-top:6px'}, h('button',{type:'button',class:'linkbtn',onclick:()=>{
      const all = chosen.length === addable.length;
      ui.presetSel = {}; if(!all) addable.forEach(x => { ui.presetSel[x.id] = true; });
      render();
    }}, chosen.length === addable.length ? 'Clear selection' : 'Select all')));
  }
  if(!list.length) wrap.append(h('p',{class:'empty',text:'The preset list is empty. Tap Edit presets to add some, or reset to the defaults.'}));
  const pgroups = state.groups.concat(list.map(x => x.group).filter((g,i,a) => !state.groups.includes(g) && a.indexOf(g) === i));
  pgroups.forEach(g => {
    const items = list.filter(x => x.group === g);
    if(!items.length) return;
    wrap.append(h('section',{class:'group'}, h('h2',{}, h('div',{class:'gh'}, h('span',{class:'l'}, g))),
      items.map(x => {
        const inf = info.get(x.id), added = inf.done;
        const on = !!ui.presetSel[x.id] && !added;
        const box = h('span',{class:'box','aria-hidden':'true'}); if(on) box.innerHTML = CHECK;
        return h('button',{type:'button',class:'prow'+(on?' on':'')+(added?' added':''),'aria-pressed':String(on),disabled:added,
          onclick:()=>{ ui.presetSel[x.id] = !ui.presetSel[x.id]; render(); }},
          box, h('span',{class:'ptxt'}, h('span',{class:'name',text:x.name}),
            h('span',{class:'meta',text: added ? 'Already in your list' : (inf.existing ? 'In your list. Adds: '+inf.missing.join(', ') : (x.settings.length ? x.settings.join(', ') : 'No settings'))})));
      })));
  });
  wrap.append(h('div',{class:'stickybar'},
    h('button',{type:'button',class:'log',disabled:!chosen.length,onclick:addChosen},
      chosen.length ? 'Add '+chosen.length+' to my list' : 'Tick machines to add')));
  return wrap;
}
function addChosen(){
  const list = state.presets || clonePresets();
  const groups = new Set();
  let n = 0;
  list.forEach(x => {
    if(!ui.presetSel[x.id]) return;
    const inf = presetInfo(x);
    if(inf.done) return;
    n++;
    if(inf.existing){
      inf.missing.forEach(t => inf.existing.settings.push({id:rid(), name:t, value:''}));
      groups.add(inf.existing.group);
    }else{
      groups.add(x.group);
      if(!state.groups.some(g => g.toLowerCase() === x.group.toLowerCase()) && state.groups.length < 30) state.groups.push(x.group);
      state.machines.push({id:rid(), name:x.name.trim().slice(0,40), group:state.groups.find(g => g.toLowerCase() === x.group.toLowerCase()) || x.group,
        settings:inf.missing.map(t => ({id:rid(), name:t, value:''}))});
    }
  });
  state.collapsed = state.collapsed.filter(g => !groups.has(g));
  ui.presetSel = {}; ui.presetView = false;
  if(n) commit();
  render(false);
}

function presetEditor(wrap){
  const list = state.presets;
  if(!list.length) wrap.append(h('p',{class:'empty',text:'Nothing here. Add a preset or reset to the defaults.'}));
  list.forEach(x => {
    const armed = ui.armedPreset === x.id;
    const card = h('div',{class:'pcard'},
      h('input',{class:'txt',type:'text',maxlength:'40',placeholder:'Machine or exercise name','aria-label':'Preset name',value:x.name,
        oninput:e => { x.name = e.target.value; typed(); }, onblur:() => flushNote()}),
      h('select',{class:'txt','aria-label':'Muscle group',onchange:e => { x.group = e.target.value; typed(); }},
        sortedGroups(x.group).map(g => h('option',{value:g,selected:g === x.group}, g))),
      h('div',{class:'lbl',text:'Settings'}));
    x.settings.forEach((t,i) => card.append(h('div',{class:'setting-row single'},
      h('input',{class:'txt',type:'text',maxlength:'30',placeholder:'Setting name, like Seat height','aria-label':'Setting name',value:t,
        oninput:e => { x.settings[i] = e.target.value; typed(); }, onblur:() => flushNote()}),
      h('button',{type:'button',class:'x','aria-label':'Remove setting '+t,onclick:()=>{
        x.settings.splice(i,1); clearTimeout(noteTimer); noteTimer = null; commit(); render();
      }},'×'))));
    card.append(
      h('button',{type:'button',class:'linkbtn',style:'justify-self:start',onclick:()=>{
        x.settings.push(''); render();
        setTimeout(() => { const els = card.querySelectorAll('input[aria-label="Setting name"]'); if(els.length) els[els.length-1].focus(); }, 0);
      }},'Add setting'),
      h('button',{type:'button',class:'rm'+(armed?' armed':''),style:'justify-self:start',onclick:()=>{
        if(!armed){ ui.armedPreset = x.id; render(); return; }
        state.presets = state.presets.filter(y => y.id !== x.id); ui.armedPreset = null;
        clearTimeout(noteTimer); noteTimer = null; commit(); render();
      }}, armed ? 'Tap again to delete this preset' : 'Delete preset'));
    wrap.append(card);
  });
  wrap.append(
    h('button',{type:'button',class:'add-btn',style:'margin-top:18px',onclick:()=>{
      const id = rid(); state.presets.push({id, name:'', group:'Other', settings:[]}); commit(); render();
      setTimeout(() => { const els = document.querySelectorAll('.pcard input[aria-label="Preset name"]'); const el = els[els.length-1]; if(el){ el.focus(); el.scrollIntoView({block:'center'}); } }, 0);
    }},'Add a preset'),
    h('button',{type:'button',class:'remove'+(ui.armedReset?' armed':''),onclick:()=>{
      if(!ui.armedReset){ ui.armedReset = true; render(); return; }
      state.presets = null; ui.armedReset = false; ui.presetEdit = false; ui.armedPreset = null; commit(); render(false);
    }}, ui.armedReset ? 'Tap again to replace all presets with the defaults' : 'Reset to defaults'));
  return wrap;
}

/* ---------- history tab ---------- */
function historyView(){
  const wrap = h('div');
  const withSets = state.machines.filter(m => setsFor(m.id).length);
  if(!withSets.length){
    wrap.append(h('p',{class:'empty',text:'Nothing logged yet. Log a set and your history shows up here.'}));
  }else{
    if(!withSets.some(m => m.id === ui.histMachine)) ui.histMachine = withSets[0].id;
    wrap.append(h('div',{class:'picker'},
      h('select',{class:'txt','aria-label':'Machine or exercise',onchange:e=>{ ui.histMachine = e.target.value; render(); }},
        withSets.map(m => h('option',{value:m.id,selected:m.id === ui.histMachine}, m.name)))));

    const sessions = sessionsFor(ui.histMachine);
    wrap.append(progressBlock(ui.histMachine));

    sessions.slice().reverse().slice(0,40).forEach(s=>{
      const vol = s.sets.reduce((a,x)=>a + x.weight*x.reps, 0);
      wrap.append(h('div',{class:'session'},
        h('div',{class:'s-head'}, h('strong',{text:fmtDate(s.ts)}),
          h('span',{text:s.sets.length+(s.sets.length===1?' set, ':' sets, ')+(vol > 0 ? Math.round(vol).toLocaleString()+' '+state.unit+' moved' : s.sets.reduce((a,x)=>a+x.reps,0)+' reps')})),
        h('div',{class:'chips'}, s.sets.map(x => h('div',{class:'chip'}, h('b',{text:fmtNum(x.weight)+' × '+x.reps}), ticks(x.feeling)))),
        noteRow(ui.histMachine, s.key)));
    });
  }

  const tools = h('div',{class:'tools'});
  tools.append(h('div',{},
    h('div',{class:'lbl',style:'margin-top:0',text:'Units'}),
    h('div',{class:'seg',role:'group','aria-label':'Units'},
      ['lb','kg'].map(u => h('button',{type:'button',class:state.unit===u?'on':'','aria-pressed':String(state.unit===u),
        onclick:()=>{ state.unit = u; commit(); render(); }}, u))),
    h('p',{class:'note',style:'margin-top:8px',text:'Switching units does not convert past entries.'})));
  tools.append(h('div',{},
    h('div',{class:'lbl',style:'margin-top:0',text:'Backup'}),
    h('p',{class:'note',text: lastBackup() ? 'Last backup: ' + fmtDate(lastBackup()) : 'No backup yet.'}),
    h('div',{class:'row',style:'margin-top:10px'},
      h('button',{type:'button',class:'btn',onclick:exportBackup},'Export backup'),
      h('button',{type:'button',class:'btn ghost',onclick:()=>fileInput.click()},'Import backup')),
    ui.importMsg ? h('p',{class:'err',role:'alert',text:ui.importMsg}) : null,
    ui.importPending ? h('div',{class:'form',style:'margin-top:12px'},
      h('p',{style:'margin:0',text:'Replace everything on this device with this backup ('+ui.importPending.machines.length+' machines and exercises, '+ui.importPending.sets.length+' sets)? Your current data will be lost.'}),
      h('div',{class:'row'},
        h('button',{type:'button',class:'btn ghost',onclick:()=>{ ui.importPending = null; render(); }},'Cancel'),
        h('button',{type:'button',class:'btn',onclick:applyImport},'Replace'))) : null,
    state.sets.length ? h('button',{type:'button',class:'linkbtn',style:'margin-top:8px',onclick:exportCsv},'Export sets as CSV for a spreadsheet') : null,
    h('p',{class:'note',style:'margin-top:8px',text:'Your data lives only on this device. Back it up now and then, and before you delete the app or change devices.'})));
  wrap.append(tools);
  return wrap;
}

const METRICS = [
  {id:'top', label:'Weight',  title:'Heaviest set per session',
   fn:sets => Math.max(...sets.map(x => x.weight)),                       unit:() => state.unit},
  {id:'reps',label:'Reps',    title:'Total reps per session',
   fn:sets => sets.reduce((a,x) => a + x.reps, 0),                        unit:() => 'reps'},
  {id:'vol', label:'Volume',  title:'Volume per session, weight × reps',
   fn:sets => sets.reduce((a,x) => a + x.weight*x.reps, 0),               unit:() => state.unit},
  {id:'e1rm',label:'Est. max',title:'Estimated one-rep max per session',
   fn:sets => Math.max(...sets.map(x => x.weight*(1 + x.reps/30))),       unit:() => state.unit}
];
const fmtVal = v => (Math.round(v*10)/10).toLocaleString();
const fmtTick = v => v >= 10000 ? fmtNum(v/1000)+'k' : String(Math.round(v*10)/10);
function niceStep(x){
  if(!(x > 0)) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(x))), f = x/e;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e;
}
function axisRange(minV, maxV){
  const range = maxV - minV;
  if(range === 0){
    const u = niceStep(maxV/10);
    const lo = Math.max(0, Math.floor(maxV/u)*u - 2*u);
    return {lo, hi: lo + 4*u};
  }
  const u = niceStep(range/8);
  const lo = Math.max(0, Math.floor((minV - range*0.1)/u)*u);
  let hi = Math.ceil((maxV + range*0.1)/u)*u;
  if(((hi-lo)/u) % 2) hi += u;
  return {lo, hi};
}

function progressBlock(mid){
  const all = setsFor(mid);
  const allZero = all.length > 0 && all.every(x => x.weight === 0);
  const met = METRICS.find(m => m.id === (allZero ? 'reps' : ui.metric)) || METRICS[0];
  const box = h('div',{class:'chart'}, h('h3',{text:met.title}));
  if(!allZero){
    box.append(h('div',{class:'seg',role:'group','aria-label':'Progress measure'},
      METRICS.map(m => h('button',{type:'button',class:m.id===met.id?'on':'','aria-pressed':String(m.id===met.id),
        onclick:()=>{ ui.metric = m.id; render(); }}, m.label))));
  }
  const sessions = sessionsFor(mid);
  if(sessions.length < 2){
    box.append(h('p',{class:'hint',text:'Log this in another session to see your progress.'}));
    return box;
  }
  const pts = sessions.slice(-20).map(sn => ({ts:sn.ts, v:met.fn(sn.sets)}));
  const first = pts[0], last = pts[pts.length-1], unit = met.unit();
  const delta = last.v - first.v;
  box.append(h('p',{class:'sum',text: Math.abs(delta) < 0.05
    ? 'No change since '+fmtShort(first.ts)
    : (delta > 0 ? 'Up ' : 'Down ')+fmtVal(Math.abs(delta))+' '+unit+' since '+fmtShort(first.ts)}));
  const readout = h('p',{class:'readout',text:fmtDate(last.ts)+': '+fmtVal(last.v)+' '+unit});
  box.append(readout);

  const W=320,H=150,pl=38,pr=12,pt=12,pb=26;
  const {lo,hi} = axisRange(Math.min(...pts.map(p=>p.v)), Math.max(...pts.map(p=>p.v)));
  const x = i => pl + i*(W-pl-pr)/(pts.length-1);
  const y = v => pt + (1-(v-lo)/(hi-lo))*(H-pt-pb);
  let svg = '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+met.title+', from '+fmtVal(first.v)+' to '+fmtVal(last.v)+' '+unit+'">';
  [lo,(lo+hi)/2,hi].forEach(v=>{
    svg += '<line class="gl" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(v).toFixed(1)+'" y2="'+y(v).toFixed(1)+'"/>';
    svg += '<text class="ax" x="'+(pl-6)+'" y="'+(y(v)+4).toFixed(1)+'" text-anchor="end">'+fmtTick(v)+'</text>';
  });
  svg += '<path class="ln" d="'+pts.map((p,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(p.v).toFixed(1)).join(' ')+'"/>';
  pts.forEach((p,i)=>{
    svg += '<circle class="pt" data-i="'+i+'" cx="'+x(i).toFixed(1)+'" cy="'+y(p.v).toFixed(1)+'" r="'+(i===pts.length-1?6.5:4.5)+'"/>';
    svg += '<circle class="hit" data-i="'+i+'" cx="'+x(i).toFixed(1)+'" cy="'+y(p.v).toFixed(1)+'" r="15"/>';
  });
  svg += '<text class="ax" x="'+pl+'" y="'+(H-6)+'" text-anchor="start">'+fmtShort(first.ts)+'</text>';
  svg += '<text class="ax" x="'+(W-pr)+'" y="'+(H-6)+'" text-anchor="end">'+fmtShort(last.ts)+'</text>';
  svg += '</svg>';
  const holder = h('div'); holder.innerHTML = svg;
  holder.querySelectorAll('circle.hit').forEach(c => c.addEventListener('click', () => {
    const i = Number(c.getAttribute('data-i'));
    holder.querySelectorAll('circle.pt').forEach((d,j) => d.setAttribute('r', j === i ? 6.5 : 4.5));
    readout.textContent = fmtDate(pts[i].ts)+': '+fmtVal(pts[i].v)+' '+unit;
  }));
  box.append(holder);
  if(met.id === 'e1rm') box.append(h('p',{class:'fine',text:'Estimated with the Epley formula. Least reliable above about 10 reps.'}));
  return box;
}

/* ---------- backup and export ---------- */
const META_KEY = 'machine-log-meta';
function lastBackup(){ try{ return JSON.parse(localStorage.getItem(META_KEY) || '{}').lastBackup || 0; }catch(e){ return 0; } }
function markBackup(){ try{ localStorage.setItem(META_KEY, JSON.stringify({lastBackup: Date.now()})); }catch(e){} }

// Opens the iPhone share sheet (Save to Files, AirDrop, email) when it can, otherwise downloads the file.
async function saveFile(name, mime, text){
  const blob = new Blob([text], {type:mime});
  try{
    const file = new File([blob], name, {type:mime});
    if(navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({files:[file], title:name});
      return true;
    }
  }catch(err){
    if(err && err.name === 'AbortError') return false;   // the share sheet was closed without saving
  }
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
}
async function exportBackup(){
  const payload = {app:'workout-log', version:1, exportedAt:new Date().toISOString(), data:state};
  if(await saveFile('workout-log-backup-' + dk(Date.now()) + '.json', 'application/json', JSON.stringify(payload, null, 1))){
    markBackup(); render();
  }
}
async function exportCsv(){
  const q = v => '"' + String(v).replace(/"/g,'""') + '"';
  const rows = [['date','time','machine_or_exercise','group','set_of_day','weight_'+state.unit,'reps','feeling_1_to_5','session_note']];
  const counter = {};
  state.sets.slice().sort((a,b)=>a.ts-b.ts).forEach(s=>{
    const m = machineById(s.machineId); if(!m) return;
    const k = m.id+'|'+dk(s.ts); counter[k] = (counter[k]||0)+1;
    const d = new Date(s.ts);
    rows.push([dk(s.ts), d.toTimeString().slice(0,5), m.name, m.group, counter[k], s.weight, s.reps, s.feeling, state.notes[m.id+'@'+dk(s.ts)] || '']);
  });
  await saveFile('workout-log-' + dk(Date.now()) + '.csv', 'text/csv', '\ufeff' + rows.map(r => r.map(q).join(',')).join('\n'));
}
const fileInput = h('input',{type:'file',accept:'application/json,.json',style:'display:none','aria-hidden':'true',tabindex:'-1'});
fileInput.addEventListener('change', async () => {
  const f = fileInput.files && fileInput.files[0];
  fileInput.value = '';
  if(!f) return;
  try{
    const raw = JSON.parse(await f.text());
    const data = raw && raw.data && typeof raw.data === 'object' ? raw.data : raw;
    if(!data || !Array.isArray(data.machines) || !Array.isArray(data.sets)) throw new Error('not a backup');
    ui.importPending = normalize(data); ui.importMsg = '';
  }catch(err){
    ui.importPending = null; ui.importMsg = 'That file is not a Workout log backup.';
  }
  render();
});
document.body.append(fileInput);
function applyImport(){
  if(!ui.importPending) return;
  state = ui.importPending; ui.importPending = null; ui.importMsg = '';
  ui.selected = null; ui.presetView = false;
  commit(); render(false);
}

/* ---------- shell ---------- */
const root = document.getElementById('root');
const tabLog = document.getElementById('tab-log');
const tabHist = document.getElementById('tab-hist');
function render(keep){
  const y = window.scrollY;
  root.replaceChildren(ui.tab === 'log' ? logView() : historyView());
  tabLog.classList.toggle('on', ui.tab === 'log');
  tabHist.classList.toggle('on', ui.tab === 'history');
  tabLog.setAttribute('aria-current', ui.tab === 'log' ? 'page' : 'false');
  tabHist.setAttribute('aria-current', ui.tab === 'history' ? 'page' : 'false');
  window.scrollTo(0, keep === false ? 0 : y);
}
tabLog.addEventListener('click', ()=>{
  if(ui.tab === 'log' && (ui.selected || ui.presetView)){ ui.selected = null; ui.error = ''; ui.confirmRemove = false; if(ui.presetView) leavePresets(); }
  ui.tab = 'log'; render(false);
});
tabHist.addEventListener('click', ()=>{ ui.tab = 'history'; render(false); });

render(false);
setSync('Saved on this device');
try{ if(navigator.storage && navigator.storage.persist) navigator.storage.persist(); }catch(e){}
if('serviceWorker' in navigator){
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}
})();
