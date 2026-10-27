(() => {
  'use strict';
  const form = document.querySelector('#qrForm');
  const type = document.querySelector('#qrType');
  const businessId = document.querySelector('#businessId');
  const customWrap = document.querySelector('#customWrap');
  const customValue = document.querySelector('#customValue');
  const target = document.querySelector('#qrcode');
  const idLabel = document.querySelector('#qrId');
  const description = document.querySelector('#qrDescription');

  function buildPayload() {
    const id = businessId.value.trim() || 'OSORIO-CIGARS-MIA-001';
    const web = `${window.location.origin}/?business=${encodeURIComponent(id)}`;
    if (type.value === 'whatsapp') {
      description.textContent = 'Abre una conversación con OSORIO CIGAR\'S por WhatsApp';
      return `https://wa.me/17865470805?text=${encodeURIComponent(`Hola, encontré OSORIO CIGAR'S mediante el QR ${id}. Quiero información.`)}`;
    }
    if (type.value === 'website') {
      description.textContent = 'Abre la web para clientes de OSORIO CIGAR\'S';
      return web;
    }
    if (type.value === 'custom') {
      description.textContent = 'Enlace personalizado de OSORIO CIGAR\'S';
      return customValue.value.trim() || web;
    }
    description.textContent = 'Contacto comercial de OSORIO CIGAR\'S';
    return [
      'BEGIN:VCARD',
      'VERSION:3.0',
      "FN:OSORIO CIGAR'S",
      'ORG:Osorio Signature LLC',
      'TEL;TYPE=CELL:+17865470805',
      'EMAIL:info@osoriocigar.com',
      `URL:${window.location.origin}`,
      `UID:${id}`,
      'NOTE:Puros premium estilo cubano hechos a mano en Miami. Exclusivamente 21+.',
      'END:VCARD'
    ].join('\n');
  }

  function generate(event) {
    if (event) event.preventDefault();
    target.innerHTML = '';
    idLabel.textContent = businessId.value.trim() || 'OSORIO-CIGARS-MIA-001';
    new QRCode(target, { text: buildPayload(), width:256, height:256, colorDark:'#080808', colorLight:'#ffffff', correctLevel:QRCode.CorrectLevel.H });
  }

  type.addEventListener('change', () => {
    customWrap.hidden = type.value !== 'custom';
    generate();
  });
  form.addEventListener('submit', generate);
  document.querySelector('#printButton').addEventListener('click', () => window.print());
  document.querySelector('#downloadButton').addEventListener('click', () => {
    const canvas = target.querySelector('canvas');
    const image = target.querySelector('img');
    const href = canvas ? canvas.toDataURL('image/png') : image?.src;
    if (!href) return;
    const link = document.createElement('a');
    link.download = `${idLabel.textContent}-QR.png`;
    link.href = href;
    link.click();
  });
  generate();
})();
