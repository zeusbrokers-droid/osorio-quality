(() => {
  'use strict';
  const loginView = document.querySelector('#loginView');
  const dashboardView = document.querySelector('#dashboardView');
  const loginForm = document.querySelector('#loginForm');
  const loginError = document.querySelector('#loginError');
  const leadList = document.querySelector('#leadList');
  const emptyState = document.querySelector('#emptyState');
  const filter = document.querySelector('#filter');
  const lastUpdated = document.querySelector('#lastUpdated');
  let leads = [];

  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const phoneDigits = (value) => String(value || '').replace(/\D/g, '');
  const dateText = (value) => new Intl.DateTimeFormat('es-US', { dateStyle:'medium', timeStyle:'short', timeZone:'America/New_York' }).format(new Date(value));
  const badgeClass = (classification) => classification === 'CALIENTE' ? 'hot' : classification === 'TIBIO' ? 'warm' : 'cold';

  function showLogin() {
    loginView.hidden = false;
    dashboardView.hidden = true;
  }

  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
  }

  function render() {
    const selected = filter.value;
    const visible = leads.filter((lead) => selected === 'all' || lead.classification === selected || lead.status === selected);
    document.querySelector('#totalCount').textContent = leads.length;
    document.querySelector('#hotCount').textContent = leads.filter((lead) => lead.classification === 'CALIENTE').length;
    document.querySelector('#newCount').textContent = leads.filter((lead) => lead.status === 'new').length;
    emptyState.hidden = visible.length > 0;
    leadList.innerHTML = visible.map((lead) => {
      const phone = phoneDigits(lead.phone);
      const message = encodeURIComponent(`Hola ${lead.name}, soy del equipo de OSORIO CIGAR'S. Recibimos tu solicitud sobre ${lead.intent_label || lead.intent}.`);
      return `<article class="lead" data-id="${esc(lead.id)}">
        <div class="lead-head">
          <div><h2>${esc(lead.name)}</h2><span class="badge ${badgeClass(lead.classification)}">${esc(lead.classification)}</span></div>
          <strong>${esc(lead.phone)}</strong>
        </div>
        <div class="lead-grid">
          <div class="datum"><small>Interés</small><strong>${esc(lead.intent_label || lead.intent)}</strong></div>
          <div class="datum"><small>Cantidad</small><strong>${esc(lead.quantity || 'No indicada')}</strong></div>
          <div class="datum"><small>Fecha</small><strong>${esc(lead.event_date || 'No indicada')}</strong></div>
          <div class="datum"><small>Ciudad / ZIP</small><strong>${esc(lead.location || 'No indicado')}</strong></div>
          <div class="datum"><small>Horario</small><strong>${esc(lead.contact_time || 'No indicado')}</strong></div>
          <div class="datum"><small>Business ID</small><strong>${esc(lead.business_id)}</strong></div>
        </div>
        <div class="lead-actions">
          <a class="wa" href="https://wa.me/${phone}?text=${message}" target="_blank" rel="noopener">Responder por WhatsApp</a>
          <select class="status" aria-label="Estado del prospecto">
            <option value="new" ${lead.status === 'new' ? 'selected' : ''}>Nuevo</option>
            <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>Contactado</option>
            <option value="closed" ${lead.status === 'closed' ? 'selected' : ''}>Cerrado</option>
          </select>
          <span class="timestamp">${dateText(lead.created_at)}</span>
        </div>
      </article>`;
    }).join('');
  }

  async function loadLeads() {
    const response = await fetch('/api/leads', { cache:'no-store' });
    if (response.status === 401) return showLogin();
    if (!response.ok) throw new Error('No se pudieron cargar los prospectos');
    leads = (await response.json()).leads;
    showDashboard();
    render();
    lastUpdated.textContent = `Actualizado ${new Intl.DateTimeFormat('es-US', { timeStyle:'short' }).format(new Date())}`;
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.textContent = '';
    const response = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ password:loginForm.password.value }) });
    if (!response.ok) {
      loginError.textContent = (await response.json()).error || 'No se pudo iniciar sesión';
      return;
    }
    loginForm.reset();
    await loadLeads();
  });

  leadList.addEventListener('change', async (event) => {
    if (!event.target.classList.contains('status')) return;
    const card = event.target.closest('.lead');
    const response = await fetch(`/api/leads/${encodeURIComponent(card.dataset.id)}/status`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status:event.target.value }) });
    if (response.ok) {
      const lead = leads.find((item) => String(item.id) === card.dataset.id);
      if (lead) lead.status = event.target.value;
      render();
    }
  });

  filter.addEventListener('change', render);
  document.querySelector('#refreshButton').addEventListener('click', () => loadLeads().catch(() => {}));
  document.querySelector('#logoutButton').addEventListener('click', async () => {
    await fetch('/api/logout', { method:'POST' });
    showLogin();
  });

  fetch('/api/session', { cache:'no-store' })
    .then((response) => response.json())
    .then((session) => session.authenticated ? loadLeads() : showLogin())
    .catch(showLogin);

  window.setInterval(() => {
    if (!dashboardView.hidden) loadLeads().catch(() => {});
  }, 30000);
})();
