const API = 'https://fakestoreapi.com/products';
const VALID_COUPON = 'SMART10';
const SHIPPING_COST = 50;

let products = [];
let filtered = [];
let banners = [
  'https://img.freepik.com/free-vector/flat-design-shopping-sale-banner-template_23-2149335392.jpg',
  'https://t3.ftcdn.net/jpg/04/65/46/52/240_F_465465254_1pN9MGrA831idD6zIBL7q8rnZZpUCQTy.jpg',
  'https://t3.ftcdn.net/jpg/14/30/99/52/240_F_1430995251_fXkpfB4pWXvnIsLpkaW7hiuMLwTB31PR.jpg',
  'https://img.pikbest.com/templates/20240827/online-shopping-banner-promotion-design_10763837.jpg!w700wp',

];

let bannerIndex = 0;

const reviews = [
  { name: 'Ayesha', rating: 5, comment: 'Great products and fast shipping! Everything updated instantly.', date: '2025-09-12' },
  { name: 'Rashed', rating: 4, comment: 'Good value for money. The balance check is a neat feature.', date: '2025-08-20' },
  { name: 'Imran', rating: 3, comment: 'Okay experience, the shopping cart logic is complex but works.', date: '2025-07-02' },
  { name: 'Jamil', rating: 5, comment: 'Fantastic UI thanks to Tailwind. Very fast loading.', date: '2025-10-01' },
  { name: 'Alam (Ctg)', rating: 4, comment: 'Smooth interface and easy checkout. Would love more local products.', date: '2025-10-15' },
  { name: 'Nasif', rating: 5, comment: 'Amazing experience! The discount feature really helps.', date: '2025-09-28' },
  { name: 'Shahariar', rating: 4, comment: 'Nice layout, responsive design, and simple navigation.', date: '2025-10-10' }
];

let reviewIndex = 0;

const STORAGE_KEY = 'Amar dukan_state_v1';
const DEFAULT_BALANCE = 1000;
let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
if (typeof state.balance !== 'number') state.balance = DEFAULT_BALANCE;
if (!state.cart) state.cart = {};

// --- DOM ---
const el = id => document.getElementById(id);
const productsGrid = el('products-grid');
const cartItems = el('cart-items');
const cartCount = el('cart-count');
const subtotalEl = el('subtotal');
const deliveryEl = el('delivery');
const shippingEl = el('shipping');
const discountEl = el('discount');
const totalEl = el('total');
const userBalanceEl = el('user-balance');
const addMoneyBtn = el('add-money');
const applyCouponBtn = el('apply-coupon');
const couponInput = el('coupon');
const checkoutBtn = el('checkout');
const openCartBtn = el('open-cart');
const bannerImg = el('banner-img');
const nextBanner = el('next-banner');
const prevBanner = el('prev-banner');
const searchInput = el('search');
const sortSelect = el('sort');
const yearSpan = el('year');
const contactForm = el('contact-form');
const thanks = el('contact-thanks');
const backToTop = el('back-to-top');
const mobileToggle = el('mobile-toggle');
const mobileMenu = el('mobile-menu');
const couponMessage = el('coupon-message');
const reviewsContainer = el('reviews-carousel');

