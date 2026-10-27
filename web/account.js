import { api, bindNavApi, esc, getApiBase, setApiBase } from './api.js';

const KEY = 'qazar.apiKey';
const msg = document.getElementById('msg');
const tierCard = document.getElementById('tier-card');
const tierBody = document.getElementById('tier-body');
const checkoutBtn = document.getElementById('checkout');
const keyInput = document.getElementById('api_key');
const baseInput = document.getElementById('api_base');

keyInput.value = localStorage.getItem(KEY) || '';
baseInput.value = getApiBase();

function setMsg(text, ok) {
  msg.textContent = text;
  msg.className = `msg ${ok ? 'ok' : text ? 'bad' : ''}`;
}

function renderAccount(body) {
  tierCard.hidden = false;
  const inflight = body.inflight == null ? 'unlimited' : body.inflight;
  const days = body.baselineDays == null ? 'kept' : `${body.baselineDays}d`;
  tierBody.innerHTML = `
    <div><span class="muted sm">Owner</span><b>${esc(body.ownerId)}</b></div>
    <div><span class="muted sm">Tier</span><b>${esc(body.tier)}</b></div>
    <div><span class="muted sm">Page cap</span><b>${esc(body.pageCap)}</b></div>
    <div><span class="muted sm">In-flight</span><b>${esc(inflight)}</b></div>
    <div><span class="muted sm">Baselines</span><b>${esc(days)}</b></div>`;
  checkoutBtn.hidden = !body.checkout || body.tier === 'pro';
}

async function loadAccount() {
  const key = keyInput.value.trim();
  const base = baseInput.value.trim();
  if (base) setApiBase(base);
  if (!key) return setMsg('Paste a partner API secret.');
  localStorage.setItem(KEY, key);
  setMsg('Loading…');
  try {
    const body = await api.account(key);
    setMsg('');
    renderAccount(body);
  } catch (e) {
    tierCard.hidden = true;
    setMsg(e.message || 'Could not load account');
  }
}

document.getElementById('load').addEventListener('click', loadAccount);
checkoutBtn.addEventListener('click', async () => {
  try {
    const { url } = await api.checkout(keyInput.value.trim());
    if (url) location.href = url;
    else setMsg('Checkout URL missing');
  } catch (e) {
    setMsg(e.message || 'Checkout failed');
  }
});

bindNavApi();
if (keyInput.value && getApiBase()) loadAccount();
