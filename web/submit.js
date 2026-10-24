import { api, getApiBase, setApiBase } from './api.js';

const $ = (id) => document.getElementById(id);
const msg = $('msg');
const apiStatus = $('api-status');
$('api_base').value = getApiBase();

async function testApi() {
  const base = getApiBase();
  const isHttps = typeof location !== 'undefined' && location.protocol === 'https:';
  const isInsecure = base.startsWith('http://');
  apiStatus.textContent = 'Connecting to ' + base + '…';
  apiStatus.className = 'msg';

  try {
    await api.health();
    apiStatus.textContent = '✓ Connected to ' + base;
    apiStatus.className = 'msg ok';
    $('api_base').value = base;
    return;
  } catch {
    apiStatus.textContent = 'Auto-detecting live qaZAR server…';
    const discovered = await api.autoDiscover();
    if (discovered) {
      apiStatus.textContent = '✓ Auto-connected to live server: ' + discovered;
      apiStatus.className = 'msg ok';
      $('api_base').value = discovered;
      return;
    }

    if (isHttps && isInsecure) {
      apiStatus.textContent = '✗ GitHub Pages (HTTPS) cannot reach insecure HTTP (' + base + '). Run `npm run server` with cloudflared or pass ?api=https://...';
    } else {
      apiStatus.textContent = '✗ Cannot reach ' + base + ' – is the server running?';
    }
    apiStatus.className = 'msg bad';
  }
}
testApi();

$('api-save').addEventListener('click', () => {
  setApiBase($('api_base').value || getApiBase());
  testApi();
});

$('run-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('submit');
  const domain = $('domain').value.trim();
  if (!domain || !$('domain').checkValidity()) {
    msg.textContent = 'Enter a valid domain URL (https://…)';
    msg.className = 'msg bad';
    return;
  }
  btn.disabled = true;
  msg.textContent = 'Submitting…';
  msg.className = 'msg';
  try {
    const { runId } = await api.createRun({
      domain,
      sitemap_url: $('sitemap_url').value.trim(),
      max_pages: Number($('max_pages').value) || 10,
      renderJs: Boolean($('render_js')?.checked),
    });
    location.href = `./results.html?id=${encodeURIComponent(runId)}`;
  } catch (err) {
    msg.textContent = err.message;
    msg.className = 'msg bad';
    btn.disabled = false;
  }
});
