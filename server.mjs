import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const technicians = [
  {name:'Rohan Mehta',trade:'Washers & dryers',rating:'4.9',jobs:186,area:'South + Central',availability:'Available today',color:'#e9be5f'},
  {name:'Priya Nair',trade:'Cooling & HVAC',rating:'4.8',jobs:142,area:'West + Central',availability:'Next slot tomorrow',color:'#c0ded4'},
  {name:'Dev Shah',trade:'Refrigeration',rating:'4.7',jobs:98,area:'North + East',availability:'Available today',color:'#efc7a4'},
  {name:'Amit Joshi',trade:'Leaks, drains & water heaters',rating:'4.9',jobs:121,area:'South + East',availability:'Available today',color:'#c7d9b2'}
];
const demoServices=['Washing machine','Refrigerator','Plumbing','Dishwasher','Air conditioner','Water heater'];
const demoStatuses=Array(10).fill('New').concat(Array(8).fill('Scheduled'),Array(7).fill('In progress'),Array(5).fill('Completed'));
const demoBookings=Array.from({length:30},function(_,index){
  const number=index+1;
  return {id:'DEMO-'+String(number).padStart(3,'0'),name:'Demo Customer '+String(number).padStart(2,'0'),phone:'DEMO-'+String(number).padStart(4,'0'),area:'Demo Zone '+String.fromCharCode(65+(index%3)),service:demoServices[index%demoServices.length],date:new Date(Date.now()-Math.floor(index/6)*86400000).toISOString().slice(0,10),status:demoStatuses[index],plan:'None',demo:true};
});
const bookings=demoBookings;
const plans = [{id:'monthly',name:'Monthly Booking Pass',price:99,cadence:'month',detail:'Priority booking for everyday home repairs.',tag:'FLEXIBLE'},{id:'annual',name:'Annual Booking Pass',price:3000,cadence:'year',detail:'A year of priority access and peace of mind.',tag:'BEST VALUE'}];
const allowedEvents = new Set(['page_viewed','service_category_selected','booking_form_started','booking_submitted','plans_viewed','plan_selected','plan_request_submitted','technician_list_viewed','booking_status_changed','service_completed']);
const allowedProperties = new Set(['page','service','entry_point','plan_id','status','previous_status','booking_id']);
const rateBuckets = new Map();

