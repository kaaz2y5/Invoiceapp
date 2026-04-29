const itemsRoot = document.getElementById('items');
const itemTemplate = document.getElementById('itemTemplate');
const invoiceNumber = document.getElementById('invoiceNumber');
const invoiceDate = document.getElementById('invoiceDate');
const taxRate = document.getElementById('taxRate');

if (!invoiceNumber.value) {
  invoiceNumber.value = `INV-${Date.now().toString().slice(-6)}`;
}
if (!invoiceDate.value) {
  invoiceDate.value = new Date().toISOString().slice(0, 10);
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
  const tax = subtotal * (Number(taxRate.value || 0) / 100);
  const total = subtotal + tax;
  document.getElementById('subtotal').textContent = currency(subtotal);
  document.getElementById('tax').textContent = currency(tax);
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
    taxRate: taxRate.value,
    items: getItems(),
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

document.getElementById('addItem').addEventListener('click', () => addItem());
document.getElementById('saveDraft').addEventListener('click', () => {
  localStorage.setItem('invoiceDraft', JSON.stringify(allFields()));
  alert('Draft saved on this iPad/browser.');
});
document.getElementById('loadDraft').addEventListener('click', () => {
  loadFields(JSON.parse(localStorage.getItem('invoiceDraft') || 'null'));
});
document.getElementById('printInvoice').addEventListener('click', () => window.print());
taxRate.addEventListener('input', updateTotals);

addItem({ desc: 'Oil Change', qty: 1, price: 89.99 });
updateTotals();
