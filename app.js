/**
 * app.js — DealZen SPA Main Logic
 * Pages: Home | Search | Compare | Recommendations | Wishlist | Auth
 * Data comes from API (api.js). Wishlist / viewed / user stored in localStorage.
 */

/* ═══════════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════════ */
const State = {
    currentUser:      JSON.parse(localStorage.getItem('dz_user')    || 'null'),
    wishlist:         JSON.parse(localStorage.getItem('dz_wishlist') || '[]'),
    viewedProducts:   JSON.parse(localStorage.getItem('dz_viewed')  || '[]'),
    searchHistory:    JSON.parse(localStorage.getItem('dz_history') || '[]'),
    currentSort:      'relevance',
    currentSearchResults: [],
    currentCompareProduct: null,
    allProducts:      [],    // cached after first load
    aiPanelOpen:      false,
    aiConversation:   [],
};

function saveState() {
    localStorage.setItem('dz_user',     JSON.stringify(State.currentUser));
    localStorage.setItem('dz_wishlist', JSON.stringify(State.wishlist));
    localStorage.setItem('dz_viewed',   JSON.stringify(State.viewedProducts));
    localStorage.setItem('dz_history',  JSON.stringify(State.searchHistory));
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */
const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');
const stars = (r) => '★'.repeat(Math.floor(r)) + '☆'.repeat(5 - Math.floor(r));

function isWished(id) { return State.wishlist.includes(id); }

function platformColors(name) {
    const map = { Amazon: '#FF9900', Flipkart: '#2874F0', Croma: '#E31837',
                  'Reliance Digital': '#004B8D', 'Vijay Sales': '#E32227' };
    return map[name] || '#7c6ff7';
}

/* ═══════════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════════ */
function showToast(msg, icon = '✓') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${icon}</span> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2700);
}

/* ═══════════════════════════════════════════════════════════════
   NAVIGATION / PAGE ROUTING
═══════════════════════════════════════════════════════════════ */
async function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const pageEl = document.getElementById('page-' + page);
    if (!pageEl) return;
    pageEl.classList.add('active');

    const navMap = { home: 0, search: 1, compare: 2, recommend: 3, wishlist: 4, auth: 5 };
    const links = document.querySelectorAll('.nav-link');
    if (navMap[page] !== undefined && links[navMap[page]]) {
        links[navMap[page]].classList.add('active');
    }

    document.getElementById('site-footer').style.display = page === 'auth' ? 'none' : 'block';

    if (page === 'home')      await renderHome();
    if (page === 'search')    await renderSearchPage();
    if (page === 'compare')   await renderCompare(State.currentCompareProduct?.id || null);
    if (page === 'recommend') await renderRecommendations('all');
    if (page === 'wishlist')  renderWishlist();
    window.scrollTo(0, 0);
}

/* ═══════════════════════════════════════════════════════════════
   SKELETON / LOADING CARDS
═══════════════════════════════════════════════════════════════ */
function skeletonCard() {
    return `<div class="product-card" style="pointer-events:none">
        <div class="product-card-img" style="background:rgba(255,255,255,0.04);animation:pulse 1.5s infinite"></div>
        <div class="product-card-body">
            <div style="height:10px;width:40%;background:rgba(255,255,255,0.06);border-radius:4px;margin-bottom:8px;animation:pulse 1.5s infinite"></div>
            <div style="height:13px;width:85%;background:rgba(255,255,255,0.06);border-radius:4px;margin-bottom:8px;animation:pulse 1.5s infinite"></div>
            <div style="height:20px;width:50%;background:rgba(255,255,255,0.06);border-radius:4px;animation:pulse 1.5s infinite"></div>
        </div>
    </div>`;
}

function showSkeletons(containerId, count = 8) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = Array(count).fill(skeletonCard()).join('');
}

