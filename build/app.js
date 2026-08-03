"use strict";
const DATA = JSON.parse(document.getElementById('payload').textContent);
const META = DATA.meta, SALES = DATA.sales, B = DATA.build;
const TAX = B.tax_factor || 1;
const MAIN_PRODUCT = B.main_product || 'Produto principal';
const MAIN_PREFIX = B.main_product_prefix || '';

/* ---------------- format ---------------- */
const nf0=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0});
const nf1=new Intl.NumberFormat('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
const nf2=new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const brl=v=>(v==null||!isFinite(v))?'-':'R$ '+nf2.format(v);
const pct=v=>(v==null||!isFinite(v))?'-':nf2.format(v*100)+'%';
const intf=v=>(v==null||!isFinite(v))?'-':nf0.format(v);
const numf=v=>(v==null||!isFinite(v))?'-':nf1.format(v);
const roasf=v=>(v==null||!isFinite(v))?'-':nf1.format(v)+'x';
const dimf=v=>v==null?'-':String(v);
const norm=s=>(s==null?'':String(s)).trim().toLowerCase();
const isMainProd=p=>norm(p).startsWith(MAIN_PREFIX);
const brdate=d=>{ if(!d) return '-'; const p=d.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; };
const WD=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const weekday=d=>{ const dt=new Date(d+'T00:00:00'); return isNaN(dt)?'':WD[dt.getDay()]; };

/* ---------------- date helpers ---------------- */
function pad(n){return String(n).padStart(2,'0');}
function dstr(dt){return dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate());}
function addDays(s,n){const dt=new Date(s+'T00:00:00');dt.setDate(dt.getDate()+n);return dstr(dt);}
const TODAY = B.today || B.date_max;

/* ---------------- STATE ---------------- */
const STATE = {
  page:'geral', from:B.date_min, to:B.date_max, preset:'todo', tax:true,
  selDays:new Set(),
  mSelC:new Set(), mSelA:new Set(), mSelAd:new Set(),
  sort:{}, colw: JSON.parse(localStorage.getItem('dm_colw')||'{}'),
  iaWin: localStorage.getItem('ia_win') || '14d',
};
const taxf = ()=> STATE.tax ? TAX : 1;

/* active date test: selDays override the De/Até range */
function dateActive(d){
  if(!d) return false;
  if(STATE.selDays.size) return STATE.selDays.has(d);
  return (!STATE.from || d>=STATE.from) && (!STATE.to || d<=STATE.to);
}
const metaActive  = ()=> META.filter(m=>dateActive(m.d));
const salesActive = ()=> SALES.filter(s=>dateActive(s.d));

/* ---------------- aggregation ----------------
   bucket = {sp,im,cl,pv,ck, vendas, vendasM, fat}
   vendas  = compras do produto principal (base de exibição da página)
   vendasM = compras do produto principal atribuídas ao Meta Ads (base das conversões)
   fat     = faturamento (todos os produtos do escopo)
   Obs.: na aba Meta o conjunto de vendas já é filtrado a meta==1, então vendas==vendasM. */
function newBucket(){return {sp:0,im:0,cl:0,pv:0,ck:0,vendas:0,vendasM:0,fat:0};}
function addSales(a,r){ a.vendas+=r.main; a.vendasM+=(r.main&&r.meta)?1:0; a.fat+=r.val; }
function derive(a){
  const g=a.sp*taxf();
  return {gasto:g, impr:a.im, cliques:a.cl, pv:a.pv, ck:a.ck, vendas:a.vendas, fat:a.fat,
    cpm:a.im?g/a.im*1000:null, ctr:a.im?a.cl/a.im:null, cpc:a.cl?g/a.cl:null,
    cpv:a.pv?g/a.pv:null, cr:a.cl?a.pv/a.cl:null,               /* CR = Page Views / Cliques */
    cpic:a.ck?g/a.ck:null, vischk:a.pv?a.ck/a.pv:null,
    convlp:a.pv?a.vendasM/a.pv:null,                            /* Vendas(Meta) / Page Views */
    convchk:a.ck?a.vendasM/a.ck:null,                           /* Vendas(Meta) / Checkouts */
    cac:a.vendas?g/a.vendas:null, roas:g?a.fat/g:null, ticket:a.vendas?a.fat/a.vendas:null};
}
function buildAgg(fS,fM,dim){
  const m={}; const get=k=>m[k]||(m[k]=newBucket());
  fM.forEach(r=>{const a=get(r[dim]); a.sp+=r.sp; a.im+=r.im; a.cl+=r.cl; a.pv+=r.pv; a.ck+=r.ck;});
  fS.forEach(r=>{const a=get(r[dim]); addSales(a,r);});
  return m;
}
function totals(fS,fM){
  const a=newBucket();
  fM.forEach(r=>{a.sp+=r.sp;a.im+=r.im;a.cl+=r.cl;a.pv+=r.pv;a.ck+=r.ck;});
  fS.forEach(r=>addSales(a,r));
  return a;
}
function daily(fS,fM){
  const days={}; const g=d=>days[d]||(days[d]=Object.assign({d},newBucket()));
  fM.forEach(r=>{if(!r.d)return; const a=g(r.d); a.sp+=r.sp; a.im+=r.im; a.cl+=r.cl; a.pv+=r.pv; a.ck+=r.ck;});
  fS.forEach(r=>{if(!r.d)return; addSales(g(r.d),r);});
  return Object.values(days).sort((a,b)=>a.d<b.d?-1:1);
}

/* ---------------- generic interactive table ---------------- */
function colWidth(cfg,c){ const saved=(STATE.colw[cfg.id]||{})[c.key];
  if(saved) return saved;
  if(c.w) return c.w;
  if(c.type==='date') return 96;
  if(c.type==='dim') return c.big?300:150;
  return 88; }
