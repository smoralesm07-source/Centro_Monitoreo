(function(){
'use strict';
const ENH='20260915e-search';
const css=`
.mp-search-card{margin-bottom:14px;padding:20px;background:var(--panel);border:1px solid var(--line);border-radius:16px}
.mp-search-card h2{margin:0 0 6px;font-size:21px}.mp-search-card p{margin:0 0 15px;color:var(--ink2);max-width:900px}
.mp-search-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.mp-search-row input{font-size:15px;padding:13px 14px}
.mp-modes{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.mp-mode{background:transparent;color:var(--ink2);padding:7px 10px}.mp-mode.active{background:var(--raised);color:var(--ink);border-color:#3b4d61}
.mp-coverage{margin-top:11px;padding:9px 11px;border:1px solid #594a20;background:#211d10;border-radius:8px;color:#f1d783;font-size:11px;line-height:1.45}
.mp-match{display:inline-flex;border:1px solid var(--line2);border-radius:999px;padding:3px 7px;font-size:9px;color:var(--blue);margin-bottom:5px}
.mp-searching{opacity:.55;pointer-events:none}.mp-side-title{margin-bottom:5px}.mp-hidden{display:none!important}
@media(max-width:850px){.mp-search-row{grid-template-columns:1fr}}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
let mode='all', last=[];
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const d=v=>{if(!v)return '—';const x=new Date(v);return Number.isNaN(x.getTime())?String(v):new Intl.DateTimeFormat('es-CL',{dateStyle:'medium'}).format(x)};
const isCode=q=>/^\d{2,8}-\d{1,5}-[A-Z0-9]{2,6}$/i.test(String(q).trim());
function matchText(r){if(r.match_type==='proveedor')return r.participant_name||r.match_label||'Proveedor';if(r.match_type==='item')return r.item_description||r.match_label||'Ítem';if(r.match_type==='organismo')return r.match_label||r.buyer_name||'Organismo';return r.match_label||r.title||r.tender_code}
function renderSearch(rows,meta){
 last=rows||[];
 const count=document.getElementById('count'), table=document.getElementById('table'), source=document.getElementById('sourcebar'), status=document.getElementById('status');
 if(count)count.textContent=String(last.length);
 if(source)source.innerHTML=`<span class="pill ok">búsqueda transversal</span><span class="pill">${e(meta?.mode||mode)}</span><span class="pill">${e(meta?.latency_ms||'—')} ms</span><span class="pill">${e(meta?.indexed_tenders||0)} indexadas</span>`;
 if(status)status.textContent='Resultados del índice piloto';
 const cov=document.getElementById('mpCoverage');
 if(cov)cov.innerHTML=`<strong>Cobertura indexada actual:</strong> ${e(d(meta?.min_date))} → ${e(d(meta?.max_date))}, ${e(meta?.indexed_tenders||0)} licitaciones. La búsqueda no exige fecha; la cobertura histórica aún se está ampliando. Al abrir un resultado, la ficha se consulta en vivo desde Mercado Público.`;
 if(!table)return;
 if(!last.length){table.innerHTML='<div class="empty">No se encontraron coincidencias dentro de la cobertura actualmente indexada.</div>';return;}
 table.innerHTML=`<table><thead><tr><th>Coincidencia</th><th>Licitación</th><th>Organismo</th><th>Publicación</th></tr></thead><tbody>${last.map(r=>`<tr data-mp-code="${e(r.tender_code)}"><td><span class="mp-match">${e(r.match_type)}</span><div><strong>${e(matchText(r))}</strong></div>${r.participant_rut?`<div class="tiny">RUT ${e(r.participant_rut)}</div>`:''}${r.product_code?`<div class="tiny">UNSPSC ${e(r.product_code)}</div>`:''}</td><td><div class="code">${e(r.tender_code)}</div><strong>${e(r.title||'—')}</strong><div class="tiny">${e(r.status||'')}</div></td><td>${e(r.buyer_name||'—')}</td><td>${e(d(r.publication_date))}</td></tr>`).join('')}</tbody></table>`;
 table.querySelectorAll('[data-mp-code]').forEach(x=>x.onclick=()=>window.openCode(x.dataset.mpCode));
}
async function search(){
 const q=String(document.getElementById('mpQ')?.value||'').trim();if(q.length<2)return;
 if(isCode(q)){window.openCode(q);return;}
 const card=document.getElementById('mpSearchCard'),btn=document.getElementById('mpSearchBtn');card?.classList.add('mp-searching');if(btn)btn.textContent='Buscando…';
 try{const out=await window.api('search',{query:q,mode,limit:100});renderSearch(out.rows||[],out.meta||{});}catch(err){const table=document.getElementById('table');if(table)table.innerHTML=`<div class="empty">${e(err?.message||err)}</div>`;}finally{card?.classList.remove('mp-searching');if(btn)btn.textContent='Buscar';}
}
function install(){
 const shell=document.querySelector('.shell'),top=document.querySelector('.top'),workspace=document.querySelector('.workspace');
 if(!shell||!top||!workspace||document.getElementById('mpSearchCard'))return false;
 const card=document.createElement('section');card.id='mpSearchCard';card.className='mp-search-card';
 card.innerHTML=`<h2>¿Qué quieres encontrar?</h2><p>Busca sin indicar fecha por proveedor, servicio público, producto/ítem o licitación. La fecha queda como exploración complementaria.</p><div class="mp-search-row"><input id="mpQ" placeholder="RUT o proveedor · organismo · producto/UNSPSC · código o título de licitación"><button id="mpSearchBtn" class="primary">Buscar</button></div><div class="mp-modes"><button class="mp-mode active" data-m="all">Todos</button><button class="mp-mode" data-m="proveedor">Proveedores</button><button class="mp-mode" data-m="organismo">Servicios públicos</button><button class="mp-mode" data-m="item">Productos / ítems</button><button class="mp-mode" data-m="licitacion">Licitaciones</button></div><div id="mpCoverage" class="mp-coverage">El índice transversal está en fase piloto y se está ampliando. La ficha detallada permanece conectada a la API oficial en vivo.</div>`;
 top.insertAdjacentElement('afterend',card);
 document.getElementById('mpSearchBtn').onclick=search;document.getElementById('mpQ').onkeydown=x=>{if(x.key==='Enter')search()};
 card.querySelectorAll('.mp-mode').forEach(b=>b.onclick=()=>{mode=b.dataset.m;card.querySelectorAll('.mp-mode').forEach(x=>x.classList.toggle('active',x===b));});
 const side=workspace.querySelector('.side');if(side){const h=side.querySelector('h3');if(h){h.textContent='Exploración por fecha';h.classList.add('mp-side-title')}const tiny=side.querySelector('.tiny');if(tiny)tiny.textContent='Opción secundaria para revisar las licitaciones publicadas en un día específico.';const filter=side.querySelector('#filter')?.closest('.field');const state=side.querySelector('#state')?.closest('.field');filter?.classList.add('mp-hidden');state?.classList.add('mp-hidden');}
 const hero=workspace.querySelector('.hero');if(hero){const lab=hero.querySelector('label');if(lab)lab.textContent='Abrir licitación por código exacto';}
 const p=top.querySelector('.brand p');if(p)p.textContent='Piloto independiente · búsqueda transversal + API en vivo';
 const badges=top.querySelector('.pills')||top.querySelector('[style*="display:flex"]');if(badges){const x=document.createElement('span');x.className='pill';x.textContent='search '+ENH;badges.insertBefore(x,badges.lastElementChild);}
 return true;
}
function wait(){if(install())return;const mo=new MutationObserver(()=>{if(install())mo.disconnect()});mo.observe(document.documentElement,{subtree:true,childList:true});setTimeout(()=>mo.disconnect(),120000)}
wait();
})();
