(function(){
'use strict';
const ENH='20260915e-search';
const target='./explorer-20260915g.js?analyst='+Date.now();
fetch(target,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('No se pudo cargar explorador analítico: HTTP '+r.status);return r.text()}).then(js=>{if(!js.includes("const BUILD='20260915g-analyst'"))throw new Error('Build analítico inesperado.');const tag=document.createElement('script');tag.text=js+'\n//# sourceURL=mp-analyst-explorer.js';document.body.appendChild(tag)}).catch(err=>{const x=document.getElementById('app');if(x){const n=document.createElement('div');n.className='fatal';n.textContent='No fue posible cargar la capa analítica: '+(err?.message||err);x.prepend(n)}});
})();