function renderTable(cfg){
  const table=document.getElementById(cfg.id); if(!table) return;
  const sortState=STATE.sort[cfg.id];
  let rows=cfg.rows.slice();
  if(sortState){ const {key,dir}=sortState; const c=cfg.cols.find(x=>x.key===key);
    rows.sort((a,b)=>{ let va=a.cells[key], vb=b.cells[key];
      if(c && c.type==='dim'){ va=norm(va); vb=norm(vb); return dir==='asc'?(va<vb?-1:va>vb?1:0):(va>vb?-1:va<vb?1:0); }
      va=(va==null||!isFinite(va))?-Infinity:va; vb=(vb==null||!isFinite(vb))?-Infinity:vb;
      return dir==='asc'?va-vb:vb-va; }); }
  const ext={};
  cfg.cols.forEach(c=>{ if(c.heat){ const vs=rows.map(r=>r.cells[c.key]).filter(v=>v!=null&&isFinite(v)); ext[c.key]=[Math.min(...vs),Math.max(...vs)]; }});
  const fmt=(t,v)=> t==='brl'?brl(v):t==='pct'?pct(v):t==='int'?intf(v):t==='num'?numf(v):t==='roas'?roasf(v):t==='date'?brdate(v):dimf(v);
  const widths=cfg.cols.map(c=>colWidth(cfg,c)); const totalW=widths.reduce((a,b)=>a+b,0);
  const colgroup='<colgroup>'+cfg.cols.map((c,i)=>`<col style="width:${widths[i]}px">`).join('')+'</colgroup>';
  let thead='<thead><tr>'+cfg.cols.map((c,i)=>{
    const sc = sortState&&sortState.key===c.key ? (sortState.dir==='asc'?'sorted-asc':'sorted-desc') : '';
    return `<th class="${c.type==='dim'?'dim ':''}${sc}" data-k="${c.key}" data-ci="${i}">${c.label}<span class="rsz"></span></th>`;
  }).join('')+'</tr></thead>';
  let tbody='<tbody>'+rows.map(r=>{
    const sel = cfg.selectable && cfg.selSet && cfg.selSet.has(r.k);
    const tds=cfg.cols.map(c=>{
      const v=r.cells[c.key]; let bg='';
      if(c.heat && ext[c.key]) bg=`background:${heat(v,ext[c.key][0],ext[c.key][1],c.heat)}`;
      const cls=(c.type==='dim'?'dim':'');
      return `<td class="${cls}" style="${bg}">${fmt(c.type,v)}</td>`;
    }).join('');
    return `<tr class="${sel?'sel':''}" data-k="${encodeURIComponent(r.k)}">${tds}</tr>`;
  }).join('')+'</tbody>';
  let tfoot='';
  if(cfg.total){ tfoot='<tfoot><tr>'+cfg.cols.map((c,i)=>{
    const v=cfg.total[c.key]; return `<td class="${c.type==='dim'?'dim':''}">${i===0?(v==null?'Total Geral':fmt(c.type,v)):fmt(c.type,v)}</td>`;
  }).join('')+'</tr></tfoot>'; }
  table.style.width=totalW+'px';
  table.innerHTML=colgroup+thead+tbody+tfoot;
  const cols=table.querySelector('colgroup').children;
  table.querySelectorAll('thead th').forEach(th=>{
    th.addEventListener('click',e=>{ if(e.target.classList.contains('rsz'))return;
      const k=th.dataset.k, cur=STATE.sort[cfg.id];
      if(!cur||cur.key!==k) STATE.sort[cfg.id]={key:k,dir:'asc'};
      else if(cur.dir==='asc') STATE.sort[cfg.id]={key:k,dir:'desc'};
      else delete STATE.sort[cfg.id];
      renderTable(cfg);
    });
  });
  table.querySelectorAll('thead th .rsz').forEach(g=>{
    g.addEventListener('mousedown',e=>{ e.preventDefault(); e.stopPropagation();
      const th=g.parentElement, k=th.dataset.k, ci=+th.dataset.ci, x0=e.clientX;
      const w0=cols[ci].offsetWidth, tw0=table.offsetWidth;
      document.body.style.userSelect='none';
      const mv=ev=>{ const nw=Math.max(60,w0+(ev.clientX-x0)); cols[ci].style.width=nw+'px'; table.style.width=(tw0-w0+nw)+'px';
        STATE.colw[cfg.id]=STATE.colw[cfg.id]||{}; STATE.colw[cfg.id][k]=nw; };
      const up=()=>{ document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up); document.body.style.userSelect=''; localStorage.setItem('dm_colw',JSON.stringify(STATE.colw)); };
      document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
    });
  });
  if(cfg.selectable && cfg.onSelect){
    table.querySelectorAll('tbody tr').forEach(tr=>{
      tr.addEventListener('click',e=>{ cfg.onSelect(decodeURIComponent(tr.dataset.k), e); });
    });
  }
}
/* Heatmap por coluna: cor FIXA por métrica (definida em identidade-visual.css),
   só a OPACIDADE varia com o valor (maior valor = mais vibrante). */
const HEAT_HUE={gasto:'--heat-gasto', fat:'--heat-fat', roas:'--heat-roas'};
function heat(v,lo,hi,kind){
  if(v==null||!isFinite(v)||hi===lo||!HEAT_HUE[kind]) return 'transparent';
  const t=Math.max(0,Math.min(1,(v-lo)/(hi-lo)));
  const c=hx2rgb(cvar(HEAT_HUE[kind]));
  return `rgba(${c[0]},${c[1]},${c[2]},${(0.06+0.5*t).toFixed(3)})`;
}
function toggleSet(set,key,ctrl){
  if(ctrl){ set.has(key)?set.delete(key):set.add(key); }
  else { const only=set.has(key)&&set.size===1; set.clear(); if(!only) set.add(key); }
}

/* ---------------- charts ---------------- */
const charts={};
const CHART_SERIES=['--cc1','--cc2','--cc3','--cc4','--cc5','--cc6','--cc7','--cc8','--cc9','--cc10'];
const cvar=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const chartPalette=()=>CHART_SERIES.map(v=>cvar(v)||'#888888');
const hx2rgb=h=>{h=(h||'').replace('#','').trim();if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h||'888888',16);return [(n>>16)&255,(n>>8)&255,n&255];};
const cmuted=()=>cvar('--muted')||'#6B7280', cink=()=>cvar('--ink')||'#1A1D2E', cgrid=()=>cvar('--grid')||'#EEF0F5';
function destroy(id){ if(charts[id]){ charts[id].destroy(); delete charts[id]; } }
const FMT={brl:brl,pct:pct,num:numf,int:intf,roas:roasf};