function send(res, status, payload, type='application/json; charset=utf-8') {
  res.writeHead(status, {'content-type':type,'cache-control':'no-store','access-control-allow-origin':'*'});
  res.end(type.startsWith('application/json') ? JSON.stringify(payload) : payload);
}
async function body(req) {
  let raw=''; for await (const chunk of req) raw+=chunk;
  if (raw.length>100_000) throw new Error('Request too large');
  return raw ? JSON.parse(raw) : {};
}
const app = http.createServer(async (req,res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (req.method==='OPTIONS') return send(res,204,{});
  if (url.pathname==='/api/healthz') return send(res,200,{ok:true,service:'Appliance Circle'});
  if (url.pathname==='/api/site-data' && req.method==='GET') return send(res,200,{technicians,plans});
  if (url.pathname==='/api/bookings' && req.method==='GET') return send(res,200,bookings);
  if (url.pathname==='/api/bookings' && req.method==='POST') {
    try {
      const data=await body(req);
      if (!data.name?.trim() || !data.phone?.trim() || !data.area?.trim() || !data.service?.trim()) return send(res,400,{error:'Please fill out all required fields.'});
      const row={id:`AC-${Date.now().toString().slice(-6)}`,name:data.name.trim(),phone:data.phone.trim(),area:data.area.trim(),service:data.service.trim(),date:data.date || new Date().toISOString().slice(0,10),status:'New',plan:'None'};
      bookings.unshift(row); return send(res,201,row);
    } catch { return send(res,400,{error:'The booking could not be saved.'}); }
  }
  if (url.pathname.startsWith('/api/bookings/') && req.method==='PATCH') {
    const id=url.pathname.split('/').at(-1); const row=bookings.find(x=>x.id===id);
    if (!row) return send(res,404,{error:'Booking not found. Sample assignment records are read-only.'});
    try { const {status}=await body(req); if (!['New','Scheduled','In progress','Completed'].includes(status)) return send(res,400,{error:'Invalid status.'}); row.status=status; return send(res,200,row); } catch { return send(res,400,{error:'Invalid update.'}); }
  }
  if (url.pathname==='/api/technicians' && req.method==='GET') return send(res,200,technicians);
  if (url.pathname==='/api/plans' && req.method==='GET') return send(res,200,plans);
  if (url.pathname==='/api/subscriptions' && req.method==='POST') {
    try { const data=await body(req); if (!data.name?.trim() || !data.email?.trim() || !plans.some(p=>p.id===data.planId)) return send(res,400,{error:'Enter your name and email, then choose a plan.'}); return send(res,201,{ok:true,message:`Thanks, ${data.name.trim()} — your ${data.planId} pass request is ready for Circle confirmation.`}); } catch { return send(res,400,{error:'Could not process plan request.'}); }
  }
  if (url.pathname==='/api/analytics/events' && req.method==='POST') {
    const now=Date.now(); const key=req.socket.remoteAddress || 'unknown'; const bucket=rateBuckets.get(key) || {start:now,count:0};
    if (now-bucket.start>60_000) { bucket.start=now; bucket.count=0; }
    bucket.count+=1; rateBuckets.set(key,bucket);
    if (bucket.count>100) return send(res,429,{error:'Event limit reached. Try again shortly.'});
    try {
      const data=await body(req);
      if (!allowedEvents.has(data.event) || typeof data.distinctId!=='string' || data.distinctId.length<5 || data.distinctId.length>100 || data.consent!==true) return send(res,400,{error:'A consented event name and anonymous visitor ID are required.'});
      const properties={};
      for (const [name,value] of Object.entries(data.properties || {})) if (allowedProperties.has(name) && ['string','number','boolean'].includes(typeof value)) properties[name]=typeof value==='string'?value.slice(0,100):value;
      const timestamp=Date.now(); const results=[];
      if (process.env.MIXPANEL_PROJECT_TOKEN) {
        const event={event:data.event,properties:{token:process.env.MIXPANEL_PROJECT_TOKEN,distinct_id:data.distinctId,time:Math.floor(timestamp/1000),$insert_id:randomUUID(),...properties}};
        try { const r=await fetch('https://api.mixpanel.com/track?verbose=1',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify([event])}); results.push(['mixpanel',r.ok]); } catch { results.push(['mixpanel',false]); }
      }
      if (process.env.POSTHOG_PROJECT_TOKEN) {
        const host=(process.env.POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/$/,'');
        try { const r=await fetch(`${host}/i/v0/e/`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:process.env.POSTHOG_PROJECT_TOKEN,event:data.event,timestamp:new Date(timestamp).toISOString(),properties:{...properties,distinct_id:data.distinctId}})}); results.push(['posthog',r.ok]); } catch { results.push(['posthog',false]); }
      }
      if (process.env.AMPLITUDE_API_KEY) {
        const host=process.env.AMPLITUDE_REGION==='eu'?'https://api.eu.amplitude.com':'https://api2.amplitude.com';
        try { const r=await fetch(`${host}/2/httpapi`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({api_key:process.env.AMPLITUDE_API_KEY,events:[{user_id:data.distinctId,event_type:data.event,time:timestamp,event_id:timestamp,event_properties:properties,insert_id:randomUUID()}]})}); results.push(['amplitude',r.ok]); } catch { results.push(['amplitude',false]); }
      }
      return send(res,202,{accepted:results.filter(([,ok])=>ok).map(([name])=>name),configured:results.map(([name])=>name)});
    } catch { return send(res,400,{error:'Invalid analytics event.'}); }
  }
  if (url.pathname.startsWith('/api/')) return send(res,404,{error:'Not found'});
  try { const html=await readFile(path.join(root,'public','index.html'),'utf8'); return send(res,200,html,'text/html; charset=utf-8'); } catch { return send(res,500,'Website files are missing.','text/plain; charset=utf-8'); }
});

async function seedMixpanelCat2() {
  if (process.env.MIXPANEL_DEMO_SEED !== 'cat2-funnel-once' || !process.env.MIXPANEL_PROJECT_TOKEN) return;
  const now = Date.now() - 6 * 60 * 60 * 1000;
  const events = [];
  for (let i = 1; i <= 50; i++) {
    const distinctId = 'cat2_demo_visitor_' + String(i).padStart(3, '0');
    const startedAt = now - Math.floor((i - 1) / 10) * 24 * 60 * 60 * 1000 + (i % 10) * 17 * 60 * 1000;
    const add = (event, time) => events.push({ event, properties: {
      token: process.env.MIXPANEL_PROJECT_TOKEN,
      distinct_id: distinctId,
      time: Math.floor(time / 1000),
      $insert_id: 'cat2-demo-' + i + '-' + event,
      demo_dataset: true,
      demo_source: 'CAT2 synthetic funnel sample',
      page: 'CAT2_SYNTHETIC_DEMO',
      service: 'synthetic_demo',
      entry_point: 'CAT2_SYNTHETIC_DEMO'
    }});
    add('page_viewed', startedAt);
    if (i <= 30) add('booking_form_started', startedAt + 2 * 60 * 1000);
    if (i <= 12) add('booking_submitted', startedAt + 7 * 60 * 1000);
  }
  events.sort((a, b) => a.properties.time - b.properties.time);
  let accepted = 0;
  for (let i = 0; i < events.length; i += 20) {
    const response = await fetch('https://api.mixpanel.com/track?verbose=1', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(events.slice(i, i + 20))
    });
    const result = await response.text();
    if (!response.ok) throw new Error('Mixpanel returned HTTP ' + response.status);
    const statuses = JSON.parse(result);
    accepted += statuses.filter(item => item.status === 1).length;
  }
  console.log('CAT2 synthetic funnel sample imported to Mixpanel: ' + accepted + '/' + events.length);
}

app.listen(port,'0.0.0.0',()=>{console.log(`Appliance Circle listening on ${port}`); seedMixpanelCat2().catch(error=>console.error('CAT2 synthetic funnel import failed:',error.message));});
