(function(){
'use strict';
const ENH='20260915e-search';
const target='./search-enhancer-20260915f.js?context='+Date.now();
fetch(target,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('No se pudo cargar exploración contextual: HTTP '+r.status);return r.text()}).then(js=>{if(!js.includes("const ENH='20260915f-context'"))throw new Error('Build contextual inesperado.');const tag=document.createElement('script');tag.text=js+'\n//# sourceURL=mp-context-enhancer.js';document.body.appendChild(tag)}).catch(err=>{const x=document.getElementById('mpCoverage');if(x)x.textContent='No fue posible cargar la capa de búsqueda contextual: '+(err?.message||err)});
})();