/* combo: Vendas (barras) · Gasto/Faturamento (R$) · ROAS (eixo próprio) */
function comboChart(id, d){
  destroy(id); const el=document.getElementById(id); if(!el) return;
  const labels=d.map(x=>x.d.slice(5)), mut=cmuted(), gr=cgrid();
  charts[id]=new Chart(el,{
    data:{labels, datasets:[
      {type:'bar',label:'Vendas',data:d.map(x=>x.vendas),backgroundColor:cvar('--chart-vendas'),yAxisID:'y',borderRadius:3,order:3},
      {type:'line',label:'Gasto',data:d.map(x=>+(x.sp*taxf()).toFixed(2)),borderColor:cvar('--chart-gasto'),backgroundColor:cvar('--chart-gasto'),yAxisID:'y1',borderWidth:2,pointRadius:2,tension:.25,order:2},
      {type:'line',label:'Faturamento',data:d.map(x=>+x.fat.toFixed(2)),borderColor:cvar('--chart-faturamento'),backgroundColor:cvar('--chart-faturamento'),yAxisID:'y1',borderWidth:2,pointRadius:2,tension:.25,order:2},
      {type:'line',label:'ROAS',data:d.map(x=>{const g=x.sp*taxf();return g?+(x.fat/g).toFixed(2):null;}),borderColor:cink(),backgroundColor:cink(),yAxisID:'y2',borderWidth:2,pointRadius:2,spanGaps:true,tension:.25,order:0},
    ]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{legend:{labels:{color:cink(),boxWidth:10,usePointStyle:true,font:{size:11}}},
        tooltip:{callbacks:{label:c=>{const v=c.raw,ax=c.dataset.yAxisID; return c.dataset.label+': '+(ax==='y1'?brl(v):ax==='y2'?roasf(v):intf(v));}}}},
      scales:{x:{ticks:{color:mut,font:{size:10}},grid:{display:false}},
        y:{position:'left',ticks:{color:mut,font:{size:10}},grid:{color:gr},beginAtZero:true,title:{display:true,text:'Vendas',color:mut,font:{size:10}}},
        y1:{position:'right',ticks:{color:mut,font:{size:10}},grid:{display:false},beginAtZero:true,title:{display:true,text:'R$',color:mut,font:{size:10}}},
        y2:{position:'right',ticks:{color:mut,font:{size:10},callback:v=>numf(v)+'x'},grid:{display:false},beginAtZero:true,title:{display:true,text:'ROAS',color:mut,font:{size:10}}}}}
  });
}
/* linhas genéricas (1 ou 2 eixos) */
function multiLine(id, d, series, opts){
  destroy(id); const el=document.getElementById(id); if(!el) return;
  const labels=d.map(x=>x.d.slice(5)), mut=cmuted();
  const useR=series.some(s=>s.axis==='R');
  const datasets=series.map(s=>({label:s.label,data:d.map(s.fn),borderColor:s.color,backgroundColor:s.color,
    yAxisID:s.axis==='R'?'y1':'y',borderWidth:2,pointRadius:2,spanGaps:true,tension:.25,_fmt:FMT[s.fmt]||numf}));
  const scales={x:{ticks:{color:mut,font:{size:9}},grid:{display:false}},
    y:{position:'left',beginAtZero:true,ticks:{color:mut,font:{size:9},callback:v=>(FMT[opts.L.fmt]||numf)(v)},grid:{color:cgrid()}}};
  if(useR) scales.y1={position:'right',beginAtZero:true,grid:{display:false},ticks:{color:mut,font:{size:9},callback:v=>(FMT[opts.R.fmt]||numf)(v)}};
  charts[id]=new Chart(el,{type:'line',data:{labels,datasets},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{legend:{labels:{color:cink(),boxWidth:10,usePointStyle:true,font:{size:10}}},
        tooltip:{callbacks:{label:c=>c.dataset.label+': '+(c.dataset._fmt||numf)(c.raw)}}},
      scales}});
}
/* barras horizontais (faturamento por anúncio) */
const barLabels={id:'barLabels',afterDatasetsDraw(ch){const{ctx}=ch;ctx.save();ctx.font='600 11px Segoe UI,system-ui';ctx.fillStyle=cmuted();ctx.textBaseline='middle';
  const ds=ch.data.datasets[0], f=ds._fmt||intf;
  ch.getDatasetMeta(0).data.forEach((el,i)=>{const v=ds.data[i]; if(!v)return; ctx.fillText(f(v),el.x+5,el.y);});ctx.restore();}};
function hbar(id, items, valFn, color, top, fmtFn){
  destroy(id); const el=document.getElementById(id); if(!el) return;
  let arr=items.slice().sort((a,b)=>valFn(b)-valFn(a)); if(top) arr=arr.slice(0,top);
  const mut=cmuted(), f=fmtFn||intf;
  charts[id]=new Chart(el,{type:'bar', plugins:[barLabels],
    data:{labels:arr.map(x=>x.label), datasets:[{label:'v',data:arr.map(valFn),backgroundColor:color||'#1BAF7A',borderRadius:3,_fmt:f}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,layout:{padding:{right:44}},
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>f(c.raw)}}},
      scales:{x:{beginAtZero:true,ticks:{color:mut,font:{size:9}},grid:{color:cgrid()}},
              y:{ticks:{color:mut,font:{size:9}},grid:{display:false}}}}});
}
/* CAC por campanha, por dia (uma linha por campanha) */
function campCacChart(id, fM, fS){
  destroy(id); const el=document.getElementById(id); if(!el) return;
  const spendTot={}; fM.forEach(r=>spendTot[r.camp]=(spendTot[r.camp]||0)+r.sp);
  const camps=Object.keys(spendTot).sort((a,b)=>spendTot[b]-spendTot[a]).slice(0,6);
  const dset=new Set(); fM.forEach(r=>r.d&&dset.add(r.d)); fS.forEach(r=>r.d&&dset.add(r.d));
  const days=[...dset].sort();
  const K=(c,dd)=>c+''+dd, sp={}, vd={};
  fM.forEach(r=>{if(!r.d)return; sp[K(r.camp,r.d)]=(sp[K(r.camp,r.d)]||0)+r.sp;});
  fS.forEach(r=>{if(!r.d)return; vd[K(r.camp,r.d)]=(vd[K(r.camp,r.d)]||0)+r.main;});
  const PAL=chartPalette();
  const ds=camps.map((c,i)=>({label:c.length>22?c.slice(0,22)+'…':c,
    data:days.map(dd=>{const s=(sp[K(c,dd)]||0)*taxf(), v=vd[K(c,dd)]||0; return v?+(s/v).toFixed(2):null;}),
    borderColor:PAL[i%PAL.length],backgroundColor:PAL[i%PAL.length],borderWidth:2,pointRadius:1.5,spanGaps:true,tension:.25}));
  const mut=cmuted();
  charts[id]=new Chart(el,{type:'line',data:{labels:days.map(x=>x.slice(5)),datasets:ds},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{legend:{labels:{color:cink(),boxWidth:8,font:{size:9}}},tooltip:{callbacks:{label:c=>c.dataset.label+': '+brl(c.raw)}}},
      scales:{x:{ticks:{color:mut,font:{size:9}},grid:{display:false}},y:{ticks:{color:mut,font:{size:9},callback:v=>brl(v)},grid:{color:cgrid()},beginAtZero:true}}}});
}

/* ---------------- KPI cards ---------------- */
function kpiCard(k){ return `<div class="kpi ${k.hero?'hero':''}"><div class="kl"><span>${k.label}</span>${k.pill?`<span class="pill q">${k.pill}</span>`:''}</div><div class="kv">${k.val}</div><div class="ka">${k.aux||''}</div></div>`; }

