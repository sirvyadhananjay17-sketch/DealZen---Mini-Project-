"""
app.py — DealZen Flask REST API
Endpoints:
    GET  /api/health
    GET  /api/categories
    GET  /api/products              ?category=&q=&sort=price_asc|price_desc|rating
    GET  /api/products/<int:id>
    GET  /api/recommendations
    POST /api/auth/register
    POST /api/auth/login
    POST /api/ai/chat               ← proxies to Google Gemini (keeps key server-side)
"""
from flask import Flask, jsonify, request, abort
from flask_cors import CORS
from config import Config
from models import db, Product, Platform, Recommendation, User
from sqlalchemy import or_, func
import hashlib
import os
import requests as http_requests


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    CORS(app, origins='*')

    # ─── Health ──────────────────────────────────────────────────────────────
    @app.route('/api/health')
    def health():
        return jsonify({'status': 'ok', 'message': 'DealZen API is running 🚀'})

    # ─── Categories ──────────────────────────────────────────────────────────
    @app.route('/api/categories')
    def get_categories():
        rows = db.session.query(Product.category).distinct().order_by(Product.category).all()
        categories = [r[0] for r in rows]
        return jsonify(categories)

    # ─── Products ────────────────────────────────────────────────────────────
    @app.route('/api/products')
    def get_products():
        category = request.args.get('category', '').strip()
        query_str = request.args.get('q', '').strip()
        sort      = request.args.get('sort', 'relevance')

        q = Product.query

        # Filter by category
        if category and category.lower() != 'all':
            q = q.filter(func.lower(Product.category) == category.lower())

        # Full-text search on name, brand, category, description
        if query_str:
            like = f'%{query_str}%'
            q = q.filter(or_(
                Product.name.ilike(like),
                Product.brand.ilike(like),
                Product.category.ilike(like),
                Product.description.ilike(like),
            ))

        products = q.all()

        # Sort
        if sort == 'price_asc':
            products.sort(key=lambda p: p.best_price().price if p.best_price() else 0)
        elif sort == 'price_desc':
            products.sort(key=lambda p: p.best_price().price if p.best_price() else 0, reverse=True)
        elif sort == 'rating':
            products.sort(key=lambda p: float(p.rating), reverse=True)

        return jsonify([p.to_dict() for p in products])

    @app.route('/api/products/<int:product_id>')
    def get_product(product_id):
        product = Product.query.get_or_404(product_id, description='Product not found')
        return jsonify(product.to_dict())

    # ─── Recommendations ─────────────────────────────────────────────────────
    @app.route('/api/recommendations')
    def get_recommendations():
        category = request.args.get('category', '').strip()

        q = Recommendation.query.order_by(Recommendation.match_percent.desc())

        if category and category.lower() != 'all':
            # Filter via joined product's category
            q = q.join(Product).filter(func.lower(Product.category) == category.lower())

        recs = q.limit(12).all()
        return jsonify([r.to_dict() for r in recs])

    # ─── Auth — Register ─────────────────────────────────────────────────────
    @app.route('/api/auth/register', methods=['POST'])
    def register():
        data = request.get_json(silent=True) or {}
        name     = (data.get('name') or '').strip()
        email    = (data.get('email') or '').strip().lower()
        password = (data.get('password') or '').strip()

        if not name or not email or not password:
            return jsonify({'error': 'All fields are required'}), 400
        if len(password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters'}), 400
        if '@' not in email:
            return jsonify({'error': 'Invalid email address'}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 409

        pw_hash = hashlib.sha256(password.encode()).hexdigest()
        user = User(name=name, email=email, password_hash=pw_hash)
        db.session.add(user)
        db.session.commit()
        return jsonify({'message': f'Welcome to DealZen, {name}!', 'user': user.to_dict()}), 201

    # ─── Auth — Login ────────────────────────────────────────────────────────
    @app.route('/api/auth/login', methods=['POST'])
    def login():
        data = request.get_json(silent=True) or {}
        email    = (data.get('email') or '').strip().lower()
        password = (data.get('password') or '').strip()

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        pw_hash = hashlib.sha256(password.encode()).hexdigest()
        user = User.query.filter_by(email=email, password_hash=pw_hash).first()
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401

        return jsonify({'message': f'Welcome back, {user.name}!', 'user': user.to_dict()})

    # ─── AI Chat — Proxy to Google Gemini ───────────────────────────────────
    @app.route('/api/ai/chat', methods=['POST'])
    def ai_chat():
        api_key = os.environ.get('GEMINI_API_KEY', '')
        if not api_key or api_key == 'your_gemini_api_key_here':
            return jsonify({'error': 'AI not configured. Set GEMINI_API_KEY in backend/.env'}), 503

        data = request.get_json(silent=True) or {}
        messages      = data.get('messages', [])   # [{"role": "user", "content": "..."}]
        system_prompt = data.get('system', '')
        max_tokens    = int(data.get('max_tokens', 800))

        if not messages:
            return jsonify({'error': 'messages array is required'}), 400

        # Build Gemini-style contents list
        # Gemini roles: "user" | "model"  (not "assistant")
        gemini_contents = []
        if system_prompt:
            # Prepend system prompt as first user turn (Gemini doesn't have a separate system role)
            gemini_contents.append({
                'role': 'user',
                'parts': [{'text': f'[System Instructions]\n{system_prompt}'}]
            })
            gemini_contents.append({
                'role': 'model',
                'parts': [{'text': 'Understood. I will follow those instructions.'}]
            })

        for msg in messages:
            role = 'model' if msg.get('role') == 'assistant' else 'user'
            gemini_contents.append({
                'role': role,
                'parts': [{'text': msg.get('content', '')}]
            })

        payload = {
            'contents': gemini_contents,
            'generationConfig': {
                'maxOutputTokens': max_tokens,
                'temperature': 0.7,
            }
        }

        url = (
            f'https://generativelanguage.googleapis.com/v1beta/models/'
            f'gemini-2.0-flash:generateContent?key={api_key}'
        )

        try:
            resp = http_requests.post(
                url,
                headers={'content-type': 'application/json'},
                json=payload,
                timeout=30,
            )
            if not resp.ok:
                err = resp.json().get('error', {})
                return jsonify({'error': err.get('message', resp.text)}), resp.status_code

            result = resp.json()
            # Extract text from Gemini response structure
            reply = (
                result
                .get('candidates', [{}])[0]
                .get('content', {})
                .get('parts', [{}])[0]
                .get('text', '')
            )
            return jsonify({'reply': reply})
        except http_requests.exceptions.Timeout:
            return jsonify({'error': 'AI request timed out. Try again.'}), 504
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return app


if __name__ == '__main__':
    application = create_app()
    application.run(debug=True, host='0.0.0.0', port=5000)
