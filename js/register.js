// js/register.js — logika rejestracji dla register.html
(function(){
  'use strict';

  const FORM = document.getElementById('register-form');
  const KEY = 'stylish_users_v1';

  function allUsers() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  }

  function saveUsers(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function setError(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
  }

  if (FORM) {
    FORM.addEventListener('submit', (e) => {
      e.preventDefault();

      setError('reg-name-error','');
      setError('reg-email-error','');
      setError('reg-password-error','');
      setError('reg-password2-error','');

      const name = FORM.name.value.trim();
      const email = FORM.email.value.trim();
      const pass = FORM.password.value;
      const pass2 = FORM.password2.value;

      let ok = true;
      if (!name) { setError('reg-name-error','Wprowadź imię i nazwisko.'); ok=false; }
      if (!email) { setError('reg-email-error','Wprowadź email.'); ok=false; }
      if (!pass || pass.length < 6) { setError('reg-password-error','Hasło musi mieć co najmniej 6 znaków.'); ok=false; }
      if (pass !== pass2) { setError('reg-password2-error','Hasła nie są identyczne.'); ok=false; }
      if (!ok) return;

      const users = allUsers();
      if (users.find(u => u.email === email)) {
        setError('reg-email-error','Konto z tym adresem już istnieje.');
        return;
      }

      users.push({ name, email, password: pass });
      saveUsers(users);

      localStorage.setItem('stylish_current_user', JSON.stringify({ email, name }));
      alert('Zarejestrowano pomyślnie.');
      window.location.href = 'index.html';
    });
  }
})();
