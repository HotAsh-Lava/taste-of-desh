import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';
import {
  G,
  ICONS,
  ep,
  cf,
  bjDate,
  bjTime,
  nid,
  nextSeq,
  expStyle,
  stStyle,
  openPrintWindow,
  buildPOHTML,
  buildSalesReceiptHTML,
  Btn,
  FInput,
  FSel,
  Overlay,
  Card,
  Stat,
  CatChip,
  TabErrorBoundary,
  ConfirmDlg,
  ComboInput,
  CatManageOverlay,
  Slideshow,
  ddmmyyyy,
  CHECKER,
  fromDbProduct,
  toDbProduct,
  fromDbInv,
  toDbInv,
  findProductForBatch,
  toDbSale,
  fromDbPO,
  toDbPO,
  removeBackground,
  uploadToBucket,
  optimizeImage
} from './App.jsx';

function DashTab({prods,inv,orders,sales,catColors,customSlides,setCustomSlides,qrCodes,setQrCodes}) {
  // Load the charting library only when this tab actually renders. Vite splits
  // this into its own chunk, so it never touches the customer-facing bundle.
  const [RC,setRC]=useState(null);
  useEffect(()=>{ let ok=true; import('recharts').then(m=>{ if(ok) setRC(m); }); return ()=>{ ok=false; }; },[]);
  const lowStock=prods.filter(p=>p.stock<3);
  const outStock=prods.filter(p=>p.stock<=0);
  const expiring=inv.filter(i=>{const d=(new Date(i.exp)-new Date())/86400000;return d>0&&d<90;});
  const expired=inv.filter(i=>new Date(i.exp)<new Date()&&i.qty>0);
  // Group the low-stock list by category so the alerts panel reads as a table
  // instead of one giant run-on paragraph.
  const lowByCat=useMemo(()=>{
    const m={};
    lowStock.forEach(p=>{ (m[p.cat||'Uncategorised']=m[p.cat||'Uncategorised']||[]).push(p); });
    return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0]));
  },[prods]);
  const totalRev=sales.reduce((s,o)=>s+o.grand,0);
  const pendingN=orders.filter(o=>o.status==='pending').length;
  const [capt,setCapt]=useState('');
  const [upBusy,setUpBusy]=useState('');
  // Slideshow images and QR codes go to Storage too — site_settings used to hold
  // base64 blobs, which every visitor downloaded on every page load.
  async function handleSlideImg(e){
    const f=e.target.files[0]; if(!f) return;
    setUpBusy('slide');
    try{
      const url = await uploadToBucket('site-images', f, 'slides');
      const next=[...customSlides,{id:nid(customSlides),img:url,caption:capt}];
      const { error } = await supabase.from('site_settings').update({custom_slides:next}).eq('id',true);
      if(error) throw new Error('Failed to save slide: '+error.message);
      setCustomSlides(next);
      setCapt('');
    }catch(err){ alert(err.message); }
    finally{ setUpBusy(''); e.target.value=''; }
  }
  async function delSlide(id){
    const next=customSlides.filter(s=>s.id!==id);
    const { error } = await supabase.from('site_settings').update({custom_slides:next}).eq('id',true);
    if(error){alert('Failed to delete slide: '+error.message);return;}
    setCustomSlides(next);
  }
  async function handleQRImg(method,e){
    const f=e.target.files[0]; if(!f) return;
    setUpBusy(method);
    try{
      const url = await uploadToBucket('site-images', f, 'qr');
      const next={...qrCodes,[method]:url};
      const { error } = await supabase.from('site_settings').update({qr_codes:next}).eq('id',true);
      if(error) throw new Error('Failed to save QR code: '+error.message);
      setQrCodes(next);
    }catch(err){ alert(err.message); }
    finally{ setUpBusy(''); e.target.value=''; }
  }
  async function delQR(method){
    const next={...qrCodes,[method]:''};
    const { error } = await supabase.from('site_settings').update({qr_codes:next}).eq('id',true);
    if(error){alert('Failed to remove QR: '+error.message);return;}
    setQrCodes(next);
  }
  // Real numbers, computed from the sales table — the last 6 months including
  // this one. This used to be a hardcoded array of made-up figures.
  const monthly = useMemo(()=>{
    const now = new Date();
    const buckets = [];
    for(let k=5;k>=0;k--){
      const d = new Date(now.getFullYear(), now.getMonth()-k, 1);
      buckets.push({
        key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
        m: d.toLocaleString('en',{month:'short'}),
        sales:0, cost:0, profit:0, courier:0,
      });
    }
    const byKey = {};
    buckets.forEach(b=>{ byKey[b.key]=b; });
    sales.forEach(sl=>{
      if(!sl.date) return;
      const b = byKey[String(sl.date).slice(0,7)];   // 'YYYY-MM-DD' -> 'YYYY-MM'
      if(!b) return;
      const rev  = +sl.grand   || 0;
      const cour = +sl.courier || 0;
      // Cost of goods sold: match each line item back to its product's cost price.
      const cost = (sl.items||[]).reduce((sum,it)=>{
        const pr = prods.find(x=>x.name===it.name);
        return sum + ((pr && pr.cp) ? pr.cp * it.qty : 0);
      },0);
      b.sales   += rev;
      b.cost    += cost;
      b.courier += cour;
      b.profit  += rev - cost - cour;
    });
    return buckets.map(b=>({
      m: b.m,
      sales:   +b.sales.toFixed(2),
      cost:    +b.cost.toFixed(2),
      profit:  +b.profit.toFixed(2),
      courier: +b.courier.toFixed(2),
    }));
  },[sales,prods]);

  // Top products by units actually sold, not by list price.
  const topProds = useMemo(()=>{
    const sold = {};
    sales.forEach(sl=>(sl.items||[]).forEach(it=>{
      sold[it.name] = (sold[it.name]||0) + (+it.qty||0);
    }));
    return [...prods]
      .map(pr=>({...pr, sold: sold[pr.name]||0}))
      .sort((a,b)=> (b.sold-a.sold) || (b.sp-a.sp))
      .slice(0,5);
  },[prods,sales]);
  const noSales = sales.length===0;
  return(
    <div>
      <div style={{fontSize:19,fontWeight:'bold',color:G.dk,marginBottom:16}}>📊 Dashboard</div>
      {(lowStock.length>0||expired.length>0||expiring.length>0)&&(
        <Card style={{marginBottom:18,border:`1px solid ${G.gold}`,background:'#FFFDF5'}}>
          <div style={{fontWeight:'bold',color:G.yd,marginBottom:12,fontSize:15}}>⚠️ Alerts</div>

          {/* Summary chips */}
          <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:lowByCat.length?14:0}}>
            {outStock.length>0&&<div style={{background:'#FDECEA',border:`1px solid ${G.rd}`,borderRadius:8,padding:'6px 12px',fontSize:12,color:G.rd,fontWeight:'bold'}}>⛔ {outStock.length} out of stock</div>}
            <div style={{background:'#FFF3E0',border:`1px solid ${G.yd}`,borderRadius:8,padding:'6px 12px',fontSize:12,color:'#8a6d00',fontWeight:'bold'}}>🔻 {lowStock.length} low stock (&lt;3)</div>
            {expiring.length>0&&<div style={{background:'#FFF8E1',border:`1px solid ${G.yd}`,borderRadius:8,padding:'6px 12px',fontSize:12,color:'#8a6d00',fontWeight:'bold'}}>⏳ {expiring.length} expiring soon</div>}
            {expired.length>0&&<div style={{background:'#FDECEA',border:`1px solid ${G.rd}`,borderRadius:8,padding:'6px 12px',fontSize:12,color:G.rd,fontWeight:'bold'}}>💀 {expired.length} expired batch(es)</div>}
          </div>

          {/* Low-stock table, grouped by category */}
          {lowByCat.length>0&&(
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr style={{background:G.gd,color:G.w}}>
                    <th style={{padding:'8px 10px',textAlign:'left'}}>Category</th>
                    <th style={{padding:'8px 10px',textAlign:'left'}}>Product</th>
                    <th style={{padding:'8px 10px',textAlign:'center',whiteSpace:'nowrap'}}>Stock left</th>
                  </tr>
                </thead>
                <tbody>
                  {lowByCat.map(([cat,items])=>items.map((p,idx)=>(
                    <tr key={p.id} style={{borderBottom:`1px solid ${G.brd}`}}>
                      {idx===0&&<td rowSpan={items.length} style={{padding:'7px 10px',verticalAlign:'top',fontWeight:'bold',borderRight:`1px solid ${G.brd}`}}><CatChip cat={cat} catColors={catColors}/></td>}
                      <td style={{padding:'7px 10px'}}>{p.name}</td>
                      <td style={{padding:'7px 10px',textAlign:'center'}}>
                        <span style={{background:p.stock<=0?'#FDECEA':'#FFF3E0',color:p.stock<=0?G.rd:'#8a6d00',fontWeight:'bold',padding:'2px 10px',borderRadius:20,display:'inline-block',minWidth:24}}>{p.stock}</span>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      <Card style={{marginBottom:18}}>
        <div style={{fontWeight:'bold',fontSize:14,marginBottom:4,color:G.dk}}>🖼️ Home Slideshow Images</div>
        <div style={{fontSize:11,color:G.mut,marginBottom:12}}>Upload pictures to feature them in the rotating slideshow at the top of the customer Home page.</div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end',marginBottom:14}}>
          <div style={{flex:1,minWidth:160}}><FInput label="Caption (optional)" value={capt} onChange={setCapt}/></div>
          <div style={{background:G.gl,border:`1px solid ${G.g}`,borderRadius:9,padding:11,marginBottom:11,fontSize:11,color:G.tx,lineHeight:1.65}}>
            <div style={{fontWeight:'bold',color:G.gd,fontSize:12,marginBottom:3}}>📐 Recommended size: 1200 × 576 px</div>
            The slideshow panel is a wide landscape banner — roughly <b>2 parts wide to 1 part tall</b>.
            Any size will work: the picture is scaled to fit and a blurred copy of it fills whatever is left over.
            But an image at this ratio fills the panel edge to edge, with no blurred border.
            <div style={{marginTop:4,color:G.mut}}>Keep important text out of the bottom strip — that's where the caption sits.</div>
          </div>
          <div style={{marginBottom:10}}>
            <input type="file" accept="image/*" onChange={handleSlideImg} disabled={upBusy==='slide'} style={{fontSize:12}}/>
            {upBusy==='slide'&&<div style={{fontSize:11,color:G.bd,fontWeight:'bold',marginTop:4}}>⏳ Uploading…</div>}
          </div>
        </div>
        {customSlides.length===0
          ? <div style={{color:G.mut,fontSize:12}}>No custom slides yet.</div>
          : (
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              {customSlides.map(s=>(
                <div key={s.id} style={{position:'relative',width:140}}>
                  <img src={s.img} alt={s.caption||'Slide'} style={{width:140,height:90,objectFit:'contain',borderRadius:9,border:`1px solid ${G.brd}`,display:'block',...CHECKER}}/>
                  {s.caption&&<div style={{fontSize:10,color:G.tx,marginTop:4,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.caption}</div>}
                  <button onClick={()=>delSlide(s.id)} style={{position:'absolute',top:4,right:4,background:'rgba(0,0,0,0.55)',color:'#fff',border:'none',borderRadius:'50%',width:22,height:22,cursor:'pointer',fontSize:12}}>✕</button>
                </div>
              ))}
            </div>
          )
        }
      </Card>
      <Card style={{marginBottom:18}}>
        <div style={{fontWeight:'bold',fontSize:14,marginBottom:4,color:G.dk}}>💳 Payment QR Codes</div>
        <div style={{fontSize:11,color:G.mut,marginBottom:14}}>Upload your real Alipay and WeChat Pay QR codes — customers will see these during checkout instead of the placeholder.</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16}}>
          {[['alipay','💙 Alipay'],['wechat','💚 WeChat Pay']].map(([m,l])=>(
            <div key={m} style={{textAlign:'center'}}>
              <div style={{fontWeight:'bold',fontSize:12,marginBottom:8,color:G.dk}}>{l}</div>
              {qrCodes && qrCodes[m] ? (
                <div style={{position:'relative',display:'inline-block'}}>
                  <img src={qrCodes[m]} style={{width:140,height:140,objectFit:'contain',borderRadius:9,border:`1px solid ${G.brd}`,display:'block',background:G.w}}/>
                  <button onClick={()=>delQR(m)} style={{position:'absolute',top:4,right:4,background:'rgba(0,0,0,0.55)',color:'#fff',border:'none',borderRadius:'50%',width:22,height:22,cursor:'pointer',fontSize:12}}>✕</button>
                </div>
              ) : (
                <div style={{width:140,height:140,margin:'0 auto',borderRadius:9,border:`2px dashed ${G.brd}`,display:'flex',alignItems:'center',justifyContent:'center',color:G.mut,fontSize:11,background:G.bg}}>No QR yet</div>
              )}
              <div style={{marginTop:9}}>
                <input type="file" accept="image/*" onChange={e=>handleQRImg(m,e)} disabled={upBusy===m} style={{fontSize:11}}/>
                {upBusy===m&&<div style={{fontSize:11,color:G.bd,fontWeight:'bold',marginTop:4}}>⏳ Uploading…</div>}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:12,marginBottom:20}}>
        <Stat icon="💰" label="Total Revenue (¥)" value={`¥${Math.round(totalRev)}`} color={G.gd}/>
        <Stat icon="🛒" label="Pending Orders" value={pendingN} color={G.yd}/>
        <Stat icon="📦" label="Products" value={prods.length} color={G.bd}/>
        <Stat icon="⚠️" label="Low Stock Items" value={lowStock.length} color={G.rd}/>
      </div>
      <Card style={{marginBottom:18}}>
        <div style={{fontWeight:'bold',fontSize:14,marginBottom:4,color:G.dk}}>📈 Monthly Performance (RMB)</div>
        <div style={{fontSize:11,color:G.mut,marginBottom:12}}>Last 6 months, from your Sales List. Cost is calculated from each product's cost price.</div>
        {noSales&&<div style={{fontSize:12,color:G.yd,background:G.goldl,borderRadius:8,padding:10,marginBottom:12}}>No sales recorded yet — this chart will fill in as orders are completed.</div>}
        {RC
          ? <RC.ResponsiveContainer width="100%" height={220}>
              <RC.BarChart data={monthly}><RC.CartesianGrid strokeDasharray="3 3"/><RC.XAxis dataKey="m" fontSize={11}/><RC.YAxis fontSize={11}/><RC.Tooltip/><RC.Legend/>
                <RC.Bar dataKey="sales" name="Sales" fill={G.gm}/><RC.Bar dataKey="cost" name="Cost" fill="#EF9A9A"/><RC.Bar dataKey="profit" name="Profit" fill={G.gold}/>
              </RC.BarChart>
            </RC.ResponsiveContainer>
          : <div style={{height:220,display:'flex',alignItems:'center',justifyContent:'center',color:G.mut,fontSize:12}}>Loading chart</div>}
      </Card>
      <Card style={{marginBottom:18}}>
        <div style={{fontWeight:'bold',fontSize:14,marginBottom:14,color:G.dk}}>🚚 Courier Cost by Month (¥)</div>
        {RC
          ? <RC.ResponsiveContainer width="100%" height={180}>
              <RC.LineChart data={monthly}><RC.CartesianGrid strokeDasharray="3 3"/><RC.XAxis dataKey="m" fontSize={11}/><RC.YAxis fontSize={11}/><RC.Tooltip/>
                <RC.Line type="monotone" dataKey="courier" name="Courier" stroke={G.bd} strokeWidth={2} dot={{fill:G.bd}}/>
              </RC.LineChart>
            </RC.ResponsiveContainer>
          : <div style={{height:180,display:'flex',alignItems:'center',justifyContent:'center',color:G.mut,fontSize:12}}>Loading chart</div>}
      </Card>
      <Card style={{marginBottom:18}}>
        <div style={{fontWeight:'bold',fontSize:14,marginBottom:12,color:G.dk}}>⭐ Top Products</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{background:G.gd,color:G.w}}>
              <th style={{padding:'8px 10px',textAlign:'left'}}>#</th><th style={{padding:'8px 10px',textAlign:'left'}}>Product</th>
              <th style={{padding:'8px 10px',textAlign:'center'}}>Category</th><th style={{padding:'8px 10px',textAlign:'center'}}>Units Sold</th><th style={{padding:'8px 10px',textAlign:'center'}}>Price</th><th style={{padding:'8px 10px',textAlign:'center'}}>Stock</th>
            </tr></thead>
            <tbody>{topProds.map((p,i)=>(
              <tr key={p.id} style={{background:i%2===0?G.w:G.bg,borderBottom:`1px solid ${G.brd}`}}>
                <td style={{padding:'7px 10px',fontWeight:'bold'}}>{i+1}</td><td style={{padding:'7px 10px'}}>{p.name}</td>
                <td style={{padding:'7px 10px',textAlign:'center'}}><CatChip cat={p.cat} catColors={catColors}/></td>
                <td style={{padding:'7px 10px',textAlign:'center',fontWeight:'bold',color:p.sold>0?G.gd:G.mut}}>{p.sold}</td>
                <td style={{padding:'7px 10px',textAlign:'center'}}>¥{p.sp}</td>
                <td style={{padding:'7px 10px',textAlign:'center'}}><span style={{...stStyle(p.stock),padding:'2px 8px',borderRadius:5,display:'inline-block'}}>{p.stock}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      {expiring.length>0&&(
        <Card>
          <div style={{fontWeight:'bold',fontSize:14,marginBottom:10,color:G.rd}}>⚠️ Expiring Soon (&lt;3 months)</div>
          {expiring.map(i=>(
            <div key={i.id} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:`1px solid ${G.brd}`,fontSize:12}}>
              <span>{i.name}</span><span style={{color:G.rd,fontWeight:'bold'}}>Exp: {i.exp} (Qty: {i.qty})</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// A read-only stock display for the product forms. Stock is now owned entirely by
// the Inventory tab: products.stock is the sum of that product's inventory batches,
// kept in step by a database trigger. You raise stock by adding an inventory batch,
// not by typing a number here.
function StockReadout({value,note}) {
  return (
    <div style={{marginBottom:10}}>
      <div style={{fontSize:11,fontWeight:'600',marginBottom:3,color:'#555'}}>Stock Quantity</div>
      <div style={{padding:'8px 11px',borderRadius:8,border:'1px dashed #bbb',background:'#F5F5F5',fontSize:13,color:'#333',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
        <span style={{fontWeight:'bold'}}>{value===''||value==null?'—':value}</span>
        <span style={{fontSize:10,color:'#888'}}>🔒 from Inventory</span>
      </div>
      <div style={{fontSize:10,color:'#888',marginTop:4}}>{note||'Add stock in the Inventory tab. This number is the total of all batches.'}</div>
    </div>
  );
}

// ==================== Editing ====================

// In BULK mode a field does nothing until you tick it. That's the whole point:
// "edit 12 products" must never quietly overwrite a field you didn't mean to touch.
// Untouched = untouched.
function BulkField({on,setOn,k,label,children}) {
  const active = !!on[k];
  return (
    <div style={{marginBottom:10,opacity:active?1:0.45,transition:'opacity 0.15s'}}>
      <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:'600',marginBottom:3,cursor:'pointer',color:active?G.gd:G.mut}}>
        <input type="checkbox" checked={active} onChange={e=>setOn(p=>({...p,[k]:e.target.checked}))}/>
        {label}
      </label>
      <div style={{pointerEvents:active?'auto':'none'}}>{children}</div>
    </div>
  );
}

// Edit one product, or many at once. Same component — it just changes shape.
function ProdEditOverlay({items,cats,onClose,onSaved}) {
  const bulk = items.length > 1;
  const one  = items[0];
  const [on,setOn]         = useState({});
  const [busy,setBusy]     = useState(false);
  const [imgBusy,setImgBusy] = useState(false);
  const [cutBg,setCutBg]   = useState(true);
  const [f,setF] = useState(bulk
    ? {cat:'',unit:'PCS',pw:'',gw:'',sp:'',cp:'',stock:'',disc:'',bs:false,isNew:false,slideshow:false}
    : {name:one.name, upc:one.upc||'', cat:one.cat||'', unit:one.unit||'PCS',
       pw:one.pw??'', gw:one.gw??'', sp:one.sp??'', cp:one.cp??'',
       stock:one.stock??0, disc:one.disc??0, bs:!!one.bs, isNew:!!one.isNew, slideshow:!!one.slideshow, img:one.img||''});
  const set = (k,v)=>setF(p=>({...p,[k]:v}));

  async function handleImg(e){
    const file=e.target.files[0]; if(!file) return;
    setImgBusy(true);
    try{
      let up=file, transparent=false;
      if(cutBg){ const r=await removeBackground(file); up=r.file; transparent=r.removed; }
      up=await optimizeImage(up,{maxDim:1000,quality:0.9,transparent});
      set('img', await uploadToBucket('product-images', up));
    }catch(err){ alert(err.message); }
    finally{ setImgBusy(false); e.target.value=''; }
  }

  async function save(){
    if(busy||imgBusy) return;
    const patch={};
    if(bulk){
      if(on.cat){ if(!f.cat){alert('Pick a category.');return;} patch.category=f.cat; }
      if(on.unit)  patch.unit          = f.unit;
      if(on.pw)    patch.pack_weight   = +f.pw    || 0;
      if(on.gw)    patch.gross_weight  = +f.gw    || 0;
      if(on.sp)    patch.selling_price = +f.sp    || 0;
      if(on.cp)    patch.cost_price    = +f.cp    || 0;
      if(on.disc){ patch.discount = +f.disc || 0; patch.on_offer = (+f.disc||0) > 0; }
      if(on.bs)    patch.best_seller   = !!f.bs;
      if(on.isNew) patch.is_new        = !!f.isNew;
      if(on.slideshow) patch.show_in_slideshow = !!f.slideshow;
      if(Object.keys(patch).length===0){ alert('Tick at least one field to change.'); return; }
    } else {
      if(!f.name||!f.cat||f.sp===''||f.pw===''||f.gw===''){
        alert('Name, Category, Packed Weight, Gross Weight and Selling Price are all required.'); return;
      }
      Object.assign(patch, toDbProduct({
        ...f, pw:+f.pw, gw:+f.gw, sp:+f.sp, cp:+f.cp||0,
        stock:+f.stock||0, disc:+f.disc||0, offer:(+f.disc||0)>0,
      }));
      // Stock is derived from inventory by the database — never overwrite it here.
      delete patch.stock;
    }
    setBusy(true);
    // .select() makes the database report what it actually changed, rather than us
    // assuming it worked and updating the screen for nothing.
    const { data, error } = await supabase.from('products').update(patch).in('id', items.map(i=>i.id)).select();
    setBusy(false);
    if(error){ alert('Could not save:\n\n'+error.message); return; }
    if(!data||data.length===0){ alert('The database updated 0 rows. Check your admin permissions.'); return; }
    onSaved(data.map(fromDbProduct));
    onClose();
  }

  // In bulk mode every field gets a tick-box; in single mode it's just the field.
  const W = (k,label,node)=> bulk ? <BulkField on={on} setOn={setOn} k={k} label={label}>{node}</BulkField> : node;
  const YN = [{v:'yes',l:'Yes'},{v:'no',l:'No'}];

  return (
    <Overlay title={bulk?`Edit ${items.length} Products`:`Edit — ${one.name}`} onClose={onClose} width={660}>
      {bulk&&(
        <div style={{background:G.gl,border:`1px solid ${G.g}`,borderRadius:9,padding:11,marginBottom:14,fontSize:11,color:G.tx,lineHeight:1.6}}>
          <b style={{color:G.gd}}>Bulk edit — {items.length} products selected.</b><br/>
          Tick a field to change it on all of them. Anything left unticked is <b>not touched</b>.
          <div style={{marginTop:4,color:G.mut}}>{items.map(i=>i.name).join(' · ')}</div>
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
        {!bulk&&<FInput label="Product Name" value={f.name} onChange={v=>set('name',v)} req/>}
        {!bulk&&<FInput label="UPC/Barcode" value={f.upc} onChange={v=>set('upc',v)}/>}
        {W('cat',  'Category',            <FSel   label={bulk?'':'Category'}            value={f.cat}   onChange={v=>set('cat',v)}   options={cats}/>)}
        {W('unit', 'Unit',                <FSel   label={bulk?'':'Unit'}                value={f.unit}  onChange={v=>set('unit',v)}  options={['PCS','KG','BOX','BOTTLE','PACK']}/>)}
        {W('pw',   'Packed Weight (g)',   <FInput label={bulk?'':'Packed Weight (g)'}   value={f.pw}    onChange={v=>set('pw',v)}    type="number" req={!bulk}/>)}
        {W('gw',   'Gross Weight (KG)',   <FInput label={bulk?'':'Gross Weight (KG)'}   value={f.gw}    onChange={v=>set('gw',v)}    type="number" req={!bulk}/>)}
        {W('sp',   'Selling Price (RMB)', <FInput label={bulk?'':'Selling Price (RMB)'} value={f.sp}    onChange={v=>set('sp',v)}    type="number" req={!bulk}/>)}
        {W('cp',   'Cost Price (RMB)',    <FInput label={bulk?'':'Cost Price (RMB)'}    value={f.cp}    onChange={v=>set('cp',v)}    type="number"/>)}
        {!bulk && <StockReadout value={f.stock} note={`Total across all inventory batches for ${one.name}. Change it by adding or editing batches in the Inventory tab.`}/>}
        {W('disc', 'Discount (%)',        <FInput label={bulk?'':'Discount (%)'}        value={f.disc}  onChange={v=>set('disc',v)}  type="number"/>)}
        {bulk&&W('bs',    '⭐ Best Seller',  <FSel label="" value={f.bs?'yes':'no'}    onChange={v=>set('bs',    v==='yes')} options={YN}/>)}
        {bulk&&W('isNew', '✨ New Arrival',  <FSel label="" value={f.isNew?'yes':'no'} onChange={v=>set('isNew', v==='yes')} options={YN}/>)}
        {bulk&&W('slideshow', '🖼️ Show in Slideshow', <FSel label="" value={f.slideshow?'yes':'no'} onChange={v=>set('slideshow', v==='yes')} options={YN}/>)}
      </div>

      <div style={{fontSize:10,color:G.mut,marginTop:-2,marginBottom:8}}>
        Setting a discount above 0 automatically marks the product as “On Offer”.
        Stock is the number the shop sells against — change it only to correct a miscount.
      </div>

      {!bulk&&(
        <>
          <div style={{display:'flex',gap:20,margin:'4px 0 12px',flexWrap:'wrap'}}>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,cursor:'pointer',color:G.tx}}>
              <input type="checkbox" checked={!!f.bs} onChange={e=>set('bs',e.target.checked)}/> ⭐ Best Seller
            </label>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,cursor:'pointer',color:G.tx}}>
              <input type="checkbox" checked={!!f.isNew} onChange={e=>set('isNew',e.target.checked)}/> ✨ New Arrival
            </label>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,cursor:'pointer',color:G.tx}}>
              <input type="checkbox" checked={!!f.slideshow} onChange={e=>set('slideshow',e.target.checked)}/> 🖼️ Show in Slideshow
            </label>
          </div>
          <div style={{marginBottom:8}}>
            <div style={{fontSize:11,fontWeight:'600',marginBottom:5,color:G.tx}}>Product Picture</div>
            <input type="file" accept="image/*" onChange={handleImg} disabled={imgBusy} style={{fontSize:12}}/>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:G.tx,marginTop:7,cursor:imgBusy?'not-allowed':'pointer'}}>
              <input type="checkbox" checked={cutBg} disabled={imgBusy} onChange={e=>setCutBg(e.target.checked)}/>
              <span>Remove the plain background <span style={{color:G.mut}}>(best for products shot on white)</span></span>
            </label>
            {imgBusy&&<div style={{fontSize:11,color:G.bd,marginTop:6,fontWeight:'bold'}}>⏳ Processing and uploading…</div>}
            {f.img&&!imgBusy&&<div style={{marginTop:8,width:96,height:96,borderRadius:8,border:`1px solid ${G.brd}`,...CHECKER,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}><img src={f.img} alt="Product preview" style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/></div>}
            <div style={{fontSize:10,color:G.mut,marginTop:5}}>Leave this alone to keep the current picture.</div>
          </div>
        </>
      )}

      <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:14}}>
        <Btn v='outline' onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={busy||imgBusy}>{busy?'Saving…':'Save Changes'}</Btn>
      </div>
    </Overlay>
  );
}

// Edit one inventory batch, or many at once.
function InvEditOverlay({items,cats,prods,setProds,onClose,onSaved,reloadProducts}) {
  const bulk = items.length > 1;
  const one  = items[0];
  const [on,setOn]     = useState({});
  const [busy,setBusy] = useState(false);
  const [f,setF] = useState(bulk
    ? {cat:'',qty:'',exp:'',sp:'',cp:'',pw:''}
    : {name:one.name, cat:one.cat||'', qty:one.qty??'', exp:one.exp||'',
       sp:one.sp??'', cp:one.cp??'', pw:one.pw??'', upc:one.upc||'', date:one.date||''});
  const set = (k,v)=>setF(p=>({...p,[k]:v}));

  async function save(){
    if(busy) return;
    const patch={};
    // How each product's stock has to move. products.stock is the number the shop
    // actually sells against, so changing a batch's quantity must move it too —
    // otherwise the shelf and the shop would disagree.
    const deltas={};

    if(bulk){
      if(on.cat){ if(!f.cat){alert('Pick a category.');return;} patch.category=f.cat; }
      if(on.exp) patch.expiry_date   = f.exp || null;
      if(on.sp)  patch.selling_price = +f.sp || 0;
      if(on.cp)  patch.cost_price    = +f.cp || 0;
      if(on.pw)  patch.pack_weight   = +f.pw || 0;
      if(on.qty){
        const nq = +f.qty || 0;
        if(nq < 0){ alert('Quantity cannot be negative.'); return; }
        patch.qty = nq;
        items.forEach(it=>{ deltas[it.name] = (deltas[it.name]||0) + (nq - (+it.qty||0)); });
      }
      if(Object.keys(patch).length===0){ alert('Tick at least one field to change.'); return; }
    } else {
      if(!f.name || f.qty===''){ alert('Product Name and Qty are required.'); return; }
      const nq = +f.qty || 0;
      if(nq < 0){ alert('Quantity cannot be negative.'); return; }
      // If the name now matches a product, re-link the batch to it.
      const matched = findProductForBatch(prods, {name:f.name, pw:f.pw, upc:f.upc});
      patch.product_id    = matched ? matched.id : null;
      patch.name          = f.name;
      patch.category      = f.cat || null;
      patch.qty           = nq;
      patch.expiry_date   = f.exp || null;
      patch.selling_price = +f.sp || 0;
      patch.cost_price    = +f.cp || 0;
      patch.pack_weight   = +f.pw || 0;
      patch.upc           = f.upc || null;
      if(f.date) patch.date = f.date;
      // The units leave the old product and land on the new one. If the name didn't
      // change, these two cancel out into a simple difference.
      deltas[one.name] = (deltas[one.name]||0) - (+one.qty||0);
      deltas[f.name]   = (deltas[f.name]  ||0) + nq;
    }

    setBusy(true);
    const { data, error } = await supabase.from('inventory').update(patch).in('id', items.map(i=>i.id)).select();
    if(error){ setBusy(false); alert('Could not save:\n\n'+error.message); return; }
    if(!data||data.length===0){ setBusy(false); alert('The database updated 0 rows. Check your admin permissions.'); return; }

    // Editing a batch's quantity moves stock automatically through the trigger.
    if(reloadProducts) await reloadProducts();
    setBusy(false);
    onSaved(data.map(fromDbInv));
    onClose();
  }

  const W = (k,label,node)=> bulk ? <BulkField on={on} setOn={setOn} k={k} label={label}>{node}</BulkField> : node;
  const qtyDelta = (!bulk && f.qty!=='') ? (+f.qty||0) - (+one.qty||0) : 0;

  return (
    <Overlay title={bulk?`Edit ${items.length} Inventory Batches`:`Edit Batch — ${one.name}`} onClose={onClose} width={660}>
      {bulk&&(
        <div style={{background:G.gl,border:`1px solid ${G.g}`,borderRadius:9,padding:11,marginBottom:14,fontSize:11,color:G.tx,lineHeight:1.6}}>
          <b style={{color:G.gd}}>Bulk edit — {items.length} batches selected.</b><br/>
          Tick a field to change it on all of them. Anything left unticked is <b>not touched</b>.
          <div style={{marginTop:4,color:G.mut}}>Changing Qty sets every selected batch to that number, and moves each product's stock to match.</div>
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
        {!bulk&&<FInput label="Product Name" value={f.name} onChange={v=>set('name',v)} req/>}
        {!bulk&&<FInput label="Date Received" value={f.date} onChange={v=>set('date',v)} type="date"/>}
        {W('cat','Category',            <FSel   label={bulk?'':'Category'}            value={f.cat} onChange={v=>set('cat',v)} options={cats}/>)}
        {W('qty','Quantity',            <FInput label={bulk?'':'Quantity'}            value={f.qty} onChange={v=>set('qty',v)} type="number" req={!bulk}/>)}
        {W('exp','Expiry Date',         <FInput label={bulk?'':'Expiry Date'}         value={f.exp} onChange={v=>set('exp',v)} type="date"/>)}
        {W('sp', 'Selling Price (RMB)', <FInput label={bulk?'':'Selling Price (RMB)'} value={f.sp}  onChange={v=>set('sp',v)}  type="number"/>)}
        {W('cp', 'Cost Price (RMB)',    <FInput label={bulk?'':'Cost Price (RMB)'}    value={f.cp}  onChange={v=>set('cp',v)}  type="number"/>)}
        {W('pw', 'Packed Weight (g)',   <FInput label={bulk?'':'Packed Weight (g)'}   value={f.pw}  onChange={v=>set('pw',v)}  type="number"/>)}
        {!bulk&&<FInput label="UPC/Barcode" value={f.upc} onChange={v=>set('upc',v)}/>}
      </div>

      {!bulk&&qtyDelta!==0&&(
        <div style={{background:qtyDelta>0?G.gl:'#FFF3E0',border:`1px solid ${qtyDelta>0?G.g:G.yd}`,borderRadius:8,padding:10,marginBottom:10,fontSize:12,color:G.tx}}>
          Quantity {qtyDelta>0?'up':'down'} by <b>{Math.abs(qtyDelta)}</b> — the stock count for “{f.name}” will change by <b>{qtyDelta>0?'+':''}{qtyDelta}</b> when you save.
        </div>
      )}
      {!bulk&&f.name!==one.name&&(
        <div style={{background:'#FFF3E0',border:`1px solid ${G.yd}`,borderRadius:8,padding:10,marginBottom:10,fontSize:12,color:G.tx}}>
          You've renamed this batch. Its {one.qty} unit(s) will move off “{one.name}” and onto “{f.name}”.
        </div>
      )}

      <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:10}}>
        <Btn v='outline' onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={busy}>{busy?'Saving…':'Save Changes'}</Btn>
      </div>
    </Overlay>
  );
}

function ProdTab({prods,setProds,cats,setCats,catColors,setCatColors,inv,setInv,orders,sales}) {
  const [q,setQ]=useState('');
  const [sel,setSel]=useState([]);
  const [showAdd,setShowAdd]=useState(false);
  const [showCatMgr,setShowCatMgr]=useState(false);
  const [discMode,setDiscMode]=useState(false);
  const [discPct,setDiscPct]=useState(10);
  const [conf,setConf]=useState(null);
  const [delBusy,setDelBusy]=useState(false);
  const [editing,setEditing]=useState(null);   // array of products being edited
  const [np,setNp]=useState({name:'',upc:'',cat:'',unit:'PCS',pw:'',gw:'',sp:'',cp:'',stock:0,disc:0,img:''});
  // products.stock is the single source of truth now. This used to override the
  // displayed stock with the sum of inventory batches, which disagreed with reality
  // as soon as a customer bought something.
  const synced=prods;
  const list=useMemo(()=>{
    let r=synced;
    if(q){const lq=q.toLowerCase();r=r.filter(p=>p.name.toLowerCase().includes(lq)||(p.upc||'').includes(lq));}
    return [...r].sort((a,b)=>{const ca=cats.indexOf(a.cat),cb=cats.indexOf(b.cat); if(ca!==cb) return ca-cb; return a.name.localeCompare(b.name);});
  },[synced,q,cats]);
  const [imgBusy,setImgBusy]=useState(false);
  const [cutBg,setCutBg]=useState(true);
  const [imgNote,setImgNote]=useState('');
  // Product pictures go to Supabase Storage and we keep only the URL. They used to
  // be stored as base64 inside products.image_url, which meant every product fetch
  // dragged the full image bytes across the network.
  // With "remove background" ticked, the plain white backdrop is stripped out first
  // and the empty margin cropped away, so the product sits cleanly on any colour.
  async function handleImg(e){
    const f=e.target.files[0]; if(!f) return;
    setImgBusy(true); setImgNote('');
    try{
      let file=f, note='', transparent=false;
      if(cutBg){
        const res=await removeBackground(f);
        file=res.file;
        transparent=res.removed;
        note=res.removed
          ? 'Background removed. The product will sit cleanly on any colour.'
          : 'No plain backdrop was found, so the photo was uploaded unchanged.';
      }
      file=await optimizeImage(file,{maxDim:1000,quality:0.9,transparent});
      const url=await uploadToBucket('product-images', file);
      setNp(p=>({...p,img:url}));
      setImgNote(note);
    }catch(err){ alert(err.message); }
    finally{ setImgBusy(false); e.target.value=''; }
  }
  async function addProd(){
    if(!np.name||!np.cat||!np.sp||!np.pw||!np.gw){alert('Name, Category, Packed Weight, Gross Weight and Selling Price are required');return;}
    if(!np.img){alert('Please upload a product picture');return;}
    if(imgBusy){alert('Please wait for the image to finish uploading.');return;}
    const draft={...np,pw:+np.pw,gw:+np.gw,sp:+np.sp,cp:+np.cp||0,stock:+np.stock||0,disc:+np.disc||0,offer:+np.disc>0,bs:false,isNew:true};
    // Stock is owned by inventory; a new product starts empty and is raised by
    // adding batches. Force 0 here so the form can't set an out-of-thin-air number.
    const dbProduct = { ...toDbProduct(draft), stock: 0 };
    const { data, error } = await supabase.from('products').insert(dbProduct).select().single();
    if(error){alert('Failed to save product: '+error.message);return;}
    setProds(p=>[...p, fromDbProduct(data)]);
    setNp({name:'',upc:'',cat:'',unit:'PCS',pw:'',gw:'',sp:'',cp:'',stock:0,disc:0,img:''});setShowAdd(false);
  }
  // Work out what deleting the selected products will actually touch, so the
  // confirmation can say so plainly instead of the admin finding out afterwards.
  function deleteImpact(){
    const picked = prods.filter(p=>sel.includes(p.id));
    const names  = picked.map(p=>p.name);
    const hit    = (it)=> (it.pid && sel.includes(it.pid)) || names.includes(it.name);
    const nOrders  = (orders||[]).filter(o=>(o.items||[]).some(hit)).length;
    const nSales   = (sales ||[]).filter(s=>(s.items||[]).some(hit)).length;
    const batches  = (inv   ||[]).filter(i=>names.includes(i.name));
    const units    = batches.reduce((sum,i)=>sum+(+i.qty||0),0);
    return { names, nOrders, nSales, nBatches: batches.length, units };
  }

  async function doDelete(){
    if(delBusy) return;
    setDelBusy(true);
    try{
      // .select() forces the database to report exactly which rows it removed.
      // Without it, a delete that RLS quietly refuses looks like a success: the row
      // would disappear from the screen and come back on the next page refresh.
      const { data, error } = await supabase.from('products').delete().in('id', sel).select();

      if(error){
        // The most common failure is a foreign key: the product is still referenced
        // by an order, a sale, or an inventory batch. Say so in plain English.
        const fk = /foreign key constraint/i.test(error.message||'');
        alert(fk
          ? 'The database would not delete this product because other records still point at it.\n\n'
            + 'Run the "product delete" SQL in Supabase (step 9) — it tells the database to keep your order and sales history while letting the product go.\n\n'
            + 'Details: ' + error.message
          : 'Could not delete:\n\n' + error.message);
        return;
      }

      if(!data || data.length===0){
        alert('The database removed 0 rows.\n\nThat usually means the products table has no DELETE policy for admins.');
        return;
      }

      const goneIds   = data.map(d=>d.id);
      const goneNames = data.map(d=>d.name);
      setProds(p=>p.filter(x=>!goneIds.includes(x.id)));
      // Inventory batches for these products are removed by the database (cascade),
      // so clear them from the screen too rather than leaving ghosts behind.
      if(setInv) setInv(p=>p.filter(i=>!goneNames.includes(i.name)));
      setSel([]); setConf(null);
    } finally { setDelBusy(false); }
  }
  async function applyDisc(){
    const { error } = await supabase.from('products').update({ discount: discPct, on_offer: discPct>0 }).in('id', sel);
    if(error){alert('Failed to apply discount: '+error.message);return;}
    setProds(p=>p.map(x=>sel.includes(x.id)?{...x,disc:discPct,offer:discPct>0}:x));setSel([]);setDiscMode(false);
  }
  async function removeDisc(){
    const { error } = await supabase.from('products').update({ discount: 0, on_offer: false }).in('id', sel);
    if(error){alert('Failed to remove discount: '+error.message);return;}
    setProds(p=>p.map(x=>sel.includes(x.id)?{...x,disc:0,offer:false}:x));setSel([]);setDiscMode(false);
  }
  function tog(id){setSel(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);}
  const allSel = list.length>0 && list.every(p=>sel.includes(p.id));
  function toggleAll(){ setSel(allSel ? [] : list.map(p=>p.id)); }
  return(
    <div>
      {conf&&<ConfirmDlg msg={conf.msg} onYes={conf.yes} onNo={()=>setConf(null)}/>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:19,fontWeight:'bold',color:G.dk}}>📋 Product List</div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <Btn onClick={()=>setShowAdd(true)}>+ Add Product</Btn>
          <Btn v='info' sm onClick={()=>setShowCatMgr(true)}>🎨 Categories</Btn>
          {sel.length>0&&<Btn v='info' sm onClick={()=>setEditing(prods.filter(p=>sel.includes(p.id)))}>✏️ Edit ({sel.length})</Btn>}
          {sel.length>0&&!discMode&&<Btn v='warn' sm onClick={()=>setDiscMode(true)}>% Discount</Btn>}
          {discMode&&sel.length>0&&<><input type="number" value={discPct} onChange={e=>setDiscPct(+e.target.value)} style={{width:55,padding:'4px 6px',borderRadius:5,border:`1px solid ${G.brd}`,fontSize:12}}/><Btn v='warn' sm onClick={applyDisc}>Apply</Btn><Btn v='danger' sm onClick={removeDisc}>Remove</Btn><Btn v='outline' sm onClick={()=>{setDiscMode(false);setSel([]);}}>Cancel</Btn></>}
          {sel.length>0&&<Btn v='danger' sm disabled={delBusy} onClick={()=>{
            const im = deleteImpact();
            let m = `Delete ${sel.length} product(s)?\n\n${im.names.join(', ')}`;
            const notes = [];
            if(im.units>0)    notes.push(`• ${im.units} unit(s) across ${im.nBatches} inventory batch(es) will be deleted with it.`);
            if(im.nOrders>0)  notes.push(`• Appears in ${im.nOrders} customer order(s). That history is KEPT — the name and price stay on the order.`);
            if(im.nSales>0)   notes.push(`• Appears in ${im.nSales} sales record(s). That history is KEPT too.`);
            if(notes.length)  m += '\n\n' + notes.join('\n');
            m += '\n\nThis cannot be undone.';
            setConf({msg:m, yes:doDelete});
          }}>🗑️ Delete ({sel.length})</Btn>}
        </div>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name or UPC/barcode..." style={{flex:1,padding:'9px 12px',borderRadius:8,border:`1px solid ${G.brd}`,fontSize:13}}/>
        {q&&<Btn v='outline' sm onClick={()=>setQ('')}>Clear</Btn>}
      </div>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:950}}>
          <thead><tr style={{background:G.gd,color:G.w}}>
            <th style={{padding:'9px 7px',textAlign:'center'}}><input type="checkbox" checked={allSel} onChange={toggleAll}/></th>
            {['S.No','Picture','Product Name','UPC/Barcode','Category','Unit','Packed (g)','Gross (KG)','Sell (RMB)','Cost (RMB)','Stock','Discount','Edit'].map(h=>(
              <th key={h} style={{padding:'9px 7px',textAlign:'center',whiteSpace:'nowrap'}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{list.map((p,i)=>{const isS=sel.includes(p.id);return(
            <tr key={p.id} style={{background:isS?G.gl:i%2===0?G.w:G.bg,borderBottom:`1px solid ${G.brd}`}}>
              <td style={{padding:'7px',textAlign:'center'}}><input type="checkbox" checked={isS} onChange={()=>tog(p.id)}/></td>
              {/* Running serial number that always follows the current sort/filter,
                  so it stays 1,2,3… even after products are added or deleted.
                  The real database id is kept underneath in grey, since orders and
                  inventory still reference it. */}
              <td style={{padding:'7px',textAlign:'center',fontWeight:'bold'}}>{i+1}<div style={{fontSize:9,color:G.mut,fontWeight:'normal'}}>#{p.id}</div></td>
              <td style={{padding:'7px',textAlign:'center'}}>{p.img?<img src={p.img} alt={p.name} loading="lazy" decoding="async" style={{width:40,height:40,objectFit:'contain',borderRadius:6}}/>:<span style={{fontSize:24}}>{ICONS[p.cat]||'📦'}</span>}</td>
              <td style={{padding:'7px'}}><div style={{fontWeight:'bold'}}>{p.name}</div><div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{p.offer&&<span style={{background:'#FFCDD2',color:'#B71C1C',borderRadius:4,padding:'1px 5px',fontSize:10,fontWeight:'bold'}}>On Offer</span>}{p.slideshow&&<span style={{background:'#D6E9FF',color:'#1565C0',borderRadius:4,padding:'1px 5px',fontSize:10,fontWeight:'bold'}}>🖼️ Slideshow</span>}</div></td>
              <td style={{padding:'7px',textAlign:'center',color:G.mut,fontSize:11}}>{p.upc||'—'}</td>
              <td style={{padding:'7px',textAlign:'center'}}><CatChip cat={p.cat} catColors={catColors}/></td>
              <td style={{padding:'7px',textAlign:'center'}}>{p.unit}</td>
              <td style={{padding:'7px',textAlign:'center'}}>{p.pw}</td>
              <td style={{padding:'7px',textAlign:'center'}}>{p.gw}</td>
              <td style={{padding:'7px',textAlign:'center'}}>{p.offer?<><div style={{textDecoration:'line-through',color:G.mut,fontSize:10}}>¥{p.sp}</div><div style={{color:'#B71C1C',fontWeight:'bold'}}>¥{ep(p).toFixed(2)}</div></>:<span>¥{p.sp}</span>}</td>
              <td style={{padding:'7px',textAlign:'center'}}>{p.cp?`¥${p.cp}`:'—'}</td>
              <td style={{padding:'7px',textAlign:'center'}}><span style={{...stStyle(p.stock),padding:'2px 8px',borderRadius:5,display:'inline-block'}}>{p.stock}</span></td>
              <td style={{padding:'7px',textAlign:'center'}}>{p.disc>0?<span style={{color:'#B71C1C',fontWeight:'bold'}}>{p.disc}%</span>:'—'}</td>
              <td style={{padding:'7px',textAlign:'center'}}><button onClick={()=>setEditing([p])} title={`Edit ${p.name}`} style={{background:'none',border:'none',cursor:'pointer',fontSize:15,lineHeight:1}}>✏️</button></td>
            </tr>
          );})}</tbody>
        </table>
        {list.length===0&&<div style={{textAlign:'center',padding:40,color:G.mut}}>No products found</div>}
      </div>
      {showAdd&&(
        <Overlay title="Add New Product" onClose={()=>setShowAdd(false)} width={640}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <FInput label="Product Name *" value={np.name} onChange={v=>setNp(p=>({...p,name:v}))} req/>
            <FInput label="UPC/Barcode" value={np.upc} onChange={v=>setNp(p=>({...p,upc:v}))}/>
            <FSel label="Category *" value={np.cat} onChange={v=>setNp(p=>({...p,cat:v}))} options={cats}/>
            <FSel label="Unit *" value={np.unit} onChange={v=>setNp(p=>({...p,unit:v}))} options={['PCS','KG','BOX','BOTTLE','PACK']}/>
            <FInput label="Packed Weight (g) *" value={np.pw} onChange={v=>setNp(p=>({...p,pw:v}))} type="number" req/>
            <FInput label="Gross Weight (KG) *" value={np.gw} onChange={v=>setNp(p=>({...p,gw:v}))} type="number" req/>
            <FInput label="Selling Price (RMB) *" value={np.sp} onChange={v=>setNp(p=>({...p,sp:v}))} type="number" req/>
            <FInput label="Cost Price (RMB)" value={np.cp} onChange={v=>setNp(p=>({...p,cp:v}))} type="number"/>
            <StockReadout value={0} note="New products start at 0. Add an inventory batch to set the stock."/>
            <FInput label="Discount (%)" value={np.disc} onChange={v=>setNp(p=>({...p,disc:v}))} type="number"/>
          </div>
          <div style={{marginTop:6,marginBottom:6}}>
            <div style={{fontSize:11,fontWeight:'600',marginBottom:5}}>Product Picture <span style={{color:'#B71C1C'}}>*</span> <span style={{color:G.mut,fontWeight:'normal'}}>(required)</span></div>
            <input type="file" accept="image/*" onChange={handleImg} disabled={imgBusy} style={{fontSize:12}}/>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:G.tx,marginTop:7,cursor:imgBusy?'not-allowed':'pointer'}}>
              <input type="checkbox" checked={cutBg} disabled={imgBusy} onChange={e=>setCutBg(e.target.checked)}/>
              <span>Remove the plain background <span style={{color:G.mut}}>(best for products shot on white)</span></span>
            </label>
            {imgBusy&&<div style={{fontSize:11,color:G.bd,marginTop:6,fontWeight:'bold'}}>⏳ Processing and uploading…</div>}
            {imgNote&&!imgBusy&&<div style={{fontSize:11,color:G.gd,marginTop:6}}>{imgNote}</div>}
            {np.img&&!imgBusy&&<div style={{marginTop:8,width:96,height:96,borderRadius:8,border:`1px solid ${G.brd}`,...CHECKER,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}><img src={np.img} alt="Product preview" style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/></div>}
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:14}}><Btn v='outline' onClick={()=>setShowAdd(false)}>Cancel</Btn><Btn onClick={addProd}>Save Product</Btn></div>
        </Overlay>
      )}
      {editing&&<ProdEditOverlay items={editing} cats={cats} onClose={()=>setEditing(null)}
        onSaved={updated=>{ setProds(p=>p.map(x=>{const u=updated.find(y=>y.id===x.id); return u?{...x,...u}:x;})); setSel([]); }}/>}
      {showCatMgr&&<CatManageOverlay cats={cats} setCats={setCats} catColors={catColors} setCatColors={setCatColors} prods={prods} onClose={()=>setShowCatMgr(false)}/>}
    </div>
  );
}

function InvTab({inv,setInv,prods,setProds,cats,catColors,delInv,setDelInv,reloadProducts}) {
  const [q,setQ]=useState('');
  const [sel,setSel]=useState([]);
  const [showAdd,setShowAdd]=useState(false);
  const [srch,setSrch]=useState('');
  const [conf,setConf]=useState(null);
  const [editing,setEditing]=useState(null);   // array of batches being edited
  const [ni,setNi]=useState({name:'',cat:'',qty:'',exp:'',sp:'',cp:'',pw:'',upc:''});
  const baseList=useMemo(()=>{
    let r=inv;
    if(q){const lq=q.toLowerCase(); r=r.filter(i=>i.name.toLowerCase().includes(lq)||(i.upc||'').includes(lq));}
    return [...r].sort((a,b)=>{
      const ca=cats.indexOf(a.cat),cb=cats.indexOf(b.cat);
      if(ca!==cb) return ca-cb;
      if(a.name!==b.name) return a.name.localeCompare(b.name);
      return new Date(a.exp)-new Date(b.exp);
    });
  },[inv,q,cats]);
  const matching=useMemo(()=>{if(!srch)return[];return prods.filter(p=>p.name.toLowerCase().includes(srch.toLowerCase())||(p.upc||'').includes(srch)).slice(0,8);},[srch,prods]);
  function selProd(p){setNi({name:p.name,cat:p.cat,qty:'',exp:'',sp:p.sp,cp:p.cp||'',pw:p.pw,upc:p.upc||''});setSrch('');}   // clear srch so the dropdown closes
  async function addItem(){
    if(!ni.name||!ni.qty||!ni.exp){alert('Product, quantity and expiry date required');return;}
    const draft={date:bjDate(),ts:bjTime(),...ni,qty:+ni.qty,sp:+ni.sp,cp:+ni.cp,pw:+ni.pw};
    const matchedProd=findProductForBatch(prods, draft);
    const { data, error } = await supabase.from('inventory').insert(toDbInv(draft, matchedProd?.id)).select().single();
    if(error){alert('Failed to save inventory item: '+error.message);return;}
    const item=fromDbInv(data);
    setInv(p=>[...p,item]);
    // The database trigger has already recomputed products.stock from the batches.
    // Re-pull products so the Product List shows the new total.
    if(reloadProducts) await reloadProducts();
    setNi({name:'',cat:'',qty:'',exp:'',sp:'',cp:'',pw:'',upc:''});setSrch('');setShowAdd(false);
  }
  // ----- Fix 5: restore or permanently delete archived items -----
  const [archSel,setArchSel]=useState([]);
  const [archBusy,setArchBusy]=useState(false);
  function toggleArch(id){setArchSel(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);}

  // Puts archived rows back into `inventory` and recalculates the product's stock.
  async function restoreArchived(){
    if(archSel.length===0) return;
    if(!window.confirm(`Restore ${archSel.length} item(s) back into inventory?`)) return;
    setArchBusy(true);
    try{
      const rows=delInv.filter(d=>archSel.includes(d.archiveId));
      const toInsert=rows.map(d=>{
        const prod=findProductForBatch(prods, d);
        return {
          product_id: prod?prod.id:null, date: d.date, time: d.time, name: d.name,
          category: d.cat, qty: d.qty, expiry_date: d.exp || null,
          selling_price: d.sp, cost_price: d.cp, pack_weight: d.pw, upc: d.upc || null,
        };
      });
      const { data: newRows, error: insErr } = await supabase.from('inventory').insert(toInsert).select();
      if(insErr){alert('Failed to restore: '+insErr.message);return;}
      const restored=(newRows||[]).map(fromDbInv);
      setInv([...inv,...restored]);

      // Stock recomputes itself from the restored batches via the trigger.
      if(reloadProducts) await reloadProducts();

      const { error: delErr } = await supabase.from('inventory_archive').delete().in('id', archSel);
      if(delErr) console.error('Archive cleanup failed:', delErr.message);
      setDelInv(p=>p.filter(d=>!archSel.includes(d.archiveId)));
      setArchSel([]);
    } finally { setArchBusy(false); }
  }

  // Permanently deletes archived rows. There is no undo.
  async function purgeArchived(){
    if(archSel.length===0) return;
    if(!window.confirm(`Permanently delete ${archSel.length} item(s)? This CANNOT be undone.`)) return;
    setArchBusy(true);
    try{
      const { error } = await supabase.from('inventory_archive').delete().in('id', archSel);
      if(error){alert('Failed to delete: '+error.message);return;}
      setDelInv(p=>p.filter(d=>!archSel.includes(d.archiveId)));
      setArchSel([]);
    } finally { setArchBusy(false); }
  }

  async function doRemove(){
    const toRm=inv.filter(i=>sel.includes(i.id));
    const archived=toRm.map(x=>({...x,deletedAt:`${bjDate()} ${bjTime()}`}));
    // .select() so we get back the archive row IDs — we need them to restore/purge later
    const { data: archRows, error: archErr } = await supabase
      .from('inventory_archive').insert(archived.map(a=>({original_data:a}))).select();
    if(archErr){alert('Failed to archive removed items: '+archErr.message);return;}
    const { error: delErr } = await supabase.from('inventory').delete().in('id', sel);
    if(delErr){alert('Failed to remove: '+delErr.message);return;}
    const withIds=(archRows||[]).map(r=>({...r.original_data, archiveId:r.id}));
    setDelInv(p=>[...withIds,...p]);
    setInv(p=>p.filter(i=>!sel.includes(i.id)));
    // Removing batches lowers stock automatically through the trigger.
    if(reloadProducts) await reloadProducts();
    setSel([]);setConf(null);
  }
  function tog(id){setSel(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);}
  const allSel = baseList.length>0 && baseList.every(i=>sel.includes(i.id));
  function toggleAll(){ setSel(allSel ? [] : baseList.map(i=>i.id)); }
  return(
    <div>
      {conf&&<ConfirmDlg msg={conf.msg} onYes={conf.yes} onNo={()=>setConf(null)}/>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:19,fontWeight:'bold',color:G.dk}}>🏭 Inventory</div>
        <div style={{display:'flex',gap:6}}><Btn onClick={()=>setShowAdd(true)}>+ Add Items</Btn>{sel.length>0&&<Btn v='info' onClick={()=>setEditing(inv.filter(i=>sel.includes(i.id)))}>✏️ Edit ({sel.length})</Btn>}{sel.length>0&&<Btn v='danger' onClick={()=>setConf({msg:`Remove ${sel.length} item(s) from inventory?`,yes:doRemove})}>Remove ({sel.length})</Btn>}</div>
      </div>
      <div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap',fontSize:11,alignItems:'center'}}>
        {[{c:'#FFCDD2',l:'Expired'},{c:'#BBDEFB',l:'<3 months'},{c:'#FFF9C4',l:'<6 months'},{c:'#C8E6C9',l:'>1 year'}].map(k=>(
          <div key={k.l} style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:12,height:12,background:k.c,borderRadius:2}}/><span style={{color:G.tx}}>{k.l}</span></div>
        ))}
        <div style={{color:G.mut,fontSize:11,marginLeft:'auto'}}>Sorted by category priority</div>
      </div>
      <div style={{marginBottom:14}}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name or UPC..." style={{width:'100%',padding:'9px 12px',borderRadius:8,border:`1px solid ${G.brd}`,fontSize:13,boxSizing:'border-box'}}/></div>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:850}}>
          <thead><tr style={{background:G.gd,color:G.w}}>
            <th style={{padding:'9px 7px',textAlign:'center'}}><input type="checkbox" checked={allSel} onChange={toggleAll}/></th>
            {['SI.','Date','Time','Product Name','Category','Qty','Expiry Date','Sell','Cost','Packed (g)','UPC','Edit'].map(h=>(
              <th key={h} style={{padding:'9px 7px',textAlign:'center',whiteSpace:'nowrap'}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{baseList.map((item,i)=>{const es=expStyle(item.exp);return(
            <tr key={item.id} style={{...es,borderBottom:`1px solid ${G.brd}`}}>
              <td style={{padding:'7px',textAlign:'center'}}><input type="checkbox" checked={sel.includes(item.id)} onChange={()=>tog(item.id)}/></td>
              <td style={{padding:'7px',textAlign:'center',fontWeight:'bold'}}>{i+1}</td>
              <td style={{padding:'7px'}}>{item.date}</td>
              <td style={{padding:'7px',fontSize:10,color:G.mut}}>{item.ts}</td>
              <td style={{padding:'7px',fontWeight:'bold'}}>{item.name}</td>
              <td style={{padding:'7px',textAlign:'center'}}><CatChip cat={item.cat} catColors={catColors}/></td>
              <td style={{padding:'7px',textAlign:'center',fontWeight:'bold'}}>{item.qty}</td>
              <td style={{padding:'7px',textAlign:'center',fontWeight:'bold',fontSize:11}}>{ddmmyyyy(item.exp)}</td>
              <td style={{padding:'7px',textAlign:'center'}}>¥{item.sp}</td>
              <td style={{padding:'7px',textAlign:'center'}}>{item.cp?`¥${item.cp}`:'—'}</td>
              <td style={{padding:'7px',textAlign:'center'}}>{item.pw}</td>
              <td style={{padding:'7px',textAlign:'center',fontSize:10,color:G.mut}}>{item.upc||'—'}</td>
              <td style={{padding:'7px',textAlign:'center'}}><button onClick={()=>setEditing([item])} title={`Edit this batch of ${item.name}`} style={{background:'none',border:'none',cursor:'pointer',fontSize:15,lineHeight:1}}>✏️</button></td>
            </tr>
          );})}</tbody>
        </table>
        {baseList.length===0&&<div style={{textAlign:'center',padding:40,color:G.mut}}>No inventory items</div>}
      </div>
      {delInv.length>0&&(
        <Card style={{marginTop:22}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,flexWrap:'wrap',gap:8}}>
            <div style={{fontWeight:'bold',fontSize:14,color:'#B71C1C'}}>🗑 Deleted Items (Archive) · {delInv.length}</div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              {archSel.length>0&&<span style={{fontSize:11,color:G.mut}}>{archSel.length} selected</span>}
              <Btn sm v='success' disabled={archSel.length===0||archBusy} onClick={restoreArchived}>↩️ Restore to Inventory</Btn>
              <Btn sm v='danger' disabled={archSel.length===0||archBusy} onClick={purgeArchived}>🔥 Delete Forever</Btn>
            </div>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:640}}>
              <thead><tr style={{background:'#FFEBEE'}}>
                <th style={{padding:'7px',textAlign:'center',width:34}}>
                  <input type="checkbox"
                    checked={archSel.length===delInv.length&&delInv.length>0}
                    onChange={e=>setArchSel(e.target.checked?delInv.map(d=>d.archiveId).filter(Boolean):[])}/>
                </th>
                {['Product Name','Category','Qty','Expiry Date','UPC','Deleted At'].map(h=><th key={h} style={{padding:'7px',textAlign:'center'}}>{h}</th>)}
              </tr></thead>
              <tbody>{delInv.map((d,i)=>{
                const isSel=archSel.includes(d.archiveId);
                return(
                <tr key={d.archiveId||i} style={{borderBottom:`1px solid ${G.brd}`,opacity:isSel?1:0.8,background:isSel?G.gl:'transparent'}}>
                  <td style={{padding:'6px',textAlign:'center'}}>
                    <input type="checkbox" disabled={!d.archiveId} checked={isSel} onChange={()=>toggleArch(d.archiveId)}/>
                  </td>
                  <td style={{padding:'6px',textAlign:'center'}}>{d.name}</td>
                  <td style={{padding:'6px',textAlign:'center'}}><CatChip cat={d.cat} catColors={catColors}/></td>
                  <td style={{padding:'6px',textAlign:'center'}}>{d.qty}</td>
                  <td style={{padding:'6px',textAlign:'center'}}>{d.exp}</td>
                  <td style={{padding:'6px',textAlign:'center',color:G.mut}}>{d.upc||'—'}</td>
                  <td style={{padding:'6px',textAlign:'center',color:G.mut}}>{d.deletedAt}</td>
                </tr>
              );})}</tbody>
            </table>
          </div>
          <div style={{fontSize:10,color:G.mut,marginTop:8}}>Restoring puts the batch back into inventory and adds its quantity to the product's stock. Deleting forever cannot be undone.</div>
        </Card>
      )}
      {editing&&<InvEditOverlay items={editing} cats={cats} prods={prods} setProds={setProds} reloadProducts={reloadProducts} onClose={()=>setEditing(null)}
        onSaved={updated=>{ setInv(p=>p.map(x=>{const u=updated.find(y=>y.id===x.id); return u||x;})); setSel([]); }}/>}
      {showAdd&&(
        <Overlay title="Add Inventory Item" onClose={()=>setShowAdd(false)} width={520}>
          {/* Once a product is picked the search box disappears — you only see the
              chosen product, with a Change button to search again. This stops the
              dropdown lingering over the form after a selection. */}
          {!ni.name ? (
            <div style={{position:'relative',marginBottom:14}}>
              <div style={{fontSize:11,color:G.tx,marginBottom:3,fontWeight:'600'}}>Search Product (name or UPC)</div>
              <input autoFocus value={srch} onChange={e=>setSrch(e.target.value)} placeholder="Type to search..." style={{width:'100%',padding:'8px 11px',borderRadius:7,border:`1px solid ${G.brd}`,fontSize:13,boxSizing:'border-box'}}/>
              {matching.length>0&&(
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:G.w,border:`1px solid ${G.brd}`,borderRadius:8,boxShadow:'0 4px 12px rgba(0,0,0,0.12)',zIndex:100,maxHeight:200,overflow:'auto'}}>
                  {matching.map(p=>(
                    <div key={p.id} onClick={()=>selProd(p)} style={{padding:'9px 12px',cursor:'pointer',fontSize:12,borderBottom:`1px solid ${G.bg}`}}>
                      <div style={{fontWeight:'bold'}}>{p.name}</div>
                      <div style={{color:G.mut,fontSize:11}}>{p.cat} · {p.pw}g{p.upc?' · '+p.upc:''}</div>
                    </div>
                  ))}
                </div>
              )}
              {srch&&matching.length===0&&<div style={{fontSize:11,color:G.mut,marginTop:5}}>No product matches “{srch}”.</div>}
            </div>
          ) : (
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:G.gl,borderRadius:8,padding:'10px 12px',marginBottom:14,gap:10}}>
              <div>
                <div style={{fontWeight:'bold',color:G.gd,fontSize:13}}>{ni.name}</div>
                <div style={{color:G.tx,fontSize:11}}>{ni.cat} · {ni.pw}g{ni.upc?' · '+ni.upc:''}</div>
              </div>
              <Btn sm v='outline' onClick={()=>{setNi({name:'',cat:'',qty:'',exp:'',sp:'',cp:'',pw:'',upc:''});setSrch('');}}>Change</Btn>
            </div>
          )}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <FInput label="Quantity (PCS) *" value={ni.qty} onChange={v=>setNi(p=>({...p,qty:v}))} type="number" req/>
            <div><FInput label="Expiry Date *" value={ni.exp} onChange={v=>setNi(p=>({...p,exp:v}))} type="date" req/>{ni.exp&&<div style={{fontSize:10,color:G.gd,marginTop:-6,marginBottom:8}}>📅 {ddmmyyyy(ni.exp)}</div>}</div>
            <FInput label="Selling Price (RMB)" value={ni.sp} onChange={v=>setNi(p=>({...p,sp:v}))} type="number"/>
            <FInput label="Cost Price (RMB)" value={ni.cp} onChange={v=>setNi(p=>({...p,cp:v}))} type="number"/>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:14}}><Btn v='outline' onClick={()=>setShowAdd(false)}>Cancel</Btn><Btn onClick={addItem}>Add to Inventory</Btn></div>
        </Overlay>
      )}
    </div>
  );
}