/* ═══════════════════════════════════════════════════════════════
   PRODUCT CARD
═══════════════════════════════════════════════════════════════ */
function productCard(p) {
    const minPrice = p.best_price || (p.prices?.[0]?.price ?? 0);
    const wished   = isWished(p.id);
    const storeCount = p.prices?.length || 0;
    const imgHtml = p.image_url
        ? `<img src="${resolveImage(p.image_url)}" alt="${p.name}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=\\'emoji-fallback\\'>${p.emoji}</span>'" />`
        : `<span class="emoji-fallback">${p.emoji}</span>`;

    return `
    <div class="product-card" id="pcard-${p.id}" onclick="viewProduct(${p.id})">
        <button class="wish-btn ${wished ? 'active' : ''}" onclick="toggleWish(event,${p.id})"
            title="${wished ? 'Remove from wishlist' : 'Add to wishlist'}">♥</button>
        <div class="badge-low">Best Deal</div>
        <div class="product-card-img">${imgHtml}</div>
        <div class="product-card-body">
            <div class="product-card-cat">${p.category}</div>
            <div class="product-card-name">${p.name}</div>
            <div class="product-card-price">${fmt(minPrice)}</div>
            <div class="product-card-from">from ${storeCount} store${storeCount !== 1 ? 's' : ''}</div>
            <div class="product-card-rating">${stars(p.rating)} <span style="color:var(--zen-muted)">${p.rating}</span></div>
        </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   HOME PAGE
═══════════════════════════════════════════════════════════════ */
async function renderHome() {
    showSkeletons('trending-grid', 8);
    showSkeletons('flash-grid',    4);

    try {
        if (!State.allProducts.length) {
            State.allProducts = await API.getProducts();
        }
        const all = State.allProducts;

        const trending = [...all].sort((a, b) => b.rating - a.rating).slice(0, 8);
        const flash    = [...all].sort(() => Math.random() - 0.5).slice(0, 4);

        document.getElementById('trending-grid').innerHTML = trending.map(productCard).join('');
        document.getElementById('flash-grid').innerHTML    = flash.map(productCard).join('');
        updateWishCount();
    } catch (err) {
        document.getElementById('trending-grid').innerHTML =
            `<p class="error-msg">⚠️ Could not load products. Is the Flask server running?<br><code>python backend/app.py</code></p>`;
        document.getElementById('flash-grid').innerHTML = '';
    }
}

/* ═══════════════════════════════════════════════════════════════
   SEARCH PAGE
═══════════════════════════════════════════════════════════════ */
async function renderSearchPage() {
    if (!State.allProducts.length) {
        showSkeletons('results-grid', 6);
        try {
            State.allProducts = await API.getProducts();
        } catch {
            document.getElementById('results-grid').innerHTML =
                `<p class="error-msg">⚠️ Could not reach the backend.</p>`;
            return;
        }
    }
    State.currentSearchResults = [...State.allProducts];
    filterProducts();
}

function doHeroSearch() {
    const q = document.getElementById('hero-search').value.trim();
    if (!q) return;
    State.currentSearchResults = State.allProducts.filter(p =>
        `${p.name} ${p.brand} ${p.category} ${p.description}`.toLowerCase().includes(q.toLowerCase())
    );
    document.getElementById('main-search').value = q;
    addSearchHistory(q);
    showPage('search');
}

function doMainSearch() {
    const q = document.getElementById('main-search').value.trim();
    if (!q) {
        State.currentSearchResults = [...State.allProducts];
    } else {
        addSearchHistory(q);
        State.currentSearchResults = State.allProducts.filter(p =>
            `${p.name} ${p.brand} ${p.category} ${p.description}`.toLowerCase().includes(q.toLowerCase())
        );
    }
    filterProducts();
}

function searchCat(cat) {
    State.currentSearchResults = State.allProducts.filter(p => p.category === cat);
    document.getElementById('main-search').value = cat;
    showPage('search');
}

function filterProducts() {
    const maxPrice  = parseInt(document.getElementById('price-filter')?.value || 300000);
    const priceLabel = document.getElementById('price-max-label');
    if (priceLabel) priceLabel.textContent = '₹' + maxPrice.toLocaleString('en-IN');

    const checkedCats = [...document.querySelectorAll('.cat-filter:checked')].map(c => c.value);
    const minRating   = parseFloat(document.querySelector('input[name="rating-filter"]:checked')?.value || 0);

    let filtered = State.currentSearchResults.filter(p => {
        const minP = p.best_price || 0;
        return minP <= maxPrice && checkedCats.includes(p.category) && p.rating >= minRating;
    });

    // Sort
    if (State.currentSort === 'price_asc')  filtered.sort((a, b) => (a.best_price || 0) - (b.best_price || 0));
    if (State.currentSort === 'price_desc') filtered.sort((a, b) => (b.best_price || 0) - (a.best_price || 0));
    if (State.currentSort === 'rating')     filtered.sort((a, b) => b.rating - a.rating);

    const countEl = document.getElementById('results-count');
    if (countEl) countEl.textContent = `Showing ${filtered.length} product${filtered.length !== 1 ? 's' : ''}`;

    const gridEl = document.getElementById('results-grid');
    if (gridEl) {
        gridEl.innerHTML = filtered.length
            ? filtered.map(productCard).join('')
            : `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--zen-muted)">
                    <div style="font-size:2rem;margin-bottom:0.5rem">🔍</div>
                    <p>No products found. Try adjusting your filters.</p>
               </div>`;
    }
    updateWishCount();
}

function sortProducts(mode, btn) {
    State.currentSort = mode;
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterProducts();
}

/* ═══════════════════════════════════════════════════════════════
   COMPARE PAGE
═══════════════════════════════════════════════════════════════ */
async function renderCompare(productId) {
    const content = document.getElementById('compare-content');
    const zone    = document.getElementById('ai-analysis-zone');
    content.innerHTML = skeletonCard() + skeletonCard();

    try {
        if (!State.allProducts.length) State.allProducts = await API.getProducts();
        const all = State.allProducts;

        // Find product to show
        let p = productId ? all.find(x => x.id === productId) : null;
        if (!p && all.length) p = all[0];
        if (!p) { content.innerHTML = '<p style="color:var(--zen-muted)">No products found.</p>'; return; }

        State.currentCompareProduct = p;

        // Product selector chips (first 9)
        document.getElementById('compare-selector').innerHTML =
            all.slice(0, 9).map(pp => `
                <button onclick="renderCompare(${pp.id})" style="
                    background:${pp.id === p.id ? 'rgba(124,111,247,0.2)' : 'rgba(255,255,255,0.04)'};
                    border:1px solid ${pp.id === p.id ? 'rgba(124,111,247,0.5)' : 'var(--zen-border)'};
                    color:${pp.id === p.id ? 'var(--zen-text)' : 'var(--zen-muted)'};
                    border-radius:100px;font-size:0.8rem;padding:0.35rem 0.9rem;
                    cursor:pointer;font-family:var(--font-body);transition:all 0.15s">
                    ${pp.emoji} ${pp.name.split(' ').slice(0, 2).join(' ')}
                </button>`).join('');

        document.getElementById('compare-sub').textContent =
            `${p.name} — Comparing across ${p.prices.length} platforms`;

        const entries = p.prices; // sorted low→high from backend
        const minPrice = entries[0]?.price || 0;
        const maxPrice = Math.max(...entries.map(e => e.price));

        function priceClass(price) {
            if (price === minPrice) return 'lowest';
            if (price <= minPrice * 1.04) return 'mid';
            return 'high';
        }

        // ── Compare table ──
        let html = `
        <div style="background:var(--zen-card);border:1px solid var(--zen-border);border-radius:var(--radius);overflow:hidden;margin-bottom:1.5rem">
            <div style="display:grid;grid-template-columns:180px repeat(${entries.length},1fr);gap:1px;background:var(--zen-border)">
                <div class="compare-cell label">Platform</div>
                ${entries.map(e => `
                    <div class="compare-cell" style="background:${e.price === minPrice ? 'rgba(61,232,160,0.05)' : 'var(--zen-card)'}">
                        <div class="compare-platform" style="color:${platformColors(e.platform_name)}">
                            ● ${e.platform_name}
                        </div>
                        <div class="compare-price ${priceClass(e.price)}">${fmt(e.price)}</div>
                        ${e.old_price && e.old_price > e.price
                            ? `<div style="font-size:0.72rem;color:var(--zen-muted);text-decoration:line-through">${fmt(e.old_price)}</div>`
                            : ''}
                        ${e.price === minPrice ? '<div class="best-badge">Best Price</div>' : ''}
                    </div>`).join('')}
            </div>

            ${[
                ['Delivery',    entries.map(e => e.platform_name.includes('Croma') || e.platform_name.includes('Reliance') ? '2-3 days' : 'Next Day')],
                ['Free Return', entries.map(e => e.platform_name === 'Amazon' || e.platform_name === 'Flipkart'
                    ? '<span class="tag-yes">✓ Yes</span>' : '<span class="tag-no">✗ No</span>')],
                ['EMI',         entries.map(() => '<span class="tag-yes">✓ Available</span>')],
                ['Warranty',    entries.map(e => e.platform_name.includes('Croma') || e.platform_name.includes('Reliance') ? '1yr + Extra' : '1 Year')],
                ['Cashback',    entries.map(e => e.platform_name === 'Flipkart' ? 'Up to 5%' : e.platform_name === 'Amazon' ? 'Up to 3%' : '—')],
                ['Buy', entries.map(e =>
                    `<a href="${e.buy_link}" target="_blank" rel="noopener"
                        class="buy-btn ${e.price === minPrice ? 'best' : ''}"
                        onclick="event.stopPropagation()">
                        ${e.price === minPrice ? '🏆 Best Deal ↗' : 'Buy Here ↗'}
                     </a>`)],
            ].map(([label, cells]) => `
                <div style="display:grid;grid-template-columns:180px repeat(${entries.length},1fr);gap:1px;background:var(--zen-border)">
                    <div class="compare-cell label">${label}</div>
                    ${cells.map(v => `<div class="compare-cell" style="font-size:0.85rem">${v}</div>`).join('')}
                </div>`).join('')}
        </div>`;

        // ── Price bar chart ──
        html += `<div class="price-bar-section">
            <div class="price-bar-title">📊 Price Comparison Chart</div>
            ${entries.map(e => {
                const pct   = Math.round((e.price / maxPrice) * 100);
                const color = e.price === minPrice ? 'var(--zen-low)' : e.price <= minPrice * 1.04 ? 'var(--zen-mid)' : 'var(--zen-high)';
                return `<div class="bar-item">
                    <div class="bar-label">${e.platform_name}</div>
                    <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
                    <div class="bar-val" style="color:${color}">₹${(e.price / 1000).toFixed(1)}K</div>
                </div>`;
            }).join('')}
        </div>`;

        // ── Product info card ──
        const wished = isWished(p.id);
        html += `
        <div style="background:var(--zen-card);border:1px solid var(--zen-border);border-radius:var(--radius);padding:1.4rem;display:flex;gap:1.2rem;align-items:flex-start;flex-wrap:wrap">
            ${p.image_url
                ? `<img src="${resolveImage(p.image_url)}" style="width:90px;height:90px;object-fit:cover;border-radius:12px;flex-shrink:0">`
                : `<div style="font-size:2.5rem;background:#1c1c28;border-radius:12px;width:90px;height:90px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${p.emoji}</div>`}
            <div style="flex:1;min-width:200px">
                <div style="font-size:0.75rem;color:var(--zen-accent);font-weight:600;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:0.3rem">
                    ${p.category} · ${p.brand}
                </div>
                <div style="font-family:var(--font-head);font-size:1.2rem;font-weight:700;margin-bottom:0.4rem">${p.name}</div>
                <div style="color:var(--zen-muted);font-size:0.88rem;margin-bottom:0.6rem">${p.description || ''}</div>
                <div style="display:flex;gap:0.75rem;align-items:center;flex-wrap:wrap">
                    <span style="color:var(--zen-accent2);font-size:0.9rem">${stars(p.rating)} ${p.rating}/5</span>
                    <button onclick="toggleWish(event,${p.id})" style="
                        background:${wished ? 'rgba(247,108,108,0.15)' : 'rgba(255,255,255,0.05)'};
                        border:1px solid ${wished ? 'rgba(247,108,108,0.4)' : 'var(--zen-border)'};
                        color:${wished ? '#f76c6c' : 'var(--zen-muted)'};
                        border-radius:6px;padding:0.3rem 0.8rem;cursor:pointer;font-size:0.82rem;
                        font-family:var(--font-body);transition:all 0.15s">
                        ${wished ? '♥ Saved' : '♡ Save to Wishlist'}
                    </button>
                </div>
            </div>
        </div>`;

        content.innerHTML = html;

        // AI deal analysis (non-blocking)
        getAIDealAnalysis(p, entries, minPrice);

    } catch (err) {
        content.innerHTML = `<p style="color:var(--zen-muted)">⚠️ Could not load comparison data. ${err.message}</p>`;
    }
}

/* ═══════════════════════════════════════════════════════════════
   RECOMMENDATIONS PAGE
═══════════════════════════════════════════════════════════════ */
async function renderRecommendations(tab) {
    showSkeletons('rec-grid', 8);

    try {
        const recs = await API.getRecommendations(tab === 'all' ? '' : tab);

        document.getElementById('rec-grid').innerHTML = recs.length
            ? recs.map(rec => {
                const p = rec.product;
                const isMatch = rec.match_percent >= 85;
                return `
                <div class="product-card" onclick="viewProduct(${p.id})">
                    <button class="wish-btn ${isWished(p.id) ? 'active' : ''}" onclick="toggleWish(event,${p.id})">♥</button>
                    ${isMatch ? '<div class="badge-low">Top Pick</div>' : ''}
                    <div class="product-card-img">
                        ${p.image_url
                            ? `<img src="${resolveImage(p.image_url)}" alt="${p.name}" loading="lazy">`
                            : `<span class="emoji-fallback">${p.emoji}</span>`}
                    </div>
                    <div class="product-card-body">
                        <div class="product-card-cat">${p.category}</div>
                        <div class="product-card-name">${p.name}</div>
                        <div class="product-card-price">${fmt(p.best_price)}</div>
                        <div class="rec-reason">✦ ${rec.reason}</div>
                        <div class="product-card-rating">${stars(p.rating)} ${p.rating}</div>
                    </div>
                </div>`;
            }).join('')
            : `<div style="grid-column:1/-1;color:var(--zen-muted);padding:2rem 0">No recommendations found for this category yet.</div>`;

        // Recently viewed
        const viewed = State.viewedProducts
            .map(id => State.allProducts.find(p => p.id === id))
            .filter(Boolean)
            .slice(0, 6);

        document.getElementById('viewed-grid').innerHTML = viewed.length
            ? viewed.map(productCard).join('')
            : `<div style="color:var(--zen-muted);font-size:0.9rem">Click on products to build your viewing history.</div>`;

        updateWishCount();
    } catch (err) {
        document.getElementById('rec-grid').innerHTML =
            `<p class="error-msg">⚠️ Could not load recommendations. Is the server running?</p>`;
    }
}

function showRecTab(tab, btn) {
    document.querySelectorAll('.rec-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderRecommendations(tab);
}

/* ═══════════════════════════════════════════════════════════════
   VIEW PRODUCT (track viewed + navigate to compare)
═══════════════════════════════════════════════════════════════ */
function viewProduct(id) {
    const numId = Number(id);
    if (!State.viewedProducts.includes(numId)) {
        State.viewedProducts.unshift(numId);
        if (State.viewedProducts.length > 10) State.viewedProducts.pop();
        saveState();
    }
    State.currentCompareProduct = State.allProducts.find(p => p.id === numId) || null;
    showPage('compare');
}

/* ═══════════════════════════════════════════════════════════════
   WISHLIST
═══════════════════════════════════════════════════════════════ */
function toggleWish(e, id) {
    e.stopPropagation();
    const numId = Number(id);
    if (State.wishlist.includes(numId)) {
        State.wishlist = State.wishlist.filter(x => x !== numId);
        showToast('Removed from wishlist', '💔');
    } else {
        State.wishlist.push(numId);
        showToast('Added to wishlist!', '♥');
    }
    saveState();
    updateWishCount();

    // Refresh wish buttons on current page
    document.querySelectorAll(`[onclick*="toggleWish"]`).forEach(btn => {
        const btnId = parseInt(btn.getAttribute('onclick').match(/\d+/)?.[0]);
        if (btnId === numId) btn.classList.toggle('active', State.wishlist.includes(numId));
    });
}

function renderWishlist() {
    const items = State.wishlist
        .map(id => State.allProducts.find(p => p.id === id))
        .filter(Boolean);

    document.getElementById('wish-sub').textContent = `${items.length} item${items.length !== 1 ? 's' : ''} saved`;

    if (!items.length) {
        document.getElementById('wishlist-items').innerHTML = `
            <div class="wish-empty">
                <div class="wish-empty-icon">💸</div>
                <p>Your wishlist is empty.<br>Save products you love to compare them later!</p>
                <button onclick="showPage('search')" style="background:var(--zen-accent);border:none;color:#fff;border-radius:8px;padding:0.6rem 1.4rem;margin-top:1rem;cursor:pointer;font-family:var(--font-body);font-weight:600">Browse Products</button>
            </div>`;
        return;
    }

    document.getElementById('wishlist-items').innerHTML = items.map(p => {
        const minPrice = p.best_price || 0;
        const imgContent = p.image_url
            ? `<img src="${resolveImage(p.image_url)}" style="width:100%;height:100%;object-fit:cover">`
            : `<span style="font-size:2rem">${p.emoji}</span>`;
        return `
        <div class="wish-item">
            <div class="wish-item-img">${imgContent}</div>
            <div>
                <div class="wish-item-cat">${p.category} · ${p.brand}</div>
                <div class="wish-item-name">${p.name}</div>
                <div class="wish-item-price">${fmt(minPrice)}
                    <span style="font-size:0.75rem;color:var(--zen-muted);font-weight:400">
                        from ${p.prices?.length || 0} stores
                    </span>
                </div>
            </div>
            <div class="wish-item-actions">
                <button class="buy-btn" onclick="viewProduct(${p.id})">Compare →</button>
                <button class="btn-remove" onclick="removeWish(${p.id})">✕ Remove</button>
            </div>
        </div>`;
    }).join('');
}

function removeWish(id) {
    State.wishlist = State.wishlist.filter(x => x !== Number(id));
    saveState();
    updateWishCount();
    renderWishlist();
    showToast('Removed from wishlist', '💔');
}

function updateWishCount() {
    const el = document.getElementById('wish-count');
    if (el) el.textContent = State.wishlist.length;
}

/* ═══════════════════════════════════════════════════════════════
   SEARCH HISTORY
═══════════════════════════════════════════════════════════════ */
function addSearchHistory(q) {
    if (!State.searchHistory.includes(q)) {
        State.searchHistory.unshift(q);
        if (State.searchHistory.length > 10) State.searchHistory.pop();
        saveState();
    }
}

/* ═══════════════════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════════════════════ */
function toggleAuth(mode) {
    document.getElementById('login-form').style.display    = mode === 'login'    ? 'block' : 'none';
    document.getElementById('register-form').style.display = mode === 'register' ? 'block' : 'none';
}

async function doLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-pass').value;
    const alert = document.getElementById('login-alert');

    if (!email || !pass) {
        alert.textContent = 'Please fill in all fields.';
        alert.className = 'alert-zen show error'; return;
    }

    try {
        const res = await API.login({ email, password: pass });
        State.currentUser = res.user;
        saveState();
        alert.textContent = `Welcome back, ${res.user.name}! 👋`;
        alert.className   = 'alert-zen show success';
        document.getElementById('auth-nav-btn').textContent = '👤 ' + res.user.name;
        showToast(`Signed in as ${res.user.name}`, '👋');
        setTimeout(() => showPage('home'), 1200);
    } catch (err) {
        alert.textContent = err.message || 'Login failed.';
        alert.className   = 'alert-zen show error';
    }
}

async function doRegister() {
    const name  = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass  = document.getElementById('reg-pass').value;
    const alert = document.getElementById('reg-alert');

    if (!name || !email || !pass) {
        alert.textContent = 'Please fill in all fields.';
        alert.className = 'alert-zen show error'; return;
    }
    if (pass.length < 8) {
        alert.textContent = 'Password must be at least 8 characters.';
        alert.className = 'alert-zen show error'; return;
    }

    try {
        const res = await API.register({ name, email, password: pass });
        State.currentUser = res.user;
        saveState();
        alert.textContent = `Account created! Welcome to DealZen, ${name}! 🎉`;
        alert.className   = 'alert-zen show success';
        document.getElementById('auth-nav-btn').textContent = '👤 ' + name;
        showToast(`Welcome to DealZen, ${name}!`, '🎉');
        setTimeout(() => showPage('home'), 1300);
    } catch (err) {
        alert.textContent = err.message || 'Registration failed.';
        alert.className   = 'alert-zen show error';
    }
}

function doLogout() {
    State.currentUser = null;
    saveState();
    document.getElementById('auth-nav-btn').textContent = 'Login';
    showToast('Logged out successfully', '👋');
    showPage('home');
}

/* ═══════════════════════════════════════════════════════════════
   AI ASSISTANT PANEL
═══════════════════════════════════════════════════════════════ */
function toggleAI() {
    State.aiPanelOpen = !State.aiPanelOpen;
    document.getElementById('ai-panel').classList.toggle('open', State.aiPanelOpen);
    document.getElementById('ai-fab').textContent = State.aiPanelOpen ? '✕' : '✦';
}

function appendAIMessage(type, text) {
    const container = document.getElementById('ai-messages');
    const div = document.createElement('div');
    div.className = `ai-msg ${type}`;
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function appendAILoading() {
    const container = document.getElementById('ai-messages');
    const id = 'load-' + Date.now();
    const div = document.createElement('div');
    div.className = 'ai-msg bot loading';
    div.id = id;
    div.innerHTML = `<span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return id;
}

