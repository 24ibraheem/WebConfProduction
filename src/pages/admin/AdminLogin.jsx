import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'


export default function AdminLogin(){
const [form, setForm] = useState({ username: '', password: '' })
const navigate = useNavigate()


async function submit(){
// Use relative path for API calls (works with proxy in dev and same-origin in prod)
const res = await fetch('/api/admin-login', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) })
if(res.ok) navigate('/admin/dashboard')
else alert('invalid credentials')
}


return (
<div className="min-h-screen flex items-center justify-center bg-slate-950">
<div className="bg-slate-900/50 backdrop-blur-md p-8 rounded-2xl shadow-lg w-[520px] border border-slate-800">
<h2 className="text-2xl font-bold mb-6 text-white">Admin Login</h2>
<input className="w-full bg-slate-950 border border-slate-700 text-white px-4 py-3 rounded-xl mb-4 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-all" placeholder="Username" value={form.username} onChange={e=>setForm({...form, username: e.target.value})} />
<input type="password" className="w-full bg-slate-950 border border-slate-700 text-white px-4 py-3 rounded-xl mb-6 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-all" placeholder="Password" value={form.password} onChange={e=>setForm({...form, password: e.target.value})} />
<div className="flex items-center justify-between">
<button onClick={submit} className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all">Login</button>
<a href="/" className="text-sm text-slate-400 hover:text-white transition-colors">Back to Home</a>
</div>
</div>
</div>
)
}