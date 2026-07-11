import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName } }
      });
      if (error) setError(error.message);
      else onLogin(data.user);
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else onLogin(data.user);
    }
    setLoading(false);
  }

  return (
    <div style={{maxWidth:360, margin:'40px auto', padding:24, border:'1px solid #ddd', borderRadius:12}}>
      <h2>{mode === 'login' ? 'Log In' : 'Sign Up'}</h2>
      <form onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <input placeholder="Full name" value={fullName}
            onChange={e=>setFullName(e.target.value)}
            style={{display:'block', width:'100%', marginBottom:10, padding:8}} />
        )}
        <input type="email" placeholder="Email" value={email}
          onChange={e=>setEmail(e.target.value)} required
          style={{display:'block', width:'100%', marginBottom:10, padding:8}} />
        <input type="password" placeholder="Password" value={password}
          onChange={e=>setPassword(e.target.value)} required
          style={{display:'block', width:'100%', marginBottom:10, padding:8}} />
        {error && <p style={{color:'red', fontSize:13}}>{error}</p>}
        <button type="submit" disabled={loading} style={{width:'100%', padding:10}}>
          {loading ? '...' : (mode === 'login' ? 'Log In' : 'Sign Up')}
        </button>
      </form>
      <p style={{marginTop:12, fontSize:13, textAlign:'center'}}>
        {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
        <a href="#" onClick={()=>setMode(mode==='login'?'signup':'login')}>
          {mode === 'login' ? 'Sign up' : 'Log in'}
        </a>
      </p>
    </div>
  );
}