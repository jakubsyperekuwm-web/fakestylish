/* js/cart-add.js
   Robust add-to-cart script (replaces previous).

   Features:
   - detects add buttons (text, classes, svg icon, data-add-to-cart)
   - prefers nearest product card for extraction; avoids using modal lists
   - deduplicates rapid duplicate adds per-tab
   - renders live mini-cart into #mini-cart-items and updates total
   - removal button works reliably (reads dataset or attribute)
*/
(function(){
  'use strict';

  const CART_KEY = 'stylish_cart_v1';
  const BADGE_ID = 'site-cart-badge';
  const TOAST_ID = 'tiny-add-toast';
  const DEDUPE_MS = 800;
  const OBS_DEBOUNCE_MS = 120;

  // helper: load/save
  function loadCart(){ try { return JSON.parse(localStorage.getItem(CART_KEY))||[] } catch(e){ return [] } }
  function saveCart(cart){ try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch(e){} updateCartBadge(); renderMiniCart(); try{ if(window.BroadcastChannel){ new BroadcastChannel('stylish_cart_channel').postMessage({type:'cart_updated'}) }}catch(e){} }

  // ui helpers
  function formatPrice(n){ try { return n.toLocaleString('pl-PL',{style:'currency',currency:'PLN'}); } catch(e){ return n+' zł'; } }
  function showToast(text){ let t=document.getElementById(TOAST_ID); if(!t){ t=document.createElement('div'); t.id=TOAST_ID; t.style.cssText='position:fixed;right:20px;bottom:20px;background:#111;color:#fff;padding:10px 14px;border-radius:8px;z-index:9999;opacity:0;transition:opacity .18s'; document.body.appendChild(t);} t.textContent=text; requestAnimationFrame(()=>t.style.opacity='1'); clearTimeout(t._h); t._h=setTimeout(()=>t.style.opacity='0',1300); }

  function updateCartBadge(){ try{ const cart=loadCart(); const count=cart.reduce((s,i)=>(s+(i.qty||0)),0); let badge=document.getElementById(BADGE_ID); if(!badge){ const cartBtn=document.querySelector('button, a[href*="cart"], .cart, .shopping-cart, .site-cart'); const parent=cartBtn?(cartBtn.closest('button, a')||cartBtn.parentElement):null; if(parent){ badge=document.createElement('span'); badge.id=BADGE_ID; badge.setAttribute('data-stylish-badge','1'); badge.style.cssText='display:inline-block;min-width:20px;height:20px;line-height:20px;border-radius:12px;background:#ff3b30;color:#fff;font-size:12px;text-align:center;padding:0 6px;margin-left:8px;'; parent.appendChild(badge); } } if(badge){ badge.textContent = count>0?count:''; badge.style.display = count>0? 'inline-block':'none'; } }catch(e){console.error(e)} }

  // parsing helpers
  function parsePrice(text){ if(!text) return 0; const m=(text+'').replace(/\u00A0/g,' ').match(/[\d\s\.,]+/); if(!m) return 0; let num=m[0].trim().replace(/\s+/g,'').replace(',','.'); num=parseFloat(num); return isNaN(num)?0:Math.round(num); }
  function slugify(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }

  // dedupe map per-tab
  if(!window.__stylish_recentAdds) window.__stylish_recentAdds = new Map();

  // addToCart with dedupe
  function addToCart(item){
    try{
      if(!item) return;
      const now=Date.now();
      const id = item.id || slugify(item.title||'produkt');
      const last = window.__stylish_recentAdds.get(id) || 0;
      if(now - last < DEDUPE_MS){ console.log('[cart-add] deduped', id); return; }
      window.__stylish_recentAdds.set(id, now);
      // purge old entries occasionally
      try{ for(const [k,t] of window.__stylish_recentAdds){ if(now - t > 5000) window.__stylish_recentAdds.delete(k); } }catch(e){}
      const cart = loadCart();
      const existing = cart.find(i=>i.id===id);
      if(existing) existing.qty = (existing.qty||0) + (item.qty||1);
      else cart.push({ id, title: item.title||'Produkt', price: item.price||0, qty: item.qty||1, image: item.image||'' });
      saveCart(cart);
      showToast('Dodano do koszyka: ' + (item.title||'Produkt'));
      console.log('[cart-add] added', item.title, 'price', item.price);
    }catch(e){ console.error('addToCart error', e); }
  }

  // extraction: prefer nearest card; only use modal if card missing info and modal contains single product
  function extractFromElement(btn){
    // priority: dataset on button
    try{
      if(btn.dataset && (btn.dataset.title || btn.dataset.productId || btn.dataset.price || btn.dataset.image)){
        const t = btn.dataset.title || btn.dataset.productName || btn.dataset.product || null;
        const p = btn.dataset.price ? parsePrice(btn.dataset.price) : 0;
        const id = btn.dataset.productId || btn.dataset.id || slugify(t||'produkt');
        const image = btn.dataset.image || '';
        return { title: t, price: p, image:image, id:id, source:'button-dataset' };
      }
    }catch(e){}

    let card = btn.closest('.product-card, .card, .product, .product-item, .card-detail, .product-detail') || btn.parentElement || null;
    const target = btn.getAttribute && (btn.getAttribute('data-bs-target') || btn.getAttribute('data-target') || btn.getAttribute('data-modal'));
    let modal = null;
    if(target && typeof target === 'string' && target.length){ modal = document.querySelector(target); }

    const titleSelectors = ['.card-title a', '.card-title', '.product-title a', '.product-title', '.product-name a', '.product-name', 'h3 a', 'h3', 'h2', '.title', '.name'];
    const priceSelectors = ['.card-price', '.product-price', '.price', 'span.card-price', '.price-code .product-price', '[class*="price"]'];
    const imgSelectors = ['img.product-image', 'img.card-img', '.product-thumb img', 'img'];

    function extractFromContainer(container){
      if(!container) return { title:null, price:0, image:'' };
      let title=null, price=0, image='';
      for(const s of titleSelectors){ const el=container.querySelector(s); if(el && (el.textContent||el.innerText)){ title=(el.textContent||el.innerText).trim(); break; } }
      for(const s of priceSelectors){ const p=container.querySelector(s); if(p && (p.textContent||p.innerText)){ price = parsePrice(p.textContent||p.innerText); break; } }
      for(const s of imgSelectors){ const i=container.querySelector(s); if(i && i.getAttribute){ const src = i.getAttribute('src') || i.getAttribute('data-src') || i.getAttribute('data-lazy'); if(src){ image = src; break; } } }
      return { title, price, image };
    }

    let info = extractFromContainer(card);
    // if no title found in card and modal exists and has exactly one product detail, use modal
    if((!info.title || info.title.length===0) && modal){
      try{
        const productDetails = modal.querySelectorAll('.product-detail, .product-single, .product-card, .card-detail');
        if(productDetails && productDetails.length === 1){
          info = extractFromContainer(productDetails[0]);
          info.source = 'modal-single';
        } else {
          info.source = 'nearest-card';
        }
      }catch(e){ info.source = 'nearest-card'; }
    } else {
      info.source = 'nearest-card';
    }

    const id = (card && card.dataset && (card.dataset.productId || card.dataset.id || card.dataset.sku)) || (info.title ? slugify(info.title) : null);
    return { title: info.title, price: info.price, image: info.image, id: id, source: info.source };
  }

  // detect add buttons
  function isAddButton(el){
    if(!el) return false;
    try{
      if(el.hasAttribute && el.hasAttribute('data-add-to-cart')) return true;
      const txt = (el.textContent||'').trim().toLowerCase();
      if(txt.includes('dodaj do koszyka') || txt.includes('do koszyka')) return true;
      const cls = el.className||'';
      if(cls.indexOf('btn-black')!==-1 || cls.indexOf('add-to-cart')!==-1 || cls.indexOf('add-cart')!==-1) return true;
      const use = el.querySelector && el.querySelector('svg use');
      if(use){ const href = use.getAttribute('xlink:href') || use.getAttribute('href') || ''; if(href.indexOf('shopping-carriage')!==-1 || href.indexOf('shopping-cart')!==-1) return true; }
      const target = el.getAttribute && (el.getAttribute('data-bs-target') || el.getAttribute('data-target'));
      if(target && String(target).length) return true;
    }catch(e){}
    return false;
  }

  function findAddButtons(){ return Array.from(document.querySelectorAll('button, a')).filter(isAddButton); }

  // bind static buttons
  function initAddButtons(){
    try{
      const buttons = findAddButtons();
      console.log('[cart-add] initAddButtons — found', buttons.length);
      buttons.forEach(btn=>{
        if(btn.dataset.cartBound) return;
        btn.dataset.cartBound = '1';
        btn.addEventListener('click', function(e){
          try{ e.preventDefault(); e.stopPropagation(); }catch(e){}
          const info = extractFromElement(btn);
          if(!info.title && !info.id){ console.warn('[cart-add] no info, ignoring'); return; }
          addToCart({ title: info.title||'Produkt', price: info.price||0, qty:1, image: info.image||'', id: info.id });
        }, false);
      });
    }catch(e){ console.error('initAddButtons error', e); }
  }

  // delegation fallback (capture)
  document.addEventListener('click', function(e){
    try{
      const t = e.target.closest && e.target.closest('button, a');
      if(!t) return;
      if(!isAddButton(t)) return;
      // if already bound, prevent default (to avoid navigation) but don't double-add
      try{ e.preventDefault(); }catch(e){}
      if(t.dataset.cartBound) return;
      const info = extractFromElement(t);
      if(!info.title && !info.id){ console.warn('[cart-add] delegate: no info', t); return; }
      addToCart({ title: info.title||'Produkt', price: info.price||0, qty:1, image: info.image||'', id: info.id });
    }catch(e){}
  }, true);

  // mini-cart render
  function renderMiniCart(){
    try{
      const container = document.getElementById('mini-cart-items');
      if(!container) return;
      const cart = loadCart();
      container.innerHTML = '';
      if(!cart || cart.length===0){
        container.innerHTML = '<div class="text-center py-4">Twój koszyk jest pusty.</div>';
        const totalEl = document.getElementById('mini-cart-total-price');
        if(totalEl) totalEl.textContent = formatPrice(0);
        return;
      }
      cart.forEach(item=>{
        const row = document.createElement('div');
        row.className = 'mini-cart-item d-flex align-items-center py-2 border-bottom';
        row.innerHTML = `
          <div style="width:64px; height:64px; flex:0 0 64px; margin-right:12px;">
            <img src="${item.image || 'images/single-product-thumb1.jpg'}" alt="${(item.title||'').replace(/"/g,'&quot;')}" style="width:100%; height:100%; object-fit:cover; border-radius:6px;" />
          </div>
          <div style="flex:1;">
            <div style="font-weight:700;">${(item.title||'Produkt')}</div>
            <div class="fs-7 text-muted">Ilość: ${item.qty}</div>
          </div>
          <div style="min-width:100px; text-align:right;">
            <div>${formatPrice(item.price * item.qty)}</div>
            <button class="btn btn-link text-danger btn-sm mt-1 mini-remove-btn" data-remove-id="${item.id}" style="padding:0; text-decoration:none;">Usuń</button>
          </div>
        `;
        container.appendChild(row);
      });
      const subtotal = cart.reduce((s,it)=>s + (it.price * it.qty),0);
      const totalEl = document.getElementById('mini-cart-total-price');
      if(totalEl) totalEl.textContent = formatPrice(subtotal);
    }catch(e){ console.error('renderMiniCart error', e); }
  }

  // remove handler robust
  document.addEventListener('click', function(e){
    try{
      const btn = e.target.closest && e.target.closest('.mini-remove-btn');
      if(!btn) return;
      e.preventDefault && e.preventDefault();
      const id = (btn.dataset && btn.dataset.removeId) ? btn.dataset.removeId : (btn.getAttribute && btn.getAttribute('data-remove-id'));
      if(!id) return;
      let cart = loadCart();
      cart = cart.filter(i=>i.id !== id);
      saveCart(cart);
    }catch(e){}
  });

  // MutationObserver debounce for dynamic content
  function observeDom(){
    let t = null;
    const obs = new MutationObserver(function(mutations){
      if(t) clearTimeout(t);
      t = setTimeout(function(){ try{ initAddButtons(); updateCartBadge(); renderMiniCart(); }catch(e){} }, OBS_DEBOUNCE_MS);
    });
    obs.observe(document.body, { childList:true, subtree:true });
  }

  // storage sync
  window.addEventListener('storage', function(e){ if(e.key === CART_KEY){ updateCartBadge(); renderMiniCart(); } });

  // init
  function init(){
    initAddButtons(); updateCartBadge(); renderMiniCart(); observeDom();
    setTimeout(function(){ initAddButtons(); updateCartBadge(); renderMiniCart(); }, 600);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  // expose for debugging
  try{ window.__stylish_cart_add = { addToCart, loadCart, saveCart, updateCartBadge: updateCartBadge, renderMiniCart }; }catch(e){}

})();