/* ---------------- colunas das tabelas ---------------- */
const METRIC_COLS=[
  {key:'gasto',label:'Gasto',type:'brl',heat:'gasto'},   /* heatmap vermelho */
  {key:'cpm',label:'CPM',type:'brl'},
  {key:'ctr',label:'CTR',type:'pct'},
  {key:'cr',label:'CR',type:'pct'},
  {key:'vischk',label:'VisCHK',type:'pct'},
  {key:'convchk',label:'ConvCHK',type:'pct'},
  {key:'vendas',label:'Vendas',type:'int'},
  {key:'cac',label:'CAC',type:'brl'},
  {key:'fat',label:'Faturamento',type:'brl',heat:'fat'},  /* heatmap verde */
  {key:'ticket',label:'Ticket',type:'brl'},
  {key:'roas',label:'ROAS',type:'roas',heat:'roas'},      /* heatmap amarelo */
];
const DAILY_COLS=[{key:'date',label:'Data',type:'date'},{key:'wd',label:'Dia',type:'dim',w:64}].concat(METRIC_COLS);
const HCOLS=[{key:'dim',label:'',type:'dim',big:true}].concat(METRIC_COLS.map(c=>{const o={...c}; delete o.heat; return o;}));
function metricCells(x,d){
  return {gasto:d.gasto, cpm:d.cpm, ctr:d.ctr, cr:d.cr, vischk:d.vischk, convchk:d.convchk,
    vendas:x.vendas, cac:d.cac, fat:x.fat, ticket:d.ticket, roas:d.roas};
}
function dailyCells(x,d,isTotal){
  return Object.assign({date:isTotal?null:x.d, wd:isTotal?'':weekday(x.d)}, metricCells(x,d));
}

/* ---------------- tabela Vendas por produto ---------------- */
function renderProdTable(id, salesSet){
  const mainCount=salesSet.reduce((s,r)=>s+r.main,0);
  const byProd={}; salesSet.forEach(r=>{ if(isMainProd(r.prod)) return; byProd[r.prod]=(byProd[r.prod]||0)+1; });
  const rows=[{k:'__main__', cells:{prod:MAIN_PRODUCT, vendas:mainCount, pctm:1}}];
  Object.entries(byProd).sort((a,b)=>b[1]-a[1]).forEach(([prod,c])=>{
    rows.push({k:prod, cells:{prod:prod, vendas:c, pctm:mainCount?c/mainCount:null}});
  });
  renderTable({id, cols:[{key:'prod',label:'Produto',type:'dim',big:true},{key:'vendas',label:'Vendas',type:'int',w:80},{key:'pctm',label:'% vs principal',type:'pct',w:120}], rows});
}

/* ---------------- funil + gráficos de conversão (comuns às 2 abas) ---------------- */
/* ---- comparativo período atual vs período anterior de MESMO tamanho ---- */
function prevWindow(){
  if(!STATE.from||!STATE.to) return null;
  const span=Math.round((new Date(STATE.to+'T00:00:00')-new Date(STATE.from+'T00:00:00'))/86400000)+1;
  if(!(span>=1)) return null;
  return {from:addDays(STATE.from,-span), to:addDays(STATE.from,-1), span};
}
const inRange=(d,a,b)=>d&&d>=a&&d<=b;
/* métricas em que MENOR é melhor (custo); nas demais, maior é melhor */
const GOOD_LOW={gasto:1,cpm:1,cpc:1,cpv:1,cpic:1,cac:1};
function deltaBadge(cur,prev,key){
  if(cur==null||prev==null||!isFinite(cur)||!isFinite(prev)||prev===0) return '';
  const p=((cur-prev)/Math.abs(prev))*100; if(!isFinite(p)) return '';
  const flat=Math.abs(p)<0.05, up=cur>prev;
  const good=flat?null:(GOOD_LOW[key]?!up:up);
  const cls=flat?'flat':(good?'good':'bad'), arrow=flat?'→':(up?'▲':'▼');
  return `<span class="delta ${cls}">${arrow} ${nf1.format(Math.abs(p))}%</span>`;
}
function renderFunnel(id, steps){
  document.getElementById(id).innerHTML=steps.map(s=>{
    const color=s[4]?`var(${s[4]})`:'var(--accent-blue)';
    const hi=(s[3]==='gasto'||s[3]==='fat');   // valores em destaque + contorno inteiro
    const border=hi?`border-color:${color}`:`border-left-color:${color}`;
    const secs=s[2].map(x=>`<div><span class="s-label">${x[0]}</span><span class="s-val${x[2]?' s-pill '+x[2]:''}">${x[1]}</span></div>`).join('');
    return `<div class="step" style="${border}">
      <div class="step-main"><div class="m-label">${s[0]}</div>
        <div class="m-val"${hi?` style="color:${color}"`:''}>${s[1]}</div>
        ${s[5]?`<div class="m-delta">${s[5]}</div>`:''}</div>
      <div class="secs">${secs}</div></div>`;
  }).join('');
}
function funnelSteps(t, tp){
  const d=derive(t), P=(k)=>tp?tp[k]:null, Pd=tp?derive(tp):null;
  return [
    ['Gasto Total', brl(d.gasto), [], 'gasto', '--heat-gasto', deltaBadge(d.gasto, Pd?Pd.gasto:null, 'gasto')],
    ['Impressões', intf(t.im), [['CPM',brl(d.cpm)]], 'impr', '--c6', deltaBadge(t.im, P('im'), 'im')],
    ['Cliques', intf(t.cl), [['CPC',brl(d.cpc)],['CTR',pct(d.ctr)]], 'cl', '--c1', deltaBadge(t.cl, P('cl'), 'cl')],
    ['Page Views', intf(t.pv), [['CPV',brl(d.cpv)],['CR',pct(d.cr)]], 'pv', '--c4', deltaBadge(t.pv, P('pv'), 'pv')],
    ['Checkouts', intf(t.ck), [['CPIC',brl(d.cpic)],['VisCHK',pct(d.vischk)]], 'ck', '--c3', deltaBadge(t.ck, P('ck'), 'ck')],
    ['Vendas', intf(t.vendas), [['CAC',brl(d.cac),'cac'],['ConvCHK',pct(d.convchk)]], 'vendas', '--c7', deltaBadge(t.vendas, P('vendas'), 'vendas')],
    ['Faturamento', brl(t.fat), [['ROAS',roasf(d.roas),'roas'],['Ticket Médio',brl(d.ticket)]], 'fat', '--heat-fat', deltaBadge(t.fat, P('fat'), 'fat')],
  ];
}
function convCharts(id1,id2,id3,dd){
  multiLine(id1, dd, [{label:'CPM',fn:x=>x.im?+((x.sp*taxf())/x.im*1000).toFixed(2):null,color:cvar('--chart-cpm'),fmt:'brl',axis:'L'},
     {label:'CTR',fn:x=>x.im?+(x.cl/x.im).toFixed(4):null,color:cvar('--chart-ctr'),fmt:'pct',axis:'R'}], {L:{fmt:'brl'},R:{fmt:'pct'}});
  multiLine(id2, dd, [{label:'CR',fn:x=>x.cl?+(x.pv/x.cl).toFixed(4):null,color:cvar('--chart-cr'),fmt:'pct',axis:'L'},
     {label:'VisCHK',fn:x=>x.pv?+(x.ck/x.pv).toFixed(4):null,color:cvar('--chart-vischk'),fmt:'pct',axis:'L'}], {L:{fmt:'pct'}});
  multiLine(id3, dd, [{label:'ConvLP',fn:x=>x.pv?+(x.vendasM/x.pv).toFixed(4):null,color:cvar('--chart-convlp'),fmt:'pct',axis:'L'},
     {label:'ConvCHK',fn:x=>x.ck?+(x.vendasM/x.ck).toFixed(4):null,color:cvar('--chart-vischk'),fmt:'pct',axis:'L'}], {L:{fmt:'pct'}});
}

