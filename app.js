/* App Dinamita (light) — separado en app.js para Vercel */
if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(console.error);
let _deferredPrompt=null; const btnInstall=document.getElementById('btnInstall');
window.addEventListener('beforeinstallprompt',(e)=>{ e.preventDefault(); _deferredPrompt=e; btnInstall.style.display='inline-block'; });
btnInstall?.addEventListener('click', async ()=>{ if(!_deferredPrompt) return; _deferredPrompt.prompt(); await _deferredPrompt.userChoice; _deferredPrompt=null; btnInstall.style.display='none'; });

async function requestStoragePersist() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const granted = await navigator.storage.persist();
      console.log('Persistencia de almacenamiento:', granted ? 'GARANTIZADA' : 'NO garantizada');
    }
  } catch(e) { console.warn('Persistencia no soportada', e); }
}
requestStoragePersist();

const FOLIO_NUM_KEY = 'dinamita:folio:num';
const FOLIO_PREFIX = 'DG-';
function nextFolioCode() {
  const n = parseInt(localStorage.getItem(FOLIO_NUM_KEY) || '1', 10);
  localStorage.setItem(FOLIO_NUM_KEY, String(n + 1));
  const padded = String(n).padStart(4, '0');
  return FOLIO_PREFIX + padded;
}

const DB_KEY='dinamita_apps_db_light_v1';
const nowISO=()=>new Date().toISOString();
const addMonths=(dStr, m)=>{ const d=new Date(dStr); d.setMonth(d.getMonth()+m); return d.toISOString().slice(0,10); };
const loadDB=()=>{ try { return JSON.parse(localStorage.getItem(DB_KEY))||seed(); } catch(_) { return seed(); } };
const saveDB=(db)=>localStorage.setItem(DB_KEY, JSON.stringify(db));
function seed(){
  const today = new Date().toISOString().slice(0,10);
  const db={
    business:{name:'Dinamita Gym', slogan:'¡Bienvenido a tu DINAMITA app!', colors:['#E02424','#000','#111'],
      address:'Av. Baja California #70, Chimalhuacán', whatsapp:'56 4319 5153' },
    catalog:[
      {id:'mem-vip',name:'Membresía VIP',type:'membresia',price:250,stock:null},
      {id:'mem-mensual',name:'Membresía Mensual',type:'membresia',price:300,stock:null},
      {id:'pre-entreno',name:'Pre-entreno 300g',type:'producto',price:450,stock:10},
      {id:'proteina',name:'Proteína 2lb',type:'producto',price:650,stock:8},
      {id:'agua',name:'Agua 600ml',type:'producto',price:20,stock:50},
      {id:'clase-box',name:'Clase Box 1hr',type:'servicio',price:120,stock:null}
    ],
    memberships:[
      {id:'m-1',name:'Juan Pérez',plan:'VIP',start:today,months:1,end:addMonths(today,1),status:'activa'},
      {id:'m-2',name:'Ana López',plan:'Mensual',start:today,months:1,end:addMonths(today,1),status:'activa'}
    ],
    customers:[{id:'c-1',name:'Carlos Ruiz',phone:'555-100-200',email:'cr@example.com',notes:'VIP',createdAt:nowISO()}],
    sales:[{id:'sale-seed',folio: nextFolioCode(), date:nowISO(),items:[{id:'agua',name:'Agua 600ml',price:20,qty:2,type:'producto'}],total:40,pay:'efectivo'}],
    stock_moves:[],
    createdAt: nowISO(),
    updatedAt: nowISO()
  };
  saveDB(db); return db;
}
let DB=loadDB();

const app=document.getElementById('app');
const nav=document.getElementById('topnav').querySelectorAll('a');
const routes={
  '/welcome':Welcome,
  '/panel/catalogo':Catalog,
  '/panel/inventario':Inventory,
  '/panel/ventas':Sales,
  '/panel/membresias':Memberships,
  '/panel/clientes':Customers,
  '/panel/reportes':Reports,
  '/panel/backup':Backup
};
function setActive(h){ nav.forEach(a=>a.classList.toggle('active', a.getAttribute('href')===h)); }
function render(route){ app.innerHTML=''; const view=(routes[route]||Welcome); app.appendChild(view()); setActive('#'+route); localStorage.setItem('dinamita:last',route); }
window.addEventListener('hashchange',()=>render(location.hash.replace('#','')||'/welcome'));

