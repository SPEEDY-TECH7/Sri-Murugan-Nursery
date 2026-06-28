/*
Simple Express proxy for server-side Supabase operations.
Usage:
  - Set environment vars:
      SUPABASE_URL
      SUPABASE_SERVICE_ROLE_KEY
      ADMIN_TOKEN (a shared secret for admin endpoints)
  - Install deps: `npm install express @supabase/supabase-js dotenv cors`
  - Run: `node proxy.js`

This server exposes protected admin endpoints and uses the Supabase service_role key
server-side so the key never appears in client code.
*/

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-me';

if(!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY){
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

app.get('/health', (req, res) => res.json({ok:true}));

// Seed products (protected)
app.post('/admin/seed', async (req, res) => {
  const token = req.headers['x-admin-token'];
  if(token !== ADMIN_TOKEN) return res.status(403).json({error:'unauthorized'});
  const products = req.body.products;
  if(!Array.isArray(products)) return res.status(400).json({error:'products array required'});
  try{
    const { error } = await supabaseAdmin.from('products').upsert(products);
    if(error) return res.status(500).json({error: error.message});
    return res.json({ok:true});
  }catch(e){
    return res.status(500).json({error:e.message});
  }
});

// Update order (protected)
app.post('/admin/update-order', async (req, res) => {
  const token = req.headers['x-admin-token'];
  if(token !== ADMIN_TOKEN) return res.status(403).json({error:'unauthorized'});
  const { id, data } = req.body;
  if(!id || !data) return res.status(400).json({error:'id and data required'});
  try{
    const { error } = await supabaseAdmin.from('orders').update(data).eq('id', id);
    if(error) return res.status(500).json({error: error.message});
    return res.json({ok:true});
  }catch(e){
    return res.status(500).json({error:e.message});
  }
});

const port = process.env.PORT || 3000;
app.listen(port, ()=>console.log(`Proxy server listening on ${port}`));
