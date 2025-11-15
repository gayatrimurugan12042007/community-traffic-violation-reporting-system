let map;
let marker;

function goHome() {
  window.location.href = '/';
}

function initMap() {
  map = L.map('map');
  const defaultLatLng = [20.5937, 78.9629];
  map.setView(defaultLatLng, 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
}

function showLocation(lat, lng) {
  if (!map) return;
  if (marker) {
    map.removeLayer(marker);
  }
  map.setView([lat, lng], 15);
  marker = L.marker([lat, lng]).addTo(map);
}

async function loadReports() {
  const tbody = document.querySelector('#reports-table tbody');
  tbody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';

  const resp = await fetch('/api/police/reports/pending');
  const reports = await resp.json();

  tbody.innerHTML = '';
  for (const r of reports) {
    const tr = document.createElement('tr');
    const mediaLinks = (r.mediaFiles || [])
      .map((m) => `<a href="${m}" target="_blank">View</a>`) 
      .join(', ');

    const locButton = r.location && r.location.lat
      ? `<button class="button" onclick="showLocation(${r.location.lat}, ${r.location.lng})">View Map</button>`
      : 'N/A';

    tr.innerHTML = `
      <td>${r._id}</td>
      <td>${r.vehicleNumber}</td>
      <td>${r.violationType}</td>
      <td>${mediaLinks}</td>
      <td>${locButton}</td>
      <td>
        <button class="button approve" onclick="decide('${r._id}', 'Approve')">Approve</button>
        <button class="button reject" onclick="decide('${r._id}', 'Reject')">Reject</button>
      </td>
    `;

    tbody.appendChild(tr);
  }
}

async function decide(id, decision) {
  const fineAmount =
    decision === 'Approve' ? prompt('Enter fine amount in INR (or leave blank):') : null;

  const resp = await fetch(`/api/police/reports/${id}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, fineAmount: fineAmount ? Number(fineAmount) : undefined }),
  });

  const data = await resp.json();
  alert(data.message || 'Decision recorded');
  loadReports();
}

window.addEventListener('load', () => {
  initMap();
  loadReports();
});