async function sendAIMessage() {
    const input = document.getElementById('ai-input');
    const msg   = input.value.trim();
    if (!msg) return;
    input.value = '';
    appendAIMessage('user', msg);
    const loadId = appendAILoading();
    State.aiConversation.push({ role: 'user', content: msg });

    // Build product context from cached products
    const productContext = State.allProducts.map(p =>
        `• ${p.name} (${p.category}, ${p.brand}): best ${fmt(p.best_price)} on ${p.best_platform}, rated ${p.rating}/5`
    ).join('\n');

    const systemPrompt = `You are DealZen AI, a smart Indian e-commerce shopping assistant.
Current catalog:
${productContext}
Rules: Be concise (2-4 sentences). Use ₹ for prices. Reference specific catalog products. Give actionable advice.`;

    try {
        const res = await fetch(API_BASE + '/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system: systemPrompt,
                messages: State.aiConversation,
                max_tokens: 800,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'AI request failed');
        const reply = data.reply || 'No response.';
        State.aiConversation.push({ role: 'assistant', content: reply });
        document.getElementById(loadId)?.remove();
        appendAIMessage('bot', reply);
    } catch (err) {
        document.getElementById(loadId)?.remove();
        appendAIMessage('bot', `⚠️ ${err.message || 'AI unavailable. Add ANTHROPIC_API_KEY to backend/.env and restart Flask.'}`);
    }
}

