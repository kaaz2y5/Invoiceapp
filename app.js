const STORAGE_KEY = 'invoiceRecords';
const itemsRoot = document.getElementById('items');
const itemTemplate = document.getElementById('itemTemplate');
const invoiceNumber = document.getElementById('invoiceNumber');
const invoiceDate = document.getElementById('invoiceDate');
const signaturePad = document.getElementById('signaturePad');
const signatureCtx = signaturePad.getContext('2d');
const photoInput = document.getElementById('photoInput');
const photoPreview = document.getElementById('photoPreview');
let currentPhoto = '';
let isSigning = false;
let signatureHasInk = false;

const servicePresets = [
  { desc: 'Full Synthetic Oil Change', qty: 1, price: 89.99 },
  { desc: 'Conventional Oil Change', qty: 1, price: 59.99 },
  { desc: 'Air Filter', qty: 1, price: 24.99 },
  { desc: 'Cabin Air Filter', qty: 1, price: 29.99 },
  { desc: 'Wiper Blades', qty: 1, price: 34.99 },
  { desc: 'Tire Pressure Check', qty: 1, price: 0 },
];

const moneyFields = ['taxRate', 'discount', 'disposalFee', 'travelFee'];
const savedFieldIds = [
  'bizName',
  'bizPhone',
  'invoiceNumber',
  'invoiceDate',
  'customerName',
  'customerPhone',
  'vehicle',
  'vin',
  'plate',
  'mileage',
  'oilType',
  'nextService',
  'taxRate',
  'discount',
  'disposalFee',
  'travelFee',
  'paymentStatus',
  'notes',
];

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}

function newInvoiceId() {
  return `INV-${Date.now().toString().slice(-6)}`;
}

function currency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

function dollars(id) {
  return Number(document.getElementById(id).value || 0);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]));
}

function addItem(data = { desc: '', qty: 1, price: 0 }) {
  const row = itemTemplate.content.firstElementChild.cloneNode(true);
  row.querySelector('.desc').value = data.desc || '';
  row.querySelector('.qty').value = data.qty || 1;
  row.querySelector('.price').value = data.price || 0;
  row.querySelector('.remove').addEventListener('click', () => {
    row.remove();
    updateTotals();
  });
  row.addEventListener('input', updateTotals);
  itemsRoot.appendChild(row);
  updateTotals();
}

function getItems() {
  return Array.from(document.querySelectorAll('.item-row')).map((row) => ({
    desc: row.querySelector('.desc').value,
    qty: Number(row.querySelector('.qty').value || 0),
    price: Number(row.querySelector('.price').value || 0),
  }));
}

function calculateTotals() {
  const subtotal = getItems().reduce((sum, item) => sum + item.qty * item.price, 0);
  const fees = dollars('disposalFee') + dollars('travelFee');
  const discount = Math.min(dollars('discount'), subtotal + fees);
  const taxable = Math.max(subtotal + fees - discount, 0);
  const tax = taxable * (dollars('taxRate') / 100);
  return { subtotal, fees, discount, tax, total: taxable + tax };
}

function updateTotals() {
  const totals = calculateTotals();
  document.getElementById('subtotal').textContent = currency(totals.subtotal);
  document.getElementById('fees').textContent = currency(totals.fees);
  document.getElementById('discountTotal').textContent = `-${currency(totals.discount)}`;
  document.getElementById('tax').textContent = currency(totals.tax);
  document.getElementById('total').textContent = currency(totals.total);
}

function setPaymentStatus(status) {
  document.getElementById('paymentStatus').value = status;
  document.getElementById('paymentDisplay').textContent = status;
  document.querySelectorAll('[data-payment]').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.payment === status);
  });
}

