/* js/cart-add.js (synchronized version)
   Prosty skrypt dodawania produktów do koszyka (localStorage) z synchronizacją między stronami/kartami.
*/
(function () {
  'use strict';

  const CART_KEY = 'stylish_cart_v1';
  const BADGE_ID = 'site-cart-badge';
  const TOAST_ID = 'tiny-add-toast';

  let bc = null;
  try { if ('BroadcastChannel' in window) bc = new BroadcastChannel('stylish_cart_channel'); } catch (e) { bc = null; }

  function loadCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
  }

  function saveCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { console.error('Błąd zapisu koszyka', e); }
    updateCartBadge();
    try { if (bc) bc.postMessage({ type: 'cart_updated' }); } catch (e) {}
  }

  function formatId(text) { return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

  function parsePrice(text) {
    if (!text) return 0;
    const m = text.replace(/\u00A0/g, ' ').match(/[\d\s\.,]+/);
    if (!m) return 0;
    let num = m[0].trim().replace(/\s+/g, '').replace(',', '.');
    num = parseFloat(num);
    return isNaN(num) ? 0 : Math.round(num);
  }

  function showTinyToast(text) {
    let t = document.getElementById(TOAST_ID);
    if (!t) {
      t = document.createElement('div');
      t.id = TOAST_ID;
      t.style.cssText = 'position:fixed; right:20px; bottom:20px; background:#111; color:#fff; padding:10px 14px; border-radius:8px; box-shadow:0 6px 20px rgba(0,0,0,0.2); z-index:9999; opacity:0; transition:opacity .18s';
      document.body.appendChild(t);
    }
    t.textContent = text;
    requestAnimationFrame(() => t.style.opacity = '1');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.style.opacity = '0', 1200);
  }

  function addToCart(item) {
    const cart = loadCart();
    const id = item.id || formatId(item.title);
    const existing = cart.find(i => i.id === id);
    if (existing) existing.qty = (existing.qty || 0) + (item.qty || 1);
    else cart.push({ id, title: item.title || 'Produkt', price: item.price || 0, qty: item.qty || 1, image: item.image || '' });
    saveCart(cart);
    showTinyToast(`Dodano do koszyka: ${item.title}`);
  }

  function updateCartBadge() {
    const cart = loadCart();
    const count = cart.reduce((s, it) => s + (it.qty || 0), 0);
    let badge = document.getElementById(BADGE_ID);

    if (!badge) {
      const cartBtn = document.querySelector('button, a[href*="cart"], .cart, .shopping-cart, .site-cart') ||
        document.querySelector('button svg use[href*="shopping"], svg use[xlink\\:href*="shopping-cart"], svg use[xlink\\:href*="shopping-carriage"]');
      const parent = cartBtn ? (cartBtn.closest('button, a') || cartBtn.parentElement) : null;
      if (parent) {
        badge = document.createElement('span');
        badge.id = BADGE_ID;
        badge.style.cssText = 'display:inline-block; min-width:20px; height:20px; line-height:20px; border-radius:12px; background:#ff3b30; color:#fff; font-size:12px; text-align:center; padding:0 6px; margin-left:8px;';
        parent.appendChild(badge);
      }
    }

    if (badge) {
      badge.textContent = count > 0 ? count : '';
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }

  function initAddButtons() {
    const candidates = Array.from(document.querySelectorAll('button, a'));
    const buttons = candidates.filter(el => {
      const txt = (el.textContent || '').trim().toLowerCase();
      if (txt.includes('dodaj do koszyka')) return true;
      if (el.classList && (el.classList.contains('btn-black') || el.classList.contains('add-to-cart') || el.classList.contains('add-cart'))) return true;
      return false;
    });

    buttons.forEach(btn => {
      if (btn.dataset.cartBound) return;
      btn.dataset.cartBound = '1';

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        let el = btn.closest('.product-card, .card, .product, .product-item, .product-card.position-relative') || btn.parentElement;
        let climb = 0;
        while (el && climb < 6 && !el.querySelector) { el = el.parentElement; climb++; }
        if (!el) el = document.body;

        const titleEl = el.querySelector('.card-title a, .product-title a, .product-name a, h3 a, h3, h2, .title');
        const title = titleEl ? (titleEl.textContent || titleEl.innerText || '').trim() : 'Produkt';

        const priceEl = el.querySelector('.card-price, .product-price, .price, .card-detail .card-price, .product-price.fs-3, .product-price.fs-6') || el.querySelector('[class*="price"]');
        const price = priceEl ? parsePrice(priceEl.textContent || priceEl.innerText) : 0;

        const imgEl = el.querySelector('img.product-image, img.card-img, img');
        const image = imgEl ? (imgEl.getAttribute('src') || '') : '';

        addToCart({ title, price, qty: 1, image });
      });
    });
  }

  function observeDom() {
    const obs = new MutationObserver(() => { initAddButtons(); updateCartBadge(); });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  function onStorageEvent(e) {
    if (!e) return;
    if (e.key === CART_KEY) {
      try { updateCartBadge(); } catch (err) { }
    }
  }

  function onBroadcastMessage(ev) { try { if (!ev || !ev.data) return; if (ev.data.type === 'cart_updated') updateCartBadge(); } catch (e) {} }

  function init() { initAddButtons(); updateCartBadge(); observeDom(); window.addEventListener('storage', onStorageEvent); if (bc) bc.addEventListener('message', onBroadcastMessage); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  try { window.__stylish_cart_add = { addToCart, loadCart, saveCart, updateCartBadge }; } catch (e) {}

})();