/* ---------------- PAGE 1: Visão Geral ---------------- */
function renderGeral(){
  const fM=metaActive(), fS=salesActive();          // fS = todas as vendas do funil
  const t=totals(fS,fM), d=derive(t);
  const pw=prevWindow();
  const tp = pw ? totals(SALES.filter(s=>inRange(s.d,pw.from,pw.to)), META.filter(m=>inRange(m.d,pw.from,pw.to))) : null;
  renderFunnel('geralFunnel', funnelSteps(t, tp));
  const dd=daily(fS,fM);
  convCharts('gCpmCtr','gCrVis','gConv', dd);
  comboChart('gCombo', dd);
  renderProdTable('gProd', fS);

  const dl=dd.slice().reverse();
  renderTable({id:'gDaily', cols:DAILY_COLS,
    rows:dl.map(x=>{const dv=derive(x); return {k:x.d, cells:dailyCells(x,dv)};}),
    total:dailyCells(t,d,true),
    selectable:true, selSet:STATE.selDays,
    onSelect:(k,e)=>{ toggleSet(STATE.selDays,k,e&&(e.ctrlKey||e.metaKey)); syncDateInputs(); renderAll(); },
  });
}

/* ---------------- PAGE 2: Meta Ads ---------------- */
function metaScope(ex){ let fM=metaActive(), fS=salesActive().filter(s=>s.meta);   // só Meta Ads
  if(ex!=='C'&&STATE.mSelC.size){ fM=fM.filter(r=>STATE.mSelC.has(r.camp)); fS=fS.filter(r=>STATE.mSelC.has(r.camp)); }
  if(ex!=='A'&&STATE.mSelA.size){ fM=fM.filter(r=>STATE.mSelA.has(r.adset)); fS=fS.filter(r=>STATE.mSelA.has(r.adset)); }
  if(ex!=='D'&&STATE.mSelAd.size){ fM=fM.filter(r=>STATE.mSelAd.has(r.ad)); fS=fS.filter(r=>STATE.mSelAd.has(r.ad)); }
  return {fM,fS}; }
function selDim(dim,key,ctrl){
  const sets={C:STATE.mSelC,A:STATE.mSelA,D:STATE.mSelAd}, s=sets[dim];
  if(ctrl){ s.has(key)?s.delete(key):s.add(key); }
  else { const sole=s.has(key)&&s.size===1&&!Object.entries(sets).some(([k2,x])=>k2!==dim&&x.size);
    Object.values(sets).forEach(x=>x.clear()); if(!sole) s.add(key); }
  renderMeta();
}
function metaPrevTotals(pw){
  let fM=META.filter(m=>inRange(m.d,pw.from,pw.to));
  let fS=SALES.filter(s=>s.meta && inRange(s.d,pw.from,pw.to));
  if(STATE.mSelC.size){fM=fM.filter(r=>STATE.mSelC.has(r.camp));fS=fS.filter(r=>STATE.mSelC.has(r.camp));}
  if(STATE.mSelA.size){fM=fM.filter(r=>STATE.mSelA.has(r.adset));fS=fS.filter(r=>STATE.mSelA.has(r.adset));}
  if(STATE.mSelAd.size){fM=fM.filter(r=>STATE.mSelAd.has(r.ad));fS=fS.filter(r=>STATE.mSelAd.has(r.ad));}
  return totals(fS,fM);
}
function renderMeta(){
  const F=metaScope(null), fM=F.fM, fS=F.fS;
  const t=totals(fS,fM), d=derive(t);
  const pw=prevWindow(); const tp = pw ? metaPrevTotals(pw) : null;
  renderFunnel('metaFunnel', funnelSteps(t, tp));

  const dd=daily(fS,fM);
  convCharts('mCpmCtr','mCrVis','mConv', dd);
  comboChart('mCombo', dd);
  const aggAd=buildAgg(fS,fM,'ad');
  hbar('mContent', Object.entries(aggAd).map(([label,a])=>({label,v:a.fat})), x=>x.v, cvar('--chart-faturamento'), 10, brl);
  renderProdTable('mProd', fS);

  const dl=dd.slice().reverse();
  renderTable({id:'tDaily', cols:DAILY_COLS,
    rows:dl.map(x=>{const dv=derive(x); return {k:x.d, cells:dailyCells(x,dv)};}),
    total:dailyCells(t,d,true),
    selectable:true, selSet:STATE.selDays,
    onSelect:(k,e)=>{ toggleSet(STATE.selDays,k,e&&(e.ctrlKey||e.metaKey)); syncDateInputs(); renderAll(); },
  });

  function hierRows(map){ return Object.entries(map).map(([k,a])=>{const dv=derive(a);
    return {k, cells:Object.assign({dim:k}, metricCells(a,dv))};}); }
  function totRowOf(tt){const dv=derive(tt);return Object.assign({dim:null}, metricCells(tt,dv));}
  const Sc=metaScope('C'), Sa=metaScope('A'), Sd=metaScope('D');
  renderTable({id:'tCamp', cols:HCOLS.map((c,i)=>i===0?{...c,label:'Campanha'}:c), rows:hierRows(buildAgg(Sc.fS,Sc.fM,'camp')), total:totRowOf(totals(Sc.fS,Sc.fM)),
    selectable:true, selSet:STATE.mSelC, onSelect:(k,e)=>selDim('C',k,e&&(e.ctrlKey||e.metaKey))});
  renderTable({id:'tAdset', cols:HCOLS.map((c,i)=>i===0?{...c,label:'Conjunto',big:true}:c), rows:hierRows(buildAgg(Sa.fS,Sa.fM,'adset')), total:totRowOf(totals(Sa.fS,Sa.fM)),
    selectable:true, selSet:STATE.mSelA, onSelect:(k,e)=>selDim('A',k,e&&(e.ctrlKey||e.metaKey))});
  renderTable({id:'tAd', cols:HCOLS.map((c,i)=>i===0?{...c,label:'Anúncio'}:c), rows:hierRows(buildAgg(Sd.fS,Sd.fM,'ad')), total:totRowOf(totals(Sd.fS,Sd.fM)),
    selectable:true, selSet:STATE.mSelAd, onSelect:(k,e)=>selDim('D',k,e&&(e.ctrlKey||e.metaKey))});

  campCacChart('chCamp', fM, fS); campCacChart('chAdset', fM, fS); campCacChart('chAd', fM, fS);

  const vendas=fS.reduce((s,r)=>s+r.main,0);
  document.getElementById('qCount').textContent=vendas+' vendas · '+fS.length+' linhas';
  const rows=fS.slice().sort((a,b)=>(a.d<b.d?1:-1));
  renderTable({id:'tQual',
    cols:[{key:'d',label:'Data',type:'date'},{key:'nm',label:'Nome',type:'dim'},{key:'prod',label:'Produto',type:'dim',big:true},
      {key:'val',label:'Valor',type:'brl',w:110},{key:'camp',label:'Campanha',type:'dim',big:true},{key:'ad',label:'Anúncio',type:'dim',big:true},{key:'em',label:'E‑mail',type:'dim',w:200}],
    rows:rows.map((s,i)=>({k:'s'+i, cells:{d:s.d,nm:s.nm,prod:s.prod,val:s.val,camp:s.camp,ad:s.ad,em:s.em}}))});
}

