function goHome() {
  window.location.href = '/';
}

async function loadFines() {
  const vehicleNumber = document.getElementById('search-vehicle').value.trim();
  if (!vehicleNumber) {
    alert('Enter a vehicle number');
    return;
  }

  const resp = await fetch(`/api/owner/fines?vehicleNumber=${encodeURIComponent(vehicleNumber)}`);
  const fines = await resp.json();

  const tbody = document.getElementById('fines-body');
  tbody.innerHTML = '';

  if (!fines.length) {
    tbody.innerHTML = '<tr><td colspan="5">No fines found</td></tr>';
    return;
  }

  for (const f of fines) {
    const tr = document.createElement('tr');
    const payButton =
      f.status === 'Unpaid'
        ? `<button onclick="payFine('${f._id}')">Pay</button>`
        : 'Paid';

    tr.innerHTML = `
      <td>${f._id}</td>
      <td>${f.vehicleNumber}</td>
      <td>${f.amount}</td>
      <td>${f.status}</td>
      <td>${payButton}</td>
    `;

    tbody.appendChild(tr);
  }
}

async function payFine(id) {
  const method = prompt('Choose payment method (e.g., UPI, Card, NetBanking):', 'UPI');
  if (!method) return;

  const resp = await fetch(`/api/owner/fines/${id}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentMethod: method }),
  });

  const data = await resp.json();
  alert(data.message || 'Payment simulated successfully');
  loadFines();
}