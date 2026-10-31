const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const DATA = path.join(__dirname, 'data');
const UPLOADS = path.join(__dirname, 'uploads');
fs.mkdirSync(DATA, {recursive:true}); fs.mkdirSync(UPLOADS,{recursive:true});
const dbFile = path.join(DATA,'orders.json');
const knowledgeFile = path.join(__dirname,'knowledge.json');
const knowledge = JSON.parse(fs.readFileSync(knowledgeFile,'utf8'));
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile,'[]');
app.use(cors()); app.use(express.json({limit:'1mb'}));
const upload = multer({dest:UPLOADS, limits:{fileSize:5*1024*1024}});
const menu = [
 {id:'nsala',name:'Ofe Nsala (white soup)',category:'Soup',price:null},
 {id:'olugbo',name:'Ofe Olugbo',category:'Soup',price:null},
 {id:'egusi',name:'Egusi soup',category:'Soup',price:null},
 {id:'oha',name:'Oha soup',category:'Soup',price:null},
 {id:'ogbono',name:'Ogbono soup',category:'Soup',price:null},
 {id:'catfish',name:'Catfish pepper soup',category:'Pepper soup',price:null},
 {id:'noodles',name:'Special noodles',category:'Meals',price:null},
 {id:'shawarma',name:'Shawarma',category:'Meals',price:null}
];
function readOrders(){return JSON.parse(fs.readFileSync(dbFile,'utf8'));}
function saveOrders(v){fs.writeFileSync(dbFile,JSON.stringify(v,null,2));}
app.get('/api/health',(req,res)=>res.json({ok:true,app:'Favorite Restaurant and Bar API'}));
app.get('/api/menu',(req,res)=>res.json({items:menu,note:'Prices are intentionally blank until confirmed from the restaurant price list.'}));
app.get('/api/knowledge',(req,res)=>res.json(knowledge));
app.post('/api/orders',(req,res)=>{
 const {customerName,phone,fulfilment,address,items,total,paymentMethod}=req.body||{};
 if(!phone || !Array.isArray(items) || !items.length) return res.status(400).json({error:'A phone number and at least one order item are required.'});
 const orders=readOrders(); const order={id:'FRB-'+Date.now(),customerName:customerName||'Guest',phone,fulfilment:fulfilment||'Pickup',address:address||'',items,total:Number(total)||0,paymentMethod:paymentMethod||'Bank transfer',status:'Received',createdAt:new Date().toISOString()};
 orders.unshift(order); saveOrders(orders); res.status(201).json({order});
});
app.post('/api/orders/:id/receipt',upload.single('receipt'),(req,res)=>{
 if(!req.file) return res.status(400).json({error:'Upload a receipt image or PDF.'});
 const orders=readOrders(); const o=orders.find(x=>x.id===req.params.id); if(!o) return res.status(404).json({error:'Order not found'});
 o.receiptFile=req.file.filename; o.receiptOriginalName=req.file.originalname; o.status='Receipt submitted'; saveOrders(orders); res.json({ok:true,order:o});
});
// Protect these admin routes before deploying publicly. Set ADMIN_TOKEN in the host environment.
function admin(req,res,next){const token=process.env.ADMIN_TOKEN;if(!token || req.headers.authorization!==`Bearer ${token}`) return res.status(401).json({error:'Admin authentication required'});next();}
app.get('/api/admin/orders',admin,(req,res)=>res.json({orders:readOrders()}));
app.patch('/api/admin/orders/:id',admin,(req,res)=>{const orders=readOrders();const o=orders.find(x=>x.id===req.params.id);if(!o)return res.status(404).json({error:'Order not found'});if(req.body.status)o.status=String(req.body.status);saveOrders(orders);res.json({order:o});});
app.post('/api/assistant', (req,res)=>{
 const q=String(req.body?.message||'').toLowerCase();
 const r=knowledge.restaurant, c=knowledge.technology_company, a=knowledge.app;
 let answer='I am Favourite AI. I can help with the restaurant, its menu, ordering, delivery, payment, ownership and app information. What would you like to know?';
 if(/who (owns|is the owner)|owner|proprietor/.test(q)) answer=`${r.name} is owned by ${r.owner}.`;
 else if(/who (made|built|developed)|developer|master okeke|chibyke global/.test(q)) answer=`The app developer is ${c.developer}, CEO of ${c.name}. The technology company contact email is ${c.contact_email}.`;
 else if(/company|technology company|contact (the )?(developer|company)|email/.test(q)) answer=`The app is developed by ${c.name}. Contact: ${c.contact_email}.`;
 else if(/dream|vision|mission|why (was|is) (the )?app|purpose of (the )?app/.test(q)) answer=`${c.vision} ${a.purpose.join(' ')}`;
 else if(/motto|slogan|satisfaction/.test(q)) answer=`The restaurant motto is: “${r.motto}”`;
 else if(/menu|food|soup|eat|drink/.test(q)) answer='Our website lists Ofe Nsala, Ofe Olugbo, Egusi, Oha and Ogbono soups, catfish pepper soup, special noodles and shawarma, as well as drinks. Please check the live menu for current availability.';
 else if(/price|cost|how much/.test(q)) answer=`Please check the Prices section on our website or contact the restaurant on ${r.phone}. Prices need confirmation from the current restaurant price list.`;
 else if(/order|buy|deliver|pickup|pick up|from far|distance/.test(q)) answer='The app is designed to let customers order food and drinks remotely. You can order through our website, choose pickup or delivery, and provide your phone number and delivery address where needed.';
 else if(/pay|bank|transfer|receipt/.test(q)) answer='The website Payment section explains bank transfer payment. After transferring, send your receipt to the restaurant on WhatsApp. Confirm account details on the live website before paying.';
 else if(/where|location|address/.test(q)) answer=`${r.name} is located in ${r.location}.`;
 else if(/website|web address|url/.test(q)) answer=`You can visit ${r.name} at ${r.website}`;
 res.json({assistant:'Favourite AI',answer,disclaimer:'Automated helper. Confirm orders, prices and payment details with the restaurant.'});
});
app.listen(PORT,()=>console.log(`Favorite Restaurant and Bar API listening on ${PORT}`));