/* ---------------- PAGE 3: IA Insights ---------------- */
const r2=v=>(v==null||!isFinite(v))?null:Math.round(v*100)/100;
const r4=v=>(v==null||!isFinite(v))?null:Math.round(v*10000)/10000;
const esc=s=>String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function iaMetricRow(x,d){
  return {gasto:r2(d.gasto),impressoes:x.im,cpm:r2(d.cpm),cliques:x.cl,cpc:r2(d.cpc),ctr:r4(d.ctr),
    page_views:x.pv,cpv:r2(d.cpv),cr:r4(d.cr),checkouts:x.ck,cpic:r2(d.cpic),vischk:r4(d.vischk),
    convlp:r4(d.convlp),vendas:x.vendas,cac:r2(d.cac),convchk:r4(d.convchk),
    faturamento:r2(x.fat),roas:r2(d.roas),ticket:r2(d.ticket)};
}
/* janela própria da IA — independente do filtro de período das outras abas */
const IA_WINDOWS=[['3d',3,'3 dias'],['7d',7,'7 dias'],['14d',14,'14 dias'],['30d',30,'30 dias']];
function iaWinDays(){ const w=IA_WINDOWS.find(x=>x[0]===STATE.iaWin); return w?w[1]:14; }
function iaRenderWin(){
  document.getElementById('iaWin').innerHTML=IA_WINDOWS.map(w=>
    `<button class="chip ${STATE.iaWin===w[0]?'active':''}" data-w="${w[0]}">${w[2]}</button>`).join('');
  document.querySelectorAll('#iaWin .chip').forEach(c=>c.addEventListener('click',()=>{
    STATE.iaWin=c.dataset.w; localStorage.setItem('ia_win',STATE.iaWin); iaRenderWin();
  }));
}
function iaSumBuckets(arr){ const a=newBucket(); arr.forEach(x=>{a.sp+=x.sp;a.im+=x.im;a.cl+=x.cl;a.pv+=x.pv;a.ck+=x.ck;a.vendas+=x.vendas;a.vendasM+=x.vendasM;a.fat+=x.fat;}); return a; }
function iaPctDelta(a,b){ return (a==null||b==null||!isFinite(a)||!isFinite(b)||b===0)?null:+(((a-b)/b)*100).toFixed(1); }
function iaCmp(dR,dP,k){ return {recente:r2(dR[k]), anterior:r2(dP[k]), variacao_pct:iaPctDelta(dR[k],dP[k])}; }
function iaBuildData(){
  const winDays=iaWinDays(), from=addDays(TODAY,-(winDays-1)), to=TODAY;
  const inWin=d=>d && d>=from && d<=to;
  const fM=META.filter(m=>inWin(m.d)), fSall=SALES.filter(s=>inWin(s.d)), fSmeta=fSall.filter(s=>s.meta);
  const t=totals(fSall,fM), tm=totals(fSmeta,fM);
  const byProd={}; fSmeta.forEach(s=>{byProd[s.prod]=(byProd[s.prod]||0)+1;});

  /* --- séries diárias e janelas de tendência (escopo Meta) --- */
  const dd=daily(fSmeta,fM);                              // buckets diários (asc)
  const serie=dd.slice(-90).map(x=>{const dv=derive(x); return {d:x.d, gasto:r2(dv.gasto), cpm:r2(dv.cpm),
    ctr:r4(dv.ctr), cr:r4(dv.cr), vischk:r4(dv.vischk), convchk:r4(dv.convchk),
    vendas:x.vendas, cac:r2(dv.cac), fat:r2(x.fat), roas:r2(dv.roas)};});
  const days=dd.map(x=>x.d), n=days.length, half=Math.max(1,Math.floor(n/2));
  let comparativo=null, recentSet=null, prevSet=null;
  if(n>=2){
    recentSet=new Set(days.slice(n-half));
    prevSet=new Set(days.slice(Math.max(0,n-2*half), n-half));
    const R=iaSumBuckets(dd.filter(x=>recentSet.has(x.d))), P=iaSumBuckets(dd.filter(x=>prevSet.has(x.d)));
    const dR=derive(R), dP=derive(P);
    comparativo={
      dias_por_janela:half,
      janela_recente:{de:days[n-half], ate:days[n-1]},
      janela_anterior:prevSet.size?{de:days[Math.max(0,n-2*half)], ate:days[n-half-1]}:null,
      cpm:iaCmp(dR,dP,'cpm'), ctr:iaCmp(dR,dP,'ctr'), cr:iaCmp(dR,dP,'cr'),
      vischk:iaCmp(dR,dP,'vischk'), convchk:iaCmp(dR,dP,'convchk'),
      cac:iaCmp(dR,dP,'cac'), roas:iaCmp(dR,dP,'roas'), gasto:iaCmp(dR,dP,'gasto'),
      vendas:{recente:R.vendas, anterior:P.vendas, variacao_pct:iaPctDelta(R.vendas,P.vendas)},
    };
  }
  /* top estruturas + tendência recente vs anterior */
  function topTrend(dim,lim){
    const map=buildAgg(fSmeta,fM,dim);
    const aggR = recentSet ? buildAgg(fSmeta.filter(r=>recentSet.has(r.d)), fM.filter(r=>recentSet.has(r.d)), dim) : {};
    const aggP = prevSet   ? buildAgg(fSmeta.filter(r=>prevSet.has(r.d)),   fM.filter(r=>prevSet.has(r.d)),   dim) : {};
    return Object.entries(map).sort((a,b)=>b[1].sp-a[1].sp).slice(0,lim).map(([nome,a])=>{
      const row=Object.assign({nome}, iaMetricRow(a,derive(a)));
      if(comparativo){
        const dvR=aggR[nome]?derive(aggR[nome]):null, dvP=aggP[nome]?derive(aggP[nome]):null;
        row.tendencia={
          cac_recente:dvR?r2(dvR.cac):null, cac_anterior:dvP?r2(dvP.cac):null,
          roas_recente:dvR?r2(dvR.roas):null, roas_anterior:dvP?r2(dvP.roas):null,
          gasto_recente:dvR?r2(dvR.gasto):null, gasto_anterior:dvP?r2(dvP.gasto):null };
      }
      return row;
    });
  }

  return {
    periodo:{de:from,ate:to,janela_ia:STATE.iaWin,dias_no_periodo:n},
    imposto_meta_aplicado: STATE.tax,
    obs:"Taxas em fração 0-1. cr=PageViews/Cliques; vischk=Checkouts/PageViews; convlp=Vendas/PageViews; convchk=Vendas/Checkouts. total_todas_vendas inclui vendas orgânicas; conversões e estruturas consideram apenas Meta Ads. Produto principal = "+MAIN_PRODUCT+". comparativo_periodo compara a janela recente vs a anterior (mesmo nº de dias) — use para detectar SATURAÇÃO/fadiga (ex.: CPM subindo + CTR/ROAS caindo). serie_diaria = evolução dia a dia. variacao_pct = variação % recente vs anterior. Cada estrutura traz 'tendencia' (recente vs anterior).",
    total_todas_vendas: iaMetricRow(t,derive(t)),
    total_meta_ads: iaMetricRow(tm,derive(tm)),
    comparativo_periodo: comparativo,
    serie_diaria: serie,
    campanhas: topTrend('camp',10),
    conjuntos: topTrend('adset',10),
    anuncios: topTrend('ad',15),
    vendas_por_produto: Object.entries(byProd).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([produto,vendas])=>({produto,vendas})),
  };
}
function iaBackendUrl(){ return iaNormUrl(localStorage.getItem('ia_backend')||B.ia_worker_url||''); }
function iaStatusText(){
  const b=iaBackendUrl(), p=localStorage.getItem('ia_pass');
  document.getElementById('iaStatus').textContent = b ? '' : 'backend não configurado — clique em Configurar';
  document.getElementById('iaGen').disabled = !(b&&p);
}
function iaShow(html){ document.getElementById('iaCards').innerHTML=html; }
function iaFmtDate(ts){ try{ return new Date(ts).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }catch(_){ return ''; } }
function iaRenderCards(insights,usage,at,from,to){
  if(!insights.length){ iaShow('<div class="ia-empty">A IA não retornou insights.</div>'); return; }
  const stamp = at ? `<div class="ia-empty" style="grid-column:1/-1;text-align:left">Gerado em ${iaFmtDate(at)}${from&&to?` · janela ${esc(from)} a ${esc(to)}`:''}</div>` : '';
  const sev=s=>['alta','media','baixa'].includes(String(s))?s:'baixa';
  const cards=insights.map(i=>{
    const s=sev(i.severidade); let verba='';
    if(i.verba && i.verba.acao && i.verba.acao!=='manter'){
      const v=i.verba, pct=(v.percentual!=null?(' '+Math.abs(v.percentual)+'%'):'');
      verba=`<div class="ins-verba">💰 <b>Verba:</b> ${esc(v.acao)}${pct} ${v.nivel_ajuste?('no '+esc(v.nivel_ajuste)):''}${v.observacao?(' — '+esc(v.observacao)):''}<span class="ins-apply">Peça no chat para eu aplicar no Meta Ads.</span></div>`;
    }
    return `<div class="ins-card sev-${s}">
      <div class="ins-head"><span class="ins-badge">${esc(i.nivel||'funil')} · ${esc(i.metrica||'')}</span><span class="ins-sev">${esc(s)}</span></div>
      <div class="ins-title">${esc(i.titulo||'')}</div>
      <div class="ins-diag">${esc(i.diagnostico||'')}</div>
      <div class="ins-rec"><b>Ação:</b> ${esc(i.recomendacao||'')}</div>
      ${i.estrutura?`<div class="ins-struct">Estrutura: ${esc(i.estrutura)}</div>`:''}
      ${verba}
    </div>`;
  }).join('');
  const u = usage ? `<div class="ia-empty" style="grid-column:1/-1">Tokens: entrada ${usage.input_tokens||'?'} · saída ${usage.output_tokens||'?'}</div>` : '';
  iaShow(stamp+cards+u);
}
function iaNormUrl(u){ u=(u||'').trim(); if(u && !/^https?:\/\//i.test(u)) u='https://'+u; return u; }
async function iaGenerate(){
  const backend=iaBackendUrl(), pass=localStorage.getItem('ia_pass');
  if(!backend||!pass){ document.getElementById('iaConfig').style.display='block'; return; }
  const btn=document.getElementById('iaGen'); btn.classList.add('loading'); btn.disabled=true;
  iaShow('<div class="ia-empty">Gerando insights com a IA… (pode levar alguns segundos)</div>');
  try{
    const res=await fetch(backend,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pass,data:iaBuildData()})});
    const txt=await res.text(); let j=null; try{ j=JSON.parse(txt); }catch{}
    if(!j){ iaShow('<div class="ins-card err"><div class="ins-title">Resposta inválida do backend</div><div class="ins-diag">HTTP '+res.status+'. A URL do Worker pode estar errada ou o Worker não está publicado. Abra a URL no navegador: deve mostrar <code>{"error":"Use GET ou POST."}</code>.</div><div class="ins-struct">'+esc(txt.slice(0,200))+'</div></div>'); return; }
    if(!res.ok || j.error){
      const extra=[]; if(j.detail) extra.push(String(j.detail)); if(j.stop_reason) extra.push('stop_reason='+j.stop_reason); if(j.raw) extra.push('Resposta do modelo: '+String(j.raw));
      iaShow('<div class="ins-card err"><div class="ins-title">Erro</div><div class="ins-diag">'+esc(j.error||('HTTP '+res.status))+'</div>'+(extra.length?('<div class="ins-struct" style="white-space:pre-wrap">'+esc(extra.join('\n').slice(0,1200))+'</div>'):'')+'</div>');
    }
    else {
      iaRenderCards(j.insights||[], j.usage, j.at||Date.now(), j.from, j.to);
    }
  }catch(e){ iaShow('<div class="ins-card err"><div class="ins-title">Falha de rede</div><div class="ins-diag">'+esc(e.message)+' — a URL deve começar com https:// e terminar em .workers.dev, e o Worker precisa estar publicado (CORS).</div></div>'); }
  finally{ btn.classList.remove('loading'); btn.disabled=false; }
}
async function iaLoadLatest(){
  const backend=iaBackendUrl();
  if(!backend){ iaShow('<div class="ia-empty">Configure o backend e clique em <b>Gerar insights</b>.</div>'); return; }
  iaShow('<div class="ia-empty">Carregando insights…</div>');
  try{
    const res=await fetch(backend,{method:'GET'});
    const j=await res.json().catch(()=>null);
    if(j && Array.isArray(j.insights) && j.insights.length){ iaRenderCards(j.insights, j.usage, j.at, j.from, j.to); }
    else { iaShow('<div class="ia-empty">Nenhum insight gerado ainda. Clique em <b>Gerar insights</b>.</div>'); }
  }catch(e){ iaShow('<div class="ia-empty">Não foi possível carregar os insights agora. Clique em <b>Gerar insights</b>.</div>'); }
}
function renderIA(){ iaStatusText(); iaRenderWin(); iaLoadLatest(); }

