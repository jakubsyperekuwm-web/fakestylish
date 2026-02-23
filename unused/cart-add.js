/* js/cart-add.js — debugująca wersja (wstaw zamiast starego) */
(function(){
  'use strict';

  const CART_KEY = 'stylish_cart_v1';
  const TOAST_ID = 'tiny-add-toast';

  function loadCart(){ try { return JSON.parse(localStorage.getItem(CART_KEY))||[] } catch(e){return []} }
  function saveCart(cart){ try{ localStorage.setItem(CART_KEY, JSON.stringify(cart)); console.log('[cart-add] saved cart, length=', cart.length); } catch(e){ console.error('[cart-add] save error', e); } updateBadge(); }

  function updateBadge(){
    try{
      const cart = loadCart();
      const count = cart.reduce((s,i)=>s+(i.qty||0),0);
      let badge = document.getElementById('site-cart-badge');
      if(!badge){
        const cartBtn = document.querySelector('button, a[href*="cart"], .cart, .shopping-cart, .site-cart');
        const parent = cartBtn ? (cartBtn.closest('button, a') || cartBtn.parentElement) : null;
        if(parent){
          badge = document.createElement('span');
          badge.id = 'site-cart-badge';
          badge.style.cssText = 'display:inline-block; min-width:20px; height:20px; line-height:20px; border-radius:12px; background:#ff3b30; color:#fff; font-size:12px; text-align:center; padding:0 6px; margin-left:8px;';
          parent.appendChild(badge);
        }
      }
      if(badge){ badge.textContent = count>0?count:''; badge.style.display = count>0? 'inline-block':'none'; }
    }catch(e){ console.error('[cart-add] updateBadge error', e); }
  }

  function showToast(text){
    let t = document.getElementById(TOAST_ID);
    if(!t){
      t = document.createElement('div');
      t.id = TOAST_ID;
      t.style.cssText = 'position:fixed; right:20px; bottom:20px; background:#111; color:#fff; padding:10px 14px; border-radius:8px; z-index:9999; opacity:0; transition:opacity .18s';
      document.body.appendChild(t);
    }
    t.textContent = text;
    requestAnimationFrame(()=> t.style.opacity = '1');
    clearTimeout(t._h);
    t._h = setTimeout(()=> t.style.opacity = '0', 1200);
  }

  function parsePrice(text){
    if(!text) return 0;
    const m = (text+'').replace(/\u00A0/g,' ').match(/[\d\s\.,]+/);
    if(!m) return 0;
    let num = m[0].trim().replace(/\s+/g,'').replace(',','.');
    num = parseFloat(num);
    return isNaN(num)?0:Math.round(num);
  }

  function addToCartObject(item){
    console.log('[cart-add] addToCartObject', item);
    const cart = loadCart();
    const id = item.id || (item.title ? item.title.toLowerCase().replace(/[^a-z0-9]+/g,'-') : 'p');
    const existing = cart.find(c=>c.id===id);
    if(existing) existing.qty = (existing.qty||0) + (item.qty||1);
    else cart.push({ id, title: item.title||'Produkt', price: item.price||0, qty: item.qty||1, image: item.image||'' });
    saveCart(cart);
    showToast('Dodano do koszyka: ' + (item.title||'Produkt'));
  }

  // ---------- DEBUG helpers ----------
  function logFoundButtons(list){
    console.log('[cart-add] initAddButtons — found', list.length, 'candidates');
    list.forEach((btn,i)=>{
      console.log(`[cart-add] btn[${i}] text="${(btn.textContent||'').trim()}", classes="${btn.className}", tag=${btn.tagName}`, btn);
    });
  }

  // robust selection: consider button text, classes OR data-add-to-cart attribute
// --- rozszerzone wykrywanie przycisków "add to cart" ---
function findAddButtons() {
  const candidates = Array.from(document.querySelectorAll('button, a'));
  const filtered = candidates.filter(el => {
    const txt = (el.textContent || '').trim().toLowerCase();
    if (txt.includes('dodaj do koszyka')) return true;
    if (el.dataset && el.dataset.addToCart) return true;
    const cls = el.className || '';
    if (cls.includes('btn-black') || cls.includes('add-to-cart') || cls.includes('add-cart')) return true;

    // NOWE: przyciski z ikoną wózka (shopping-carriage / shopping-cart)
    try {
      const use = el.querySelector && el.querySelector('svg use');
      if (use) {
        const href = use.getAttribute('xlink:href') || use.getAttribute('href') || '';
        if (href.indexOf('shopping-carriage') !== -1 || href.indexOf('shopping-cart') !== -1) return true;
      }
    } catch (err) {}

    // NOWE: przyciski, które otwierają modal mini-koszyka (data-bs-target="#modallong")
    if (el.getAttribute && el.getAttribute('data-bs-target') === '#modallong') return true;

    return false;
  });
  return filtered;
}


function initAddButtons() {
  const buttons = findAddButtons();
  console.log('[cart-add] found add-buttons:', buttons.length);
  buttons.forEach(btn => {
    if (btn.dataset.cartBound) return;
    btn.dataset.cartBound = '1';

    btn.addEventListener('click', (e) => {
      // nie blokujemy otwierania modala — tylko dodajemy produkt
      try { e.preventDefault(); e.stopPropagation(); } catch (err) {}
      // znajdź kontener produktu
      let el = btn.closest('.product-card, .card, .product, .product-item') || btn.parentElement;
      if (!el) el = document.body;

      // DOBRA PRAKTYKA: jeśli element nie zawiera tytułu/ceny, spróbuj szukać w najbliższym .card-detail
      const titleEl = el.querySelector('.card-title a, .card-title, h3, .product-title, .product-header h4');
      const priceEl = el.querySelector('.card-price, .product-price, .price, span.card-price, .price-code .product-price');
      const imgEl = el.querySelector('img.product-image, img.card-img, img');

      const title = titleEl ? (titleEl.textContent || titleEl.innerText || '').trim() : 'Produkt';
      const price = priceEl ? parsePrice(priceEl.textContent || priceEl.innerText) : 0;
      const image = imgEl ? (imgEl.getAttribute('src') || '') : '';

      // dodaj do koszyka
      addToCart({ title, price, qty: 1, image });

      // opcjonalnie: jeżeli chcesz, aby kliknięcie dalej otwierało modal, usuń preventDefault/stopPropagation wyżej
    }, false);
  });
}

  // Delegated fallback: if buttons are added later or selectors fail, catch clicks on document and inspect target
  document.addEventListener('click', function(e){
    try{
      const t = e.target.closest && e.target.closest('button, a');
      if(!t) return;
      const txt = (t.textContent||'').trim().toLowerCase();
      if(t.dataset.addToCart || txt.includes('dodaj do koszyka') || (t.className && (t.className.includes('btn-black')||t.className.includes('add-to-cart')))){
        // avoid duplicate handling if handler already bound
        if(t.dataset.cartBound) return;
        e.preventDefault(); e.stopPropagation();
        console.log('[cart-add][delegate] captured click on', t);
        // emulate bound handler
        let el = t.closest('.product-card, .card, .product, .product-item, .product-card.position-relative') || t.parentElement;
        if(!el) el = document.body;
        const titleEl = el.querySelector('.card-title a, .product-title a, .product-name a, h3 a, h3, h2, .title');
        const priceEl = el.querySelector('.card-price, .product-price, .price, .card-detail .card-price, [class*=\"price\"]');
        const imgEl = el.querySelector('img.product-image, img.card-img, img');
        const title = titleEl ? (titleEl.textContent||titleEl.innerText||'').trim() : null;
        const price = priceEl ? parsePrice(priceEl.textContent||priceEl.innerText) : 0;
        const image = imgEl ? (imgEl.getAttribute('src')||'') : '';
        console.log('[cart-add][delegate] extracted ->', { title, price, image });
        addToCartObject({ title, price, qty:1, image });
      }
    }catch(err){ /* swallow */ }
  }, true);

  // small init
  document.addEventListener('DOMContentLoaded', function(){
    console.log('[cart-add] DOMContentLoaded -> initAddButtons');
    initAddButtons();
    updateBadge();
    // also run a micro-delay try in case content loads after
    setTimeout(()=>{ try{ initAddButtons(); updateBadge(); }catch(e){} }, 500);
  });

})();