function resizeSignaturePad() {
  const image = signatureHasInk ? signaturePad.toDataURL('image/png') : '';
  const rect = signaturePad.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  signaturePad.width = Math.max(rect.width * scale, 1);
  signaturePad.height = Math.max(180 * scale, 1);
  signatureCtx.setTransform(scale, 0, 0, scale, 0, 0);
  signatureCtx.lineWidth = 2.5;
  signatureCtx.lineCap = 'round';
  signatureCtx.strokeStyle = '#0f172a';

  if (image) {
    const saved = new Image();
    saved.onload = () => signatureCtx.drawImage(saved, 0, 0, rect.width, 180);
    saved.src = image;
  }
}

function pointerPosition(event) {
  const rect = signaturePad.getBoundingClientRect();
  const point = event.touches ? event.touches[0] : event;
  return { x: point.clientX - rect.left, y: point.clientY - rect.top };
}

function startSignature(event) {
  event.preventDefault();
  isSigning = true;
  signatureHasInk = true;
  const pos = pointerPosition(event);
  signatureCtx.beginPath();
  signatureCtx.moveTo(pos.x, pos.y);
}

function drawSignature(event) {
  if (!isSigning) return;
  event.preventDefault();
  const pos = pointerPosition(event);
  signatureCtx.lineTo(pos.x, pos.y);
  signatureCtx.stroke();
}

function stopSignature() {
  isSigning = false;
}

function clearSignature() {
  signatureCtx.clearRect(0, 0, signaturePad.width, signaturePad.height);
  signatureHasInk = false;
}

function signatureDataUrl() {
  return signatureHasInk ? signaturePad.toDataURL('image/png') : '';
}

function loadSignature(dataUrl = '') {
  clearSignature();
  if (!dataUrl) return;
  const image = new Image();
  image.onload = () => {
    const rect = signaturePad.getBoundingClientRect();
    signatureCtx.drawImage(image, 0, 0, rect.width, 180);
    signatureHasInk = true;
  };
  image.src = dataUrl;
}

function renderPhoto() {
  photoPreview.innerHTML = currentPhoto ? `<img src="${currentPhoto}" alt="Attached invoice photo" />` : '<p>No photo attached.</p>';
}

function compressPhoto(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 900;
        const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);
        canvas.width = Math.round(image.width * ratio);
        canvas.height = Math.round(image.height * ratio);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function allFields() {
  const totals = calculateTotals();
  const fields = savedFieldIds.reduce((acc, id) => {
    acc[id] = document.getElementById(id).value;
    return acc;
  }, {});

  return {
    ...fields,
    items: getItems(),
    photo: currentPhoto,
    signature: signatureDataUrl(),
    totals,
    updatedAt: new Date().toISOString(),
  };
}

function loadFields(data) {
  if (!data) return;
  savedFieldIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = data[id] || '';
  });
  setPaymentStatus(data.paymentStatus || 'Unpaid');
  itemsRoot.innerHTML = '';
  (data.items?.length ? data.items : [{ desc: '', qty: 1, price: 0 }]).forEach(addItem);
  currentPhoto = data.photo || '';
  renderPhoto();
  loadSignature(data.signature || '');
  updateTotals();
}

function getSavedInvoices() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveCurrentInvoice() {
  const current = allFields();
  const all = getSavedInvoices();
  const idx = all.findIndex((x) => x.invoiceNumber === current.invoiceNumber);
  if (idx >= 0) all[idx] = current;
  else all.unshift(current);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  renderSavedList();
  alert('Invoice saved locally on this device.');
}

function deleteInvoice(invoiceNo) {
  const all = getSavedInvoices().filter((x) => x.invoiceNumber !== invoiceNo);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  renderSavedList();
}