// --- Helpers ---
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function escapeHtml(s){ return (s+'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]||c)); }

// --- Balance ---
function renderBalance(){ userBalanceEl.textContent = state.balance.toFixed(2); }
addMoneyBtn.addEventListener('click', ()=>{
    state.balance += 1000;
    saveState();
    renderBalance();
    alert('1000 BDT Added To Your Balance.');
    renderCart();
});

// --- Products ---
async function loadProducts(){
    try{
        const res = await fetch(API);
        products = await res.json();
        products = products.map(p => ({ ...p, price: Math.round(p.price) }));
        filtered = products.slice();
        renderProducts(filtered);
    }catch(e){
        productsGrid.innerHTML = '<div class="p-4 col-span-full text-red-600 font-semibold">Failed to load products.</div>';
        console.error(e);
    }
}

function renderProducts(list){
    productsGrid.innerHTML = '';
    if (!list.length) { productsGrid.innerHTML = '<div class="p-4 col-span-full text-gray-500">No products found.</div>'; return; }
    list.forEach(p=>{
        const card = document.createElement('div');
        card.className = 'bg-white rounded shadow-md p-4 flex flex-col hover:shadow-lg transition duration-300';
        const ratingStar = '⭐'.repeat(Math.round(p.rating?.rate || 0));
        card.innerHTML = `
            <img src="${p.image}" alt="${escapeHtml(p.title)}" class="h-40 object-contain mb-3" />
            <div class="flex-1">
                <h3 class="font-semibold text-sm mb-1 line-clamp-2">${escapeHtml(p.title)}</h3>
                <div class="text-lg font-bold text-indigo-600">${p.price} BDT</div>
                <div class="text-xs text-gray-500">${ratingStar} (${p.rating?.count || 0})</div>
            </div>
            <div class="mt-3">
                <button data-id="${p.id}" class="add-to-cart w-full px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition">Add to Cart</button>
            </div>
        `;
        productsGrid.appendChild(card);
    });
    document.querySelectorAll('.add-to-cart').forEach(btn=>{
        btn.addEventListener('click', e=> addToCart(Number(e.currentTarget.dataset.id)));
    });
}

// --- Search & Sort ---
searchInput.addEventListener('input', applySearchAndSort);
sortSelect.addEventListener('change', applySearchAndSort);
function applySearchAndSort(){
    const q = searchInput.value.trim().toLowerCase();
    filtered = products.filter(p => p.title.toLowerCase().includes(q) || (p.category||'').toLowerCase().includes(q));
    const s = sortSelect.value;
    if (s==='low') filtered.sort((a,b)=>a.price-b.price);
    else if (s==='high') filtered.sort((a,b)=>b.price-a.price);
    renderProducts(filtered);
}

// --- Cart (Sharjil) ---
function addToCart(id){
    const product = products.find(p=>p.id===id);
    if(!product) return;
    const totalAfterAdd = computeTotalWithExtras(computeSubtotal() + product.price);
    if(totalAfterAdd > state.balance){ alert('Adding this item exceeds your balance.'); return; }
    state.cart[id] = (state.cart[id]||0) + 1;
    saveState();
    renderCart();
}

function removeFromCart(id, removeAll=false){
    if(!state.cart[id]) return;
    if(removeAll || state.cart[id] <= 1) delete state.cart[id]; else state.cart[id]--;
    saveState();
    renderCart();
}

function computeSubtotal(){ return Object.keys(state.cart).reduce((s,k)=>{ const p = products.find(x=>x.id===Number(k)); return s + ((p?.price||0)*state.cart[k]); },0); }

function getDeliveryCharge(subtotal){
  if(subtotal==0) return 0;
    if(subtotal<100) return 80;
    else if(subtotal<400) return 70;
    else if(subtotal<500) return 65;
    else if(subtotal===500) return 60;
    else if(subtotal<999) return 50;
    return 0;
}

function computeTotalWithExtras(subtotal, deliveryCharge=getDeliveryCharge(subtotal)){
    let total = subtotal + deliveryCharge + SHIPPING_COST;
    return total - appliedDiscountAmount(total);
}

function renderCart(){
    cartItems.innerHTML = '';
    const ids = Object.keys(state.cart).map(Number);
    if(!ids.length) cartItems.innerHTML = '<div class="text-sm text-gray-500 text-center py-4">Cart is empty.</div>';
    ids.forEach(id=>{
        const qty = state.cart[id];
        const p = products.find(x=>x.id===id) || {title:'Product Removed', price:0};
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 border-b last:border-b-0 py-1';
        row.innerHTML = `
            <div class="flex-1 text-sm">${escapeHtml(p.title)} <div class="text-xs text-gray-500">${qty} × ${p.price} BDT</div></div>
            <div class="flex flex-col gap-1 items-end">
                <div class="flex gap-1">
                    <button data-id="${id}" class="inc text-xs px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300">+</button>
                    <button data-id="${id}" class="dec text-xs px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300">-</button>
                </div>
                <button data-id="${id}" class="remove-all text-xs text-red-500 hover:text-red-700">Remove All</button>
            </div>
        `;
        cartItems.appendChild(row);
    });

    document.querySelectorAll('#cart-items .inc').forEach(b=>b.addEventListener('click', e=> addToCart(Number(e.currentTarget.dataset.id))));
    document.querySelectorAll('#cart-items .dec').forEach(b=>b.addEventListener('click', e=> removeFromCart(Number(e.currentTarget.dataset.id))));
    document.querySelectorAll('#cart-items .remove-all').forEach(b=>b.addEventListener('click', e=> removeFromCart(Number(e.currentTarget.dataset.id), true)));

    const subtotal = computeSubtotal();
    const deliveryCharge = getDeliveryCharge(subtotal);
    const total = computeTotalWithExtras(subtotal, deliveryCharge);
    const discountAmount = appliedDiscountAmount(subtotal + deliveryCharge + SHIPPING_COST);

    subtotalEl.textContent = subtotal.toFixed(2);
    deliveryEl.textContent = deliveryCharge.toFixed(2);
    shippingEl.textContent = SHIPPING_COST.toFixed(2);
    discountEl.textContent = discountAmount.toFixed(2);
    totalEl.textContent = total.toFixed(2);
    cartCount.textContent = ids.reduce((s,id)=>s + state.cart[id],0);

    if(total>state.balance){
        checkoutBtn.disabled=true;
        checkoutBtn.textContent='Insufficient Balance';
        checkoutBtn.classList.remove('bg-green-600','hover:bg-green-700');
        checkoutBtn.classList.add('bg-red-400');
    }else{
        checkoutBtn.disabled=(total<=0);
        checkoutBtn.textContent=(total<=0)?'Cart Empty':'Checkout';
        checkoutBtn.classList.remove('bg-red-400');
        checkoutBtn.classList.add('bg-green-600','hover:bg-green-700');
    }
}

function appliedDiscountAmount(totalBefore){
    const code = (couponInput.value||'').trim().toUpperCase();
    if(code===VALID_COUPON){
      couponMessage.textContent = `Coupon "${VALID_COUPON}" applied! (10% discount)`;;
        couponMessage.className = 'text-xs mt-1 text-green-600 font-semibold';
        return totalBefore * 0.10;
    }
    if(code){
       couponMessage.textContent = `Invalid coupon code. Try "${VALID_COUPON}".`;
        couponMessage.className = 'text-xs mt-1 text-red-500';
    }else couponMessage.textContent = '';
    return 0;
}

applyCouponBtn.addEventListener('click', ()=>renderCart());
checkoutBtn.addEventListener('click', ()=>{
    const total = Number(totalEl.textContent || 0);
    if(total<=0){ alert('Cart is empty.'); return; }
    if(total>state.balance){ alert('Insufficient balance.'); return; }
    state.balance -= total;
    state.cart = {};
    saveState();
    renderBalance();
    renderCart();
   alert(`Checkout successful! ${total.toFixed(2)} BDT deducted.`);
;
});

openCartBtn.addEventListener('click', ()=>window.scrollTo({top: document.querySelector('#products').offsetTop-80, behavior:'smooth'}));

// --- Banner ---
function renderBanner(){ bannerImg.src = banners[bannerIndex % banners.length]; }
nextBanner.addEventListener('click', ()=>{ bannerIndex=(bannerIndex+1)%banners.length; renderBanner(); });
prevBanner.addEventListener('click', ()=>{ bannerIndex=(bannerIndex-1+banners.length)%banners.length; renderBanner(); });
setInterval(()=>{ bannerIndex=(bannerIndex+1)%banners.length; renderBanner(); },4000);

// --- Reviews (Sharjil) ---
function renderReviews(){
    reviewsContainer.innerHTML = '';
    reviewIndex = reviewIndex % reviews.length;
    if(reviewIndex<0) reviewIndex = reviews.length-1;
    const r = reviews[reviewIndex];
    reviewsContainer.innerHTML = `
        <div class="w-full text-center">
            <div class="font-semibold text-lg text-indigo-600">${escapeHtml(r.name)}</div>
            <div class="text-yellow-500 text-2xl mb-2">${'★'.repeat(r.rating)}</div>
            <div class="text-gray-700 italic px-4">"${escapeHtml(r.comment)}"</div>
            <div class="text-xs text-gray-400 mt-2">Reviewed on ${escapeHtml(r.date)}</div>
        </div>
    `;
}
el('next-review').addEventListener('click', ()=>{ reviewIndex++; renderReviews(); });
el('prev-review').addEventListener('click', ()=>{ reviewIndex--; renderReviews(); });
setInterval(()=>{ reviewIndex++; renderReviews(); },6000);

// --- Navbar & Mobile ---
function setupNavLinks(){
    document.querySelectorAll('.menu-link').forEach(a=>a.addEventListener('click', ()=> mobileMenu?.classList.add('hidden')));
}
mobileToggle.addEventListener('click', ()=> mobileMenu.classList.toggle('hidden'));

// --- Contact Form (Sharjil) ---
contactForm.addEventListener('submit', e=>{
    e.preventDefault();
    const name = el('cname').value.trim();
    const email = el('cemail').value.trim();
    const msg = el('cmessage').value.trim();
    if(!name||!email||!msg){ alert('Please fill all fields.'); return; }
    if(!/^\w+([.-]?\w+)@\w+([.-]?\w+)(\.\w{2,3})+$/.test(email)){ alert('Please enter a valid email.'); return; }
    contactForm.reset();
    thanks.classList.remove('hidden');
    setTimeout(()=>{ thanks.classList.add('hidden'); },5000);
});

// --- Back to Top ---
backToTop.addEventListener('click', ()=>window.scrollTo({top:0,behavior:'smooth'}));


document.addEventListener('DOMContentLoaded', ()=>{
    yearSpan.textContent = new Date().getFullYear();
    renderBalance();
    setupNavLinks();
    loadProducts();
    renderCart();
    renderBanner();
    renderReviews();
});
