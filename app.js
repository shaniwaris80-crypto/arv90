/* ARSLAN V9 PRO — ver. entregada (actualizada IVA + Fecha + Edición)
   Splash, tabs, factura avanzada, PDF, clientes pre-cargados + buscador, estados, resumen y gráficos Chart.js
*/
document.addEventListener('DOMContentLoaded', () => {
  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));
  const money=n=>(isNaN(n)?0:n).toFixed(2).replace('.',',')+' €';
  const parseNum=v=>{const n=parseFloat(String(v).replace(',','.'));return isNaN(n)?0:n;};
  const escapeHTML=s=>String(s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const todayISO=()=>new Date().toISOString();
  const fmtDateDMY=(d)=>`${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;

  const K_CLIENTES='arslan_v9_clientes', K_PRODUCTOS='arslan_v9_productos', K_FACTURAS='arslan_v9_facturas', K_PRICEHIST='arslan_v9_pricehist';
  let clientes=JSON.parse(localStorage.getItem(K_CLIENTES)||'[]');
  let productos=JSON.parse(localStorage.getItem(K_PRODUCTOS)||'[]');
  let facturas=JSON.parse(localStorage.getItem(K_FACTURAS)||'[]');
  let priceHist=JSON.parse(localStorage.getItem(K_PRICEHIST)||'{}');

  // 👉 Índice de factura en edición (-1 = nueva)
  let currentEditIndex = -1;

  window.addEventListener('load',()=>{setTimeout(()=>{$('#splash').classList.add('fade-out');document.querySelector('[data-tab="factura"]').click();},2000);});

  function switchTab(id){$$('button.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));$$('section.panel').forEach(p=>p.classList.toggle('active',p.dataset.tabPanel===id));if(id==='resumen'){drawResumen();drawCharts();}}
  $$('button.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
  switchTab('factura');

  const lineasDiv=$('#lineas'); const btnAddLinea=$('#btnAddLinea'); const btnVaciarLineas=$('#btnVaciarLineas');
  const prov={nombre:$('#provNombre'),nif:$('#provNif'),dir:$('#provDir'),tel:$('#provTel'),email:$('#provEmail')};
  const cli={nombre:$('#cliNombre'),nif:$('#cliNif'),dir:$('#cliDir'),tel:$('#cliTel'),email:$('#cliEmail')};
  const selCliente=$('#selCliente'); const btnNuevoCliente=$('#btnNuevoCliente');
  const chkTransporte=$('#chkTransporte');
  // Nuevo checkbox para IVA real (si no existe aún en HTML, el código sigue funcionando)
  const chkAplicarIVA = $('#chkAplicarIVA') || null;
  // El antiguo "IVA incluido (solo mostrar)" se mantiene como compatibilidad si existe
  const chkIvaIncluido=$('#chkIvaIncluido');

  const estado=$('#estado'); const pagadoInp=$('#pagado'); const metodoPago=$('#metodoPago'); const observaciones=$('#observaciones');
  const subtotalEl=$('#subtotal'),transpEl=$('#transp'),ivaEl=$('#iva'),totalEl=$('#total'),mostPagadoEl=$('#mostPagado'),pendienteEl=$('#pendiente');

  const listaClientes=$('#listaClientes'), btnAddCliente=$('#btnAddCliente'), buscarCliente=$('#buscarCliente'), btnExportClientes=$('#btnExportClientes'), btnImportClientes=$('#btnImportClientes');
  const filtroEstado=$('#filtroEstado'), buscaCliente=$('#buscaCliente'), listaFacturas=$('#listaFacturas'), btnExportFacturas=$('#btnExportFacturas'), btnImportFacturas=$('#btnImportFacturas');
  const rHoy=$('#rHoy'), rSemana=$('#rSemana'), rMes=$('#rMes'), rTotal=$('#rTotal'), resGlobal=$('#resGlobal'), resPorCliente=$('#resPorCliente'), btnResetCliente=$('#btnResetCliente'), btnResetGlobal=$('#btnResetGlobal'), btnBackup=$('#btnBackup'), btnRestore=$('#btnRestore');
  const listaProductos=$('#listaProductos'), btnAddProducto=$('#btnAddProducto'), btnExportProductos=$('#btnExportProductos'), btnImportProductos=$('#btnImportProductos');
  const pNum=$('#p-num'), pFecha=$('#p-fecha'), pProv=$('#p-prov'), pCli=$('#p-cli'), pTabla=$('#p-tabla tbody'), pSub=$('#p-sub'), pTra=$('#p-tra'), pIva=$('#p-iva'), pTot=$('#p-tot'), pEstado=$('#p-estado'), pMetodo=$('#p-metodo'), pObs=$('#p-obs');

  // Campo de fecha editable (si existe en HTML)
  const fechaFacturaInput = $('#fechaFactura');
  if (fechaFacturaInput && !fechaFacturaInput.value) {
    // set default a hoy (yyyy-mm-dd)
    const hoy = new Date(); const y=hoy.getFullYear(), m=String(hoy.getMonth()+1).padStart(2,'0'), d=String(hoy.getDate()).padStart(2,'0');
    fechaFacturaInput.value = `${y}-${m}-${d}`;
  }

  function uniqueByName(arr){const map=new Map();arr.forEach(c=>{const k=(c.nombre||'').trim().toLowerCase();if(!k)return;if(!map.has(k))map.set(k,c);});return [...map.values()];}
  function seedClientesIfEmpty(){if(clientes.length>0)return;clientes=uniqueByName([
    {nombre:'Riviera — CONOR ESY SLU', nif:'B16794893', dir:'Paseo del Espolón, 09003 Burgos', tel:'', email:''},
    {nombre:'Alesal Pan / Café de Calle San Lesmes — Alesal Pan y Café S.L.', nif:'B09582420', dir:'C/ San Lesmes 1, Burgos', tel:'', email:''},
    {nombre:'Al Pan Pan Burgos, S.L.', nif:'B09569344', dir:'C/ Miranda 17, Bajo, 09002 Burgos', tel:'947 277 977', email:'bertiz.miranda@gmail.com'},
    {nombre:'Cuevas Palacios Restauración S.L. (Con/sentidos)', nif:'B10694792', dir:'C/ San Lesmes, 1 – 09004 Burgos', tel:'947 20 35 51', email:''},
    {nombre:'Café Bar Nuovo (Einy Mercedes Olivo Jiménez)', nif:'120221393', dir:'C/ San Juan de Ortega 14, 09007 Burgos', tel:'', email:''},
    {nombre:'Hotel Cordon', nif:'', dir:'', tel:'', email:''},
    {nombre:'Vaivén Hostelería', nif:'', dir:'', tel:'', email:''},
    {nombre:'Grupo Resicare', nif:'', dir:'', tel:'', email:''},
    {nombre:'Carlos Alameda Peralta & Seis Más', nif:'', dir:'', tel:'', email:''},
    {nombre:'Tabalou Development SLU', nif:'ES B09567769', dir:'', tel:'', email:''},
    {nombre:'Golden Garden — David Herrera Estalayo', nif:'71281665L', dir:'Trinidad, 12, 09003 Burgos', tel:'', email:''},
    {nombre:'Romina — PREMIER', nif:'', dir:'C/ Madrid 42, Burgos', tel:'', email:''},
    {nombre:'Abbas — Locutorio Gamonal', nif:'', dir:'C/ Derechos Humanos 45, Burgos', tel:'', email:''},
    {nombre:'Nadeem Bhai — RIA Locutorio', nif:'', dir:'C/ Vitoria 137, Burgos', tel:'', email:''},
    {nombre:'Mehmood — Mohsin Telecom', nif:'', dir:'C/ Vitoria 245, Burgos', tel:'', email:''},
    {nombre:'Adnan Asif', nif:'X7128589S', dir:'C/ Padre Flórez 3, Burgos', tel:'', email:''},
    {nombre:'Imran Khan — Estambul', nif:'', dir:'Avda. del Cid, Burgos', tel:'', email:''},
    {nombre:'Waqas Sohail', nif:'', dir:'C/ Vitoria, Burgos', tel:'', email:''},
    {nombre:'Malik — Locutorio Malik', nif:'', dir:'C/ Progreso, Burgos', tel:'', email:''},
    {nombre:'Angela', nif:'', dir:'C/ Madrid, Burgos', tel:'', email:''},
    {nombre:'Aslam — Locutorio Aslam', nif:'', dir:'Avda. del Cid, Burgos', tel:'', email:''},
    {nombre:'Victor Pelu — Tienda Centro', nif:'', dir:'Burgos Centro', tel:'', email:''},
    {nombre:'Domingo', nif:'', dir:'', tel:'', email:''},
    {nombre:'Bar Tropical', nif:'', dir:'', tel:'', email:''},
    {nombre:'Bar Punta Cana — PUNTA CANA', nif:'', dir:'C/ Los Titos, Burgos', tel:'', email:''},
    {nombre:'Jose — Alimentación Patxi', nif:'', dir:'C/ Camino Casa la Vega 33, Burgos', tel:'', email:''},
    {nombre:'Ideal — Ideal Supermercado', nif:'', dir:'Avda. del Cid, Burgos', tel:'', email:''},
  ]); saveClientes();}
  function saveClientes(){localStorage.setItem(K_CLIENTES, JSON.stringify(clientes));}
  function renderClientesSelect(){const sel=selCliente; sel.innerHTML='<option value="">— Seleccionar cliente —</option>';[...clientes].sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'')).forEach((c,i)=>{const opt=document.createElement('option'); opt.value=i; opt.textContent=c.nombre||`Cliente ${i+1}`; sel.appendChild(opt);});}
  function renderClientesLista(){listaClientes.innerHTML=''; const q=(buscarCliente.value||'').toLowerCase(); const arr=[...clientes].sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'')); const view=q?arr.filter(c=>(c.nombre||'').toLowerCase().includes(q)||(c.nif||'').toLowerCase().includes(q)):arr; if(view.length===0){listaClientes.innerHTML='<div class="item">Sin clientes.</div>';return;} view.forEach((c,idx)=>{const row=document.createElement('div'); row.className='item'; row.innerHTML=`
      <div><strong>${escapeHTML(c.nombre||'(Sin nombre)')}</strong>
      <div class="meta">${escapeHTML(c.nif||'')} · ${escapeHTML(c.dir||'')}</div>
      <div class="meta">${escapeHTML(c.tel||'')} ${c.email?('· '+escapeHTML(c.email)) : ''}</div></div>
      <div class="row-inline">
        <button class="btn small" data-e="select" data-i="${idx}">Usar</button>
        <button class="btn small" data-e="edit" data-i="${idx}">Editar</button>
        <button class="btn small ghost" data-e="del" data-i="${idx}">Borrar</button>
      </div>`; listaClientes.appendChild(row); });
    listaClientes.querySelectorAll('button').forEach(b=>{const i=+b.dataset.i; b.addEventListener('click',()=>{if(b.dataset.e==='del'){if(confirm('¿Eliminar cliente?')){clientes.splice(i,1);saveClientes();renderClientesSelect();renderClientesLista();}} else if(b.dataset.e==='select'){const c=clientes[i]; cli.nombre.value=c.nombre||''; cli.nif.value=c.nif||''; cli.dir.value=c.dir||''; cli.tel.value=c.tel||''; cli.email.value=c.email||''; switchTab('factura');} else {const c=clientes[i]; const nombre=prompt('Nombre',c.nombre||'')??c.nombre; const nif=prompt('NIF/CIF',c.nif||'')??c.nif; const dir=prompt('Dirección',c.dir||'')??c.dir; const tel=prompt('Teléfono',c.tel||'')??c.tel; const email=prompt('Email',c.email||'')??c.email; clientes[i]={nombre,nif,dir,tel,email}; saveClientes(); renderClientesSelect(); renderClientesLista();}});});}
  btnNuevoCliente?.addEventListener('click',()=>switchTab('clientes'));
  btnAddCliente?.addEventListener('click',()=>{const nombre=prompt('Nombre del cliente:'); if(!nombre) return; const nif=prompt('NIF/CIF:')||''; const dir=prompt('Dirección:')||''; const tel=prompt('Teléfono:')||''; const email=prompt('Email:')||''; clientes.push({nombre,nif,dir,tel,email}); saveClientes(); renderClientesSelect(); renderClientesLista();});
  buscarCliente?.addEventListener('input',renderClientesLista);
  btnExportClientes?.addEventListener('click',()=>downloadJSON(clientes,'clientes-arslan-v9.json'));
  btnImportClientes?.addEventListener('click',()=>uploadJSON(arr=>{if(Array.isArray(arr)){clientes=uniqueByName(arr); saveClientes(); renderClientesSelect(); renderClientesLista();}}));
  selCliente?.addEventListener('change',()=>{const i=selCliente.value; if(i==='') return; const c=clientes[+i]; if(!c) return; cli.nombre.value=c.nombre||''; cli.nif.value=c.nif||''; cli.dir.value=c.dir||''; cli.tel.value=c.tel||''; cli.email.value=c.email||'';});

  function saveProductos(){localStorage.setItem(K_PRODUCTOS, JSON.stringify(productos));}
  const PRODUCT_NAMES=['KIWI ZESPRI GOLD','MANZANA PINK LADY','NARANJA ZUMO','PLATANO CANARIO PRIMERA','TOMATE RAMA','AGUACATE GRANEL','PIMIENTO ROJO','PIMIENTO VERDE','SANDIA','MELON'];
  function seedProductsIfEmpty(){if(productos.length>0) return; productos=PRODUCT_NAMES.map(n=>({name:n})); saveProductos();}
  function lastPrice(name){const arr=priceHist[name]; return arr?.length?arr[0].price:null;}
  function savePriceHist(){localStorage.setItem(K_PRICEHIST, JSON.stringify(priceHist));}
  function pushPriceHistory(name,price){ if(!name || !(price>0)) return; const arr=priceHist[name]||[]; arr.unshift({price,date:todayISO()}); priceHist[name]=arr.slice(0,10); savePriceHist();}

  function renderProductos(){listaProductos.innerHTML=''; if(productos.length===0){listaProductos.innerHTML='<div class="item">Sin productos. Usa “Añadir” o Importar JSON.</div>';return;} productos.forEach((p,idx)=>{const row=document.createElement('div'); row.className='product-row'; row.innerHTML=`
      <input value="${escapeHTML(p.name||'')}" data-f="name">
      <select data-f="mode"><option value="" ${!p.mode?'selected':''}>—</option><option value="kg" ${p.mode==='kg'?'selected':''}>kg</option><option value="unidad" ${p.mode==='unidad'?'selected':''}>unidad</option><option value="caja" ${p.mode==='caja'?'selected':''}>caja</option></select>
      <input type="number" step="0.01" min="0" value="${p.boxKg??''}" data-f="boxKg" placeholder="Kg/caja">
      <input type="number" step="0.01" min="0" value="${p.price??''}" data-f="price" placeholder="€ base">
      <input value="${escapeHTML(p.origin||'')}" data-f="origin" placeholder="Origen">
      <div class="row-inline"><button class="btn small" data-e="save" data-i="${idx}">Guardar</button><button class="btn small ghost" data-e="del" data-i="${idx}">Borrar</button></div>`; listaProductos.appendChild(row);});
    listaProductos.querySelectorAll('button').forEach(b=>{const i=+b.dataset.i; b.addEventListener('click',()=>{if(b.dataset.e==='del'){if(confirm('¿Eliminar producto?')){productos.splice(i,1); saveProductos(); renderProductos();}}else{const row=b.closest('.product-row'); const get=f=>row.querySelector(`[data-f="${f}"]`).value.trim(); const name=get('name'); const mode=(get('mode')||null); const boxKgStr=get('boxKg'); const boxKg=boxKgStr===''?null:parseNum(boxKgStr); const priceStr=get('price'); const price=priceStr===''?null:parseNum(priceStr); const origin=get('origin')||null; productos[i]={name,mode,boxKg,price,origin}; saveProductos(); renderProductos();}});});}
  btnAddProducto?.addEventListener('click',()=>{const name=prompt('Nombre del producto:'); if(!name) return; productos.push({name}); saveProductos(); renderProductos();});
  btnExportProductos?.addEventListener('click',()=>downloadJSON(productos,'productos-arslan-v9.json'));
  btnImportProductos?.addEventListener('click',()=>uploadJSON(arr=>{if(Array.isArray(arr)){productos=arr; saveProductos(); renderProductos();}}));

  function findProducto(name){return productos.find(p=>(p.name||'').toLowerCase()===String(name).toLowerCase());}
  function lineaHTML(){const wrap=document.createElement('div'); wrap.className='linea'; wrap.innerHTML=`
      <div class="suggest-box"><input class="name" placeholder="Producto"><div class="suggest-list" hidden></div></div>
      <select class="mode"><option value="">—</option><option value="kg">kg</option><option value="unidad">unidad</option><option value="caja">caja</option></select>
      <input class="qty" type="number" min="0" step="1" placeholder="Cant.">
      <input class="gross" type="number" min="0" step="0.01" placeholder="Bruto kg">
      <input class="tare" type="number" min="0" step="0.01" placeholder="Tara kg">
      <input class="net" type="number" min="0" step="0.01" placeholder="Neto kg" disabled>
      <input class="price" type="number" min="0" step="0.01" placeholder="Precio">
      <input class="origin" placeholder="Origen">
      <input class="amount" placeholder="Importe" disabled>
      <button class="del">✕</button>`;
    const nameInp=wrap.querySelector('.name'), list=wrap.querySelector('.suggest-list'), modeInp=wrap.querySelector('.mode');
    const qtyInp=wrap.querySelector('.qty'), grossInp=wrap.querySelector('.gross'), tareInp=wrap.querySelector('.tare'), netInp=wrap.querySelector('.net');
    const priceInp=wrap.querySelector('.price'), originInp=wrap.querySelector('.origin'), amtInp=wrap.querySelector('.amount');
    nameInp.addEventListener('input',()=>{const q=nameInp.value.trim().toLowerCase(); if(!q){list.hidden=true;list.innerHTML='';return;} const matches=productos.filter(p=>p.name?.toLowerCase().includes(q)).slice(0,12); if(matches.length===0){list.hidden=true;list.innerHTML='';return;} list.innerHTML=''; matches.forEach(p=>{const last=lastPrice(p.name); const btn=document.createElement('button'); btn.textContent=`${p.name}${p.mode?` · ${p.mode}`:''}${p.boxKg?` · ${p.boxKg}kg/caja`:''}${p.price!=null?` · base ${p.price}€`:''}${p.origin?` · ${p.origin}`:''}${last?` · último ${last}€`:''}`; btn.addEventListener('click',()=>{nameInp.value=p.name; if(p.mode){modeInp.value=p.mode;} if(p.price!=null){priceInp.value=p.price;} if(p.origin){originInp.value=p.origin;} list.hidden=true; recalcLine();}); list.appendChild(btn);}); list.hidden=false;});
    nameInp.addEventListener('blur',()=>setTimeout(()=>list.hidden=true,150));
    [modeInp,qtyInp,grossInp,tareInp,priceInp].forEach(el=>el.addEventListener('input',recalcLine));
    wrap.querySelector('.del').addEventListener('click',()=>{wrap.remove();recalc();});
    function recalcLine(){const mode=(modeInp.value||'').toLowerCase(); const qty=Math.max(0,Math.floor(parseNum(qtyInp.value||0))); const gross=Math.max(0,parseNum(grossInp.value||0)); const tare=Math.max(0,parseNum(tareInp.value||0)); const price=Math.max(0,parseNum(priceInp.value||0)); let net=0; if(gross>0){net=Math.max(0,gross-tare);} else if(mode==='caja'){const p=findProducto(nameInp.value); const kg=p?.boxKg||0; net=qty*kg;} else if(mode==='kg'){ net=qty;} else if(mode==='unidad'){ net=qty;} netInp.value=net?net.toFixed(2):''; let amount=0; amount=(mode==='unidad')?qty*price:net*price; amtInp.value=amount>0?amount.toFixed(2):''; recalc();}
    return wrap;}
  function addLinea(){lineasDiv.appendChild(lineaHTML());}
  btnAddLinea?.addEventListener('click',addLinea);
  btnVaciarLineas?.addEventListener('click',()=>{if(confirm('¿Vaciar todas las líneas?')){lineasDiv.innerHTML=''; for(let i=0;i<5;i++) addLinea(); recalc();}});

  function getLineas(){return $$('.linea').map(r=>{const name=r.querySelector('.name').value.trim(); const mode=r.querySelector('.mode').value.trim().toLowerCase(); const qty=Math.max(0,Math.floor(parseNum(r.querySelector('.qty').value||0))); const gross=Math.max(0,parseNum(r.querySelector('.gross').value||0)); const tare=Math.max(0,parseNum(r.querySelector('.tare').value||0)); const net=Math.max(0,parseNum(r.querySelector('.net').value||0)); const price=Math.max(0,parseNum(r.querySelector('.price').value||0)); const origin=r.querySelector('.origin').value.trim(); return {name,mode,qty,gross,tare,net,price,origin};}).filter(l=>l.name&&(l.qty>0||l.net>0||l.gross>0));}
  function lineImporte(l){return (l.mode==='unidad')?l.qty*l.price:l.net*l.price;}

  // 🔄 Recalcular totales (Transporte 10% y, si procede, IVA 4% aplicado)
  function recalc(){
    const ls=getLineas();
    let subtotal=0; ls.forEach(l=>subtotal+=lineImporte(l));

    const transporte = chkTransporte?.checked ? subtotal*0.10 : 0;
    const baseMasTrans = subtotal + transporte;

    // Si existe chkAplicarIVA → usarlo; si no existe pero hay chkIvaIncluido, NO aplicar IVA
    const aplicarIVA = !!(chkAplicarIVA && chkAplicarIVA.checked);
    const iva = aplicarIVA ? baseMasTrans * 0.04 : 0;

    const total = baseMasTrans + iva;

    const pagado=parseNum($('#pagado').value);
    const pendiente=Math.max(0,total-pagado);

    $('#subtotal').textContent=money(subtotal);
    $('#transp').textContent=money(transporte);
    $('#iva').textContent=money(iva);
    $('#total').textContent=money(total);
    $('#mostPagado').textContent=money(pagado);
    $('#pendiente').textContent=money(pendiente);

    fillPrint(ls,{subtotal,transporte,iva,total});
    drawResumen();
  }
  ;[chkTransporte,chkIvaIncluido,chkAplicarIVA,estado,pagadoInp].forEach(el=>el?.addEventListener('input',recalc));

  function genNumFactura(){const d=new Date(),pad=n=>String(n).padStart(2,'0'); return `FA-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;}
  function unMoney(s){return parseFloat(String(s).replace(/\./g,'').replace(',','.').replace(/[^\d.]/g,''))||0;}
  function saveFacturas(){localStorage.setItem(K_FACTURAS, JSON.stringify(facturas));}

  // 🧰 Cargar una factura en el editor para modificar
  function loadFacturaToEditor(f){
    // Proveedor
    prov.nombre.value=f.proveedor?.nombre||''; prov.nif.value=f.proveedor?.nif||''; prov.dir.value=f.proveedor?.dir||''; prov.tel.value=f.proveedor?.tel||''; prov.email.value=f.proveedor?.email||'';
    // Cliente
    cli.nombre.value=f.cliente?.nombre||''; cli.nif.value=f.cliente?.nif||''; cli.dir.value=f.cliente?.dir||''; cli.tel.value=f.cliente?.tel||''; cli.email.value=f.cliente?.email||'';
    // Condiciones
    if (chkTransporte) chkTransporte.checked = !!f.transporte;
    if (chkAplicarIVA) chkAplicarIVA.checked = !!(f.totals && f.totals.iva && f.totals.iva>0);
    if (chkIvaIncluido) chkIvaIncluido.checked = !chkAplicarIVA?.checked; // compat
    estado.value=f.estado||'pendiente';
    pagadoInp.value=(f.totals?.pagado||0);
    metodoPago.value=f.metodo||'Efectivo';
    observaciones.value=f.obs||'';

    // Fecha editable si existe input
    if (fechaFacturaInput) {
      const d = new Date(f.fecha);
      const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
      fechaFacturaInput.value = `${y}-${m}-${dd}`;
    }

    // Líneas
    lineasDiv.innerHTML='';
    (f.lineas||[]).forEach(()=>addLinea());
    const rows = $$('.linea');
    (f.lineas||[]).forEach((l,idx)=>{
      const r=rows[idx];
      r.querySelector('.name').value = l.name||'';
      r.querySelector('.mode').value = l.mode||'';
      r.querySelector('.qty').value = l.qty||'';
      r.querySelector('.gross').value = l.gross||'';
      r.querySelector('.tare').value = l.tare||'';
      r.querySelector('.net').value = l.net||'';
      r.querySelector('.price').value = l.price||'';
      r.querySelector('.origin').value = l.origin||'';
      // recalcular importe de línea
      r.querySelector('.amount').value = (l.mode==='unidad') ? (l.qty*l.price||0).toFixed(2) : (l.net*l.price||0).toFixed(2);
    });

    recalc();
  }

  // 💾 Guardar / Actualizar factura
  $('#btnGuardar')?.addEventListener('click',()=>{
    const ls=getLineas(); if(ls.length===0){alert('Añade al menos una línea.');return;}

    // Empujar historial de precios
    ls.forEach(l=>pushPriceHistory(l.name,l.price));

    // Totales en UI
    const subtotal=unMoney($('#subtotal').textContent), transporte=unMoney($('#transp').textContent), iva=unMoney($('#iva').textContent), total=unMoney($('#total').textContent);
    const pagado=parseNum($('#pagado').value), pendiente=Math.max(0,total-pagado);

    // Fecha desde input si existe
    let fechaISO;
    if (fechaFacturaInput && fechaFacturaInput.value) {
      // Normalizamos a mediodía para evitar TZ raras
      fechaISO = new Date(fechaFacturaInput.value + 'T12:00:00').toISOString();
    } else {
      fechaISO = todayISO();
    }

    // ¿Nueva o edición?
    if (currentEditIndex >= 0) {
      // Actualizar EXISTENTE (mismo número)
      const f = facturas[currentEditIndex];
      f.fecha = fechaISO;
      f.proveedor = {nombre:prov.nombre.value,nif:prov.nif.value,dir:prov.dir.value,tel:prov.tel.value,email:prov.email.value};
      f.cliente = {nombre:cli.nombre.value,nif:cli.nif.value,dir:cli.dir.value,tel:cli.tel.value,email:cli.email.value};
      f.lineas = ls;
      f.transporte = !!(chkTransporte?.checked);
      // Guardamos si se aplicó IVA
      f.ivaIncluido = chkAplicarIVA ? !chkAplicarIVA.checked : (chkIvaIncluido?.checked||false);
      f.estado = estado.value;
      f.metodo = metodoPago.value;
      f.obs = observaciones.value;
      f.totals = {subtotal,transporte,iva,total,pagado,pendiente};
      facturas[currentEditIndex] = f;
      saveFacturas();
      alert(`Factura ${f.numero} actualizada.`);
    } else {
      // Nueva factura
      const numero=genNumFactura();
      const factura={
        numero, fecha:fechaISO,
        proveedor:{nombre:$('#provNombre').value,nif:$('#provNif').value,dir:$('#provDir').value,tel:$('#provTel').value,email:$('#provEmail').value},
        cliente:{nombre:$('#cliNombre').value,nif:$('#cliNif').value,dir:$('#cliDir').value,tel:$('#cliTel').value,email:$('#cliEmail').value},
        lineas:ls,
        transporte:$('#chkTransporte').checked,
        // si hay chkAplicarIVA: ivaIncluido = !aplicarIVA; si no existe, respetar el viejo checkbox
        ivaIncluido: chkAplicarIVA ? !chkAplicarIVA.checked : ($('#chkIvaIncluido')?.checked||false),
        estado:$('#estado').value, metodo:$('#metodoPago').value, obs:$('#observaciones').value,
        totals:{subtotal,transporte,iva,total,pagado,pendiente}
      };
      facturas.unshift(factura); saveFacturas(); alert(`Factura ${numero} guardada.`);
    }

    // Reset edición y refrescos
    currentEditIndex = -1;
    renderFacturas(); renderResumen(); fillPrint(ls,{subtotal,transporte,iva,total});
  });

  $('#btnNueva')?.addEventListener('click',()=>{
    lineasDiv.innerHTML=''; for(let i=0;i<5;i++) addLinea();
    if(chkTransporte) chkTransporte.checked=false;
    if(chkAplicarIVA) chkAplicarIVA.checked=false;
    if(chkIvaIncluido) chkIvaIncluido.checked=true;
    $('#estado').value='pendiente'; $('#pagado').value=''; $('#metodoPago').value='Efectivo'; $('#observaciones').value='';
    // reset fecha a hoy si existe
    if (fechaFacturaInput) {
      const hoy = new Date(); const y=hoy.getFullYear(), m=String(hoy.getMonth()+1).padStart(2,'0'), d=String(hoy.getDate()).padStart(2,'0');
      fechaFacturaInput.value = `${y}-${m}-${d}`;
    }
    currentEditIndex = -1;
    recalc();
  });

  $('#btnImprimir')?.addEventListener('click',()=>window.print());

  function badgeEstado(f){if(f.estado==='pagado')return`<span class="badge ok">Pagada</span>`; if(f.estado==='parcial'){const resta=Math.max(0,(f.totals?.total||0)-(f.totals?.pagado||0)); return `<span class="badge warn">Parcial · resta ${money(resta)}</span>`;} return `<span class="badge bad">Pendiente</span>`;}
  function renderFacturas(){listaFacturas.innerHTML=''; const q=(buscaCliente.value||'').toLowerCase(); const fe=filtroEstado.value; let arr=facturas.slice(); if(fe!=='todas')arr=arr.filter(f=>f.estado===fe); if(q)arr=arr.filter(f=>(f.cliente?.nombre||'').toLowerCase().includes(q)); if(arr.length===0){listaFacturas.innerHTML='<div class="item">No hay facturas.</div>';return;} arr.slice(0,400).forEach((f,idx)=>{const fecha=new Date(f.fecha).toLocaleString(); const div=document.createElement('div'); div.className='item'; div.innerHTML=`
        <div><strong>${escapeHTML(f.numero)}</strong> ${badgeEstado(f)}<div class="meta">${fecha} · ${escapeHTML(f.cliente?.nombre||'')}</div></div>
        <div class="row-inline"><strong>${money(f.totals.total)}</strong>
          <button class="btn small" data-e="ver" data-i="${idx}">Ver</button>
          <button class="btn small" data-e="cobrar" data-i="${idx}">💶 Cobrado</button>
          <button class="btn small ghost" data-e="pdf" data-i="${idx}">PDF Factura</button></div>`; listaFacturas.appendChild(div); });
    listaFacturas.querySelectorAll('button').forEach(b=>{const i=+b.dataset.i; b.addEventListener('click',()=>{const f=facturas[i]; if(b.dataset.e==='ver'){
          // Cargar factura en editor y preparar edición
          loadFacturaToEditor(f);
          currentEditIndex = i;
          fillPrint(f.lineas,f.totals,f); switchTab('factura'); $('#printArea').scrollIntoView({behavior:'smooth'}); return;
        }
        if(b.dataset.e==='cobrar'){const tot=f.totals.total||0; f.totals.pagado=tot; f.totals.pendiente=0; f.estado='pagado'; saveFacturas(); renderFacturas(); renderResumen(); drawResumen(); return;}
        if(b.dataset.e==='pdf'){fillPrint(f.lineas,f.totals,f); const dt=new Date(f.fecha); const nombreCliente=(f.cliente?.nombre||'Cliente').replace(/\s+/g,''); const filename=`Factura-${nombreCliente}-${fmtDateDMY(dt)}.pdf`; const opt={margin:10, filename, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}}; html2pdf().set(opt).from(document.getElementById('printArea')).save(); return;}});});}
  [filtroEstado,buscaCliente].forEach(el=>el?.addEventListener('input',renderFacturas));
  btnExportFacturas?.addEventListener('click',()=>downloadJSON(facturas,'facturas-arslan-v9.json'));
  btnImportFacturas?.addEventListener('click',()=>uploadJSON(arr=>{if(Array.isArray(arr)){facturas=arr; saveFacturas(); renderFacturas(); renderResumen();}}));

  function drawResumen(){const now=new Date(); const todayKey=now.toISOString().slice(0,10); const startOfWeek=(()=>{const d=new Date(now); const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); d.setHours(0,0,0,0); return d;})(); const startOfMonth=new Date(now.getFullYear(),now.getMonth(),1); let hoy=0,semana=0,mes=0,total=0,pendiente=0; facturas.forEach(f=>{const d=new Date(f.fecha); total+=(f.totals?.total||0); if(f.fecha.slice(0,10)===todayKey) hoy+=(f.totals?.total||0); if(d>=startOfWeek) semana+=(f.totals?.total||0); if(d>=startOfMonth) mes+=(f.totals?.total||0); pendiente+=(f.totals?.pendiente||0);}); rHoy.textContent=money(hoy); rSemana.textContent=money(semana); rMes.textContent=money(mes); rTotal.textContent=money(total); resGlobal.textContent=money(pendiente); const map=new Map(); facturas.forEach(f=>{const nom=f.cliente?.nombre||'(s/cliente)'; const pend=f.totals?.pendiente||0; map.set(nom,(map.get(nom)||0)+pend);}); resPorCliente.innerHTML=''; if(map.size===0){resPorCliente.innerHTML='<div class="item">No hay deudas registradas.</div>';return;} [...map.entries()].sort((a,b)=>b[1]-a[1]).forEach(([nom,pend])=>{const div=document.createElement('div'); div.className='item'; div.innerHTML=`<div><strong>${escapeHTML(nom)}</strong></div><div><strong>${money(pend)}</strong></div>`; resPorCliente.appendChild(div);});}
  let chart1,chart2;
  function groupDaily(n=7){const now=new Date(); const buckets=[]; for(let i=n-1;i>=0;i--){const d=new Date(now); d.setDate(d.getDate()-i); const k=d.toISOString().slice(0,10); buckets.push({k,label:k.slice(5),sum:0});} facturas.forEach(f=>{const k=f.fecha.slice(0,10); const b=buckets.find(x=>x.k===k); if(b)b.sum+=(f.totals?.total||0);}); return buckets;}
  function groupMonthly(n=12){const now=new Date(); const buckets=[]; for(let i=n-1;i>=0;i--){const d=new Date(now); d.setMonth(d.getMonth()-i); const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; buckets.push({k,label:k,sum:0});} facturas.forEach(f=>{const d=new Date(f.fecha); const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; const b=buckets.find(x=>x.k===k); if(b)b.sum+=(f.totals?.total||0);}); return buckets;}
  function drawCharts(){const daily=groupDaily(7), monthly=groupMonthly(12); if(chart1)chart1.destroy(); if(chart2)chart2.destroy(); chart1=new Chart($('#chartDiario').getContext('2d'),{type:'bar',data:{labels:daily.map(d=>d.label),datasets:[{label:'Ventas diarias',data:daily.map(d=>d.sum)}]},options:{responsive:true,plugins:{legend:{display:false}}}}); chart2=new Chart($('#chartMensual').getContext('2d'),{type:'line',data:{labels:monthly.map(d=>d.label),datasets:[{label:'Ventas mensuales',data:monthly.map(d=>d.sum)}]},options:{responsive:true,plugins:{legend:{display:false}}}});}

  $('#btnResetCliente')?.addEventListener('click',()=>{const i=selCliente.value; if(i===''){alert('Selecciona un cliente en la pestaña Factura.'); return;} const nombre=clientes[+i]?.nombre||''; if(!nombre){alert('Cliente sin nombre.'); return;} if(!confirm(`¿Resetear deudas del cliente "${nombre}"?`)) return; facturas=facturas.map(f=>{if((f.cliente?.nombre||'')===nombre){const n={...f, totals:{...f.totals}}; const tot=n.totals.total||0; n.totals.pagado=tot; n.totals.pendiente=0; n.estado='pagado'; return n;} return f;}); saveFacturas(); renderFacturas(); drawResumen();});
  $('#btnResetGlobal')?.addEventListener('click',()=>{if(!confirm('¿Resetear TODAS las deudas?')) return; facturas=facturas.map(f=>{const n={...f, totals:{...f.totals}}; const tot=n.totals.total||0; n.totals.pagado=tot; n.totals.pendiente=0; n.estado='pagado'; return n;}); saveFacturas(); renderFacturas(); drawResumen();});

  function fillPrint(lines, totals, factura=null){
    $('#p-num').textContent=factura?.numero||'(Sin guardar)';
    $('#p-fecha').textContent=(factura?new Date(factura.fecha):new Date()).toLocaleString();

    $('#p-prov').innerHTML=`<div><strong>${escapeHTML(factura?.proveedor?.nombre||$('#provNombre').value||'')}</strong></div><div>${escapeHTML(factura?.proveedor?.nif||$('#provNif').value||'')}</div><div>${escapeHTML(factura?.proveedor?.dir||$('#provDir').value||'')}</div><div>${escapeHTML(factura?.proveedor?.tel||$('#provTel').value||'')} · ${escapeHTML(factura?.proveedor?.email||$('#provEmail').value||'')}</div>`;
    $('#p-cli').innerHTML=`<div><strong>${escapeHTML(factura?.cliente?.nombre||$('#cliNombre').value||'')}</strong></div><div>${escapeHTML(factura?.cliente?.nif||$('#cliNif').value||'')}</div><div>${escapeHTML(factura?.cliente?.dir||$('#cliDir').value||'')}</div><div>${escapeHTML(factura?.cliente?.tel||$('#cliTel').value||'')} · ${escapeHTML(factura?.cliente?.email||$('#cliEmail').value||'')}</div>`;

    const tbody=document.querySelector('#p-tabla tbody'); tbody.innerHTML='';
    (lines||[]).forEach(l=>{const tr=document.createElement('tr'); tr.innerHTML=`<td>${escapeHTML(l.name)}</td><td>${escapeHTML(l.mode||'')}</td><td>${l.qty||''}</td><td>${l.net?l.net.toFixed(2):''}</td><td>${money(l.price)}</td><td>${escapeHTML(l.origin||'')}</td><td>${money((l.mode==='unidad')?l.qty*l.price:l.net*l.price)}</td>`; tbody.appendChild(tr);});

    $('#p-sub').textContent=money(totals?.subtotal||0);
    $('#p-tra').textContent=money(totals?.transporte||0);
    $('#p-iva').textContent=money(totals?.iva||0);
    $('#p-tot').textContent=money(totals?.total||0);
    $('#p-estado').textContent=factura?.estado||$('#estado').value;
    $('#p-metodo').textContent=factura?.metodo||$('#metodoPago').value;

    // Si no se aplica IVA (o se marcó "IVA incluido" de compat), añadir nota en PDF
    const ivaAplicadoAhora = !!(chkAplicarIVA && chkAplicarIVA.checked);
    const debeMostrarNota = (!ivaAplicadoAhora) || (factura && factura.ivaIncluido===true);
    const obsVal = (factura?.obs ?? ($('#observaciones').value||'—'));
    $('#p-obs').textContent = debeMostrarNota
      ? (obsVal && obsVal !== '—' ? (obsVal + ' · IVA incluido en los precios.') : 'IVA incluido en los precios.')
      : (obsVal || '—');
  }

  function downloadJSON(obj,filename){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);}
  function uploadJSON(cb){const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json'; inp.onchange=e=>{const f=e.target.files[0]; if(!f) return; const reader=new FileReader(); reader.onload=()=>{try{cb(JSON.parse(reader.result));}catch{alert('JSON inválido');}}; reader.readAsText(f);}; inp.click();}

  function addLinea(){lineasDiv.appendChild(lineaHTML());}
  function recalc(){/* defined above but needs to be declared before used. */}
  function renderResumen(){drawResumen();}

  function renderClientesSelect(){}
  function renderClientesLista(){}

  // seeds
  function seed(){}
  // BOOT
  seedClientesIfEmpty();
  seedProductsIfEmpty();
  if($$('.linea').length===0){for(let i=0;i<5;i++) addLinea();}
  ;(function(){ /* force initial renders */ })();
  // wire-up after definitions
  window.recalc=recalc;
  window.addLinea=addLinea;

  // Final initial updates
  renderClientesSelect(); renderClientesLista(); renderProductos(); renderFacturas(); drawResumen(); (function(){ /* charts defer */ })();
});
