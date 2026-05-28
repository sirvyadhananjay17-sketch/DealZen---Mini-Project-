/**
 * api.js — DealZen Frontend API Layer
 * All communication with the Flask backend goes through this module.
 * Base URL auto-detects (localhost:5000 in dev).
 */

const API_BASE = 'http://localhost:5000/api';

/**
 * Resolve an image URL from the backend.
 * Local paths like "images/foo.png" become an absolute path relative to index.html.
 * Full http:// URLs pass through unchanged.
 */
function resolveImage(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    // Relative path — resolve against the frontend root (where index.html lives)
    const base = window.location.href.replace(/\/[^/]*$/, '/');
    return base + url;
}

const API = (() => {

    async function request(endpoint, options = {}) {
        try {
            const res = await fetch(API_BASE + endpoint, {
                headers: { 'Content-Type': 'application/json' },
                ...options,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: res.statusText }));
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            return await res.json();
        } catch (err) {
            console.error('[DealZen API Error]', endpoint, err.message);
            throw err;
        }
    }

    return {
        /** GET /api/health */
        health: () => request('/health'),

        /** GET /api/categories */
        getCategories: () => request('/categories'),

        /**
         * GET /api/products
         * @param {Object} params - { category, q, sort }
         */
        getProducts(params = {}) {
            const qs = new URLSearchParams();
            if (params.category && params.category !== 'all') qs.set('category', params.category);
            if (params.q)        qs.set('q', params.q);
            if (params.sort)     qs.set('sort', params.sort);
            const query = qs.toString();
            return request('/products' + (query ? '?' + query : ''));
        },

        /** GET /api/products/:id */
        getProduct: (id) => request(`/products/${id}`),

        /**
         * GET /api/recommendations
         * @param {string} category - optional category filter
         */
        getRecommendations(category = '') {
            const qs = category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : '';
            return request('/recommendations' + qs);
        },

        /**
         * POST /api/auth/register
         * @param {Object} payload - { name, email, password }
         */
        register: (payload) => request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

        /**
         * POST /api/auth/login
         * @param {Object} payload - { email, password }
         */
        login: (payload) => request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    };
})();
