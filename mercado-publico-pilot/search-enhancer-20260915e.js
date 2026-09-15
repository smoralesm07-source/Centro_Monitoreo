(function(){
'use strict';
const ENH='20260915e-search';
const analyst='./explorer-20260915g.js?analyst='+Date.now();
const grid='./grid-fix-20260915h.js?grid='+Date.now();
function inject(js,name){const tag=document.createElement('script');tag.text=js+'\n//# sourceURL='+name;document.body.appendChild(tag)}
fetch(analyst,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('No se pudo cargar explorador analítico: HTTP '+r.status);return r.text()}).then(js=>{if(!js.includes("const BUILD='20260915g-analyst'"))throw new Error('Build analítico inesperado.');inject(js,'mp-analyst-explorer.js');return fetch(grid,{cache:'no-store'})}).then(r=>{if(!r.ok)throw new Error('No se pudo cargar corrección de grilla: HTTP '+r.status);return r.text()}).then(js=>{if(!js.includes("const BUILD='20260915h-grid'"))throw new Error('Build de grilla inesperado.');inject(js,'mp-grid-fix.js')}).catch(err=>{const x=document.getElementById('app');if(x){const n=document.createElement('div');n.className='fatal';n.textContent='No fue posible cargar la capa analítica: '+(err?.message||err);x.prepend(n)}});
})();
