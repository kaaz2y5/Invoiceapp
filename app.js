const STORAGE_KEY = 'invoiceRecords';
const itemsRoot = document.getElementById('items');
const itemTemplate = document.getElementById('itemTemplate');
const invoiceNumber = document.getElementById('invoiceNumber');
const invoiceDate = document.getElementById('invoiceDate');

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

function addItem(data = { desc: '', qty: 1, price: 0 }) {
  const row = itemTemplate.content.firstElementChild.cloneNode(true);
  row.querySelector('.desc').value = data.desc;
  row.querySelector('.qty').value = data.qty;
  row.querySelector('.price').value = data.price;
  row.querySelector('.remove').addEventListener('click', () => {
    row.remove();
    updateTotals();
  });
  row.addEventListener('input', updateTotals);
  itemsRoot.appendChild(row);
}

function getItems() {
  return Array.from(document.querySelectorAll('.item-row')).map((row) => ({
    desc: row.querySelector('.desc').value,
    qty: Number(row.querySelector('.qty').value || 0),
    price: Number(row.querySelector('.price').value || 0),
  }));
}

function updateTotals() {
  const subtotal = getItems().reduce((sum, i) => sum + i.qty * i.price, 0);
  const total = subtotal;
  document.getElementById('subtotal').textContent = currency(subtotal);
  document.getElementById('total').textContent = currency(total);
}

function allFields() {
  return {
    bizName: document.getElementById('bizName').value,
    bizPhone: document.getElementById('bizPhone').value,
    invoiceNumber: invoiceNumber.value,
    invoiceDate: invoiceDate.value,
    customerName: document.getElementById('customerName').value,
    vehicle: document.getElementById('vehicle').value,
    items: getItems(),
    updatedAt: new Date().toISOString(),
  };
}

function loadFields(data) {
  if (!data) return;
  for (const [key, value] of Object.entries(data)) {
    const el = document.getElementById(key);
    if (el && key !== 'items') el.value = value;
  }
  itemsRoot.innerHTML = '';
  (data.items?.length ? data.items : [{ desc: '', qty: 1, price: 0 }]).forEach(addItem);
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
  const all = getSavedInvoices();
  if (!all.length) {
    root.innerHTML = '<p>No saved invoices yet.</p>';
    return;
  }
  root.innerHTML = all
    .map(
      (inv) => `<div class="saved-row">
        <div><strong>${inv.invoiceNumber}</strong> • ${inv.customerName || 'No Customer'} • ${inv.invoiceDate}</div>
        <div class="saved-actions">
          <button type="button" data-load="${inv.invoiceNumber}">Load</button>
          <button type="button" data-delete="${inv.invoiceNumber}" class="remove">Delete</button>
        </div>
      </div>`
    )
    .join('');

  root.querySelectorAll('[data-load]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const invoice = all.find((x) => x.invoiceNumber === btn.dataset.load);
      loadFields(invoice);
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
  document.getElementById('vehicle').value = '';
  invoiceNumber.value = newInvoiceId();
  invoiceDate.value = new Date().toISOString().slice(0, 10);
  itemsRoot.innerHTML = '';
  addItem({ desc: 'Oil Change', qty: 1, price: 89.99 });
  updateTotals();
}

document.getElementById('addItem').addEventListener('click', () => addItem());
document.getElementById('saveInvoice').addEventListener('click', saveCurrentInvoice);
document.getElementById('newInvoice').addEventListener('click', resetInvoice);
document.getElementById('printInvoice').addEventListener('click', () => window.print());

resetInvoice();
renderSavedList();