/* ---------------- date presets ---------------- */
const PRESETS=[
  ['hoje','Hoje',()=>[TODAY,TODAY]],
  ['ontem','Ontem',()=>[addDays(TODAY,-1),addDays(TODAY,-1)]],
  ['3d','3 dias',()=>[addDays(TODAY,-2),TODAY]],
  ['7d','7 dias',()=>[addDays(TODAY,-6),TODAY]],
  ['14d','14 dias',()=>[addDays(TODAY,-13),TODAY]],
  ['30d','30 dias',()=>[addDays(TODAY,-29),TODAY]],
  ['mes','Este mês',()=>{const [y,m]=TODAY.split('-');return [`${y}-${m}-01`,TODAY];}],
  ['mespass','Mês passado',()=>{const dt=new Date(TODAY+'T00:00:00');const f=new Date(dt.getFullYear(),dt.getMonth()-1,1);const l=new Date(dt.getFullYear(),dt.getMonth(),0);return [dstr(f),dstr(l)];}],
  ['todo','Todo período',()=>[B.date_min,B.date_max]],
];
function renderPresets(){
  document.getElementById('presets').innerHTML=PRESETS.map(p=>`<button class="chip ${STATE.preset===p[0]?'active':''}" data-p="${p[0]}">${p[1]}</button>`).join('');
  document.querySelectorAll('#presets .chip').forEach(c=>c.addEventListener('click',()=>{ applyPreset(c.dataset.p); }));
}
function applyPreset(id){ const p=PRESETS.find(x=>x[0]===id); if(!p)return; const [f,t]=p[2]();
  STATE.from=f; STATE.to=t; STATE.preset=id; STATE.selDays.clear(); syncDateInputs(); renderPresets(); renderAll(); }
