const crypto = require('node:crypto');

const COOKIE = 'forgelab_admin_session';
const MAX_AGE = 60 * 60 * 8;
const safeEqual = (a, b) => {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
};
const sign = (payload, secret) => crypto.createHmac('sha256', secret).update(payload).digest('base64url');
const makeToken = secret => {
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp: Math.floor(Date.now() / 1000) + MAX_AGE })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
};
const validToken = (token, secret) => {
  if (!token || !secret) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload, secret))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.role === 'admin' && data.exp > Math.floor(Date.now() / 1000);
  } catch { return false; }
};
const cookieValue = req => {
  const raw = req.headers.cookie || '';
  const entry = raw.split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE}=`));
  return entry ? decodeURIComponent(entry.slice(COOKIE.length + 1)) : '';
};
const send = (res, status, body, headers = {}) => {
  res.statusCode = status;
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(body);
};
const loginPage = configured => `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Administração — ForgeLab</title><link rel="stylesheet" href="/assets/site.css"><body class="login-body"><main class="login-shell"><a class="brand" href="/"><span class="brand-mark">F</span><span>FORGELAB <b>STUDIO</b></span></a><section class="login-card"><div class="eyebrow">ÁREA RESTRITA</div><h1>Administração.</h1><p>Esta área é privada. Entre com as credenciais administrativas configuradas no ambiente.</p>${configured ? `<form id="admin-form"><label for="email">E-mail administrativo</label><input id="email" type="email" autocomplete="username" required><label for="password">Senha</label><input id="password" type="password" autocomplete="current-password" required><button class="btn btn-primary btn-full" type="submit">Acessar painel →</button><div class="form-message" id="msg" role="status" hidden></div></form>` : `<div class="form-message">Acesso administrativo ainda não configurado. Defina ADMIN_EMAIL, ADMIN_PASSWORD e ADMIN_SESSION_SECRET nas variáveis de ambiente do projeto.</div>`}<div class="login-divider"></div><a class="back-link" href="/">← Voltar à apresentação</a></section></main>${configured ? `<script>document.getElementById('admin-form').addEventListener('submit',async e=>{e.preventDefault();const msg=document.getElementById('msg');msg.hidden=false;msg.textContent='Verificando acesso…';try{const r=await fetch('/api/admin?action=login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:document.getElementById('email').value,password:document.getElementById('password').value})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Não foi possível entrar');location.href='/admin'}catch(err){msg.textContent=err.message}})</script>` : ''}</body></html>`;

module.exports = (req, res) => {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const configured = Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && secret && secret.length >= 32);
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const action = url.searchParams.get('action');
  const view = url.searchParams.get('view') || 'dashboard';
  if (action === 'login' && req.method === 'POST') {
    if (!configured) return send(res, 503, JSON.stringify({ error: 'A autenticação administrativa não está configurada.' }), { 'content-type': 'application/json' });
    const authenticate = data => {
      if (!safeEqual(data.email || '', process.env.ADMIN_EMAIL) || !safeEqual(data.password || '', process.env.ADMIN_PASSWORD)) {
        return send(res, 401, JSON.stringify({ error: 'E-mail ou senha incorretos.' }), { 'content-type': 'application/json' });
      }
      const token = makeToken(secret);
      return send(res, 200, JSON.stringify({ ok: true }), { 'content-type': 'application/json', 'set-cookie': `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/admin; Max-Age=${MAX_AGE}` });
    };
    if (req.body && typeof req.body === 'object') return authenticate(req.body);
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 8192) req.destroy(); });
    req.on('end', () => {
      try { return authenticate(JSON.parse(body || '{}')); }
      catch { return send(res, 400, JSON.stringify({ error: 'Requisição inválida.' }), { 'content-type': 'application/json' }); }
    });
    return;
  }
  if (action === 'logout' && req.method === 'POST') return send(res, 200, JSON.stringify({ ok: true }), { 'content-type': 'application/json', 'set-cookie': `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/admin; Max-Age=0` });
  if (view === 'login') return send(res, 200, loginPage(configured), { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  if (!configured || !validToken(cookieValue(req), secret)) return send(res, 302, '', { location: '/admin/login', 'cache-control': 'no-store' });
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Painel administrativo — ForgeLab</title><link rel="stylesheet" href="/assets/site.css"><body class="login-body"><main class="login-shell"><a class="brand" href="/"><span class="brand-mark">F</span><span>FORGELAB <b>STUDIO</b></span></a><section class="login-card"><div class="eyebrow">SESSÃO ADMINISTRATIVA</div><h1>Painel restrito.</h1><p>Você está autenticado como administrador. Esta área ainda é a base protegida do painel; os módulos de gestão devem ser conectados às funções administrativas reais antes da operação comercial.</p><div class="form-message">Acesso protegido por sessão assinada. Nenhum dado de usuários, vendas ou receita é exibido sem integração com uma fonte real.</div><button id="logout" class="btn btn-primary btn-full">Sair do painel</button><p><a class="back-link" href="/">Abrir apresentação pública</a></p></section></main><script>document.getElementById('logout').onclick=async()=>{await fetch('/api/admin?action=logout',{method:'POST'});location.href='/admin/login'}</script></body></html>`;
  return send(res, 200, html, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
};
