import { api, getApiBase, setApiBase } from './api.js';

const $ = (id) => document.getElementById(id);
const msg = $('msg');
const apiStatus = $('api-status');
$('api_base').value = getApiBase();

async function testApi() {
  try {
    await api.health();
    apiStatus.textContent = '✓ Connected to ' + getApiBase();
    apiStatus.className = 'msg ok';
  } catch {
    apiStatus.textContent = '✗ Cannot reach ' + getApiBase() + ' – is the server running?';
    apiStatus.className = 'msg bad';
  }
}
testApi();

$('api-save').addEventListener('click', () => {
  setApiBase($('api_base').value || 'http://localhost:8787');
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
