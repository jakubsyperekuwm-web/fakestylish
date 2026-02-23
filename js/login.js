// js/login.js — logika logowania dla login.html
(function(){
  'use strict';

  const FORM = document.getElementById('login-form');
  const KEY = 'stylish_users_v1';

  function findUser(email) {
    try {
      const all = JSON.parse(localStorage.getItem(KEY)) || [];
      return all.find(u => u.email === email);
    } catch {
      return null;
    }
  }

  function setError(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
  }

  if (FORM) {
    FORM.addEventListener('submit', (e) => {
      e.preventDefault();

      setError('login-email-error','');
      setError('login-password-error','');

      const email = FORM.email.value.trim();
      const password = FORM.password.value;

      let ok = true;
      if (!email) { setError('login-email-error','Wprowadź email.'); ok = false; }
      if (!password) { setError('login-password-error','Wprowadź hasło.'); ok = false; }
      if (!ok) return;

      const user = findUser(email);
      if (!user || user.password !== password) {
        alert('Błędny email lub hasło.');
        return;
      }

      localStorage.setItem('stylish_current_user', JSON.stringify({ email: user.email, name: user.name }));
      alert('Zalogowano pomyślnie.');
      window.location.href = 'index.html';
    });
  }
})();