function h(tag,attrs={},children=[]){const el=document.createElement(tag);for(const k in attrs){if(k==='class')el.className=attrs[k];else if(k==='html')el.innerHTML=attrs[k];else if(k.startsWith('on')&&typeof attrs[k]==='function')el.addEventListener(k.substring(2).toLowerCase(),attrs[k]);else el.setAttribute(k,attrs[k]);}(Array.isArray(children)?children:[children]).forEach(c=>{if(c==null)return;if(typeof c==='string')el.appendChild(document.createTextNode(c));else el.appendChild(c);});return el;}
const Section=(t,s)=>h('div',{},[h('h1',{},t),s?h('div',{class:'muted'},s):null]);

function printTicket(sale) {
  const negocio = DB.business?.name || 'Dinamita';
  const fecha = new Date(sale.date).toLocaleString();
  const logoSrc = 'assets/icon-192.png';
  const dir = DB.business?.address || '';
  const wa = DB.business?.whatsapp || '';
  let rows = sale.items.map(i => `
    <tr>
      <td>${i.name}</td>
      <td style="text-align:right;">${i.qty}</td>
      <td style="text-align:right;">$${i.price.toFixed(2)}</td>
      <td style="text-align:right;">$${(i.price*i.qty).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8">
  <title>Ticket ${sale.folio ?? ''}</title>
  <style>
    body { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; margin:0; padding:16px; background:#fff; color:#111; }
    .wrap { max-width: 360px; margin: 0 auto; }
    .head { text-align:center; }
    .head img { width: 72px; height:72px; object-fit:contain; }
    h1 { font-size: 16px; margin: 6px 0 2px; }
    .muted { color:#555; font-size:12px; }
    table { width:100%; border-collapse:collapse; font-size:12px; margin-top:10px; }
    td, th { padding:4px 0; }
    tfoot td { border-top: 1px dashed #aaa; padding-top:8px; font-weight:700; }
    .right { text-align:right; }
    @media print { .noprint { display:none } }
  </style></head><body>
    <div class="wrap">
      <div class="head">
        <img src="${logoSrc}" alt="logo">
        <h1>${negocio}</h1>
        <div class="muted">Folio: <b>${sale.folio ?? ''}</b> · ${fecha} · Pago: ${sale.pay}</div>
        <div class="muted">${dir}</div>
        <div class="muted">WhatsApp: ${wa}</div>
      </div>
      <table>
        <thead>
          <tr><th>Descripción</th><th class="right">Cant</th><th class="right">Precio</th><th class="right">Importe</th></tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><td colspan="3" class="right">Total</td><td class="right">$${sale.total.toFixed(2)}</td></tr>
        </tfoot>
      </table>
      <p class="muted" style="text-align:center; margin-top:10px">Gracias por su compra</p>
      <div class="noprint" style="text-align:center; margin-top:12px"><button onclick="window.print()">Imprimir</button></div>
    </div>
    <script> window.print(); </script>
  </body></html>`;

  const w = window.open('', '_blank', 'width=420,height=720');
  w.document.open(); w.document.write(html); w.document.close();
}

function Welcome(){
  return h('div',{},[
    Section(DB.business.slogan,'Elige un módulo o entra al POS.'),
    document.createElement('div')
  ].concat([
    (function(){const wr=document.createElement('div');wr.className='grid cards';
      wr.appendChild(Object.assign(document.createElement('a'),{href:'#/panel/ventas',className:'card'})).appendChild(Object.assign(document.createElement('h2'),{textContent:'POS'}));
      wr.appendChild(Object.assign(document.createElement('a'),{href:'#/panel/catalogo',className:'card'})).appendChild(Object.assign(document.createElement('h2'),{textContent:'Catálogo'}));
      wr.appendChild(Object.assign(document.createElement('a'),{href:'#/panel/membresias',className:'card'})).appendChild(Object.assign(document.createElement('h2'),{textContent:'Membresías'}));
      wr.appendChild(Object.assign(document.createElement('a'),{href:'#/panel/inventario',className:'card'})).appendChild(Object.assign(document.createElement('h2'),{textContent:'Inventario'}));
      wr.appendChild(Object.assign(document.createElement('a'),{href:'#/panel/clientes',className:'card'})).appendChild(Object.assign(document.createElement('h2'),{textContent:'Clientes'}));
      wr.appendChild(Object.assign(document.createElement('a'),{href:'#/panel/reportes',className:'card'})).appendChild(Object.assign(document.createElement('h2'),{textContent:'Reportes'}));
      return wr;})(),
    (function(){const c=document.createElement('div');c.className='card';
      const head=document.createElement('div'); head.className='between';
      const left=document.createElement('div'); left.appendChild(Object.assign(document.createElement('strong'),{textContent:'Negocio: '})); left.appendChild(document.createTextNode(DB.business.name));
      const btn=document.createElement('button'); btn.className='btn'; btn.textContent='Restablecer PRUEBA'; btn.onclick=()=>{DB=seed();render('/welcome')};
      head.appendChild(left); head.appendChild(btn); c.appendChild(head);
      const small=document.createElement('div'); small.className='muted'; small.style.marginTop='6px'; small.textContent='Última actualización: '+DB.updatedAt; c.appendChild(small);
      return c;})()
  ]));
}

function Catalog(){
  const tbody=document.createElement('tbody');
  function draw(){tbody.innerHTML='';DB.catalog.forEach(p=>{const tr=document.createElement('tr');
    tr.innerHTML=`<td>${p.id}</td><td>${p.name}</td><td>${p.type}</td><td>$${Number(p.price).toFixed(2)}</td><td>${p.stock??'—'}</td>
      <td><button class="btn secondary" data-id="${p.id}" data-act="edit">Editar</button> <button class="btn secondary" data-id="${p.id}" data-act="del">Borrar</button></td>`; tbody.appendChild(tr);});}
  function add(){const id=prompt('ID (único):','prod-'+Date.now()); if(!id) return;
    if(DB.catalog.find(x=>x.id===id)) return alert('ID existente');
    const name=prompt('Nombre:','Nuevo'); const type=prompt('Tipo (producto/servicio/membresia):','producto');
    const price=parseFloat(prompt('Precio:','100'))||0; const s=prompt('Stock (vacío = ilimitado):','');
    const stock=s===''?null:(parseInt(s)||0); DB.catalog.push({id,name,type,price,stock});
    DB.updatedAt=nowISO(); saveDB(DB); draw(); }
  function onAction(e){
    const btn=e.target.closest('button'); if(!btn) return;
    const id=btn.getAttribute('data-id'); const act=btn.getAttribute('data-act'); const p=DB.catalog.find(x=>x.id===id); if(!p) return;
    if(act==='edit'){ const name=prompt('Nombre:',p.name)??p.name; const type=prompt('Tipo:',p.type)??p.type;
      const price=parseFloat(prompt('Precio:',p.price))||p.price; const s=prompt('Stock (vacío = ilimitado):',p.stock==null?'':p.stock);
      const stock=(s===''?null:(parseInt(s)||0)); Object.assign(p,{name,type,price,stock}); }
    if(act==='del'){ if(!confirm('¿Borrar producto?')) return; DB.catalog=DB.catalog.filter(x=>x.id!==id); }
    DB.updatedAt=nowISO(); saveDB(DB); draw();
  }
  const table=document.createElement('table'); table.className='table';
  table.innerHTML='<thead><tr><th>ID</th><th>Nombre</th><th>Tipo</th><th>Precio</th><th>Stock</th><th>Acciones</th></tr></thead>';
  table.appendChild(tbody); table.addEventListener('click',onAction); draw();
  const addBtn=document.createElement('button'); addBtn.className='btn'; addBtn.textContent='Agregar ítem'; addBtn.onclick=add;
  const wrap=document.createElement('div'); wrap.appendChild(Section('Catálogo','Productos, servicios y membresías.')); wrap.appendChild(Object.assign(document.createElement('div'),{className:'between',style:'margin-bottom:8px'})).appendChild(addBtn); wrap.appendChild(table);
  return wrap;
}

function Inventory(){
  const list=document.createElement('tbody');
  function draw(){list.innerHTML='';DB.stock_moves.slice().reverse().forEach(m=>{const tr=document.createElement('tr');
    tr.innerHTML=`<td>${m.date.slice(0,10)}</td><td>${m.productId}</td><td>${m.type}</td><td>${m.qty}</td><td>${m.note||''}</td>`; list.appendChild(tr);});}
  function move(type){
    const productId=prompt('ID del producto (ver Catálogo):'); if(!productId) return;
    const prod=DB.catalog.find(p=>p.id===productId); if(!prod) return alert('No encontrado');
    if(prod.stock==null && type!=='ajuste'){ if(!confirm('Este item es sin stock. ¿Registrar igual?')) return; }
    const qty=parseInt(prompt('Cantidad:', type==='entrada'?1:-1))||0; const note=prompt('Nota:','');
    DB.stock_moves.push({date:nowISO(),productId,type,qty,note});
    if(prod.stock!=null){ if(type==='entrada') prod.stock+=Math.abs(qty); else if(type==='salida') prod.stock-=Math.abs(qty); else if(type==='ajuste') prod.stock=parseInt(prompt('Nuevo stock:', prod.stock))||prod.stock; }
    DB.updatedAt=nowISO(); saveDB(DB); draw();
  }
  draw();
  const table=document.createElement('table'); table.className='table';
  table.innerHTML='<thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cant.</th><th>Nota</th></tr></thead>';
  table.appendChild(list);
  const wrap=document.createElement('div'); wrap.appendChild(Section('Inventario','Entradas, salidas y ajustes.'));
  const actions=document.createElement('div'); actions.className='row'; actions.style.marginBottom='8px';
  [['Entrada','entrada','btn'],['Salida','salida','btn secondary'],['Ajuste','ajuste','btn secondary']].forEach(([label,type,cls])=>{
    const b=document.createElement('button'); b.className=cls; b.textContent=label; b.onclick=()=>move(type); actions.appendChild(b);
  });
  wrap.appendChild(actions); wrap.appendChild(table); return wrap;
}

function Sales(){
  const search=document.createElement('input'); search.className='input'; search.placeholder='Buscar por nombre o ID…';
  const results=document.createElement('div'); results.className='grid cards'; const cartTbody=document.createElement('tbody');
  const totalSpan=document.createElement('strong'); totalSpan.textContent='$0.00';
  const payType=document.createElement('select'); ['efectivo','tarjeta','transferencia'].forEach(v=>{const o=document.createElement('option'); o.value=v; o.textContent=v[0].toUpperCase()+v.slice(1); payType.appendChild(o);});
  let cart=[];
  const refreshTotal=()=> totalSpan.textContent='$'+cart.reduce((s,i)=>s+i.price*i.qty,0).toFixed(2);
  function addToCart(p){ const e=cart.find(x=>x.id===p.id); e?e.qty++:cart.push({id:p.id,name:p.name,price:p.price,qty:1,type:p.type}); drawCart(); }
  function drawCart(){ cartTbody.innerHTML=''; cart.forEach((i,idx)=>{const tr=document.createElement('tr');
    tr.innerHTML=`<td>${i.name}</td><td>$${i.price.toFixed(2)}</td><td><button class="btn ghost" data-act="minus" data-ix="${idx}">−</button> ${i.qty} <button class="btn ghost" data-act="plus" data-ix="${idx}">+</button></td><td>$${(i.price*i.qty).toFixed(2)}</td><td><button class="btn secondary" data-act="rm" data-ix="${idx}">Quitar</button></td>`;
    cartTbody.appendChild(tr);}); refreshTotal(); }
  function filter(){ const q=(search.value||'').toLowerCase().trim();
    results.innerHTML=''; DB.catalog.filter(p=>p.name.toLowerCase().includes(q)||p.id.toLowerCase().includes(q))
      .forEach(p=>{const card=document.createElement('div'); card.className='card';
        const h2=document.createElement('h2'); h2.textContent=p.name; const sub=document.createElement('div'); sub.className='muted'; sub.textContent=`${p.type} • $${p.price}`;
        const btn=document.createElement('button'); btn.className='btn'; btn.textContent='Agregar'; btn.onclick=()=>addToCart(p);
        card.appendChild(h2); card.appendChild(sub); card.appendChild(btn); results.appendChild(card); });
  }
  function charge(){
    if(!cart.length) return alert('Carrito vacío');
    for(const i of cart){ const prod=DB.catalog.find(p=>p.id===i.id); if(prod&&prod.stock!=null&&prod.stock<i.qty) return alert(`Sin stock de ${i.name}`); }
    const total=cart.reduce((s,i)=>s+i.price*i.qty,0);
    const folio = nextFolioCode();
    const sale={id:'sale-'+Date.now(),folio,date:nowISO(),items:cart.map(i=>({id:i.id,name:i.name,price:i.price,qty:i.qty,type:i.type})),total,pay:payType.value};
    DB.sales.push(sale);
    cart.forEach(i=>{ const prod=DB.catalog.find(p=>p.id===i.id); if(prod&&prod.stock!=null) prod.stock-=i.qty; });
    DB.updatedAt=nowISO(); saveDB(DB);
    printTicket(sale);
    cart=[]; drawCart(); filter(); alert('Venta registrada');
  }
  results.addEventListener('click', (e)=>{});
  cartTbody.addEventListener('click',(e)=>{const b=e.target.closest('button'); if(!b) return; const ix=parseInt(b.getAttribute('data-ix')); const act=b.getAttribute('data-act');
    if(act==='minus'){ cart[ix].qty=Math.max(1,cart[ix].qty-1); }
    if(act==='plus'){ cart[ix].qty++; }
    if(act==='rm'){ cart.splice(ix,1); }
    drawCart();
  });
  search.addEventListener('input',filter); setTimeout(filter,0);

  const table=document.createElement('table'); table.className='table';
  table.innerHTML='<thead><tr><th>Item</th><th>Precio</th><th>Cant.</th><th>Subt.</th><th></th></tr></thead>'; table.appendChild(cartTbody);
  const totals=document.createElement('div'); totals.className='between'; totals.style.marginTop='8px';
  const left=document.createElement('div'); left.appendChild(Object.assign(document.createElement('span'),{className:'muted',textContent:'Pago: '})); left.appendChild(payType);
  const right=document.createElement('div'); right.appendChild(Object.assign(document.createElement('span'),{className:'muted',textContent:'Total: '})); right.appendChild(totalSpan);
  totals.appendChild(left); totals.appendChild(right);
  const actions=document.createElement('div'); actions.className='row'; actions.style.marginTop='8px';
  const payBtn=document.createElement('button'); payBtn.className='btn'; payBtn.textContent='Cobrar + Ticket'; payBtn.onclick=charge;
  const clearBtn=document.createElement('button'); clearBtn.className='btn secondary'; clearBtn.textContent='Vaciar'; clearBtn.onclick=()=>{cart=[]; drawCart();};
  actions.appendChild(payBtn); actions.appendChild(clearBtn);

  const wrap=document.createElement('div'); wrap.appendChild(Section('POS','Busca, agrega al carrito, cobra y descuenta stock.'));
  const layout=document.createElement('div'); layout.className='grid'; layout.style.cssText='grid-template-columns:repeat(auto-fit,minmax(280px,1fr));align-items:start';
  const leftCol=document.createElement('div'); const leftCard=document.createElement('div'); leftCard.className='card'; leftCard.appendChild(Object.assign(document.createElement('h2'),{textContent:'Catálogo'})); leftCard.appendChild(search); leftCard.appendChild(Object.assign(document.createElement('div'),{style:'height:8px'})); leftCard.appendChild(results); leftCol.appendChild(leftCard);
  const rightCol=document.createElement('div'); const rightCard=document.createElement('div'); rightCard.className='card'; rightCard.appendChild(Object.assign(document.createElement('h2'),{textContent:'Ticket'})); rightCard.appendChild(table); rightCard.appendChild(totals); rightCard.appendChild(actions); rightCol.appendChild(rightCard);
  layout.appendChild(leftCol); layout.appendChild(rightCol); wrap.appendChild(layout);
  return wrap;
}

function Memberships(){
  const tbody=document.createElement('tbody'); const filterSel=document.createElement('select'); ['todas','activa','vencida'].forEach(v=>{const o=document.createElement('option'); o.value=v; o.textContent=(v[0].toUpperCase()+v.slice(1))+(v==='todas'?'':'s'); filterSel.appendChild(o);});
  function draw(){
    tbody.innerHTML='';
    const today=new Date().toISOString().slice(0,10);
    DB.memberships.forEach(m=>{ m.status = (m.end >= today) ? 'activa' : 'vencida'; });
    (DB.memberships.filter(m=>filterSel.value==='todas'||m.status===filterSel.value))
    .slice().reverse().forEach(m=>{const tr=document.createElement('tr');
      tr.innerHTML=`<td>${m.name}</td><td>${m.plan}</td><td>${m.start}</td><td>${m.end}</td><td>${m.status==='activa'?'<span style="color:#16a34a">Activa</span>':'<span style="color:#dc2626">Vencida</span>'}</td>
      <td><button class="btn secondary" data-id="${m.id}" data-act="edit">Editar</button> <button class="btn secondary" data-id="${m.id}" data-act="del">Borrar</button></td>`; tbody.appendChild(tr); });
  }
  function add(){
    const name=prompt('Nombre del socio:'); if(!name) return;
    const plan=prompt('Plan (VIP/Mensual/etc):','VIP')||'VIP';
    const start=prompt('Inicio (YYYY-MM-DD):', new Date().toISOString().slice(0,10))||new Date().toISOString().slice(0,10);
    const months=parseInt(prompt('Meses de vigencia:',1))||1;
    const end=addMonths(start, months);
    DB.memberships.push({id:'mem-'+Date.now(),name,plan,start,months,end,status:'activa'});
    DB.updatedAt=nowISO(); saveDB(DB); draw();
  }
  function onAction(e){
    const b=e.target.closest('button'); if(!b) return; const id=b.getAttribute('data-id'); const act=b.getAttribute('data-act'); const m=DB.memberships.find(x=>x.id===id); if(!m) return;
    if(act==='edit'){ const plan=prompt('Plan:', m.plan)||m.plan; const start=prompt('Inicio (YYYY-MM-DD):', m.start)||m.start; const months=parseInt(prompt('Meses:', m.months))||m.months; const end=addMonths(start, months); Object.assign(m,{plan,start,months,end}); }
    if(act==='del'){ if(!confirm('¿Eliminar membresía?')) return; DB.memberships=DB.memberships.filter(x=>x.id!==id); }
    DB.updatedAt=nowISO(); saveDB(DB); draw();
  }
  const table=document.createElement('table'); table.className='table';
  table.innerHTML='<thead><tr><th>Nombre</th><th>Plan</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Acciones</th></tr></thead>'; table.appendChild(tbody);
  table.addEventListener('click',onAction);
  const wrap=document.createElement('div'); wrap.appendChild(Section('Membresías','Registro, vigencia y estado (activa/vencida).'));
  const tools=document.createElement('div'); tools.className='between'; tools.style.marginBottom='8px';
  tools.appendChild(Object.assign(document.createElement('span'),{className:'pill',textContent: DB.memberships.length+' membresías'}));
  const right=document.createElement('div'); right.appendChild(Object.assign(document.createElement('span'),{className:'muted',textContent:'Filtro: '})); right.appendChild(filterSel); right.appendChild(document.createTextNode(' ')); const b=document.createElement('button'); b.className='btn'; b.textContent='Agregar'; b.onclick=add; right.appendChild(b); tools.appendChild(right);
  wrap.appendChild(tools); wrap.appendChild(table); filterSel.addEventListener('change',draw); draw(); return wrap;
}

function Customers(){
  const tbody=document.createElement('tbody');
  function draw(){tbody.innerHTML='';DB.customers.slice().reverse().forEach(c=>{const tr=document.createElement('tr'); tr.innerHTML=`<td>${c.name}</td><td>${c.phone||''}</td><td>${c.email||''}</td><td>${c.notes||''}</td>`; tbody.appendChild(tr); }); }
  function add(){ const name=prompt('Nombre:'); if(!name) return;
    const phone=prompt('Teléfono:',''); const email=prompt('Correo:',''); const notes=prompt('Notas/membresía:','');
    DB.customers.push({id:'c-'+Date.now(),name,phone,email,notes,createdAt:nowISO()}); DB.updatedAt=nowISO(); saveDB(DB); draw(); }
  const table=document.createElement('table'); table.className='table'; table.innerHTML='<thead><tr><th>Nombre</th><th>Teléfono</th><th>Correo</th><th>Notas</th></tr></thead>'; table.appendChild(tbody);
  const wrap=document.createElement('div'); wrap.appendChild(Section('Clientes','Alta y notas rápidas.'));
  const bar=document.createElement('div'); bar.className='between'; bar.style.marginBottom='8px'; bar.appendChild(Object.assign(document.createElement('span'),{className:'pill',textContent: DB.customers.length+' clientes'})); const b=document.createElement('button'); b.className='btn'; b.textContent='Agregar cliente'; b.onclick=add; bar.appendChild(b); wrap.appendChild(bar); wrap.appendChild(table); draw(); return wrap;
}

function Reports(){
  const byDay={}, byMonth={};
  DB.sales.forEach(s=>{const d=s.date.slice(0,10), m=s.date.slice(0,7); byDay[d]=(byDay[d]||0)+s.total; byMonth[m]=(byMonth[m]||0)+s.total;});
  const daily=document.createElement('tbody'); Object.entries(byDay).sort().forEach(([d,tot])=>{const tr=document.createElement('tr'); tr.innerHTML=`<td>${d}</td><td>$${tot.toFixed(2)}</td>`; daily.appendChild(tr); });
  const monthly=document.createElement('tbody'); Object.entries(byMonth).sort().forEach(([m,tot])=>{const tr=document.createElement('tr'); tr.innerHTML=`<td>${m}</td><td>$${tot.toFixed(2)}</td>`; monthly.appendChild(tr); });
  const low=document.createElement('ul'); DB.catalog.filter(p=>p.stock!=null && p.stock<=5).forEach(p=>{ const li=document.createElement('li'); li.textContent=`${p.name}: ${p.stock}`; low.appendChild(li); });
  const today=new Date().toISOString().slice(0,10);
  const activeCount = DB.memberships.filter(m=>m.end>=today).length;

  function exportCSV(){
    const header='folio,id,fecha,total,pago\n';
    const lines=DB.sales.map(s=>`${s.folio ?? ''},${s.id},${s.date},${s.total},${s.pay}`).join('\n');
    const blob=new Blob([header+lines],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='ventas.csv'; a.click(); URL.revokeObjectURL(url);
  }

  const wrap=document.createElement('div'); wrap.appendChild(Section('Reportes','Ventas + indicadores rápidos.'));
  const bar=document.createElement('div'); bar.className='row'; bar.style.marginBottom='8px';
  bar.appendChild(Object.assign(document.createElement('span'),{className:'pill',textContent: DB.sales.length+' ventas'}));
  bar.appendChild(Object.assign(document.createElement('span'),{className:'pill',textContent: 'Membresías activas: '+activeCount}));
  const b=document.createElement('button'); b.className='btn secondary'; b.textContent='Exportar ventas (.csv)'; b.onclick=exportCSV; bar.appendChild(b);
  wrap.appendChild(bar);
  const grid=document.createElement('div'); grid.className='grid'; grid.style.cssText='grid-template-columns:repeat(auto-fit,minmax(260px,1fr))';
  const c1=document.createElement('div'); c1.className='card'; c1.appendChild(Object.assign(document.createElement('h2'),{textContent:'Ventas por día'})); const t1=document.createElement('table'); t1.className='table'; t1.innerHTML='<thead><tr><th>Día</th><th>Total</th></tr></thead>'; t1.appendChild(daily); c1.appendChild(t1);
  const c2=document.createElement('div'); c2.className='card'; c2.appendChild(Object.assign(document.createElement('h2'),{textContent:'Ventas por mes'})); const t2=document.createElement('table'); t2.className='table'; t2.innerHTML='<thead><tr><th>Mes</th><th>Total</th></tr></thead>'; t2.appendChild(monthly); c2.appendChild(t2);
  const c3=document.createElement('div'); c3.className='card'; c3.appendChild(Object.assign(document.createElement('h2'),{textContent:'Stock bajo (≤5)'})); if(low.childElementCount) c3.appendChild(low); else { const d=document.createElement('div'); d.className='muted'; d.textContent='Todo OK'; c3.appendChild(d); }
  grid.appendChild(c1); grid.appendChild(c2); grid.appendChild(c3); wrap.appendChild(grid);
  return wrap;
}

async function saveFileLocally(filename, blob) {
  if (window.showSaveFilePicker) {
    const handle = await window.showSaveFilePicker({
      suggestedName: filename,
      types: [{ description:'JSON', accept: {'application/json':['.json']} }]
    });
    const w = await handle.createWritable();
    await w.write(blob); await w.close();
    return true;
  } else {
    const url = URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
    return false;
  }
}
async function openLocalFileAsText() {
  if (window.showOpenFilePicker) {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description:'JSON', accept: {'application/json':['.json']} }]
    });
    const file = await handle.getFile();
    return await file.text();
  } else {
    return new Promise((resolve,reject)=>{
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.json,application/json';
      input.onchange = e => {
        const f = e.target.files[0]; if(!f) return reject(new Error('Sin archivo'));
        const r = new FileReader();
        r.onload = ev => resolve(ev.target.result);
        r.onerror = reject;
        r.readAsText(f);
      };
      input.click();
    });
  }
}
function Backup(){
  async function exportJSON(){ 
    const blob = new Blob([JSON.stringify(DB,null,2)], {type:'application/json'});
    const ok = await saveFileLocally(`dinamita-backup-${new Date().toISOString().slice(0,10)}.json`, blob);
    alert(ok ? 'Respaldo guardado en el dispositivo.' : 'Descargado el archivo de respaldo.');
  }
  async function importFromDevice(){
    try{
      const text = await openLocalFileAsText();
      const data = JSON.parse(text);
      if(!data.catalog || !data.sales) throw new Error('Formato inválido');
      DB = data; DB.updatedAt = nowISO(); saveDB(DB);
      alert('Backup importado desde el dispositivo');
      render('/panel/backup');
    }catch(err){ alert('Error al importar: '+err.message); }
  }
  const wrap=document.createElement('div'); wrap.appendChild(Section('Backup (local)','Todo local. Sin nube.'));
  const row=document.createElement('div'); row.className='row'; row.style.marginBottom='8px';
  const b1=document.createElement('button'); b1.className='btn'; b1.textContent='Guardar en dispositivo (.json)'; b1.onclick=exportJSON;
  const b2=document.createElement('button'); b2.className='btn secondary'; b2.textContent='Restaurar desde dispositivo (.json)'; b2.onclick=importFromDevice;
  row.appendChild(b1); row.appendChild(b2); wrap.appendChild(row);
  const note=document.createElement('div'); note.className='muted'; note.textContent='Se guarda: catálogo, clientes, ventas, movimientos de stock, membresías e identidad (100% local).'; wrap.appendChild(note);
  return wrap;
}

const initial=location.hash.replace('#','')||localStorage.getItem('dinamita:last')||'/welcome';
function start(){ if(!location.hash)location.hash=initial; render(initial); }
start();
