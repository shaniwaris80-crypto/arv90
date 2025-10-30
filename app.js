/* =======================================================
   ARSLAN PRO V10.4 — KIWI Edition (Full, estable)
   + Mejora IVA real (+4%) con botón dedicado
   + Botón IVA se desactiva al aplicarlo y se reactiva al vaciar o nueva factura
======================================================= */
(function(){
"use strict";

/* ---------- HELPERS ---------- */
const $  = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));
const money = n => (isNaN(n)?0:n).toFixed(2).replace('.', ',') + " €";
const parseNum = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };
const escapeHTML = s => String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
const todayISO = () => new Date().toISOString();
const fmtDateDMY = d => `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
const unMoney = s => parseFloat(String(s).replace(/\./g,'').replace(',','.').replace(/[^\d.]/g,'')) || 0;
const uid = ()=>'c'+Math.random().toString(36).slice(2,10)+Date.now().toString(36);

/* ---------- KEYS ---------- */
const K_CLIENTES='arslan_v104_clientes';
const K_PRODUCTOS='arslan_v104_productos';
const K_FACTURAS='arslan_v104_facturas';
const K_PRICEHIST='arslan_v104_pricehist';

/* ---------- ESTADO ---------- */
let clientes  = load(K_CLIENTES, []);
let productos = load(K_PRODUCTOS, []);
let facturas  = load(K_FACTURAS, []);
let priceHist = load(K_PRICEHIST, {});

function load(k, fallback){ try{ const v = JSON.parse(localStorage.getItem(k)||''); return v ?? fallback; } catch{ return fallback; } }
function save(k, v){ localStorage.setItem(k, JSON.stringify(v)); }

/* ---------- TABS ---------- */
function switchTab(id){
  $$('button.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  $$('section.panel').forEach(p=>p.classList.toggle('active', p.dataset.tabPanel===id));
  if(id==='ventas'){ drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); }
  if(id==='pendientes'){ renderPendientes(); }
  if(id==='resumen'){ drawResumen(); }
}
$$('button.tab').forEach(b=>b.addEventListener('click', ()=>switchTab(b.dataset.tab)));

/* ---------- SEED DATA ---------- */
function uniqueByName(arr){
  const map=new Map();
  arr.forEach(c=>{ const k=(c.nombre||'').trim().toLowerCase(); if(k && !map.has(k)) map.set(k,c); });
  return [...map.values()];
}
function ensureClienteIds(){
  clientes.forEach(c=>{ if(!c.id) c.id=uid(); });
}
function seedClientesIfEmpty(){
  if(clientes.length) return ensureClienteIds();
  clientes = uniqueByName([
    {id:uid(), nombre:'Riviera — CONOR ESY SLU', nif:'B16794893', dir:'Paseo del Espolón, 09003 Burgos'},
    {id:uid(), nombre:'Alesal Pan / Café de Calle San Lesmes — Alesal Pan y Café S.L.', nif:'B09582420', dir:'C/ San Lesmes 1, Burgos'},
    {id:uid(), nombre:'Al Pan Pan Burgos, S.L.', nif:'B09569344', dir:'C/ Miranda 17, Bajo, 09002 Burgos', tel:'947 277 977', email:'bertiz.miranda@gmail.com'},
    {id:uid(), nombre:'Cuevas Palacios Restauración S.L. (Con/sentidos)', nif:'B10694792', dir:'C/ San Lesmes, 1 – 09004 Burgos', tel:'947 20 35 51'},
    {id:uid(), nombre:'Café Bar Nuovo (Einy Mercedes Olivo Jiménez)', nif:'120221393', dir:'C/ San Juan de Ortega 14, 09007 Burgos'},
    {id:uid(), nombre:'Hotel Cordon'},
    {id:uid(), nombre:'Vaivén Hostelería'},
    {id:uid(), nombre:'Grupo Resicare'},
    {id:uid(), nombre:'Carlos Alameda Peralta & Seis Más'},
    {id:uid(), nombre:'Tabalou Development SLU', nif:'ES B09567769'},
    {id:uid(), nombre:'Golden Garden — David Herrera Estalayo', nif:'71281665L', dir:'Trinidad, 12, 09003 Burgos'},
    {id:uid(), nombre:'Romina — PREMIER', dir:'C/ Madrid 42, Burgos'},
    {id:uid(), nombre:'Abbas — Locutorio Gamonal', dir:'C/ Derechos Humanos 45, Burgos'},
    {id:uid(), nombre:'Nadeem Bhai — RIA Locutorio', dir:'C/ Vitoria 137, Burgos'},
    {id:uid(), nombre:'Mehmood — Mohsin Telecom', dir:'C/ Vitoria 245, Burgos'},
    {id:uid(), nombre:'Adnan Asif', nif:'X7128589S', dir:'C/ Padre Flórez 3, Burgos'},
    {id:uid(), nombre:'Imran Khan — Estambul', dir:'Avda. del Cid, Burgos'},
    {id:uid(), nombre:'Waqas Sohail', dir:'C/ Vitoria, Burgos'},
    {id:uid(), nombre:'Malik — Locutorio Malik', dir:'C/ Progreso, Burgos'},
    {id:uid(), nombre:'Angela', dir:'C/ Madrid, Burgos'},
    {id:uid(), nombre:'Aslam — Locutorio Aslam', dir:'Avda. del Cid, Burgos'},
    {id:uid(), nombre:'Victor Pelu — Tienda Centro', dir:'Burgos Centro'},
    {id:uid(), nombre:'Domingo'},
    {id:uid(), nombre:'Bar Tropical'},
    {id:uid(), nombre:'Bar Punta Cana — PUNTA CANA', dir:'C/ Los Titos, Burgos'},
    {id:uid(), nombre:'Jose — Alimentación Patxi', dir:'C/ Camino Casa la Vega 33, Burgos'},
    {id:uid(), nombre:'Ideal — Ideal Supermercado', dir:'Avda. del Cid, Burgos'}
  ]);
  save(K_CLIENTES, clientes);
}

/* ---------- FUNCIONES DE KPI CORREGIDAS ---------- */
function drawKPIs(){
  const now = new Date();
  const hoy = sumBetween(startOfDay(now), endOfDay(now));
  const semana = sumBetween(startOfWeek(now), endOfDay(now));
  const mes = sumBetween(startOfMonth(now), endOfDay(now));
  const total = facturas.reduce((a,f)=>a+(f.totals?.total||0),0);

  // ✅ Evita error si los elementos no existen
  const vHoy = $('#vHoy'), vSemana = $('#vSemana'), vMes = $('#vMes'), vTotal = $('#vTotal');
  if (vHoy && vSemana && vMes && vTotal){
    vHoy.textContent = money(hoy);
    vSemana.textContent = money(semana);
    vMes.textContent = money(mes);
    vTotal.textContent = money(total);
  }

  const rHoy = $('#rHoy'), rSemana = $('#rSemana'), rMes = $('#rMes'), rTotal = $('#rTotal');
  if (rHoy && rSemana && rMes && rTotal){
    rHoy.textContent = money(hoy);
    rSemana.textContent = money(semana);
    rMes.textContent = money(mes);
    rTotal.textContent = money(total);
  }
}
/* ---------- BOTÓN IVA REAL (4%) ---------- */
// Crear botón dinámicamente dentro del área de totales
window.addEventListener('DOMContentLoaded', () => {
  const totalesCard = document.querySelector('h3');
  const totalsCardTitle = [...document.querySelectorAll('.card h3')]
    .find(el => el.textContent.includes('Totales factura'));
  if (totalsCardTitle && !document.getElementById('btnAddIVA')) {
    const btn = document.createElement('button');
    btn.id = 'btnAddIVA';
    btn.textContent = '+ Añadir IVA 4%';
    btn.className = 'ghost';
    btn.style.marginTop = '8px';
    totalsCardTitle.parentElement.appendChild(btn);
    btn.addEventListener('click', aplicarIVAReal);
  }
});

// Estado interno de IVA
let ivaAplicado = false;

function aplicarIVAReal() {
  if (ivaAplicado) return;
  const subtotal = unMoney($('#subtotal').textContent);
  const transporte = unMoney($('#transp').textContent);
  const baseMasTrans = subtotal + transporte;
  const iva = baseMasTrans * 0.04;
  const total = baseMasTrans + iva;

  // Actualizar campos visibles
  $('#iva').textContent = money(iva);
  $('#total').textContent = money(total);

  const foot = $('#pdf-foot-note');
  if (foot) foot.textContent = 'IVA añadido al total (4%).';

  // Desactivar botón
  const btn = document.getElementById('btnAddIVA');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'IVA aplicado ✔️';
    btn.style.opacity = '0.6';
  }

  ivaAplicado = true;
  recalc(); // refresca datos generales
}

/* ---------- REACTIVAR BOTÓN IVA ---------- */
function reactivarBotonIVA() {
  ivaAplicado = false;
  const btn = document.getElementById('btnAddIVA');
  if (btn) {
    btn.disabled = false;
    btn.textContent = '+ Añadir IVA 4%';
    btn.style.opacity = '1';
  }
  // restaurar valores sin IVA
  recalc();
}

/* ---------- HOOKS DE NUEVA / VACIAR ---------- */
const originalNueva = $('#btnNueva')?.onclick;
$('#btnNueva')?.addEventListener('click', ()=>{
  reactivarBotonIVA();
  if (typeof originalNueva === 'function') originalNueva();
});

const originalVaciar = $('#btnVaciarLineas')?.onclick;
$('#btnVaciarLineas')?.addEventListener('click', ()=>{
  reactivarBotonIVA();
  if (typeof originalVaciar === 'function') originalVaciar();
});
/* ---------- RECÁLCULO + PDF FILL + ESTADO ---------- */
function recalc(){
  const ls = captureLineas();
  let subtotal = 0; ls.forEach(l => subtotal += lineImporte(l));
  const transporte = $('#chkTransporte')?.checked ? subtotal * 0.10 : 0;
  const baseMasTrans = subtotal + transporte;

  // Si el IVA real está aplicado, mantenemos el valor visible
  let iva = 0;
  if (ivaAplicado) {
    iva = baseMasTrans * 0.04;
  }

  const total = baseMasTrans + iva;

  const manual = parseNum($('#pagado')?.value || 0);
  const parcial = pagosTemp.reduce((a,b)=>a+(b.amount||0),0);
  const pagadoTotal = manual + parcial;
  const pendiente = Math.max(0, total - pagadoTotal);

  $('#subtotal').textContent = money(subtotal);
  $('#transp').textContent = money(transporte);
  $('#iva').textContent = money(iva);
  $('#total').textContent = money(total);
  $('#pendiente').textContent = money(pendiente);

  if (total <= 0) { $('#estado').value = 'pendiente'; }
  else if (pagadoTotal <= 0) { $('#estado').value = 'pendiente'; }
  else if (pagadoTotal < total) { $('#estado').value = 'parcial'; }
  else { $('#estado').value = 'pagado'; }

  const foot = $('#pdf-foot-note');
  if (foot) {
    if (ivaAplicado) {
      foot.textContent = 'IVA añadido al total (4%).';
    } else {
      foot.textContent = $('#chkIvaIncluido')?.checked
        ? 'IVA incluido en los precios.'
        : 'IVA (4%) mostrado como informativo. Transporte 10% opcional.';
    }
  }

  fillPrint(ls, {subtotal, transporte, iva, total}, null, null);
  drawResumen();
}

/* ---------- FILLPRINT (PDF) ---------- */
function fillPrint(lines, totals, _temp=null, f=null){
  $('#p-num').textContent = f?.numero || '(Sin guardar)';
  $('#p-fecha').textContent = (f ? new Date(f.fecha) : new Date()).toLocaleString();

  $('#p-prov').innerHTML = `
    <div><strong>${escapeHTML(f?.proveedor?.nombre || $('#provNombre').value || '')}</strong></div>
    <div>${escapeHTML(f?.proveedor?.nif || $('#provNif').value || '')}</div>
    <div>${escapeHTML(f?.proveedor?.dir || $('#provDir').value || '')}</div>
    <div>${escapeHTML(f?.proveedor?.tel || $('#provTel').value || '')} · ${escapeHTML(f?.proveedor?.email || $('#provEmail').value || '')}</div>
  `;
  $('#p-cli').innerHTML = `
    <div><strong>${escapeHTML(f?.cliente?.nombre || $('#cliNombre').value || '')}</strong></div>
    <div>${escapeHTML(f?.cliente?.nif || $('#cliNif').value || '')}</div>
    <div>${escapeHTML(f?.cliente?.dir || $('#cliDir').value || '')}</div>
    <div>${escapeHTML(f?.cliente?.tel || $('#cliTel').value || '')} · ${escapeHTML(f?.cliente?.email || $('#cliEmail').value || '')}</div>
  `;

  const tbody = $('#p-tabla tbody'); tbody.innerHTML = '';
  (lines || []).forEach(l => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHTML(l.name)}</td>
      <td>${escapeHTML(l.mode || '')}</td>
      <td>${l.qty || ''}</td>
      <td>${l.gross ? l.gross.toFixed(2) : ''}</td>
      <td>${l.tare ? l.tare.toFixed(2) : ''}</td>
      <td>${l.net ? l.net.toFixed(2) : ''}</td>
      <td>${money(l.price)}</td>
      <td>${escapeHTML(l.origin || '')}</td>
      <td>${money((l.mode === 'unidad') ? l.qty * l.price : l.net * l.price)}</td>
    `;
    tbody.appendChild(tr);
  });

  $('#p-sub').textContent = money(totals?.subtotal || 0);
  $('#p-tra').textContent = money(totals?.transporte || 0);
  $('#p-iva').textContent = money(totals?.iva || 0);
  $('#p-tot').textContent = money(totals?.total || 0);
  $('#p-estado').textContent = f?.estado || $('#estado')?.value || 'Impagada';
  $('#p-metodo').textContent = f?.metodo || $('#metodoPago')?.value || 'Efectivo';
  $('#p-obs').textContent = f?.obs || ($('#observaciones')?.value || '—');

  // QR con datos básicos
  try {
    const canvas = $('#p-qr');
    const numero = f?.numero || '(Sin guardar)';
    const cliente = f?.cliente?.nombre || $('#cliNombre').value || '';
    const payload = `ARSLAN-Factura|${numero}|${cliente}|${money(totals?.total || 0)}|${$('#p-estado').textContent}`;
    window.QRCode.toCanvas(canvas, payload, {width:92, margin:0});
  } catch(e){}
}
/* ---------- GUARDAR / NUEVA / PDF ---------- */
function genNumFactura(){
  const d = new Date(), pad = n => String(n).padStart(2,'0');
  return `FA-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
function saveFacturas(){ save(K_FACTURAS, facturas); }

$('#btnGuardar')?.addEventListener('click', ()=>{
  const ls = captureLineas(); if(ls.length===0){ alert('Añade al menos una línea.'); return; }
  const numero = genNumFactura(); const now = todayISO();
  ls.forEach(l => pushPriceHistory(l.name, l.price));

  const subtotal = unMoney($('#subtotal').textContent);
  const transporte = unMoney($('#transp').textContent);
  const iva = unMoney($('#iva').textContent);
  const total = unMoney($('#total').textContent);

  const manual = parseNum($('#pagado').value || 0);
  const pagos = [...pagosTemp];
  const pagadoParcial = pagos.reduce((a,b)=>a+(b.amount||0),0);
  const pagadoTotal = manual + pagadoParcial;
  const pendiente = Math.max(0, total - pagadoTotal);
  const estado = (pagadoTotal<=0) ? 'pendiente' : (pagadoTotal<total ? 'parcial' : 'pagado');

  const f = {
    numero, fecha:now,
    proveedor:{nombre:$('#provNombre').value,nif:$('#provNif').value,dir:$('#provDir').value,tel:$('#provTel').value,email:$('#provEmail').value},
    cliente:{nombre:$('#cliNombre').value,nif:$('#cliNif').value,dir:$('#cliDir').value,tel:$('#cliTel').value,email:$('#cliEmail').value},
    lineas:ls, transporte:$('#chkTransporte').checked, ivaIncluido:$('#chkIvaIncluido').checked,
    estado, metodo:$('#metodoPago').value, obs:$('#observaciones').value,
    totals:{subtotal,transporte,iva,total,pagado:pagadoTotal,pendiente}, pagos
  };
  facturas.unshift(f); saveFacturas();
  pagosTemp = []; renderPagosTemp();
  renderFacturas(); renderPendientes(); drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); drawResumen();
  fillPrint(ls,{subtotal,transporte,iva,total},null,f);
});

$('#btnNueva')?.addEventListener('click', ()=>{
  const tb = $('#lineasBody'); tb.innerHTML = ''; for(let i=0;i<5;i++) addLinea();
  $('#chkTransporte').checked=false; $('#chkIvaIncluido').checked=true;
  $('#estado').value='pendiente'; $('#pagado').value='';
  $('#metodoPago').value='Efectivo'; $('#observaciones').value='';
  pagosTemp=[]; renderPagosTemp();
  reactivarBotonIVA(); // Reactivar IVA silencioso
  recalc();
});

$('#btnImprimir')?.addEventListener('click', ()=>{
  recalc();
  const element = document.getElementById('printArea');
  const d = new Date(); const file=`Factura-${($('#cliNombre').value||'Cliente').replace(/\s+/g,'')}-${fmtDateDMY(d)}.pdf`;
  const opt={margin:[10,10,10,10],filename:file,image:{type:'jpeg',quality:0.98},html2canvas:{scale:2,useCORS:true},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}};
  window.html2pdf().set(opt).from(element).save();
});

/* ---------- LISTAS, BACKUP Y FINAL ---------- */
function renderAll(){
  renderClientesSelect(); renderClientesLista();
  populateProductDatalist(); renderProductos();
  renderFacturas(); renderPendientes();
  drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); drawResumen();
}
function drawResumen(){ drawKPIs(); }

(function boot(){
  seedClientesIfEmpty();
  ensureClienteIds();
  seedProductsIfEmpty();
  setProviderDefaultsIfEmpty();

  const tb=$('#lineasBody');
  if(tb && tb.children.length===0){ for(let i=0;i<5;i++) addLinea(); }

  renderPagosTemp();
  renderAll(); recalc();
})();

/* ================================
   🎨 SELECTOR DE PALETAS (4 temas)
   ================================ */
(function(){
  const PALETAS = {
    kiwi:    {bg:'#ffffff', text:'#1e293b', accent:'#16a34a', border:'#d1d5db', muted:'#6b7280'},
    graphite:{bg:'#111827', text:'#f9fafb', accent:'#3b82f6', border:'#374151', muted:'#94a3b8'},
    sand:    {bg:'#fefce8', text:'#3f3f46', accent:'#ca8a04', border:'#e7e5e4', muted:'#78716c'},
    mint:    {bg:'#ecfdf5', text:'#065f46', accent:'#059669', border:'#a7f3d0', muted:'#0f766e'}
  };

  const bar = document.createElement('div');
  bar.id = 'colorToolbar';
  document.body.appendChild(bar);

  for(const [name,p] of Object.entries(PALETAS)){
    const b=document.createElement('button');
    b.title=name; b.style.background=p.accent;
    b.onclick=()=>aplicarTema(name);
    bar.appendChild(b);
  }

  const toggle=document.createElement('button');
  toggle.className='dark-toggle';
  toggle.textContent='🌞/🌙';
  toggle.onclick=()=>toggleDark();
  bar.appendChild(toggle);

  function aplicarTema(nombre){
    const pal=PALETAS[nombre];
    if(!pal) return;
    const root=document.documentElement;
    root.style.setProperty(`--bg`, pal.bg);
    root.style.setProperty(`--text`, pal.text);
    root.style.setProperty(`--accent`, pal.accent);
    root.style.setProperty(`--accent-dark`, nombre==='graphite' ? '#1d4ed8' : (nombre==='sand'?'#a16207':(nombre==='mint'?'#047857':'#15803d')));
    root.style.setProperty(`--border`, pal.border);
    root.style.setProperty(`--muted`, pal.muted);
    root.setAttribute('data-theme', nombre);
    localStorage.setItem('arslan_tema', nombre);
  }

  function toggleDark(){
    const isDark=document.body.classList.toggle('dark-mode');
    localStorage.setItem('arslan_dark', isDark);
  }

  const guardadoTema = localStorage.getItem('arslan_tema') || 'kiwi';
  const guardadoDark = localStorage.getItem('arslan_dark') === 'true';
  aplicarTema(guardadoTema);
  if(guardadoDark) toggleDark();
})();

let chart1, chart2, chartTop;
function groupDaily(n=7){
  const now=new Date(); const buckets=[];
  for(let i=n-1;i>=0;i--){ const d=new Date(now); d.setDate(d.getDate()-i); const k=d.toISOString().slice(0,10); buckets.push({k,label:k.slice(5),sum:0}); }
  facturas.forEach(f=>{ const k=f.fecha.slice(0,10); const b=buckets.find(x=>x.k===k); if(b) b.sum+=(f.totals?.total||0); });
  return buckets;
}
function groupMonthly(n=12){
  const now=new Date(); const buckets=[];
  for(let i=n-1;i>=0;i--){ const d=new Date(now); d.setMonth(d.getMonth()-i); const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; buckets.push({k,label:k,sum:0}); }
  facturas.forEach(f=>{ const d=new Date(f.fecha); const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; const b=buckets.find(x=>x.k===k); if(b) b.sum+=(f.totals?.total||0); });
  return buckets;
}
function drawCharts(){
  if(typeof Chart==='undefined') return;
  const daily=groupDaily(7); const monthly=groupMonthly(12);
  if(chart1) chart1.destroy(); if(chart2) chart2.destroy();
  chart1=new Chart(document.getElementById('chartDiario').getContext('2d'), {type:'bar', data:{labels:daily.map(d=>d.label), datasets:[{label:'Ventas diarias', data:daily.map(d=>d.sum)}]}, options:{responsive:true, plugins:{legend:{display:false}}}});
  chart2=new Chart(document.getElementById('chartMensual').getContext('2d'), {type:'line', data:{labels:monthly.map(d=>d.label), datasets:[{label:'Ventas mensuales', data:monthly.map(d=>d.sum)}]}, options:{responsive:true, plugins:{legend:{display:false}}}});
}
function drawTop(){
  if(typeof Chart==='undefined') return;
  const map=new Map(); // name -> total €
  facturas.forEach(f=>{
    (f.lineas||[]).forEach(l=>{
      const amt = (l.mode==='unidad') ? l.qty*l.price : l.net*l.price;
      map.set(l.name,(map.get(l.name)||0)+amt);
    });
  });
  const pairs=[...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
  const labels=pairs.map(p=>p[0]); const data=pairs.map(p=>p[1]);
  if(chartTop) chartTop.destroy();
  chartTop=new Chart(document.getElementById('chartTop').getContext('2d'), {type:'bar', data:{labels, datasets:[{label:'Top productos (€)', data} ]}, options:{responsive:true, plugins:{legend:{display:false}}}});
}

function renderVentasCliente(){
  const tb=$('#tblVentasCliente tbody'); if(!tb) return;
  tb.innerHTML='';
  const now=new Date();
  const sDay=startOfDay(now), eDay=endOfDay(now);
  const sWeek=startOfWeek(now), eWeek=endOfDay(now);
  const sMonth=startOfMonth(now), eMonth=endOfDay(now);

  const byClient=new Map(); // cliente -> {hoy,semana,mes,total}
  facturas.forEach(f=>{
    const nom=f.cliente?.nombre||'(s/cliente)';
    const d=new Date(f.fecha); const tot=f.totals?.total||0;
    const cur=byClient.get(nom)||{hoy:0,semana:0,mes:0,total:0};
    if(d>=sDay && d<=eDay) cur.hoy+=tot;
    if(d>=sWeek&&d<=eWeek) cur.semana+=tot;
    if(d>=sMonth&&d<=eMonth) cur.mes+=tot;
    cur.total+=tot;
    byClient.set(nom,cur);
  });

  [...byClient.entries()].sort((a,b)=>b[1].total-a[1].total).forEach(([nom,v])=>{
    const tr=document.createElement('tr');
    const highlight = v.hoy>0 ? 'state-green' : '';
    tr.innerHTML=`<td>${escapeHTML(nom)}</td><td class="${highlight}">${money(v.hoy)}</td><td>${money(v.semana)}</td><td>${money(v.mes)}</td><td><strong>${money(v.total)}</strong></td>`;
    tb.appendChild(tr);
  });
}

/* ---------- BACKUP/RESTORE + EXPORTS ---------- */
$('#btnBackup')?.addEventListener('click', ()=>{
  const payload={clientes, productos, facturas, priceHist, fecha: todayISO(), version:'ARSLAN PRO V10.4'};
  const filename=`backup-${fmtDateDMY(new Date())}.json`;
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});
$('#btnRestore')?.addEventListener('click', ()=>{
  const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json';
  inp.onchange=e=>{
    const f=e.target.files[0]; if(!f) return;
    const reader=new FileReader(); reader.onload=()=>{
      try{
        const obj=JSON.parse(reader.result);
        if(obj.clientes){ clientes=obj.clientes; ensureClienteIds(); }
        if(obj.productos) productos=obj.productos;
        if(obj.facturas) facturas=obj.facturas;
        if(obj.priceHist) priceHist=obj.priceHist;
        save(K_CLIENTES,clientes); save(K_PRODUCTOS,productos); save(K_FACTURAS,facturas); save(K_PRICEHIST,priceHist);
        renderAll(); alert('Copia restaurada ✔️');
      }catch{ alert('JSON inválido'); }
    }; reader.readAsText(f);
  };
  inp.click();
});
$('#btnExportClientes')?.addEventListener('click', ()=>downloadJSON(clientes,'clientes-arslan-v104.json'));
$('#btnImportClientes')?.addEventListener('click', ()=>uploadJSON(arr=>{ if(Array.isArray(arr)){ clientes=uniqueByName(arr).map(c=>({...c, id:c.id||uid()})); save(K_CLIENTES,clientes); renderClientesSelect(); renderClientesLista(); } }));
$('#btnExportProductos')?.addEventListener('click', ()=>downloadJSON(productos,'productos-arslan-v104.json'));
$('#btnImportProductos')?.addEventListener('click', ()=>uploadJSON(arr=>{ if(Array.isArray(arr)){ productos=arr; save(K_PRODUCTOS,productos); populateProductDatalist(); renderProductos(); } }));
$('#btnExportFacturas')?.addEventListener('click', ()=>downloadJSON(facturas,'facturas-arslan-v104.json'));
$('#btnImportFacturas')?.addEventListener('click', ()=>uploadJSON(arr=>{ if(Array.isArray(arr)){ facturas=arr; save(K_FACTURAS,facturas); renderFacturas(); renderPendientes(); drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); drawResumen(); } }));
$('#btnExportVentas')?.addEventListener('click', exportVentasCSV);

function downloadJSON(obj, filename){
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function uploadJSON(cb){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json';
  inp.onchange=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ cb(JSON.parse(r.result)); }catch{ alert('JSON inválido'); } }; r.readAsText(f); };
  inp.click();
}
function exportVentasCSV(){
  const rows=[['Cliente','Fecha','Nº','Total','Pagado','Pendiente','Estado']];
  facturas.forEach(f=>{
    rows.push([f.cliente?.nombre||'', new Date(f.fecha).toLocaleString(), f.numero, (f.totals?.total||0), (f.totals?.pagado||0), (f.totals?.pendiente||0), f.estado]);
  });
  const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='ventas.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
/* ---------- EVENTOS GENERALES ---------- */
$('#btnAddLinea')?.addEventListener('click', addLinea);
$('#btnVaciarLineas')?.addEventListener('click', ()=>{ 
  if(confirm('¿Vaciar líneas?')){ 
    const tb=$('#lineasBody'); 
    tb.innerHTML=''; 
    for(let i=0;i<5;i++) addLinea(); 
    recalc();

    // 🔄 Reactivar botón de IVA al vaciar líneas
    const btnIVA = $('#btnAddIVA');
    if (btnIVA) {
      btnIVA.disabled = false;
      btnIVA.textContent = '+ Añadir IVA 4%';
      btnIVA.style.opacity = '1';

      // 🧮 Restaurar IVA y total sin IVA
      const subtotal = parseNum($('#subtotal')?.textContent);
      const transporte = parseNum($('#transp')?.textContent);
      const baseMasTrans = subtotal + transporte;
      $('#iva').textContent = money(0);
      $('#total').textContent = money(baseMasTrans);

      // actualizar también el PDF sin IVA
      try {
        const lines = captureLineas();
        fillPrint(lines, {subtotal, transporte, iva:0, total: baseMasTrans}, null, null);
      } catch(err) {}

      // Restaurar texto de pie del PDF
      const foot = $('#pdf-foot-note');
      if (foot) foot.textContent = 'IVA (4%) mostrado como informativo. Transporte 10% opcional.';
    }
  }
});
$('#btnNuevoCliente')?.addEventListener('click', ()=>switchTab('clientes'));
$('#selCliente')?.addEventListener('change', ()=>{
  const id=$('#selCliente').value; if(!id) return; const c=clientes.find(x=>x.id===id); if(!c) return;
  fillClientFields(c);
});
$('#btnAddCliente')?.addEventListener('click', ()=>{
  const nombre=prompt('Nombre del cliente:'); if(!nombre) return;
  const nif=prompt('NIF/CIF:')||''; const dir=prompt('Dirección:')||''; const tel=prompt('Teléfono:')||''; const email=prompt('Email:')||'';
  clientes.push({id:uid(), nombre,nif,dir,tel,email}); saveClientes(); renderClientesSelect(); renderClientesLista();
});
$('#buscarCliente')?.addEventListener('input', renderClientesLista);

/* ---------- BOTÓN AÑADIR IVA (4%) ---------- */
$('#btnAddIVA')?.addEventListener('click', (e)=>{
  const btn = e.target;
  if (btn.disabled) return; // evitar doble aplicación

  const subtotal = parseNum($('#subtotal')?.textContent);
  const transporte = parseNum($('#transp')?.textContent);
  const baseMasTrans = subtotal + transporte;
  const iva = baseMasTrans * 0.04;
  const totalConIVA = baseMasTrans + iva;

  // Actualizar totales visibles
  $('#iva').textContent = money(iva);
  $('#total').textContent = money(totalConIVA);

  // Actualizar área PDF automáticamente
  try {
    const lines = captureLineas();
    fillPrint(lines, {subtotal, transporte, iva, total: totalConIVA}, null, null);
  } catch(err) {
    console.warn('No se pudo actualizar el PDF:', err);
  }

  // Actualizar pie de PDF
  const foot = $('#pdf-foot-note');
  if (foot) foot.textContent = 'IVA añadido al total (4%).';

  // Desactivar botón
  btn.disabled = true;
  btn.textContent = 'IVA aplicado ✔️';
  btn.style.opacity = '0.6';
});

/* ---------- RESUMEN ---------- */
function renderAll(){
  renderClientesSelect(); renderClientesLista();
  populateProductDatalist(); renderProductos(); renderFacturas(); renderPendientes();
  drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); drawResumen();
}
function drawResumen(){ drawKPIs(); }

/* ---------- BOOT ---------- */
(function boot(){
  seedClientesIfEmpty();
  ensureClienteIds();
  seedProductsIfEmpty();

  setProviderDefaultsIfEmpty();

  const tb=$('#lineasBody'); if(tb && tb.children.length===0){ for(let i=0;i<5;i++) addLinea(); }

renderPagosTemp();
/* ================================
   🎨 SELECTOR DE PALETAS (4 temas)
   ================================ */
  // Botón modo claro/oscuro
  const toggle=document.createElement('button');
  toggle.className='dark-toggle';
  toggle.textContent='🌞/🌙';
  toggle.onclick=()=>toggleDark();
  bar.appendChild(toggle);

  function aplicarTema(nombre){
    const pal=PALETAS[nombre];
    if(!pal) return;
    const root=document.documentElement;
    root.style.setProperty(`--bg`, pal.bg);
    root.style.setProperty(`--text`, pal.text);
    root.style.setProperty(`--accent`, pal.accent);
    root.style.setProperty(`--accent-dark`, nombre==='graphite' ? '#1d4ed8' : (nombre==='sand'?'#a16207':(nombre==='mint'?'#047857':'#15803d')));
    root.style.setProperty(`--border`, pal.border);
    root.style.setProperty(`--muted`, pal.muted);
    root.setAttribute('data-theme', nombre);
    localStorage.setItem('arslan_tema', nombre);
  }

  function toggleDark(){
    const isDark=document.body.classList.toggle('dark-mode');
    localStorage.setItem('arslan_dark', isDark);
    // el resto de vars se mantienen por paleta
  }

  // Restaurar configuración al cargar
  const guardadoTema = localStorage.getItem('arslan_tema') || 'kiwi';
  const guardadoDark = localStorage.getItem('arslan_dark') === 'true';
  aplicarTema(guardadoTema);
  if(guardadoDark) toggleDark();
})();
})();