function syncDateInputs(){ document.getElementById('dFrom').value=STATE.from||''; document.getElementById('dTo').value=STATE.to||''; }

/* ---------------- navigation & boot ---------------- */
function setPage(p){ STATE.page=p;
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.page===p));
  document.getElementById('page-geral').classList.toggle('active',p==='geral');
  document.getElementById('page-meta').classList.toggle('active',p==='meta');
  document.getElementById('page-ia').classList.toggle('active',p==='ia');
  document.getElementById('ptitle').textContent = p==='meta'?'Meta Ads':(p==='ia'?'IA Insights':'Visão Geral');
  document.getElementById('navToggle').checked=false;
  history.replaceState(null,'', '#'+p);
  renderAll();
}
function renderAll(){ if(STATE.page==='meta') renderMeta(); else if(STATE.page==='ia') renderIA(); else renderGeral(); }

/* Tema ESCURO é o padrão; só fica claro se o usuário tiver escolhido 'light'. */
function applyTheme(){ const t=localStorage.getItem('dm_theme'); if(t==='light') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme','dark'); }
applyTheme();
document.getElementById('themeBtn').addEventListener('click',()=>{ const dark=document.documentElement.getAttribute('data-theme')==='dark'; localStorage.setItem('dm_theme',dark?'light':'dark'); applyTheme(); renderAll(); });

document.querySelectorAll('.nav-item').forEach(n=>n.addEventListener('click',()=>setPage(n.dataset.page)));
document.getElementById('taxToggle').addEventListener('click',function(){ STATE.tax=!STATE.tax; this.classList.toggle('on',STATE.tax); renderAll(); });
document.getElementById('dFrom').addEventListener('change',e=>{ STATE.from=e.target.value; STATE.preset=''; STATE.selDays.clear(); renderPresets(); renderAll(); });
document.getElementById('dTo').addEventListener('change',e=>{ STATE.to=e.target.value; STATE.preset=''; STATE.selDays.clear(); renderPresets(); renderAll(); });
document.getElementById('clearBtn').addEventListener('click',()=>{ STATE.mSelC.clear();STATE.mSelA.clear();STATE.mSelAd.clear();STATE.selDays.clear(); applyPreset('mes'); });
document.getElementById('refreshBtn').addEventListener('click',function(){ this.classList.add('loading'); location.href=location.pathname+'?t='+Date.now()+location.hash; });

/* IA Insights config + geração */
document.getElementById('iaCfgBtn').addEventListener('click',()=>{ const c=document.getElementById('iaConfig');
  c.style.display = c.style.display==='none'?'block':'none';
  document.getElementById('iaUrl').value=localStorage.getItem('ia_backend')||'';
  document.getElementById('iaPass').value=localStorage.getItem('ia_pass')||''; });
document.getElementById('iaSave').addEventListener('click',()=>{
  const u=iaNormUrl(document.getElementById('iaUrl').value), p=document.getElementById('iaPass').value;
  if(u) localStorage.setItem('ia_backend',u); else localStorage.removeItem('ia_backend');
  if(p) localStorage.setItem('ia_pass',p); else localStorage.removeItem('ia_pass');
  document.getElementById('iaCfgMsg').textContent='Salvo neste navegador ✓';
  document.getElementById('iaConfig').style.display='none'; iaStatusText(); });
document.getElementById('iaGen').addEventListener('click',iaGenerate);

document.title=(B.client_sub?B.client_sub+' · ':'')+(B.client_name||'Dashboard');
document.getElementById('logoMain').textContent=B.client_name||'—';
document.getElementById('logoSub').textContent=B.client_sub||'';
document.getElementById('taxLabel').textContent=B.tax_label||'Imposto';
document.getElementById('mainProdNote').textContent=MAIN_PRODUCT;
document.getElementById('mainProdNoteG').textContent=MAIN_PRODUCT;
document.getElementById('mainProdNoteProdG').textContent=MAIN_PRODUCT;
document.getElementById('mainProdNoteProdM').textContent=MAIN_PRODUCT;
document.getElementById('updated').innerHTML='Última atualização:<br>'+B.generated_at_brt+' (BRT)';
document.getElementById('buildFoot').textContent='build __BUILD_ID__';
document.getElementById('buildFoot2').textContent='· build __BUILD_ID__';

syncDateInputs(); renderPresets(); iaStatusText();
document.getElementById('taxToggle').classList.toggle('on', STATE.tax);  /* imposto Meta ON por padrão */
setPage(location.hash==='#meta'?'meta':(location.hash==='#ia'?'ia':'geral'));

/* auto-refresh com cache-bust ~30 min */
setTimeout(()=>{ location.href=location.pathname+'?t='+Date.now()+location.hash; }, 30*60*1000);