function renderSavedList() {
  const root = document.getElementById('savedList');
  const query = document.getElementById('invoiceSearch').value.trim().toLowerCase();
  const all = getSavedInvoices();
  const filtered = all.filter((inv) => {
    const haystack = [
      inv.invoiceNumber,
      inv.customerName,
      inv.customerPhone,
      inv.vehicle,
      inv.vin,
      inv.plate,
      inv.invoiceDate,
      inv.paymentStatus,
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });

  if (!filtered.length) {
    root.innerHTML = `<p>${all.length ? 'No invoices match that search.' : 'No saved invoices yet.'}</p>`;
    return;
  }

  root.innerHTML = filtered
    .map((inv) => {
      const total = inv.totals?.total ?? 0;
      return `<div class="saved-row">
        <div>
          <strong>${escapeHtml(inv.invoiceNumber)}</strong>
          <span>${escapeHtml(inv.customerName || 'No Customer')}</span>
          <span>${escapeHtml(inv.vehicle || 'No Vehicle')}</span>
          <span>${escapeHtml(inv.invoiceDate || '')}</span>
          <span>${escapeHtml(inv.paymentStatus || 'Unpaid')} - ${currency(total)}</span>
        </div>
        <div class="saved-actions">
          <button type="button" data-load="${escapeHtml(inv.invoiceNumber)}">Load</button>
          <button type="button" data-delete="${escapeHtml(inv.invoiceNumber)}" class="remove">Delete</button>
        </div>
      </div>`;
    })
    .join('');

  root.querySelectorAll('[data-load]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const invoice = all.find((x) => x.invoiceNumber === btn.dataset.load);
      loadFields(invoice);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
  root.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteInvoice(btn.dataset.delete));
  });
}

function resetInvoice() {
  document.getElementById('bizName').value = 'Your Mobile Oil Change';
  document.getElementById('bizPhone').value = '';
  document.getElementById('customerName').value = '';
  document.getElementById('customerPhone').value = '';
  document.getElementById('vehicle').value = '';
  document.getElementById('vin').value = '';
  document.getElementById('plate').value = '';
  document.getElementById('mileage').value = '';
  document.getElementById('oilType').value = '';
  document.getElementById('nextService').value = '';
  document.getElementById('taxRate').value = '0';
  document.getElementById('discount').value = '0';
  document.getElementById('disposalFee').value = '0';
  document.getElementById('travelFee').value = '0';
  document.getElementById('notes').value = '';
  invoiceNumber.value = newInvoiceId();
  invoiceDate.value = new Date().toISOString().slice(0, 10);
  itemsRoot.innerHTML = '';
  addItem({ desc: 'Oil Change', qty: 1, price: 89.99 });
  currentPhoto = '';
  renderPhoto();
  clearSignature();
  setPaymentStatus('Unpaid');
  updateTotals();
}

function renderPresets() {
  const root = document.getElementById('presetActions');
  root.innerHTML = servicePresets
    .map((preset, index) => `<button type="button" class="secondary" data-preset="${index}">${preset.desc}</button>`)
    .join('');
  root.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => addItem(servicePresets[Number(btn.dataset.preset)]));
  });
}

function bindEvents() {
  document.getElementById('addItem').addEventListener('click', () => addItem());
  document.getElementById('saveInvoice').addEventListener('click', saveCurrentInvoice);
  document.getElementById('newInvoice').addEventListener('click', resetInvoice);
  document.getElementById('printInvoice').addEventListener('click', () => window.print());
  document.getElementById('invoiceSearch').addEventListener('input', renderSavedList);
  document.getElementById('clearSignature').addEventListener('click', clearSignature);
  moneyFields.forEach((id) => document.getElementById(id).addEventListener('input', updateTotals));
  document.querySelectorAll('[data-payment]').forEach((btn) => {
    btn.addEventListener('click', () => setPaymentStatus(btn.dataset.payment));
  });

  photoInput.addEventListener('change', async () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    currentPhoto = await compressPhoto(file);
    renderPhoto();
  });

  signaturePad.addEventListener('mousedown', startSignature);
  signaturePad.addEventListener('mousemove', drawSignature);
  window.addEventListener('mouseup', stopSignature);
  signaturePad.addEventListener('touchstart', startSignature, { passive: false });
  signaturePad.addEventListener('touchmove', drawSignature, { passive: false });
  window.addEventListener('touchend', stopSignature);
  window.addEventListener('resize', resizeSignaturePad);
}

renderPresets();
resizeSignaturePad();
bindEvents();
resetInvoice();
renderSavedList();