function sendAIChip(text) {
    document.getElementById('ai-input').value = text;
    sendAIMessage();
}

async function getAIDealAnalysis(product, entries, minPrice) {
    const zone = document.getElementById('ai-analysis-zone');
    zone.innerHTML = `<div class="ai-analysis-card">
        <div class="ai-analysis-title">✦ AI Deal Analysis <span style="font-size:0.8rem;font-weight:400;color:var(--zen-muted)">Analyzing...</span></div>
        <div style="display:flex;gap:6px;align-items:center;padding:0.5rem 0">
            <span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span>
        </div>
    </div>`;

    const bestEntry = entries[0];
    const maxP   = Math.max(...entries.map(e => e.price));
    const savings = maxP - minPrice;

    const prompt = `Analyze this deal for an Indian shopper in 2-3 sentences:
Product: ${product.name} (${product.category})
Prices: ${entries.map(e => `${e.platform_name}: ${fmt(e.price)}`).join(', ')}
Best: ${fmt(minPrice)} on ${bestEntry?.platform_name} (saves ${fmt(savings)})
Rating: ${product.rating}/5
Should they buy now? Which platform? Any caveats?`;

    try {
        const res = await fetch(API_BASE + '/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system: 'You are a concise Indian e-commerce expert. 2-3 sentences. Use ₹.',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 500,
            }),
        });
        const data  = await res.json();
        if (!res.ok) throw new Error(data.error);
        const reply = data.reply || 'Buy from the cheapest platform listed above.';
        zone.innerHTML = `<div class="ai-analysis-card">
            <div class="ai-analysis-title">✦ AI Deal Analysis</div>
            <div class="ai-analysis-body">${reply}</div>
            <div class="ai-verdict">✓ Best buy on ${bestEntry?.platform_name} — saves ${fmt(savings)}</div>
        </div>`;
    } catch {
        zone.innerHTML = `<div class="ai-analysis-card">
            <div class="ai-analysis-title">✦ Deal Summary</div>
            <div class="ai-analysis-body">Best price is ${fmt(minPrice)} on ${bestEntry?.platform_name}.
            You save ${fmt(savings)} compared to the highest listed price. Rated ${product.rating}/5.</div>
            <div class="ai-verdict">✓ Best buy on ${bestEntry?.platform_name} — saves ${fmt(savings)}</div>
        </div>`;
    }
}

/* ═══════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
    // Restore user session in nav
    if (State.currentUser) {
        document.getElementById('auth-nav-btn').textContent = '👤 ' + State.currentUser.name;
    }

    // Auth nav button — logout if logged in
    document.getElementById('auth-nav-btn').addEventListener('click', function (e) {
        if (State.currentUser) {
            if (confirm(`Logged in as ${State.currentUser.name}.\n\nClick OK to logout.`)) {
                doLogout();
            }
            e.stopPropagation();
        }
    }, true);

    // Preload products in background
    try {
        State.allProducts = await API.getProducts();
        State.currentSearchResults = [...State.allProducts];
    } catch {
        // Silent — will show error when user navigates to that page
    }

    updateWishCount();
    await renderHome();
});
