import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const customers = [
  ['Ananya','05/10/2026','Konanakunte','Dishwasher','Completed','Monthly'],['Rohit','18/10/2026','JP Nagar','Plumbing - leak','Completed','Monthly'],['Meena','01/10/2026','Jayanagar','Dishwasher','Completed','None'],['Karthik','14/10/2026','Banashankari','Plumbing - leak','New','Monthly'],['Divya','15/10/2026','Kengeri','Air conditioner','Scheduled','Monthly'],['Suresh','07/10/2026','Basavanagudi','Washing machine','In progress','Annual'],['Pooja','06/10/2026','Uttarahalli','Water heater','Scheduled','Monthly'],['Manoj','11/10/2026','BTM Layout','Plumbing - drain','Completed','Monthly'],['Lakshmi','24/10/2026','Konanakunte','Plumbing - leak','New','None'],['Arun','08/10/2026','JP Nagar','Dishwasher','Scheduled','None'],['Kavya','24/10/2026','Jayanagar','Plumbing - leak','Scheduled','Monthly'],['Naveen','03/10/2026','Banashankari','Water heater','Completed','Annual'],['Sowmya','15/10/2026','Kengeri','Plumbing - drain','Completed','Monthly'],['Vikram','17/10/2026','Basavanagudi','Plumbing - drain','In progress','Monthly'],['Deepa','11/10/2026','Uttarahalli','Refrigerator','In progress','Annual'],['Harish','05/10/2026','BTM Layout','Plumbing - drain','Completed','Monthly'],['Shruti','28/10/2026','Konanakunte','Plumbing - leak','Completed','None'],['Prasad','17/10/2026','JP Nagar','Dishwasher','Completed','Monthly'],['Rekha','05/10/2026','Jayanagar','Air conditioner','Completed','Monthly'],['Girish','07/10/2026','Banashankari','Water heater','Completed','Annual'],['Nisha','03/10/2026','Kengeri','Washing machine','Completed','Monthly'],['Mahesh','19/10/2026','Basavanagudi','Plumbing - leak','Completed','Annual'],['Bhavana','25/10/2026','Uttarahalli','Water heater','Scheduled','None'],['Sandeep','24/10/2026','BTM Layout','Dishwasher','Completed','Monthly'],['Anitha','16/10/2026','Konanakunte','Plumbing - leak','New','None'],['Ramesh','06/10/2026','JP Nagar','Washing machine','New','None'],['Swathi','06/10/2026','Jayanagar','Plumbing - drain','Completed','Monthly'],['Yogesh','16/10/2026','Banashankari','Dishwasher','Scheduled','Monthly'],['Chitra','12/10/2026','Kengeri','Plumbing - drain','Completed','Annual'],['Dinesh','02/10/2026','Basavanagudi','Water heater','Completed','Monthly']
].map(([name,date,area,service,status,plan], i) => ({id:`sample-${i+1}`,name,date,area,service,status,plan,synthetic:true}));
const funnel = [
  {event:'page_view',label:'Visited the site',users:30},{event:'booking_form_started',label:'Started booking',users:18},{event:'booking_submitted',label:'Submitted request',users:11},{event:'plans_viewed',label:'Viewed plans',users:4},{event:'plan_selected',label:'Selected a plan',users:3},{event:'payment_marked_paid',label:'Marked payment paid',users:2},{event:'technician_assigned',label:'Technician assigned',users:2},{event:'service_completed',label:'Service completed',users:1},{event:'repeat_booking_30d',label:'Repeat booking in 30 days',users:0}
];
const cohorts = [
  {week:'Aug 31',size:81,rates:[100,8.6,8.6,11.1,1.2]},{week:'Sep 07',size:92,rates:[100,20.7,8.7,4.3,5.4]},{week:'Sep 14',size:76,rates:[100,15.8,10.5,6.6,6.6]},{week:'Sep 21',size:100,rates:[100,18,12,10,null]}
];
const technicians = [
  {name:'Rohan Mehta',trade:'Washers & dryers',rating:'4.9',jobs:186,area:'South + Central',availability:'Available today',color:'#e9be5f'},
  {name:'Priya Nair',trade:'Cooling & HVAC',rating:'4.8',jobs:142,area:'West + Central',availability:'Next slot tomorrow',color:'#c0ded4'},
  {name:'Dev Shah',trade:'Refrigeration',rating:'4.7',jobs:98,area:'North + East',availability:'Available today',color:'#efc7a4'},
  {name:'Amit Joshi',trade:'Leaks, drains & water heaters',rating:'4.9',jobs:121,area:'South + East',availability:'Available today',color:'#c7d9b2'}
];
const bookings = [];
const plans = [{id:'monthly',name:'Monthly Booking Pass',price:99,cadence:'month',detail:'Priority booking for everyday home repairs.',tag:'FLEXIBLE'},{id:'annual',name:'Annual Booking Pass',price:3000,cadence:'year',detail:'A year of priority access and peace of mind.',tag:'BEST VALUE'}];

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
  if (url.pathname==='/api/demo-data' && req.method==='GET') return send(res,200,{customers,funnel,cohorts,technicians,plans});
  if (url.pathname==='/api/bookings' && req.method==='GET') return send(res,200,bookings);
  if (url.pathname==='/api/bookings' && req.method==='POST') {
    try {
      const data=await body(req);
      if (!data.name?.trim() || !data.phone?.trim() || !data.area?.trim() || !data.service?.trim()) return send(res,400,{error:'Please fill out all required fields.'});
      const row={id:`AC-${Date.now().toString().slice(-6)}`,name:data.name.trim(),phone:data.phone.trim(),area:data.area.trim(),service:data.service.trim(),date:data.date || new Date().toISOString().slice(0,10),status:'New',plan:'None',synthetic:false};
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
  if (url.pathname.startsWith('/api/')) return send(res,404,{error:'Not found'});
  try { const html=await readFile(path.join(root,'public','index.html'),'utf8'); return send(res,200,html,'text/html; charset=utf-8'); } catch { return send(res,500,'Website files are missing.','text/plain; charset=utf-8'); }
});
app.listen(port,'0.0.0.0',()=>console.log(`Appliance Circle listening on ${port}`));
