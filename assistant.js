(() => {
  'use strict';

  const WHATSAPP_NUMBER = '17865470805';

  const copy = {
    es: {
      online: 'Asistente web · atención inmediata',
      privacy: 'Tus respuestas permanecen en este dispositivo hasta que decidas abrir WhatsApp.',
      intro: '¡Hola! Soy el asistente web de Osorio Quality. Antes de ayudarte con nuestros puros premium, ¿confirmas que tienes 21 años o más?',
      ageYes: 'Sí, tengo 21+',
      ageNo: 'No',
      notEligible: 'Gracias por responder. No podemos ofrecer ni facilitar productos de tabaco a personas menores de 21 años.',
      askName: 'Perfecto. ¿Cuál es tu nombre?',
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
      summaryTitle: 'NUEVO PROSPECTO — OSORIO QUALITY',
      labels: {
        name: 'Cliente',
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
      privacy: 'Your answers stay on this device until you choose to open WhatsApp.',
      intro: 'Hello! I am the Osorio Quality web assistant. Before I help with our premium cigars, can you confirm that you are 21 or older?',
      ageYes: 'Yes, I am 21+',
      ageNo: 'No',
      notEligible: 'Thank you for answering. We cannot offer or facilitate tobacco products to anyone under 21.',
      askName: 'Perfect. What is your name?',
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
      summaryTitle: 'NEW LEAD — OSORIO QUALITY',
      labels: {
        name: 'Customer',
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
