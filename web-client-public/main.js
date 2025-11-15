// Basic frontend script for public reporter + navigation to portals

let map;
let marker;
let currentCoords = null;

function updateLocationDisplay() {
  const el = document.getElementById('location-display');
  if (!el) return;
  if (!currentCoords) {
    el.textContent = 'Click on the map or drag the marker to pin the location.';
    return;
  }
  const { lat, lng } = currentCoords;
  el.textContent = `Selected location: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function setMarker(lat, lng, options = {}) {
  currentCoords = { lat, lng };
  if (marker) {
    map.removeLayer(marker);
  }
  marker = L.marker([lat, lng], { draggable: true, ...options }).addTo(map);
  marker.on('dragend', () => {
    const pos = marker.getLatLng();
    currentCoords = { lat: pos.lat, lng: pos.lng };
    updateLocationDisplay();
  });
  updateLocationDisplay();
}

function initMap() {
  map = L.map('map');

  // Default center (India approx)
  const defaultLatLng = [20.5937, 78.9629];
  map.setView(defaultLatLng, 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  // Allow the user to manually pick the location by clicking on the map
  map.on('click', (e) => {
    const { lat, lng } = e.latlng;
    setMarker(lat, lng);
    map.setView([lat, lng], 15);
  });

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 15);
        setMarker(latitude, longitude);
      },
      () => {
        console.warn('Geolocation denied; using default center');
        setMarker(defaultLatLng[0], defaultLatLng[1]);
      }
    );
  } else {
    setMarker(defaultLatLng[0], defaultLatLng[1]);
  }
}

function openPolicePortal() {
  window.location.href = '/police.html';
}

function openOwnerPortal() {
  window.location.href = '/owner.html';
}

async function submitReport(event) {
  event.preventDefault();

  const name = document.getElementById('reporter-name').value;
  const email = document.getElementById('reporter-email').value;
  const phone = document.getElementById('reporter-phone').value;
  const vehicleNumber = document.getElementById('vehicle-number').value;
  const violationType = document.getElementById('violation-type').value;
  const description = document.getElementById('description').value;
  const filesInput = document.getElementById('media-files');

  if (!filesInput.files.length) {
    alert('Please attach at least one photo or video.');
    return;
  }

  try {
    // Ensure user exists / register (returns existing user if already registered)
    const registerResp = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone }),
    });

    const registerData = await registerResp.json();
    if (!registerResp.ok || !registerData.userId) {
      alert('Could not register or find reporter: ' + (registerData.error || 'Unknown error'));
      return;
    }

    const formData = new FormData();
    formData.append('reporterId', registerData.userId);
    formData.append('vehicleNumber', vehicleNumber);
    formData.append('violationType', violationType);
    formData.append('description', description);

    if (currentCoords) {
      formData.append('lat', currentCoords.lat);
      formData.append('lng', currentCoords.lng);
    }

    for (const file of filesInput.files) {
      formData.append('mediaFiles', file);
    }

    const resp = await fetch('/api/reports', {
      method: 'POST',
      body: formData,
    });

    const data = await resp.json();
    if (!resp.ok) {
      alert('Error submitting report: ' + (data.error || 'Unknown error'));
    } else {
      alert('Report submitted successfully. Your Report ID: ' + data.reportId);
    }
  } catch (err) {
    console.error(err);
    alert('Unexpected error submitting report.');
  }
}

window.addEventListener('load', () => {
  if (document.getElementById('map')) {
    initMap();
  }

  const reportForm = document.getElementById('report-form');
  if (reportForm) {
    reportForm.addEventListener('submit', submitReport);
  }
});