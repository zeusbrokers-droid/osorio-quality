(() => {
  'use strict';

  const WHATSAPP_NUMBER = '17865470805';
  const BUSINESS_ID = (new URLSearchParams(window.location.search).get('business') || 'OSORIO-CIGARS-MIA-001')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 80) || 'OSORIO-CIGARS-MIA-001';

  const copy = {
    es: {
      online: 'Asistente web · atención inmediata',
      privacy: 'Al continuar, tu ficha se registra de forma privada para que el equipo pueda atenderte.',
      intro: 'Antes de ayudarte con nuestros puros premium estilo cubano, ¿confirmas que tienes 21 años o más?',
      ageYes: 'Sí, tengo 21+',
      ageNo: 'No',
      notEligible: 'Gracias por responder. No podemos ofrecer ni facilitar productos de tabaco a personas menores de 21 años.',
      askName: 'Perfecto. ¿Cuál es tu nombre?',
      askPhone: '¿Cuál es tu número de teléfono o WhatsApp?',
      invalidPhone: 'Escribe un número válido con código de área.',
      askIntent: 'Gracias, {name}. ¿Qué estás buscando?',
      intents: {
        personal: 'Compra personal',
        gift: 'Un regalo',
        event: 'Para un evento',
        wholesale: 'Distribución / mayoreo'
      },
      askQuantity: '¿Qué cantidad aproximada necesitas?',
      askDate: '¿Para qué fecha es el evento?',
      askLocation: '¿En qué ciudad o código ZIP necesitas atención?',
      askTime: '¿Cuándo prefieres que el equipo te contacte?',
      times: {
        now: 'Lo antes posible',
        morning: 'En la mañana',
        afternoon: 'En la tarde',
        evening: 'En la noche'
      },
      summaryIntro: 'Listo. Revisa la ficha y envíala por WhatsApp para que el equipo confirme disponibilidad, precio y los próximos pasos.',
      summaryTitle: 'NUEVO PROSPECTO — OSORIO CIGAR\'S',
      labels: {
        name: 'Cliente',
        phone: 'Teléfono / WhatsApp',
        age: '21+ confirmado',
        intent: 'Interés',
        quantity: 'Cantidad aproximada',
        date: 'Fecha',
        location: 'Ciudad / ZIP',
        time: 'Contacto preferido',
        classification: 'Clasificación'
      },
      yes: 'Sí',
      send: 'Continuar en WhatsApp',
      restart: 'Empezar de nuevo',
      inputPlaceholder: 'Escribe tu respuesta',
      next: 'Enviar',
      required: 'Necesito esa respuesta para continuar.',
      legal: 'La confirmación por chat no sustituye la verificación de identificación requerida al completar una venta.'
    },
    en: {
      online: 'Web assistant · immediate response',
      privacy: 'When you continue, your lead card is privately registered so the team can assist you.',
      intro: 'Before I help with our premium Cuban-style cigars, can you confirm that you are 21 or older?',
      ageYes: 'Yes, I am 21+',
      ageNo: 'No',
      notEligible: 'Thank you for answering. We cannot offer or facilitate tobacco products to anyone under 21.',
      askName: 'Perfect. What is your name?',
      askPhone: 'What is your phone or WhatsApp number?',
      invalidPhone: 'Enter a valid number including area code.',
      askIntent: 'Thank you, {name}. What are you looking for?',
      intents: {
        personal: 'Personal purchase',
        gift: 'A gift',
        event: 'For an event',
        wholesale: 'Distribution / wholesale'
      },
      askQuantity: 'Approximately how many do you need?',
      askDate: 'What date is the event?',
      askLocation: 'Which city or ZIP code needs service?',
      askTime: 'When would you prefer the team to contact you?',
      times: {
        now: 'As soon as possible',
        morning: 'Morning',
        afternoon: 'Afternoon',
        evening: 'Evening'
      },
      summaryIntro: 'Done. Review the lead card and send it through WhatsApp so the team can confirm availability, pricing, and next steps.',
      summaryTitle: 'NEW LEAD — OSORIO CIGAR\'S',
      labels: {
        name: 'Customer',
        phone: 'Phone / WhatsApp',
        age: '21+ confirmed',
        intent: 'Interest',
        quantity: 'Approximate quantity',
        date: 'Date',
        location: 'City / ZIP',
        time: 'Preferred contact time',
        classification: 'Classification'
      },
      yes: 'Yes',
      send: 'Continue in WhatsApp',
      restart: 'Start again',
      inputPlaceholder: 'Type your answer',
      next: 'Send',
      required: 'I need that answer to continue.',
      legal: 'Chat confirmation does not replace the ID verification required to complete a sale.'
    }
  };

  const shell = document.querySelector('#oqAssistantShell');
  const body = document.querySelector('#oqAssistantBody');
  const form = document.querySelector('#oqAssistantForm');
  const input = document.querySelector('#oqAssistantInput');
  const submit = document.querySelector('#oqAssistantSubmit');
  const closeButton = document.querySelector('#oqAssistantClose');
  const langButton = document.querySelector('#oqAssistantLang');
  const statusText = document.querySelector('#oqAssistantStatus');
  const privacyText = document.querySelector('#oqAssistantPrivacy');

  if (!shell || !body || !form || !input || !submit || !closeButton || !langButton) return;

  let language = document.documentElement.lang === 'en' ? 'en' : 'es';
  let step = 'age';
  let state = {};

  function t() {
    return copy[language];
  }

  function interpolate(text, values) {
    return Object.entries(values).reduce((result, [key, value]) => result.replace(`{${key}}`, value), text);
  }

  function addMessage(text, who = 'bot') {
    const message = document.createElement('div');
    message.className = `oq-msg ${who}`;
    message.textContent = text;
    body.appendChild(message);
    body.scrollTop = body.scrollHeight;
  }

  function addOptions(options) {
    const wrap = document.createElement('div');
    wrap.className = 'oq-options';
    options.forEach(({ label, value }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'oq-option';
      button.textContent = label;
      button.addEventListener('click', () => handleChoice(value, label));
      wrap.appendChild(button);
    });
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;
  }

  function setFormVisible(visible, type = 'text', placeholder = '') {
    form.hidden = !visible;
    input.type = type;
    input.placeholder = placeholder || t().inputPlaceholder;
    submit.textContent = t().next;
    if (visible) {
      input.value = '';
      window.setTimeout(() => input.focus(), 80);
    }
  }

  function updateChrome() {
    langButton.textContent = language === 'es' ? 'EN' : 'ES';
    statusText.textContent = t().online;
    privacyText.textContent = t().privacy;
    submit.textContent = t().next;
    input.placeholder = t().inputPlaceholder;
  }

  function resetConversation() {
    state = {};
    step = 'age';
    body.innerHTML = '';
    updateChrome();
    setFormVisible(false);
    addMessage(t().intro);
    addOptions([
      { label: t().ageYes, value: 'yes' },
      { label: t().ageNo, value: 'no' }
    ]);
  }

  function openAssistant(event) {
    if (event) event.preventDefault();
    shell.classList.add('is-open');
    shell.setAttribute('aria-hidden', 'false');
    document.body.classList.add('oq-assistant-lock');
    if (!body.children.length) resetConversation();
    closeButton.focus();
  }

  function closeAssistant() {
    shell.classList.remove('is-open');
    shell.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('oq-assistant-lock');
  }

  function askIntent() {
    step = 'intent';
    addMessage(interpolate(t().askIntent, { name: state.name }));
    addOptions(Object.entries(t().intents).map(([value, label]) => ({ value, label })));
  }

  function handleChoice(value, label) {
    addMessage(label, 'user');
    if (step === 'age') {
      if (value === 'no') {
        step = 'done';
        addMessage(t().notEligible);
        setFormVisible(false);
        return;
      }
      state.age = true;
      step = 'name';
      addMessage(t().askName);
      setFormVisible(true, 'text');
      return;
    }

    if (step === 'intent') {
      state.intent = value;
      state.intentLabel = label;
      step = 'quantity';
      addMessage(t().askQuantity);
      setFormVisible(true, 'text');
      return;
    }

    if (step === 'time') {
      state.time = value;
      state.timeLabel = label;
      showSummary();
    }
  }

  function handleText(value) {
    const cleaned = value.trim();
    if (!cleaned) {
      addMessage(t().required);
      return;
    }

    addMessage(cleaned, 'user');
    if (step === 'name') {
      state.name = cleaned.slice(0, 80);
      step = 'phone';
      addMessage(t().askPhone);
      setFormVisible(true, 'tel');
      return;
    }

    if (step === 'phone') {
      if (cleaned.replace(/\D/g, '').length < 7) {
        addMessage(t().invalidPhone);
        return;
      }
      state.phone = cleaned.slice(0, 40);
      setFormVisible(false);
      askIntent();
      return;
    }

    if (step === 'quantity') {
      state.quantity = cleaned.slice(0, 80);
      if (state.intent === 'event') {
        step = 'date';
        addMessage(t().askDate);
        setFormVisible(true, 'date');
      } else {
        step = 'location';
        addMessage(t().askLocation);
        setFormVisible(true, 'text');
      }
      return;
    }

    if (step === 'date') {
      state.date = cleaned;
      step = 'location';
      addMessage(t().askLocation);
      setFormVisible(true, 'text');
      return;
    }

    if (step === 'location') {
      state.location = cleaned.slice(0, 100);
      step = 'time';
      setFormVisible(false);
      addMessage(t().askTime);
      addOptions(Object.entries(t().times).map(([optionValue, optionLabel]) => ({
        value: optionValue,
        label: optionLabel
      })));
    }
  }

  function classifyLead() {
    const quantityNumber = Number.parseInt(String(state.quantity).replace(/[^0-9]/g, ''), 10) || 0;
    return state.intent === 'event' || state.intent === 'wholesale' || quantityNumber >= 10 ? 'CALIENTE' : 'TIBIO';
  }

  function buildSummary() {
    const labels = t().labels;
    const rows = [
      `*${t().summaryTitle}*`,
      `${labels.name}: ${state.name}`,
      `${labels.phone}: ${state.phone}`,
      `${labels.age}: ${t().yes}`,
      `${labels.intent}: ${state.intentLabel}`,
      `${labels.quantity}: ${state.quantity}`
    ];
    if (state.date) rows.push(`${labels.date}: ${state.date}`);
    rows.push(
      `${labels.location}: ${state.location}`,
      `${labels.time}: ${state.timeLabel}`,
      `${labels.classification}: ${classifyLead()}`
    );
    return rows.join('\n');
  }

  function showSummary() {
    step = 'done';
    setFormVisible(false);
    addMessage(t().summaryIntro);

    const card = document.createElement('div');
    card.className = 'oq-summary';
    card.textContent = buildSummary();

    const whatsapp = document.createElement('a');
    whatsapp.className = 'oq-wa-action';
    whatsapp.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildSummary())}`;
    whatsapp.target = '_blank';
    whatsapp.rel = 'noopener';
    whatsapp.textContent = t().send;
    whatsapp.addEventListener('click', () => {
      const payload = {
        name: state.name,
        phone: state.phone,
        language,
        ageConfirmed: true,
        intent: state.intent,
        intentLabel: state.intentLabel,
        quantity: state.quantity,
        date: state.date || '',
        location: state.location,
        time: state.time,
        timeLabel: state.timeLabel,
        classification: classifyLead(),
        source: 'web',
        businessId: BUSINESS_ID
      };
      fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {});
    });

    const disclaimer = document.createElement('p');
    disclaimer.className = 'oq-assistant-disclaimer';
    disclaimer.textContent = t().legal;

    const restart = document.createElement('button');
    restart.type = 'button';
    restart.className = 'oq-restart';
    restart.textContent = t().restart;
    restart.addEventListener('click', resetConversation);

    card.append(whatsapp, disclaimer, restart);
    body.appendChild(card);
    body.scrollTop = body.scrollHeight;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    handleText(input.value);
  });

  closeButton.addEventListener('click', closeAssistant);
  langButton.addEventListener('click', () => {
    language = language === 'es' ? 'en' : 'es';
    resetConversation();
  });

  shell.addEventListener('click', (event) => {
    if (event.target === shell) closeAssistant();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && shell.classList.contains('is-open')) closeAssistant();
  });

  document.querySelectorAll('[data-assistant-open]').forEach((trigger) => {
    trigger.addEventListener('click', openAssistant);
  });

  updateChrome();
})();
