/* js/cart.js - logika koszyka dla cart.html */

(function(){
  'use strict';

  const CART_KEY = 'stylish_cart_v1';

  function loadCart() {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw) || []; } catch { return []; }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    renderCart();
  }

  function formatPrice(n) {
    return n.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' });
  }

  function calculateTotals(cart) {
    const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);
    const shipping = subtotal === 0 ? 0 : (subtotal >= 500 ? 0 : 20);
    const total = subtotal + shipping;
    const count = cart.reduce((s, it) => s + it.qty, 0);
    return { subtotal, shipping, total, count };
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (m) => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[m]));
  }

  function changeQty(id, delta) {
    const cart = loadCart();
    const idx = cart.findIndex(i => i.id === id);
    if (idx === -1) return;
    cart[idx].qty = Math.max(1, cart[idx].qty + delta);
    saveCart(cart);
  }

  function setQty(id, qty) {
    const cart = loadCart();
    const idx = cart.findIndex(i => i.id === id);
    if (idx === -1) return;
    cart[idx].qty = Math.max(1, qty);
    saveCart(cart);
  }

  function removeItem(id) {
    let cart = loadCart();
    cart = cart.filter(i => i.id !== id);
    saveCart(cart);
  }

  function checkout() {
    const cart = loadCart();
    if (cart.length === 0) {
      alert('Koszyk jest pusty.');
      return;
    }
    alert('Przejście do kasy (symulacja).');
  }

  function attachEvents() {
    document.querySelectorAll('.qty-minus').forEach(btn => btn.onclick = () => changeQty(btn.dataset.id, -1));
    document.querySelectorAll('.qty-plus').forEach(btn => btn.onclick = () => changeQty(btn.dataset.id, +1));
    document.querySelectorAll('.qty-input').forEach(input => input.onchange = () => setQty(input.dataset.id, parseInt(input.value)||1));
    document.querySelectorAll('.remove-item').forEach(btn => btn.onclick = () => removeItem(btn.dataset.id));

    const clearBtn = document.getElementById('clear-cart-btn');
    if (clearBtn) clearBtn.onclick = () => {
      if (confirm('Czy na pewno wyczyścić koszyk?')) {
        localStorage.removeItem(CART_KEY);
        renderCart();
      }
    };

    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) checkoutBtn.onclick = checkout;
  }

  function renderCart() {
    const container = document.getElementById('cart-items-container');
    const emptyInfo = document.getElementById('cart-empty');
    const cart = loadCart();

    container.innerHTML = '';

    if (cart.length === 0) {
      emptyInfo.style.display = 'block';
      container.appendChild(emptyInfo);
    } else {
      emptyInfo.style.display = 'none';
      cart.forEach(item => {
        const el = document.createElement('div');
        el.className = 'cart-item';
        el.dataset.id = item.id;
        el.innerHTML = `
          <img src="${item.image}" alt="${escapeHtml(item.title)}" />
          <div style="flex:1">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <div style="font-weight:700;">${escapeHtml(item.title)}</div>
                <div class="fs-7 text-muted">Kod: ${item.id}</div>
              </div>
              <div class="price">${formatPrice(item.price * item.qty)}</div>
            </div>
            <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
              <div class="qty-controls">
                <button class="btn btn-light btn-sm qty-minus" data-id="${item.id}">−</button>
                <input type="number" class="qty-input" data-id="${item.id}" value="${item.qty}" min="1" style="width:64px; text-align:center; margin:0 8px;" />
                <button class="btn btn-light btn-sm qty-plus" data-id="${item.id}">+</button>
                <button class="btn-empty ms-3 remove-item" data-id="${item.id}">Usuń</button>
              </div>
              <div style="min-width:120px; text-align:right;">
                <div class="fs-7 text-muted">Cena za szt.</div>
                <div class="fw-bold">${formatPrice(item.price)}</div>
              </div>
            </div>
          </div>`;
        container.appendChild(el);
      });
    }

    const totals = calculateTotals(cart);
    document.getElementById('summary-count').textContent = totals.count;
    document.getElementById('summary-subtotal').textContent = formatPrice(totals.subtotal);
    document.getElementById('summary-shipping').textContent = formatPrice(totals.shipping);
    document.getElementById('summary-total').textContent = formatPrice(totals.total);

    attachEvents();
  }

  document.addEventListener('DOMContentLoaded', renderCart);

})();
