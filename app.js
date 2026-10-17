'use strict';
const $ = (selector) => document.querySelector(selector);
const spells = window.SPELLS;
const KEY = 'demonlord-grimoire-v1';
const byId = new Map(spells.map(s => [s.id, s]));
const traditions = [...new Set(spells.map(s => s.tradition))].sort((a,b)=>a.localeCompare(b,'ru'));
// Player book v0.90, printed page 103. Columns are spell ranks 0–5.
const CASTINGS = [
 [1,0,0,0,0,0], [2,1,0,0,0,0], [3,2,1,0,0,0],
 [4,2,1,1,0,0], [5,2,2,1,1,0], [6,3,2,2,1,1],
 [7,3,2,2,2,1], [8,3,2,2,2,1], [9,3,3,2,2,2],
 [10,3,3,3,2,2], [11,3,3,3,3,2]
];
let character = {name:'', notes:'', selected:[], power:0, spent:{}};
let storageFailed = false;
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
  if(saved) character = validateCharacter(saved);
} catch { storageFailed = true; }
let selected = new Set(character.selected);
let view = 'all', tradition = '', rank = '', currentSpell = null;
const escape = text => String(text).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize = text => text.toLocaleLowerCase('ru').replace(/ё/g,'е');
const searchIndex = new Map(spells.map(s=>[s.id,normalize(`${s.name} ${s.tradition} ${s.description} ${JSON.stringify(s.table||[])}`)]));
function validateCharacter(data) {
  if(!data || typeof data !== 'object' || typeof data.name !== 'string' || typeof data.notes !== 'string' || !Array.isArray(data.selected) || data.selected.some(id=> typeof id !== 'string' || !byId.has(id))) throw new Error('invalid character');
  const power = data.power === undefined ? 0 : data.power;
  if(!Number.isInteger(power) || power < 0 || power > 10) throw new Error('invalid power');
  const spent = {};
  if(data.spent !== undefined) {
    if(!data.spent || typeof data.spent !== 'object' || Array.isArray(data.spent)) throw new Error('invalid uses');
    for(const [id, count] of Object.entries(data.spent)) {
      if(!byId.has(id) || !Number.isInteger(count) || count < 0 || count > 11) throw new Error('invalid uses');
      spent[id] = count;
    }
  }
  return {name:data.name.slice(0,80),notes:data.notes.slice(0,10000),selected:[...new Set(data.selected)],power,spent};
}
let toastTimer;
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,4000);}
function save(){character.selected=[...selected];try{localStorage.setItem(KEY,JSON.stringify(character));storageFailed=false;}catch{storageFailed=true;toast('Браузер не сохранил изменения. Скачай файл персонажа.');}updateCharacter();}
function updateCharacter(){$('#character-label').textContent=character.name||'Мой персонаж';$('#selected-count').textContent=selected.size;}
function setView(next){view=next;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-pressed',b.dataset.view===view);});$('#view-title').textContent=view==='all'?'Книга заклинаний':'Мой гримуар';$('#view-description').textContent=view==='all'?'От первого шёпота силы до запретных ритуалов. Найди свою магию и собери гримуар персонажа.':'Избранные заклинания твоего персонажа. Вся нужная магия под рукой — с полным описанием каждого эффекта.';render();}
function reset(){tradition='';rank='';$('#search').value='';$('#kind').value='';$('#sort').value='tradition';syncFilters();render();}
function syncFilters(){$('#tradition-select').value=tradition;document.querySelectorAll('[data-tradition]').forEach(b=>{b.classList.toggle('active',b.dataset.tradition===tradition);b.setAttribute('aria-pressed',b.dataset.tradition===tradition);});document.querySelectorAll('[data-rank]').forEach(b=>{b.classList.toggle('active',b.dataset.rank===rank);b.setAttribute('aria-pressed',b.dataset.rank===rank);});}
function render(){
 const query=normalize($('#search').value.trim());
 const words=query.split(/\s+/).filter(Boolean);
 const results=spells.filter(s=>(view==='all'||selected.has(s.id))&&(!tradition||s.tradition===tradition)&&(rank===''||s.rank===Number(rank))&&(!$('#kind').value||s.kind===$('#kind').value)&&words.every(w=>searchIndex.get(s.id).includes(w)));
 const compareName=(a,b)=>a.name.localeCompare(b.name,'ru');
 results.sort((a,b)=>$('#sort').value==='name'?compareName(a,b):$('#sort').value==='rank'?a.rank-b.rank||compareName(a,b):a.tradition.localeCompare(b.tradition,'ru')||a.rank-b.rank||compareName(a,b));
 $('#results-count').textContent=`Найдено: ${results.length}${tradition?' · '+tradition:''}`;
 $('#cards').innerHTML=results.map(s=>`<article class="card ${selected.has(s.id)?'saved':''}"><div class="card-top"><span class="tradition-tag">${escape(s.tradition)}</span><span class="rank-badge" aria-label="Ранг ${s.rank}">${s.rank}</span></div><h2><button class="card-title" data-open="${s.id}">${escape(s.name)}</button></h2><span class="card-kind ${s.kind==='Боевое'?'combat':''}">${s.kind==='Боевое'?'◇':'○'} ${s.kind} заклинание</span><p class="excerpt">${escape(s.description.replace(/\n/g,' '))}</p>${usesHTML(s)}<div class="card-bottom"><button class="details" data-open="${s.id}">Описание <span aria-hidden="true">↗</span></button><button class="toggle" data-toggle="${s.id}" aria-pressed="${selected.has(s.id)}" aria-label="${selected.has(s.id)?'Убрать':'Добавить'}: ${escape(s.name)}"><b aria-hidden="true">${selected.has(s.id)?'✓':'+'}</b> ${selected.has(s.id)?'В гримуаре':'В гримуар'}</button></div></article>`).join('');
 $('#empty').hidden=results.length!==0;
 const noSelection=view==='selected'&&selected.size===0;
 $('#empty-text').textContent=noSelection?'Добавь заклинания из каталога. Они появятся здесь вместе с подробными описаниями.':'По этим условиям заклинаний не найдено. Попробуй другое слово или сбрось фильтры.';
 $('#empty-action').textContent=noSelection?'Открыть каталог':'Сбросить фильтры';
 updateCharacter();
 renderPower();
}
function toggle(id){const removing=selected.has(id);removing?selected.delete(id):selected.add(id);save();render();if(currentSpell===id)updateDialogButton();if(!storageFailed)toast(removing?'Заклинание убрано из гримуара':'Заклинание добавлено в гримуар');}
function usesHTML(spell) {
 if(!spell || !selected.has(spell.id)) return '';
 const max = CASTINGS[character.power][spell.rank];
 const spent = character.spent[spell.id] || 0;
 const remaining = Math.max(0, max - spent);
 return `<div class="spell-usage ${remaining===0?'depleted':''}">
 <div class="usage-summary"><span>${max?'Осталось применений':'Недоступно при этой Мощи'}</span><strong>${remaining} / ${max}</strong></div>
 <div class="usage-pips" aria-hidden="true">${Array.from({length:max},(_,i)=>`<span class="${i<remaining?'available':'used'}"></span>`).join('')}</div>
 <div class="usage-actions"><button class="cast-button" data-cast="${spell.id}" ${remaining===0?'disabled':''} aria-label="Использовать: ${escape(spell.name)}">Использовать −1</button><button class="restore-button" data-restore="${spell.id}" ${spent===0?'disabled':''} aria-label="Вернуть применение: ${escape(spell.name)}">Вернуть +1</button></div></div>`;
}
function renderPower() {
 $('#power').value=character.power;
 $('#rank-uses').innerHTML=CASTINGS[character.power].map((count,rank)=>`<div class="rank-use ${count?'':'unavailable'}"><span>Ранг ${rank}</span><strong>${count || '—'}</strong><small>${count?'на заклинание':'недоступен'}</small></div>`).join('');
}
function changeUses(id, restore=false) {
 if(!selected.has(id)) return;
 const spent=character.spent[id] || 0;
 const max=CASTINGS[character.power][byId.get(id).rank];
 if(restore ? spent===0 : spent>=max) return;
 character.spent[id]=spent+(restore?-1:1);
 save();render();
 if(currentSpell) updateDialogButton();
 const root=$('#spell-dialog').open?$('#spell-dialog'):$('#cards');
 root.querySelector(`[data-${restore?'restore':'cast'}="${id}"]:not(:disabled)`)?.focus({preventScroll:true});
 if(!storageFailed) toast(`${byId.get(id).name}: осталось ${Math.max(0,max-character.spent[id])} из ${max}`);
}
$('#power').innerHTML=CASTINGS.map((_,power)=>`<option value="${power}">${power}</option>`).join('');
$('#power').onchange=e=>{character.power=Number(e.target.value);save();render();if(currentSpell)updateDialogButton();};
$('#rest').onclick=()=>{character.spent={};save();render();if(currentSpell)updateDialogButton();if(!storageFailed)toast('Все применения восстановлены');};
const labels = /^(Требования|Цель|Цели|Область|Длительность|Жертва|Спровоцированное|Размен|Атака 20\+)/;
function descriptionHTML(text){
 const blocks=[];
 for(const line of text.split('\n')){
   if(labels.test(line)||!blocks.length||/^(При |Когда |Каждое |Каждая |Каждый |Существо,|В конце |После |Если |Ты )/.test(line))blocks.push(line);
   else blocks[blocks.length-1]+=' '+line;
 }
 return blocks.map(block=>{const label=block.match(labels);return label?`<p class="rule"><strong>${escape(label[0])}</strong>${escape(block.slice(label[0].length))}</p>`:`<p>${escape(block)}</p>`;}).join('');
}
function openSpell(id){const s=byId.get(id);currentSpell=id;$('#spell-title').textContent=s.name;$('#spell-meta').textContent=`${s.tradition.toUpperCase()} · РАНГ ${s.rank} · ${s.kind.toUpperCase()}`;$('#spell-description').innerHTML=descriptionHTML(s.description)+(s.table?`<table class="effect-table"><caption>Дикая магия</caption><thead><tr><th scope="col">d20</th><th scope="col">Эффект</th></tr></thead><tbody>${s.table.map(row=>`<tr><th scope="row">${escape(row[0])}</th><td>${escape(row[1])}</td></tr>`).join('')}</tbody></table>`:'');$('#spell-page').textContent=`Книга игрока · стр. ${s.page}`;updateDialogButton();$('#spell-dialog').showModal();$('#spell-dialog').scrollTop=0;}
function updateDialogButton(){$('#spell-uses').innerHTML=usesHTML(byId.get(currentSpell));const active=selected.has(currentSpell);$('#spell-toggle').textContent=active?'✓ Убрать из гримуара':'+ Добавить в гримуар';$('#spell-toggle').setAttribute('aria-pressed',active);}
$('#total-count').textContent=spells.length;$('#stat-spells').textContent=spells.length;$('#stat-traditions').textContent=traditions.length;
$('#traditions').innerHTML=traditions.map(t=>`<button class="tradition" data-tradition="${escape(t)}"><span>${escape(t)}</span><small>${spells.filter(s=>s.tradition===t).length}</small></button>`).join('');
traditions.forEach(t=>$('#tradition-select').add(new Option(t,t)));
document.addEventListener('click',e=>{
 const cast=e.target.closest('[data-cast]');if(cast)changeUses(cast.dataset.cast);
 const restore=e.target.closest('[data-restore]');if(restore)changeUses(restore.dataset.restore,true);
 const open=e.target.closest('[data-open]');if(open)openSpell(open.dataset.open);
 const toggleButton=e.target.closest('[data-toggle]');if(toggleButton){const id=toggleButton.dataset.toggle;toggle(id);document.querySelector(`[data-toggle="${id}"]`)?.focus({preventScroll:true});}
 const nav=e.target.closest('[data-view]');if(nav)setView(nav.dataset.view);
 const t=e.target.closest('[data-tradition]');if(t){tradition=t.dataset.tradition===tradition?'':t.dataset.tradition;syncFilters();render();}
 const r=e.target.closest('[data-rank]');if(r){rank=r.dataset.rank;syncFilters();render();}
 const close=e.target.closest('[data-close]');if(close)document.getElementById(close.dataset.close).close();
});
$('#search').addEventListener('input',render);
$('#kind').addEventListener('change',render);$('#sort').addEventListener('change',render);
$('#tradition-select').addEventListener('change',e=>{tradition=e.target.value;syncFilters();render();});
$('#clear-tradition').onclick=()=>{tradition='';syncFilters();render();};
$('#reset').onclick=reset;$('#empty-action').onclick=()=>{if(view==='selected'&&!selected.size)setView('all');reset();};
$('#spell-toggle').onclick=()=>toggle(currentSpell);
$('#character-open').onclick=()=>{$('#character-name').value=character.name;$('#character-notes').value=character.notes;$('#character-dialog').showModal();};
$('#character-name').addEventListener('input',e=>{character.name=e.target.value;save();});$('#character-notes').addEventListener('input',e=>{character.notes=e.target.value;save();});
$('#export').onclick=()=>{const data={format:'demonlord-grimoire',version:1,...character,selected:[...selected]};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='grimoire-character.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Файл персонажа готов');};
$('#import').onclick=()=>$('#import-file').click();
$('#import-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1000000)throw new Error('size');const raw=JSON.parse(await file.text());if(raw.format!=='demonlord-grimoire'||raw.version!==1)throw new Error('format');const incoming=validateCharacter(raw);if(!confirm(`Заменить текущего персонажа на «${incoming.name||'Безымянный странник'}»? Выбранных заклинаний: ${incoming.selected.length}.`))return;character=incoming;selected=new Set(character.selected);save();$('#character-name').value=character.name;$('#character-notes').value=character.notes;render();if(!storageFailed)toast('Персонаж загружен');}catch{toast('Не удалось загрузить файл. Выбери JSON, скачанный из этого гримуара.');}finally{e.target.value='';}};
document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();$('#search').focus();}});
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
syncFilters();render();if(storageFailed)toast('Не удалось прочитать сохранение. Можно загрузить файл персонажа.');

