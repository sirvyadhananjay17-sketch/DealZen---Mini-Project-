# DealZen — E-Commerce Price Comparison & Recommendation System

> Built with Flask + MySQL (backend) and vanilla HTML/CSS/JS (frontend)

---

## 📁 Project Structure

```
d:\project\
├── overview.html          ← Original prototype (reference)
│
├── backend\               ← Python Flask REST API
│   ├── app.py             ← API routes (products, recommendations, auth)
│   ├── config.py          ← MySQL config (reads from .env)
│   ├── models.py          ← SQLAlchemy models
│   ├── seed.py            ← One-time database seeder
│   ├── requirements.txt
│   └── .env               ← YOUR credentials (edit this!)
│
└── frontend\              ← Single-Page Application
    ├── index.html         ← Main SPA
    └── js\
        ├── api.js         ← API calls to Flask
        └── app.js         ← All SPA logic
```

---

## 🚀 Setup Instructions

### Step 1 — Create MySQL Database

Open MySQL Workbench / command line and run:
```sql
CREATE DATABASE dealzen_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 2 — Configure Credentials

Edit `backend\.env`:
```
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DB=dealzen_db
```

### Step 3 — Install Python Dependencies

```powershell
cd d:\project\backend
pip install -r requirements.txt
```

### Step 4 — Seed the Database

```powershell
python seed.py
```

Expected output:
```
⚙️  Dropping and recreating all tables...
📋 Seeding platforms...
📦 Seeding products & prices...
✨ Seeding recommendations...
✅ Done! Seeded 5 platforms, 15 products, 8 recommendations.
```

### Step 5 — Start the Flask Server

```powershell
python app.py
```

Flask will start at: **http://localhost:5000**

Test it: http://localhost:5000/api/health

### Step 6 — Open the Frontend

Open `d:\project\frontend\index.html` in your browser.

> **Note:** Use VS Code Live Server or `python -m http.server 8080` inside `frontend\` for best results.

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check if server is running |
| GET | `/api/categories` | List all product categories |
| GET | `/api/products` | All products (supports `?category=`, `?q=`, `?sort=`) |
| GET | `/api/products/<id>` | Single product with all prices |
| GET | `/api/recommendations` | Recommendations (supports `?category=`) |
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Log in |

---

## 🛍️ Features

- **Price Comparison** — compare across Amazon, Flipkart, Croma, Reliance Digital, Vijay Sales
- **Smart Search** — search by product name, brand, category, description
- **Category Filters** — Smartphones, Laptops, Headphones, Cameras, Watches, TVs, Appliances
- **Price Bar Chart** — visual price comparison across platforms
- **AI Deal Analysis** — powered by Claude AI (requires Anthropic API key)
- **AI Shopping Assistant** — chat-based product advisor
- **Wishlist** — saved locally in browser
- **Auth** — register/login stored in MySQL
- **Recommendations** — content-based filtering from backend

---

## 🎨 Design

- Dark theme: Deep `#0a0a0f` background
- Fonts: Syne (headings) + DM Sans (body)
- Accent: Purple `#7c6ff7`
- Platform color coding: Amazon (orange), Flipkart (blue), Croma (red), Reliance (navy), Vijay (red)