function PITab({prods,pos,setPOs,catColors}) {
  function blankPIItem(){return {name:'',qty:'',pw:'',uc:'',cat:'',gw:'',us:'',exp:'',sp:'',upc:'',tc:'',ts2:'',ppc:''};}
  const [hdr,setHdr]=useState({cr:'',sr:'',bdc:'',cnc:''});
  const [vendor,setVendor]=useState('');
  const [items,setItems]=useState([blankPIItem()]);
  const [curId,setCurId]=useState(null);
  const poNum=curId?(pos.find(p=>p.id===curId)?.poNum||1):(pos.length>0?Math.max(...pos.map(p=>p.poNum))+1:1);

  function recalc(u){
    const qty=+(u.qty||0),uc=+(u.uc||0),us=+(u.us||0),gw=+(u.gw||0);
    u.tc=(qty*uc).toFixed(2); u.ts2=(us*gw*qty).toFixed(2);
    u.ppc = (qty>0 && +hdr.cr>0) ? ((+u.tc+(+u.ts2))/qty/+hdr.cr).toFixed(2) : '';
    return u;
  }
  function updItem(idx,f,v){
    setItems(prev=>prev.map((it,i)=>{
      if(i!==idx) return it;
      let u={...it,[f]:v};
      if(f==='name'&&v===''){u.pw='';u.cat='';u.gw='';u.upc='';}
      return recalc(u);
    }));
  }
  function selectItem(idx,p){
    setItems(prev=>{
      const next = prev.map((it,i)=> i!==idx ? it : recalc({...it,name:p.name,pw:p.pw,cat:p.cat,gw:p.gw,upc:p.upc||''}));
      return idx===prev.length-1 ? [...next, blankPIItem()] : next;
    });
  }
  const totQty=items.reduce((s,i)=>s+(+i.qty||0),0);
  const totC=items.reduce((s,i)=>s+(+i.tc||0),0);
  const totS=items.reduce((s,i)=>s+(+i.ts2||0),0);
  const chnLC=(+hdr.cnc)*(+hdr.sr)||0;
  const grand=totC+totS+(+hdr.bdc||0)+chnLC;

  async function save(){
    const fi=items.filter(i=>i.name&&i.qty);if(!fi.length){alert('Add at least one product');return;}
    const existing = curId ? pos.find(p=>p.id===curId) : null;
    const draft={poNum,date:existing?existing.date:bjDate(),time:existing?existing.time:bjTime(),vendor,hdr:{...hdr},items:fi,totQty,totC,totS,bdLC:+hdr.bdc||0,chnLC,grand};
    if(curId){
      const { error } = await supabase.from('purchase_orders').update(toDbPO(draft)).eq('id',curId);
      if(error){alert('Failed to save purchase order: '+error.message);return;}
      setPOs(p=>p.map(x=>x.id===curId?{...draft,id:curId}:x));
    } else {
      const { data, error } = await supabase.from('purchase_orders').insert(toDbPO(draft)).select().single();
      if(error){alert('Failed to save purchase order: '+error.message);return;}
      const saved=fromDbPO(data);
      setPOs(p=>[...p,saved]); setCurId(saved.id);
    }
    alert('Purchase order saved!');
  }
  function newOrd(){setHdr({cr:'',sr:'',bdc:'',cnc:''});setVendor('');setItems([blankPIItem()]);setCurId(null);}
  async function deleteOrder(){
    if(!curId){alert('Load or save an order first, or click Load on one below to delete it.');return;}
    const { error } = await supabase.from('purchase_orders').delete().eq('id',curId);
    if(error){alert('Failed to delete: '+error.message);return;}
    const remaining=pos.filter(p=>p.id!==curId).sort((a,b)=>a.poNum-b.poNum).map((p,i)=>({...p,poNum:i+1}));
    await Promise.all(remaining.map(p=>supabase.from('purchase_orders').update({po_num:p.poNum}).eq('id',p.id)));
    setPOs(remaining);
    newOrd();
  }
  function printOrder(){
    const html=buildPOHTML({poNum,date:bjDate(),time:bjTime(),vendor,hdr,items:items.filter(i=>i.name&&i.qty),totQty,totC,totS,bdLC:+hdr.bdc||0,chnLC,grand});
    openPrintWindow(html);
  }
  function loadPO(po){
    setCurId(po.id); setVendor(po.vendor||''); setHdr(po.hdr||{cr:'',sr:'',bdc:'',cnc:''});
    setItems([...(po.items||[]).map(it=>({...it})), blankPIItem()]);
  }

  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:19,fontWeight:'bold',color:G.dk}}>🧾 Purchase Invoice</div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <Btn onClick={newOrd}>+ New</Btn>
          <Btn v='info' onClick={save}>💾 Save</Btn>
          <Btn v='outline' onClick={printOrder}>🖨️ Print PDF</Btn>
          <Btn v='danger' onClick={deleteOrder}>🗑️ Delete</Btn>
        </div>
      </div>
      <Card style={{marginBottom:14}}>
        <div style={{fontSize:12,color:G.mut,marginBottom:10,fontWeight:'bold'}}>PO# {poNum} · Date: {bjDate()} · Time: {bjTime()}</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))',gap:10}}>
          <FInput label="Vendor" value={vendor} onChange={setVendor}/>
          <FInput label="Costing RMB Rate" value={hdr.cr} onChange={v=>setHdr(p=>({...p,cr:v}))} type="number"/>
          <FInput label="Selling RMB Rate" value={hdr.sr} onChange={v=>setHdr(p=>({...p,sr:v}))} type="number"/>
          <FInput label="BD Courier (BDT)" value={hdr.bdc} onChange={v=>setHdr(p=>({...p,bdc:v}))} type="number"/>
          <FInput label="China Courier (RMB)" value={hdr.cnc} onChange={v=>setHdr(p=>({...p,cnc:v}))} type="number"/>
        </div>
      </Card>
      <Card style={{marginBottom:14,overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:1050}}>
          <thead><tr style={{background:G.gd,color:G.w}}>
            {['Product Name','Qty','Packed(g)','Unit Cost(BDT)','Total Cost(BDT)','Category','Gross(KG)','Unit Ship(BDT)','Total Ship(BDT)','Expiry','Per Pkt(RMB)','Set Price(RMB)','UPC','✕'].map(h=>(
              <th key={h} style={{padding:'7px 5px',textAlign:'center',whiteSpace:'nowrap'}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{items.map((it,idx)=>(
            <tr key={idx} style={{background:idx%2===0?G.w:G.bg,borderBottom:`1px solid ${G.brd}`}}>
              <td style={{padding:'5px',minWidth:155}}><ComboInput value={it.name} onChange={v=>updItem(idx,'name',v)} onPick={p=>selectItem(idx,p)} options={prods} placeholder="Type to search product..."/></td>
              <td style={{padding:'5px'}}><input type="number" value={it.qty} onChange={e=>updItem(idx,'qty',e.target.value)} style={{width:50,padding:'4px',borderRadius:4,border:`1px solid ${G.brd}`,fontSize:11,textAlign:'center'}}/></td>
              <td style={{padding:'5px',textAlign:'center'}}>{it.pw||'—'}</td>
              <td style={{padding:'5px'}}><input type="number" value={it.uc} onChange={e=>updItem(idx,'uc',e.target.value)} style={{width:65,padding:'4px',borderRadius:4,border:`1px solid ${G.brd}`,fontSize:11}}/></td>
              <td style={{padding:'5px',textAlign:'center',fontWeight:'bold'}}>{it.tc||0}</td>
              <td style={{padding:'5px',textAlign:'center'}}>{it.cat?<CatChip cat={it.cat} catColors={catColors}/>:<span style={{fontSize:10,color:G.mut}}>—</span>}</td>
              <td style={{padding:'5px',textAlign:'center'}}>{it.gw}</td>
              <td style={{padding:'5px'}}><input type="number" value={it.us} onChange={e=>updItem(idx,'us',e.target.value)} style={{width:65,padding:'4px',borderRadius:4,border:`1px solid ${G.brd}`,fontSize:11}}/></td>
              <td style={{padding:'5px',textAlign:'center',fontWeight:'bold'}}>{it.ts2||0}</td>
              <td style={{padding:'5px'}}><input type="date" value={it.exp} onChange={e=>updItem(idx,'exp',e.target.value)} style={{padding:'3px',borderRadius:4,border:`1px solid ${G.brd}`,fontSize:10}}/></td>
              <td style={{padding:'5px',textAlign:'center',color:G.gd,fontWeight:'bold'}}>{it.ppc?`¥${it.ppc}`:'—'}</td>
              <td style={{padding:'5px'}}><input type="number" value={it.sp} onChange={e=>updItem(idx,'sp',e.target.value)} style={{width:60,padding:'4px',borderRadius:4,border:`1px solid ${G.brd}`,fontSize:11}}/></td>
              <td style={{padding:'5px',textAlign:'center',fontSize:10}}>{it.upc}</td>
              <td style={{padding:'5px',textAlign:'center'}}>{items.length>1&&<button onClick={()=>setItems(p=>p.filter((_,j)=>j!==idx))} style={{background:'none',border:'none',cursor:'pointer',color:'#B71C1C',fontSize:14}}>✕</button>}</td>
            </tr>
          ))}</tbody>
        </table>
        <div style={{marginTop:10}}><Btn sm onClick={()=>setItems(p=>[...p,blankPIItem()])}>+ Add Row</Btn></div>
        <div style={{background:G.bg,borderRadius:8,padding:12,marginTop:14,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:8,fontSize:12}}>
          <div><strong>Total Qty:</strong> {totQty} PCS</div><div><strong>Total Cost:</strong> ৳{totC.toFixed(2)}</div>
          <div><strong>Total Shipping:</strong> ৳{totS.toFixed(2)}</div><div><strong>BD Courier:</strong> ৳{(+hdr.bdc||0).toFixed(2)}</div>
          <div><strong>China Courier:</strong> ৳{chnLC.toFixed(2)}</div>
          <div style={{fontWeight:'bold',color:G.gd,fontSize:14}}><strong>Grand Total:</strong> ৳{grand.toFixed(2)}</div>
        </div>
      </Card>
      {pos.length>0&&(
        <Card>
          <div style={{fontWeight:'bold',fontSize:13,marginBottom:10}}>Recent Purchase Orders</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{background:G.gl}}><th style={{padding:'7px',textAlign:'left'}}>PO#</th><th style={{padding:'7px'}}>Date</th><th style={{padding:'7px'}}>Vendor</th><th style={{padding:'7px',textAlign:'center'}}>Grand Total</th><th style={{padding:'7px',textAlign:'center'}}>Action</th></tr></thead>
            <tbody>{[...pos].sort((a,b)=>b.poNum-a.poNum).map(po=>(
              <tr key={po.id} style={{borderBottom:`1px solid ${G.brd}`,background:curId===po.id?G.gl:'transparent'}}>
                <td style={{padding:'7px',fontWeight:'bold'}}>{po.poNum}</td><td style={{padding:'7px'}}>{po.date}</td><td style={{padding:'7px'}}>{po.vendor||'—'}</td>
                <td style={{padding:'7px',textAlign:'center',fontWeight:'bold'}}>৳{po.grand?.toFixed(2)}</td>
                <td style={{padding:'7px',textAlign:'center'}}><Btn sm onClick={()=>loadPO(po)}>Load</Btn></td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function PLTab({pos,setPOs,inv,setInv,catColors}) {
  const [sel,setSel]=useState([]);
  async function moveToInv(){
    const toMv=[];
    pos.forEach(po=>po.items.forEach((it,ii)=>{
      const key=`${po.id}_${ii}`;
      if(sel.includes(key) && !it.moved) toMv.push({...it,_poId:po.id,_idx:ii});
    }));
    if(!toMv.length){setSel([]);return;}
    const draftItems=toMv.map(it=>({date:bjDate(),ts:bjTime(),name:it.name,cat:it.cat||'',qty:+it.qty||0,exp:it.exp||'',sp:+it.sp||0,cp:+it.ppc||0,pw:+it.pw||0,upc:it.upc||''}));
    const { data, error } = await supabase.from('inventory').insert(draftItems.map(d=>toDbInv(d,null))).select();
    if(error){alert('Failed to move to inventory: '+error.message);return;}
    const news=data.map(fromDbInv);
    setInv(p=>[...p,...news]);
    const updatedPOs=pos.map(po=>({...po,items:po.items.map((it,ii)=>sel.includes(`${po.id}_${ii}`)?{...it,moved:true}:it)}));
    const affectedPOs=updatedPOs.filter(po=>po.items.some((it,ii)=>sel.includes(`${po.id}_${ii}`)));
    await Promise.all(affectedPOs.map(po=>supabase.from('purchase_orders').update({items:po.items}).eq('id',po.id)));
    setPOs(updatedPOs);
    alert(`${news.length} items moved to Inventory!`);setSel([]);
  }
  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:19,fontWeight:'bold',color:G.dk}}>📜 Purchase List</div>
        {sel.length>0&&<Btn onClick={moveToInv}>📦 Move to Inventory ({sel.length})</Btn>}
      </div>
      {pos.length===0?<Card><div style={{textAlign:'center',padding:40,color:G.mut}}>No purchase orders yet. Create one in Purchase Invoice.</div></Card>:
        [...pos].sort((a,b)=>b.poNum-a.poNum).map(po=>{
          const selectableKeys = po.items.map((it,i)=>!it.moved?`${po.id}_${i}`:null).filter(Boolean);
          const allSelHere = selectableKeys.length>0 && selectableKeys.every(k=>sel.includes(k));
          function toggleAllHere(){
            if(allSelHere) setSel(p=>p.filter(x=>!selectableKeys.includes(x)));
            else setSel(p=>[...new Set([...p,...selectableKeys])]);
          }
          return(
          <Card key={po.id} style={{marginBottom:18}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(135px,1fr))',gap:10,background:G.gl,borderRadius:9,padding:'11px 15px',marginBottom:12}}>
              {[['PO#',po.poNum],['Vendor',po.vendor||'—'],['Grand Total(BDT)',`৳${(po.grand||0).toFixed(2)}`],['Total Cost(BDT)',`৳${(po.totC||0).toFixed(2)}`],['Total Ship(BDT)',`৳${(po.totS||0).toFixed(2)}`],['BD Local Courier(BDT)',`৳${(po.bdLC||0).toFixed(2)}`],['China Local Courier(BDT)',`৳${(po.chnLC||0).toFixed(2)}`],['Costing RMB Rate',po.hdr?.cr||'—'],['Selling RMB Rate',po.hdr?.sr||'—'],['BD Courier(BDT)',po.hdr?.bdc||'—'],['China Courier(RMB)',po.hdr?.cnc||'—']].map(([l,v])=>(
                <div key={l}><div style={{fontSize:10,color:G.mut,fontWeight:'bold'}}>{l}</div><div style={{fontSize:12,fontWeight:'bold',color:G.dk}}>{v}</div></div>
              ))}
            </div>
            <div style={{fontSize:11,color:G.mut,marginBottom:8}}>{po.date} · {po.time}</div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:760}}>
                <thead><tr style={{background:G.gd,color:G.w}}>
                  <th style={{padding:'7px 5px',textAlign:'center'}}>{selectableKeys.length>0?<input type="checkbox" checked={allSelHere} onChange={toggleAllHere}/>:'✓'}</th>
                  {['SI.','Product Name','Category','Packed(g)','Qty','Gross(KG)','Unit Ship','Total Ship','Expiry','Per Pkt(RMB)','Set Price','UPC'].map(h=>(
                    <th key={h} style={{padding:'7px 5px',textAlign:'center',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{po.items.map((it,i)=>{const key=`${po.id}_${i}`;return(
                  <tr key={key} style={{background:it.moved?'#F1F8F2':i%2===0?G.w:G.bg,borderBottom:`1px solid ${G.brd}`}}>
                    <td style={{padding:'6px',textAlign:'center'}}>{it.moved
                      ?<span title="Already moved to Inventory" style={{color:G.gm,fontSize:15}}>✅</span>
                      :<input type="checkbox" checked={sel.includes(key)} onChange={()=>setSel(p=>p.includes(key)?p.filter(x=>x!==key):[...p,key])}/>
                    }</td>
                    <td style={{padding:'6px',textAlign:'center'}}>{i+1}</td>
                    <td style={{padding:'6px',fontWeight:'bold'}}>{it.name}{it.moved&&<span style={{marginLeft:6,background:G.gl,color:G.gd,borderRadius:4,padding:'1px 6px',fontSize:9,fontWeight:'bold',whiteSpace:'nowrap'}}>✓ IN INVENTORY</span>}</td>
                    <td style={{padding:'6px',textAlign:'center'}}>{it.cat?<CatChip cat={it.cat} catColors={catColors}/>:'—'}</td>
                    <td style={{padding:'6px',textAlign:'center'}}>{it.pw}</td>
                    <td style={{padding:'6px',textAlign:'center'}}>{it.qty}</td>
                    <td style={{padding:'6px',textAlign:'center'}}>{it.gw}</td>
                    <td style={{padding:'6px',textAlign:'center'}}>{it.us}</td>
                    <td style={{padding:'6px',textAlign:'center'}}>{it.ts2}</td>
                    <td style={{padding:'6px',textAlign:'center',...expStyle(it.exp)}}>{it.exp}</td>
                    <td style={{padding:'6px',textAlign:'center',color:G.gd,fontWeight:'bold'}}>{it.ppc?`¥${it.ppc}`:'—'}</td>
                    <td style={{padding:'6px',textAlign:'center'}}>{it.sp?`¥${it.sp}`:'—'}</td>
                    <td style={{padding:'6px',fontSize:10,color:G.mut}}>{it.upc}</td>
                  </tr>
                );})}</tbody>
              </table>
            </div>
          </Card>
          );
        })
      }
    </div>
  );
}

function OOTab({orders,setOrders,sales,setSales,reloadProducts,reloadInventory}) {
  const [conf,setConf]=useState(null);
  const active=orders.filter(o=>o.status!=='completed'&&o.status!=='cancelled');
  const stC={pending:{bg:G.goldl,c:G.yd},processing:{bg:G.bl,c:G.bd},shipped:{bg:G.pl,c:G.pd}};
  function upd(id,f,v){setOrders(p=>p.map(o=>o.id===id?{...o,[f]:v}:o));}
  async function syncOrder(o){
    const { error } = await supabase.from('orders').update({
      customer_name:o.cname, mobile:o.mob, address:o.addr, status:o.status,
      tracking:o.tracking, customer_courier_fee:o.custCourier, discount_total:o.discTotal,
    }).eq('id',o.id);
    if(error) console.error('syncOrder error:', error.message);
  }
  // Cancelling returns the goods to BOTH places: the product's stock counter
  // AND the Inventory tab (a fresh batch is created for each line, since the
  // original batch rows were consumed when the order was placed).
  async function cancelOrder(o){
    const { error: rpcErr } = await supabase.rpc('cancel_order_restore', { p_order_id: o.id });
    if(rpcErr){ alert('Failed to return the stock: '+rpcErr.message); return; }
    const { error } = await supabase.from('orders').update({status:'cancelled'}).eq('id',o.id);
    if(error){ alert('Failed to cancel the order: '+error.message); return; }
    upd(o.id,'status','cancelled');
    if(reloadProducts) await reloadProducts();
    if(reloadInventory) await reloadInventory();   // pull the recreated batches into the table
    setConf(null);
  }
  async function complete(o){
    const sub=o.items.reduce((s,i)=>s+i.up*i.qty,0);
    const tgw=o.items.reduce((s,i)=>s+i.gw*i.qty,0);
    const cour=o.custCourier!=null?o.custCourier:cf(tgw);
    const disc=o.discTotal||sub;const grand=disc+cour;
    const seq=nextSeq(sales);
    const draft={seq,date:bjDate(),type:'online',oid:o.id,cname:o.cname,mob:o.mob,addr:o.addr,sub,disc:sub-disc,discTotal:disc,courier:cour,grand};
    const lineItems=o.items.map(i=>({name:i.name,qty:i.qty,up:i.up,tp:+(i.up*i.qty).toFixed(2)}));
    const { data, error } = await supabase.from('sales').insert(toDbSale(draft)).select().single();
    if(error){alert('Failed to complete order: '+error.message);return;}
    const { error: itErr } = await supabase.from('sale_items').insert(lineItems.map(li=>({sale_id:data.id,name:li.name,qty:li.qty,unit_price:li.up,total_price:li.tp})));
    if(itErr){alert('Failed to save sale items: '+itErr.message);return;}
    const { error: ordErr } = await supabase.from('orders').update({status:'completed'}).eq('id',o.id);
    if(ordErr) console.error('Failed to sync completed status:', ordErr.message);
    const sl={...draft,id:data.id,items:lineItems};
    setSales(p=>[sl,...p]);setOrders(p=>p.map(x=>x.id===o.id?{...x,status:'completed'}:x));setConf(null);
  }
  return(
    <div>
      {conf&&<ConfirmDlg msg={conf.msg} onYes={conf.yes} onNo={()=>setConf(null)}/>}
      <div style={{fontSize:19,fontWeight:'bold',color:G.dk,marginBottom:4}}>🛒 Online Orders</div>
      <div style={{fontSize:12,color:G.mut,marginBottom:16}}>Active: {active.length} · Cancelled: {orders.filter(o=>o.status==='cancelled').length} · Total: {orders.length}</div>
      {active.length===0?<Card><div style={{textAlign:'center',padding:40,color:G.mut}}>No active orders</div></Card>:active.map(o=>{
        const sc=stC[o.status]||stC.pending;
        const sub=o.items.reduce((s,i)=>s+i.up*i.qty,0);
        const tgw=o.items.reduce((s,i)=>s+i.gw*i.qty,0);
        const cour=o.custCourier!=null?o.custCourier:cf(tgw);
        const disc=o.discTotal||sub;const grand=disc+cour;
        return(
          <Card key={o.id} style={{marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
              <div><div style={{fontWeight:'bold',fontSize:15,color:G.gd}}>{o.id}</div><div style={{fontSize:11,color:G.mut}}>{o.date} {o.time}</div></div>
              <span style={{background:sc.bg,color:sc.c,borderRadius:10,padding:'3px 10px',fontSize:11,fontWeight:'bold'}}>{o.status}</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
              <div><div style={{fontSize:10,color:G.mut,marginBottom:3}}>CUSTOMER</div><input value={o.cname} onChange={e=>upd(o.id,'cname',e.target.value)} onBlur={()=>syncOrder(o)} style={{width:'100%',padding:'4px 7px',borderRadius:5,border:`1px solid ${G.brd}`,fontSize:12,boxSizing:'border-box'}}/></div>
              <div><div style={{fontSize:10,color:G.mut,marginBottom:3}}>MOBILE</div><input value={o.mob} onChange={e=>upd(o.id,'mob',e.target.value)} onBlur={()=>syncOrder(o)} style={{width:'100%',padding:'4px 7px',borderRadius:5,border:`1px solid ${G.brd}`,fontSize:12,boxSizing:'border-box'}}/></div>
              <div><div style={{fontSize:10,color:G.mut,marginBottom:3}}>STATUS</div>
                <select value={o.status} onChange={e=>{upd(o.id,'status',e.target.value); syncOrder({...o,status:e.target.value});}} style={{width:'100%',padding:'4px 7px',borderRadius:5,border:`1px solid ${G.brd}`,fontSize:12}}>
                  <option value="pending">Pending</option><option value="processing">Processing</option><option value="shipped">Shipped</option>
                </select>
              </div>
            </div>
            <div style={{marginBottom:10}}><div style={{fontSize:10,color:G.mut,marginBottom:3}}>ADDRESS</div><textarea value={o.addr} onChange={e=>upd(o.id,'addr',e.target.value)} onBlur={()=>syncOrder(o)} style={{width:'100%',padding:'4px 7px',borderRadius:5,border:`1px solid ${G.brd}`,fontSize:11,boxSizing:'border-box',minHeight:44,resize:'vertical'}}/></div>
            {/* Fix 4: the customer's uploaded payment screenshot */}
            <div style={{marginBottom:10,padding:10,borderRadius:8,background:o.proofUrl?G.gl:'#FFEBEE',border:`1px solid ${o.proofUrl?G.g:G.rl}`}}>
              <div style={{fontSize:10,color:G.mut,marginBottom:6,fontWeight:'bold'}}>
                PAYMENT PROOF {o.payMethod&&<span style={{color:G.tx}}>· {o.payMethod==='alipay'?'💙 Alipay':'💚 WeChat Pay'}</span>}
              </div>
              {o.proofUrl
                ? <a href={o.proofUrl} target="_blank" rel="noopener noreferrer" title="Click to open full size">
                    <img src={o.proofUrl} alt={`Payment proof for ${o.id}`} style={{maxWidth:200,maxHeight:200,objectFit:'contain',borderRadius:6,border:`1px solid ${G.brd}`,background:G.w,display:'block',cursor:'zoom-in'}}/>
                  </a>
                : <div style={{fontSize:12,color:G.rd,fontWeight:'bold'}}>⚠️ No payment proof uploaded for this order.</div>
              }
            </div>
            <div style={{background:G.bg,borderRadius:8,padding:10,marginBottom:10}}>
              {o.items.map((it,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}><span>{it.name} ×{it.qty}</span><span>¥{(it.up*it.qty).toFixed(2)}</span></div>)}
              <div style={{borderTop:`1px solid ${G.brd}`,marginTop:7,paddingTop:7}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}><span>Subtotal</span><span>¥{sub.toFixed(2)}</span></div>
                {disc!==sub&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:G.gd}}><span>After Discount</span><span>¥{disc.toFixed(2)}</span></div>}
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,alignItems:'center'}}>
                  <span>Courier</span>
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    <input type="number" value={o.custCourier??''} onChange={e=>upd(o.id,'custCourier',e.target.value===''?null:+e.target.value)} onBlur={()=>syncOrder(o)} placeholder={String(cf(tgw))} style={{width:58,padding:'2px 5px',borderRadius:4,border:`1px solid ${G.brd}`,fontSize:11}}/>
                    <span>¥{cour.toFixed(2)}</span>
                  </div>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontWeight:'bold',fontSize:14,marginTop:5,color:G.gd}}><span>Grand Total</span><span>¥{grand.toFixed(2)}</span></div>
              </div>
            </div>
            <div style={{marginBottom:10,display:'flex',alignItems:'center',gap:8,fontSize:12}}>
              <span style={{color:G.tx,whiteSpace:'nowrap'}}>Custom discount price (¥):</span>
              <input type="number" value={o.discTotal??''} onChange={e=>upd(o.id,'discTotal',e.target.value?+e.target.value:null)} onBlur={()=>syncOrder(o)} placeholder="Optional" style={{width:90,padding:'4px 7px',borderRadius:5,border:`1px solid ${G.brd}`,fontSize:12}}/>
            </div>
            <div style={{marginBottom:12}}>
              <div style={{fontWeight:'bold',fontSize:12,marginBottom:6}}>📦 Tracking Numbers</div>
              {o.tracking.map((tk,i)=>(
                <div key={i} style={{display:'flex',gap:6,marginBottom:5}}>
                  <input value={tk} onChange={e=>{const tr=[...o.tracking];tr[i]=e.target.value;upd(o.id,'tracking',tr);}} onBlur={()=>syncOrder(o)} style={{flex:1,padding:'5px 9px',borderRadius:5,border:`1px solid ${G.brd}`,fontSize:12}}/>
                  <button onClick={()=>{const nt=o.tracking.filter((_,j)=>j!==i);upd(o.id,'tracking',nt);syncOrder({...o,tracking:nt});}} style={{background:'none',border:`1px solid ${G.rd}`,color:G.rd,borderRadius:5,padding:'3px 9px',cursor:'pointer',fontSize:11}}>✕</button>
                </div>
              ))}
              <Btn sm v='info' onClick={()=>{const nt=[...o.tracking,''];upd(o.id,'tracking',nt);syncOrder({...o,tracking:nt});}}>+ Add Tracking #</Btn>
            </div>
            <div style={{display:'flex',gap:8}}>
              <Btn onClick={()=>setConf({msg:`Complete order ${o.id} and move to Sales List?`,yes:()=>complete(o)})}>✅ Complete Order</Btn>
              <Btn v='danger' sm onClick={()=>setConf({msg:`Cancel order ${o.id}? The items will be returned to stock.`,yes:()=>cancelOrder(o)})}>Cancel</Btn>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function SITab({prods,inv,sales,setSales,catColors,reloadProducts}) {
  function blankSIItem(){return {pid:null,name:'',pw:'',qty:'',unit:'PCS',up:'',tp:'',gw:'',exps:[],exp:''};}
  const [cust,setCust]=useState({name:'',addr:'',mob:''});
  const [items,setItems]=useState([blankSIItem()]);
  const [ctype,setCtype]=useState('Not Free');
  const [ccour,setCcour]=useState('');
  const [dtype,setDtype]=useState('No');
  const [dpct,setDpct]=useState(0);
  const [cdsc,setCdsc]=useState('');
  const [selIt,setSelIt]=useState([]);
  const [sdpct,setSdpct]=useState(10);
  const [curId,setCurId]=useState(null);
  const [onum,setOnum]=useState(()=>nextSeq(sales));
  const [rq,setRq]=useState('');
  const [rsel,setRsel]=useState([]);
  const [saving,setSaving]=useState(false);

  // ---- Walk-in sales now move real stock. ----
  // When EDITING an invoice that already took its stock, the units it reserved are
  // still "available" to that same invoice — otherwise re-saving an unchanged invoice
  // would look like it needed twice the stock.
  const savedQty = useMemo(()=>{
    const m={};
    const ex = curId ? sales.find(x=>x.id===curId) : null;
    if(ex && ex.type==='invoice') (ex.items||[]).forEach(i=>{ if(i.pid) m[i.pid]=(m[i.pid]||0)+(+i.qty||0); });
    return m;
  },[curId,sales]);
  function availFor(pid){
    const pr=prods.find(x=>x.id===pid);
    if(!pr) return 0;
    return (pr.stock||0) + (savedQty[pid]||0);
  }
  function prodFor(it){ return prods.find(x=>x.id===it.pid) || prods.find(x=>x.name===it.name) || null; }
  const overLines = items.filter(i=>{
    if(!i.name || !i.qty) return false;
    const pr = prodFor(i);
    return pr ? (+i.qty||0) > availFor(pr.id) : false;
  });

  const sub=items.reduce((s,i)=>s+(+i.tp||0),0);
  const tgw=items.reduce((s,i)=>s+(+i.gw||0)*(+i.qty||0),0);
  const cour=ctype==='Free'?0:ctype==='Not Free'?cf(tgw):(+ccour||0);
  const damt=dtype==='Yes'?sub*(+dpct/100):dtype==='Customized Discount'?(+cdsc||0):0;
  const pad=sub-damt; const grand=pad+cour;
  const hasDsc = dtype!=='No';

  function recalcRow(u){ u.tp=(+(u.qty||0)*(+(u.up||0))).toFixed(2); return u; }
  function updIt(idx,f,v){
    setItems(prev=>prev.map((it,i)=>{
      if(i!==idx) return it;
      let u={...it,[f]:v};
      if(f==='name'){
        u.pid=null;   // re-linked below when picked from the list, or matched by name on save
        if(v===''){u.pw='';u.up='';u.gw='';u.exps=[];u.exp='';}
      }
      return recalcRow(u);
    }));
  }
  function selectProduct(idx,p){
    setItems(prev=>{
      const exps = inv.filter(x=>x.name===p.name && x.qty>0).map(x=>({exp:x.exp,qty:x.qty}));
      const next = prev.map((it,i)=> i!==idx ? it : recalcRow({...it,pid:p.id,name:p.name,pw:p.pw,up:ep(p),unit:p.unit,gw:p.gw,exps,exp:''}));
      return idx===prev.length-1 ? [...next, blankSIItem()] : next;
    });
  }
  function applySD(){
    setItems(prev=>prev.map((it,i)=>{
      if(!selIt.includes(i)) return it;
      const p=prods.find(x=>x.name===it.name); const bp=p?p.sp:+it.up;
      const np=+(bp*(1-sdpct/100)).toFixed(2);
      return recalcRow({...it,up:np});
    }));
    setSelIt([]);
  }
  function resetForm(){
    setCust({name:'',addr:'',mob:''});setItems([blankSIItem()]);setCtype('Not Free');setCcour('');setDtype('No');setDpct(0);setCdsc('');setCurId(null);setOnum(nextSeq(sales));
  }
  async function save(){
    if(saving) return;
    const fi=items.filter(i=>i.name&&i.qty);
    if(!fi.length){alert('Add at least one item');return;}

    // Link each line back to a real product so stock can be tracked. A line typed
    // by hand that matches nothing is still allowed — it just doesn't move stock.
    const lines = fi.map(i=>{
      const pr = prodFor(i);
      return { product_id: pr?pr.id:null, name:i.name, qty:+i.qty, unit_price:+i.up||0, total_price:+i.tp||0 };
    });

    // Friendly pre-check. The database checks again, atomically — this is only
    // here so you get a clear message instead of a raw Postgres error.
    const need={};
    lines.forEach(l=>{ if(l.product_id) need[l.product_id]=(need[l.product_id]||0)+l.qty; });
    for(const pid of Object.keys(need)){
      const avail = availFor(+pid);
      if(need[pid] > avail){
        const pr = prods.find(x=>String(x.id)===String(pid));
        alert(`Not enough stock for "${pr?pr.name:pid}" — ${avail} available, this invoice needs ${need[pid]}.`);
        return;
      }
    }

    const existing = curId ? sales.find(x=>x.id===curId) : null;
    const seq  = existing ? existing.seq  : onum;
    const dt   = existing ? existing.date : bjDate();
    setSaving(true);
    try{
      // One call: writes the invoice, its line items, and takes the stock off the
      // shelf — in a single transaction. Editing an invoice returns its old stock
      // first, so the new quantities are measured against the true total.
      const { data: savedId, error } = await supabase.rpc('save_invoice', {
        p_sale_id:    curId,
        p_seq:        seq,
        p_date:       dt,
        p_oid:        `INV${seq}`,
        p_cname:      cust.name,
        p_mob:        cust.mob,
        p_addr:       cust.addr,
        p_items:      lines,
        p_sub:        sub,
        p_disc:       damt,
        p_disc_total: pad,
        p_courier:    cour,
        p_grand:      grand,
      });
      if(error) throw new Error(error.message);

      const saved={
        id:savedId, seq, date:dt, type:'invoice', oid:`INV${seq}`,
        cname:cust.name, mob:cust.mob, addr:cust.addr,
        sub, disc:damt, discTotal:pad, courier:cour, grand,
        items: lines.map(l=>({pid:l.product_id,name:l.name,qty:l.qty,up:l.unit_price,tp:l.total_price})),
      };
      setSales(p=> curId ? p.map(x=>x.id===curId?saved:x) : [saved,...p]);
      setCurId(savedId);
      if(reloadProducts) await reloadProducts();
      alert('Sales invoice saved — stock updated.');
    }catch(err){
      alert(err.message || 'Failed to save the invoice.');
    }finally{ setSaving(false); }
  }
  async function deleteCurrent(){
    if(!curId){alert('Load or save an invoice first, or select one below to delete.');return;}
    if(!window.confirm('Delete this invoice? Its items will be returned to stock.')) return;
    const { error } = await supabase.rpc('delete_sales', { p_ids: [curId] });
    if(error){alert('Failed to delete: '+error.message);return;}
    setSales(p=>p.filter(x=>x.id!==curId));
    if(reloadProducts) await reloadProducts();
    resetForm();
  }
  function printCurrent(){
    const existing = curId ? sales.find(s=>s.id===curId) : null;
    const html=buildSalesReceiptHTML({orderNo:existing?existing.seq:onum,cname:cust.name,mob:cust.mob,addr:cust.addr,items:items.filter(i=>i.name&&i.qty),sub,pad,cour,grand,hasDsc});
    openPrintWindow(html);
  }
  function loadOrder(s){
    // An online sale's stock came off the shelf when the customer checked out.
    // Editing it here would take it a second time, so don't allow it.
    if(s.type==='online'){
      alert('That is a completed online order, not a walk-in invoice.\n\nIts stock was already deducted when the customer checked out, so editing it here would double-count. Manage it from the Online Orders tab instead.');
      return;
    }
    setCurId(s.id); setOnum(s.seq);
    setCust({name:s.cname||'',mob:s.mob||'',addr:s.addr||''});
    setItems([...s.items.map(i=>{
      const p=prods.find(x=>x.id===i.pid) || prods.find(x=>x.name===i.name);
      const exps = p ? inv.filter(x=>x.name===p.name&&x.qty>0).map(x=>({exp:x.exp,qty:x.qty})) : [];
      return {pid:i.pid||(p?p.id:null),name:i.name,pw:p?p.pw:'',qty:String(i.qty),unit:p?p.unit:'PCS',up:String(i.up),tp:String(i.tp),gw:p?p.gw:'',exps,exp:''};
    }), blankSIItem()]);
    setCtype('Customized Courier'); setCcour(String(s.courier||0));
    setDtype(s.disc>0?'Customized Discount':'No'); setCdsc(String(s.disc||0));
  }
  async function deleteSelectedInvoices(){
    if(!rsel.length) return;
    if(!window.confirm(`Delete ${rsel.length} sale(s)? Items from walk-in invoices will be returned to stock.`)) return;
    const { error } = await supabase.rpc('delete_sales', { p_ids: rsel });
    if(error){alert('Failed to delete: '+error.message);return;}
    setSales(p=>p.filter(x=>!rsel.includes(x.id)));
    if(curId && rsel.includes(curId)) resetForm();
    setRsel([]);
    if(reloadProducts) await reloadProducts();
  }
  function printSale(s){
    openPrintWindow(buildSalesReceiptHTML({orderNo:s.seq,cname:s.cname,mob:s.mob,addr:s.addr,items:s.items,sub:s.sub,pad:s.discTotal,cour:s.courier,grand:s.grand,hasDsc:s.disc>0}));
  }

  const recent = useMemo(()=>{
    if(!rq) return sales;
    const lq=rq.toLowerCase();
    return sales.filter(s=>String(s.seq).includes(rq)||((s.oid||'').toLowerCase().includes(lq))||((s.cname||'').toLowerCase().includes(lq)));
  },[sales,rq]);

  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:19,fontWeight:'bold',color:G.dk}}>💰 Sales Invoice</div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <Btn onClick={resetForm}>+ New</Btn>
          <Btn v='info' onClick={save} disabled={saving||overLines.length>0}>{saving?'Saving…':'💾 Save'}</Btn>
          <Btn v='outline' onClick={printCurrent}>🖨️ Print PDF</Btn>
          <Btn v='danger' onClick={deleteCurrent}>🗑️ Delete</Btn>
          {selIt.length>0&&<><input type="number" value={sdpct} onChange={e=>setSdpct(+e.target.value)} style={{width:52,padding:'4px 7px',borderRadius:5,border:`1px solid ${G.brd}`,fontSize:12}}/><Btn v='warn' sm onClick={applySD}>% Apply to Selected</Btn></>}
        </div>
      </div>
      <Card style={{marginBottom:14}}>
        <div style={{textAlign:'center',fontSize:11,fontWeight:'bold',color:G.gd,marginBottom:10,lineHeight:1.5}}>SALES RECEIPT · Taste Of Desh · Raa Trade International · Beijing, China · WeChat: RaaTrade · Order #{curId?(sales.find(s=>s.id===curId)?.seq||onum):onum}</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))',gap:10}}>
          <FInput label="Customer Name" value={cust.name} onChange={v=>setCust(p=>({...p,name:v}))}/>
          <FInput label="Mobile" value={cust.mob} onChange={v=>setCust(p=>({...p,mob:v}))}/>
          <FInput label="Address" value={cust.addr} onChange={v=>setCust(p=>({...p,addr:v}))}/>
          <div style={{fontSize:12,color:G.tx,display:'flex',alignItems:'center',paddingTop:18}}>📅 {bjDate()} · ⏰ {bjTime()}</div>
        </div>
      </Card>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
        <Card><div style={{fontWeight:'bold',fontSize:13,marginBottom:10,color:G.gd}}>Courier</div><FSel value={ctype} onChange={setCtype} options={['Free','Not Free','Customized Courier']}/>{ctype==='Customized Courier'&&<FInput label="Custom (RMB)" value={ccour} onChange={setCcour} type="number"/>}</Card>
        <Card><div style={{fontWeight:'bold',fontSize:13,marginBottom:10,color:G.gd}}>Discount</div><FSel value={dtype} onChange={setDtype} options={['No','Yes','Customized Discount']}/>{dtype==='Yes'&&<FInput label="Discount %" value={dpct} onChange={setDpct} type="number"/>}{dtype==='Customized Discount'&&<FInput label="Amount (RMB)" value={cdsc} onChange={setCdsc} type="number"/>}</Card>
      </div>
      {overLines.length>0&&(
        <div style={{background:'#FFEBEE',border:`1px solid ${G.rd}`,borderRadius:10,padding:12,marginBottom:14}}>
          <div style={{fontWeight:'bold',color:G.rd,fontSize:13,marginBottom:4}}>⚠️ Not enough stock</div>
          {overLines.map((i,k)=>{
            const pr=prodFor(i);
            return <div key={k} style={{fontSize:12,color:G.rd}}>“{i.name}” — {availFor(pr.id)} available, this invoice needs {i.qty}.</div>;
          })}
          <div style={{fontSize:11,color:G.tx,marginTop:5}}>Reduce the quantity, or add stock in the Inventory tab.</div>
        </div>
      )}
      <Card style={{marginBottom:14,overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:800}}>
          <thead><tr style={{background:G.gd,color:G.w}}>
            {['','Exp Date','Stock','Gross(KG)','Total Gross','Product Name','Packed(g)','Qty','Unit','Unit Price','Total','✕'].map(h=>(
              <th key={h} style={{padding:'7px 5px',textAlign:'center',whiteSpace:'nowrap'}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{items.map((it,idx)=>{
            const p=prodFor(it);const tgwR=(+it.gw||0)*(+it.qty||0);
            // What this invoice can actually take: current stock, plus anything this
            // same invoice already has reserved (only relevant when editing).
            const avail = p ? availFor(p.id) : null;
            const over  = avail!=null && (+it.qty||0) > avail;
            return(
              <tr key={idx} style={{background:idx%2===0?G.w:G.bg,borderBottom:`1px solid ${G.brd}`}}>
                <td style={{padding:'5px',textAlign:'center'}}><input type="checkbox" checked={selIt.includes(idx)} onChange={()=>setSelIt(p2=>p2.includes(idx)?p2.filter(x=>x!==idx):[...p2,idx])}/></td>
                <td style={{padding:'5px'}}>{it.exps.length>0?<select value={it.exp} onChange={e=>updIt(idx,'exp',e.target.value)} style={{padding:'3px',borderRadius:4,border:`1px solid ${G.brd}`,fontSize:10}}><option value="">Any</option>{it.exps.map(x=><option key={x.exp} value={x.exp}>{x.exp} ({x.qty})</option>)}</select>:<span style={{color:G.mut,fontSize:10}}>—</span>}</td>
                <td style={{padding:'5px',textAlign:'center'}}>{avail!=null?<span style={{...stStyle(avail),padding:'2px 6px',borderRadius:4,fontSize:10,display:'inline-block',outline:over?`2px solid ${G.rd}`:'none'}}>{avail}</span>:'—'}</td>
                <td style={{padding:'5px',textAlign:'center'}}>{it.gw||'—'}</td>
                <td style={{padding:'5px',textAlign:'center',fontWeight:'bold'}}>{tgwR.toFixed(3)}</td>
                <td style={{padding:'5px',minWidth:150}}><ComboInput value={it.name} onChange={v=>updIt(idx,'name',v)} onPick={p2=>selectProduct(idx,p2)} options={prods} placeholder="Type to search product..."/></td>
                <td style={{padding:'5px',textAlign:'center'}}>{it.pw||'—'}</td>
                <td style={{padding:'5px'}}><input type="number" value={it.qty} onChange={e=>updIt(idx,'qty',e.target.value)} style={{width:48,padding:'4px',borderRadius:4,border:`1px solid ${over?G.rd:G.brd}`,fontSize:11,textAlign:'center',color:over?G.rd:G.dk,fontWeight:over?'bold':'normal'}}/></td>
                <td style={{padding:'5px',textAlign:'center',fontSize:10}}>{it.unit}</td>
                <td style={{padding:'5px'}}><input type="number" value={it.up} onChange={e=>updIt(idx,'up',e.target.value)} style={{width:58,padding:'4px',borderRadius:4,border:`1px solid ${G.brd}`,fontSize:11}}/></td>
                <td style={{padding:'5px',textAlign:'center',fontWeight:'bold',color:G.gd}}>¥{(+it.tp||0).toFixed(2)}</td>
                <td style={{padding:'5px',textAlign:'center'}}>{items.length>1&&<button onClick={()=>setItems(p2=>p2.filter((_,j)=>j!==idx))} style={{background:'none',border:'none',cursor:'pointer',color:'#B71C1C',fontSize:14}}>✕</button>}</td>
              </tr>
            );
          })}</tbody>
        </table>
        <div style={{marginTop:10}}><Btn sm onClick={()=>setItems(p=>[...p,blankSIItem()])}>+ Add Row</Btn></div>
        <div style={{maxWidth:280,marginLeft:'auto',marginTop:14,fontSize:13}}>
          <div style={{display:'flex',justifyContent:'space-between',padding:'5px 0'}}><span>Sub-total</span><span>¥{sub.toFixed(2)}</span></div>
          {hasDsc&&<div style={{display:'flex',justifyContent:'space-between',padding:'5px 0',color:G.gd,fontWeight:'bold'}}><span>Price After Discount</span><span>¥{pad.toFixed(2)}</span></div>}
          <div style={{display:'flex',justifyContent:'space-between',padding:'5px 0'}}><span>Courier</span><span>¥{cour.toFixed(2)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',padding:'7px 0',fontWeight:'bold',fontSize:16,borderTop:`2px solid ${G.brd}`,color:G.gd}}><span>Grand Total</span><span>¥{grand.toFixed(2)}</span></div>
        </div>
        <div style={{textAlign:'center',fontStyle:'italic',color:G.tx,fontSize:13,marginTop:10}}>Thank you for your business</div>
      </Card>
      <Card>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,flexWrap:'wrap',gap:8}}>
          <div style={{fontWeight:'bold',fontSize:13}}>Recent Invoice Orders</div>
          <input value={rq} onChange={e=>setRq(e.target.value)} placeholder="Search order # or customer..." style={{padding:'6px 10px',borderRadius:6,border:`1px solid ${G.brd}`,fontSize:12}}/>
        </div>
        {rsel.length>0&&(
          <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
            <Btn sm onClick={()=>{const s=sales.find(x=>x.id===rsel[0]); if(s)loadOrder(s); setRsel([]);}}>📂 Load to Edit</Btn>
            <Btn sm v='outline' onClick={()=>{const s=sales.find(x=>x.id===rsel[0]); if(s)printSale(s);}}>🖨️ Print</Btn>
            <Btn sm v='danger' onClick={deleteSelectedInvoices}>🗑️ Delete Selected ({rsel.length})</Btn>
          </div>
        )}
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{background:G.gl}}><th style={{padding:'7px'}}></th><th style={{padding:'7px',textAlign:'left'}}>Order #</th><th style={{padding:'7px'}}>Date</th><th style={{padding:'7px'}}>Type</th><th style={{padding:'7px'}}>Customer</th><th style={{padding:'7px',textAlign:'center'}}>Total</th></tr></thead>
            <tbody>{recent.map(s=>(
              <tr key={s.id} style={{borderBottom:`1px solid ${G.brd}`,background:rsel.includes(s.id)?G.gl:(curId===s.id?'#F1F8F2':'transparent')}}>
                <td style={{padding:'7px',textAlign:'center'}}><input type="checkbox" checked={rsel.includes(s.id)} onChange={()=>setRsel(p=>p.includes(s.id)?p.filter(x=>x!==s.id):[...p,s.id])}/></td>
                <td style={{padding:'7px',fontWeight:'bold',color:G.gd}}>#{s.seq}</td><td style={{padding:'7px'}}>{s.date}</td>
                <td style={{padding:'7px'}}><span style={{background:s.type==='online'?G.bl:G.goldl,color:s.type==='online'?G.bd:G.yd,borderRadius:8,padding:'2px 8px',fontSize:11,fontWeight:'bold'}}>{s.type==='online'?'Online':'Invoice'}</span></td>
                <td style={{padding:'7px'}}>{s.cname||'—'}</td><td style={{padding:'7px',textAlign:'center',fontWeight:'bold'}}>¥{s.grand?.toFixed(2)}</td>
              </tr>
            ))}</tbody>
          </table>
          {recent.length===0&&<div style={{textAlign:'center',padding:24,color:G.mut}}>No matching orders</div>}
        </div>
      </Card>
    </div>
  );
}

function SLTab({sales,setSales,reloadProducts}) {
  const [q,setQ]=useState('');
  const [exp,setExp]=useState(new Set());
  const [sel,setSel]=useState([]);
  const list=useMemo(()=>!q?sales:sales.filter(s=>(s.oid||'').toLowerCase().includes(q.toLowerCase())||(s.cname||'').toLowerCase().includes(q.toLowerCase())||String(s.seq).includes(q)),[sales,q]);
  const rev=sales.reduce((s,o)=>s+o.grand,0);
  const cour=sales.reduce((s,o)=>s+(o.courier||0),0);
  function toggle(id){setExp(p=>{const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n;});}
  const allSel = list.length>0 && list.every(s=>sel.includes(s.id));
  function toggleAll(){ setSel(allSel ? [] : list.map(s=>s.id)); }
  async function deleteSelected(){
    if(!sel.length) return;
    if(!window.confirm(`Delete ${sel.length} sales record(s)? Items from walk-in invoices will be returned to stock. This cannot be undone.`)) return;
    // Goes through the database function so that walk-in invoices hand their
    // stock back. Online sales don't — their stock was taken by the order itself.
    const { error } = await supabase.rpc('delete_sales', { p_ids: sel });
    if(error){alert('Failed to delete: '+error.message);return;}
    setSales(p=>p.filter(s=>!sel.includes(s.id)));
    setSel([]);
    if(reloadProducts) await reloadProducts();
  }
  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:19,fontWeight:'bold',color:G.dk}}>📈 Sales List</div>
        {sel.length>0&&<Btn v='danger' sm onClick={deleteSelected}>🗑️ Delete Selected ({sel.length})</Btn>}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:12,marginBottom:18}}>
        <Stat icon="💰" label="Total Revenue (¥)" value={`¥${Math.round(rev)}`} color={G.gd}/>
        <Stat icon="🚚" label="Total Courier (¥)" value={`¥${Math.round(cour)}`} color={G.bd}/>
        <Stat icon="📦" label="Total Orders" value={sales.length} color={G.pd}/>
      </div>
      <div style={{marginBottom:14}}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by order #, ID or customer..." style={{width:'100%',padding:'9px 12px',borderRadius:8,border:`1px solid ${G.brd}`,fontSize:13,boxSizing:'border-box'}}/></div>
      {list.length===0?<Card><div style={{textAlign:'center',padding:40,color:G.mut}}>No sales records yet</div></Card>:(
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:820}}>
            <thead><tr style={{background:G.gd,color:G.w}}>
              <th style={{padding:'9px 7px',textAlign:'center'}}><input type="checkbox" checked={allSel} onChange={toggleAll}/></th>
              <th style={{padding:'9px 7px'}}></th>
              {['Order #','Date','Type','Customer','Mobile','Subtotal','Discount','Courier','Grand Total'].map(h=>(
                <th key={h} style={{padding:'9px 7px',textAlign:'center',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{list.map((s,i)=>(
              <React.Fragment key={s.id}>
                <tr style={{background:i%2===0?G.w:G.bg,borderBottom:`1px solid ${G.brd}`}}>
                  <td style={{padding:'7px',textAlign:'center'}}><input type="checkbox" checked={sel.includes(s.id)} onChange={()=>setSel(p=>p.includes(s.id)?p.filter(x=>x!==s.id):[...p,s.id])}/></td>
                  <td onClick={()=>toggle(s.id)} style={{padding:'7px',textAlign:'center',cursor:'pointer'}}>{exp.has(s.id)?'▼':'▶'}</td>
                  <td style={{padding:'7px',textAlign:'center',fontWeight:'bold',color:G.gd}}>#{s.seq}</td><td style={{padding:'7px',textAlign:'center'}}>{s.date}</td>
                  <td style={{padding:'7px',textAlign:'center'}}><span style={{background:s.type==='online'?G.bl:G.goldl,color:s.type==='online'?G.bd:G.yd,borderRadius:8,padding:'2px 8px',fontSize:11,fontWeight:'bold'}}>{s.type==='online'?'🛒 Online':'💰 Invoice'}</span></td>
                  <td style={{padding:'7px'}}>{s.cname||'—'}</td><td style={{padding:'7px'}}>{s.mob||'—'}</td>
                  <td style={{padding:'7px',textAlign:'center'}}>¥{s.sub?.toFixed(2)}</td>
                  <td style={{padding:'7px',textAlign:'center',color:s.disc>0?'#B71C1C':G.mut}}>{s.disc>0?`-¥${s.disc.toFixed(2)}`:'—'}</td>
                  <td style={{padding:'7px',textAlign:'center'}}>¥{s.courier?.toFixed(2)}</td>
                  <td style={{padding:'7px',textAlign:'center',fontWeight:'bold',fontSize:14,color:G.gd}}>¥{s.grand?.toFixed(2)}</td>
                </tr>
                {exp.has(s.id)&&(
                  <tr><td colSpan={11} style={{background:G.gl,padding:'10px 18px'}}>
                    <div style={{fontWeight:'bold',fontSize:11,color:G.gd,marginBottom:6}}>Items Ordered:</div>
                    {s.items.map((it,k)=>(
                      <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'3px 0',borderBottom:k<s.items.length-1?`1px dashed ${G.brd}`:'none'}}>
                        <span>{it.name} × {it.qty}</span><span>¥{(it.tp!=null?it.tp:it.up*it.qty).toFixed(2)}</span>
                      </div>
                    ))}
                  </td></tr>
                )}
              </React.Fragment>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminApp({prods,setProds,cats,setCats,catColors,setCatColors,inv,setInv,delInv,setDelInv,orders,setOrders,sales,setSales,pos,setPOs,customSlides,setCustomSlides,goCustomer,qrCodes,setQrCodes,onLogout,reloadProducts,reloadInventory}) {
  const [tab,setTab]=useState('dash');
  const [open,setOpen]=useState(true);
  const tabs=[
    {id:'dash',icon:'📊',l:'Dashboard'},{id:'prods',icon:'📋',l:'Product List'},{id:'inv',icon:'🏭',l:'Inventory'},
    {id:'pi',icon:'🧾',l:'Purchase Invoice'},{id:'pl',icon:'📜',l:'Purchase List'},{id:'oo',icon:'🛒',l:'Online Orders'},
    {id:'si',icon:'💰',l:'Sales Invoice'},{id:'sl',icon:'📈',l:'Sales List'},
  ];
  return(
    <div>
      <div style={{background:G.grad,padding:'10px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:15}}>⚙️</span><div style={{color:G.gold,fontWeight:'bold',fontSize:14}}>Admin Panel — Taste of Desh</div>
        </div>
        <button onClick={goCustomer} style={{padding:'5px 13px',borderRadius:16,border:'none',cursor:'pointer',background:'rgba(255,255,255,0.15)',color:G.w,fontWeight:'bold',fontSize:11}}>🏠 View Storefront</button>
        <button onClick={onLogout} style={{padding:'5px 13px',borderRadius:16,border:'none',cursor:'pointer',background:'rgba(255,255,255,0.15)',color:G.w,fontWeight:'bold',fontSize:11}}>🚪 Logout</button>
      </div>
      <div style={{display:'flex',minHeight:'calc(100vh - 86px)',background:G.bg}}>
        <div style={{width:open?206:58,flexShrink:0,background:G.gd,transition:'width 0.2s ease',display:'flex',flexDirection:'column',position:'sticky',top:0,alignSelf:'flex-start',height:'calc(100vh - 86px)',overflowY:'auto'}}>
          <button onClick={()=>setOpen(o=>!o)} style={{background:'rgba(255,255,255,0.08)',border:'none',color:G.gold,padding:'13px 0',cursor:'pointer',fontSize:17,width:'100%',textAlign:'center'}}>{open?'◀ ☰':'☰'}</button>
          {tabs.map(tb=>(
            <button key={tb.id} onClick={()=>setTab(tb.id)} title={tb.l} style={{display:'flex',alignItems:'center',gap:11,padding:open?'12px 16px':'12px 0',justifyContent:open?'flex-start':'center',border:'none',background:tab===tb.id?'rgba(255,255,255,0.14)':'transparent',borderLeft:tab===tb.id?`4px solid ${G.gold}`:'4px solid transparent',color:G.w,cursor:'pointer',fontSize:13,fontWeight:tab===tb.id?'bold':'normal',width:'100%',boxSizing:'border-box'}}>
              <span style={{fontSize:17,flexShrink:0}}>{tb.icon}</span>{open&&<span style={{whiteSpace:'nowrap'}}>{tb.l}</span>}
            </button>
          ))}
        </div>
        <div style={{flex:1,padding:20,minWidth:0,overflowX:'auto'}}>
         <TabErrorBoundary key={tab}>
          {tab==='dash'&&<DashTab prods={prods} inv={inv} orders={orders} sales={sales} catColors={catColors} customSlides={customSlides} setCustomSlides={setCustomSlides} qrCodes={qrCodes} setQrCodes={setQrCodes}/>}
          {tab==='prods'&&<ProdTab prods={prods} setProds={setProds} cats={cats} setCats={setCats} catColors={catColors} setCatColors={setCatColors} inv={inv} setInv={setInv} orders={orders} sales={sales}/>}
          {tab==='inv'&&<InvTab inv={inv} setInv={setInv} prods={prods} setProds={setProds} cats={cats} catColors={catColors} delInv={delInv} setDelInv={setDelInv} reloadProducts={reloadProducts}/>}
          {tab==='pi'&&<PITab prods={prods} pos={pos} setPOs={setPOs} catColors={catColors}/>}
          {tab==='pl'&&<PLTab pos={pos} setPOs={setPOs} inv={inv} setInv={setInv} catColors={catColors}/>}
          {tab==='oo'&&<OOTab orders={orders} setOrders={setOrders} sales={sales} setSales={setSales} reloadProducts={reloadProducts} reloadInventory={reloadInventory}/>}
          {tab==='si'&&<SITab prods={prods} inv={inv} sales={sales} setSales={setSales} catColors={catColors} reloadProducts={reloadProducts}/>}
          {tab==='sl'&&<SLTab sales={sales} setSales={setSales} reloadProducts={reloadProducts}/>}
         </TabErrorBoundary>
        </div>
      </div>
    </div>
  );
}

export default AdminApp;
