document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('login-email');
    const roleSelect = document.getElementById('login-role');

    const email = emailInput.value.trim();
    const role = roleSelect.value;

    if (!email || !role) {
      alert('Please enter your email and select a role.');
      return;
    }

    // Store simple session info client-side for now
    try {
      window.localStorage.setItem(
        'ctvrs_session',
        JSON.stringify({ email, role, ts: Date.now() })
      );
    } catch (e) {
      // ignore storage errors
    }

    if (role === 'public') {
      window.location.href = '/reporter.html';
    } else if (role === 'police') {
      window.location.href = '/police.html';
    } else if (role === 'owner') {
      window.location.href = '/owner.html';
    }
  });
});
