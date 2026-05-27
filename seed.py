"""
seed.py — Run once to create tables and populate the database.

Usage:
    python seed.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from models import db, Platform, Product, ProductPrice, Recommendation

# ─── Platform data ───────────────────────────────────────────────────────────
PLATFORMS = [
    {'id': 'amazon',   'name': 'Amazon',          'color': '#FF9900', 'site_url': 'https://www.amazon.in'},
    {'id': 'flipkart', 'name': 'Flipkart',         'color': '#2874F0', 'site_url': 'https://www.flipkart.com'},
    {'id': 'croma',    'name': 'Croma',            'color': '#E31837', 'site_url': 'https://www.croma.com'},
    {'id': 'reliance', 'name': 'Reliance Digital', 'color': '#004B8D', 'site_url': 'https://www.reliancedigital.in'},
    {'id': 'vijay',    'name': 'Vijay Sales',      'color': '#E32227', 'site_url': 'https://www.vijaysales.com'},
]

# ─── Product seed data ───────────────────────────────────────────────────────
# Format: (name, brand, category, emoji, rating, reviews, description, image_url, prices_dict)
# prices_dict: {'platform_id': (price, old_price)}  OR  {'platform_id': (price, old_price, buy_link)}
#              buy_link = direct product URL; omit or set None to fall back to platform homepage
# Local images are served from /images/ relative to frontend root
PRODUCTS_SEED = [

    # ════════════════════════════════════════════════
    # SMARTPHONES (6 products)
    # ════════════════════════════════════════════════
    (
        'Samsung Galaxy S24 Ultra', 'Samsung', 'Smartphones', '📱', 4.5, 12340,
        '200MP camera, titanium frame, S Pen, Galaxy AI features, IP68 rating',
        'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&h=320&fit=crop&q=80',
        {
            'amazon':   (124999, 134999, 'https://www.amazon.in/s?k=Samsung+Galaxy+S24+Ultra'),
            'flipkart': (122999, 134999, 'https://www.flipkart.com/search?q=Samsung+Galaxy+S24+Ultra'),
            'croma':    (126999, 134999, 'https://www.croma.com/searchB?q=Samsung+Galaxy+S24+Ultra'),
            'reliance': (123999, 134999, 'https://www.reliancedigital.in/search?q=Samsung+Galaxy+S24+Ultra'),
        },
    ),
    (
        'Apple iPhone 15 Pro', 'Apple', 'Smartphones', '📱', 4.7, 18920,
        'A17 Pro chip, 48MP main camera, titanium design, Action Button, USB-C',
        'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=320&fit=crop&q=80',
        {
            'amazon':   (134900, 139900, 'https://www.amazon.in/s?k=Apple+iPhone+15+Pro'),
            'flipkart': (132900, 139900, 'https://www.flipkart.com/search?q=Apple+iPhone+15+Pro'),
            'croma':    (136900, 139900, 'https://www.croma.com/searchB?q=Apple+iPhone+15+Pro'),
            'vijay':    (135900, 139900, 'https://www.vijaysales.com/search?q=Apple+iPhone+15+Pro'),
        },
    ),
    (
        'OnePlus 12', 'OnePlus', 'Smartphones', '📱', 4.4, 7600,
        'Snapdragon 8 Gen 3, Hasselblad cameras, 100W SUPERVOOC, 5400mAh battery',
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=320&fit=crop&q=80',
        {'amazon': (64999, 69999), 'flipkart': (62999, 69999), 'croma': (65999, 69999), 'reliance': (63999, 69999)},
    ),
    (
        'Google Pixel 8 Pro', 'Google', 'Smartphones', '📱', 4.3, 5100,
        'Tensor G3, 50MP triple camera, 7 years of updates, Temperature sensor',
        'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&h=320&fit=crop&q=80',
        {'amazon': (89999, 99999), 'flipkart': (87999, 99999), 'croma': (91999, 99999)},
    ),
    (
        'Xiaomi 14 Ultra', 'Xiaomi', 'Smartphones', '📱', 4.6, 6800,
        'Snapdragon 8 Gen 3, Leica quad camera with 1-inch sensor, 90W wired charging, ceramic body',
        'images/xiaomi_14_ultra.png',
        {'amazon': (99999, 109999), 'flipkart': (97999, 109999), 'reliance': (98999, 109999)},
    ),
    (
        'Realme GT 6', 'Realme', 'Smartphones', '📱', 4.2, 4300,
        'Snapdragon 8s Gen 3, 6000mAh battery, 120W Charge, 50MP Sony camera, AI features',
        'images/realme_gt6.png',
        {'amazon': (34999, 39999), 'flipkart': (33999, 39999), 'reliance': (35499, 39999)},
    ),

    # ════════════════════════════════════════════════
    # HEADPHONES (4 products)
    # ════════════════════════════════════════════════
    (
        'Sony WH-1000XM5', 'Sony', 'Headphones', '🎧', 4.6, 22400,
        'Industry-leading noise cancelling, 30hr battery, Multipoint connection, speak-to-chat',
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=320&fit=crop&q=80',
        {'amazon': (26990, 34990), 'flipkart': (25990, 34990), 'croma': (27990, 34990), 'reliance': (26490, 34990)},
    ),
    (
        'Apple AirPods Pro 2nd Gen', 'Apple', 'Headphones', '🎧', 4.5, 14700,
        'Adaptive Transparency, USB-C, Personalized Spatial Audio, 6hr battery',
        'https://images.unsplash.com/photo-1588423771073-b8903fead714?w=400&h=320&fit=crop&q=80',
        {'amazon': (22990, 26900), 'flipkart': (21990, 26900), 'croma': (23490, 26900), 'vijay': (22490, 26900)},
    ),
    (
        'Bose QuietComfort 45', 'Bose', 'Headphones', '🎧', 4.5, 9800,
        'World-class noise cancellation, 24hr battery, Aware Mode, foldable design, USB-C charging',
        'images/bose_qc45.png',
        {'amazon': (27990, 34900), 'flipkart': (26990, 34900), 'croma': (28990, 34900), 'reliance': (27490, 34900)},
    ),
    (
        'JBL Tune 770NC', 'JBL', 'Headphones', '🎧', 4.1, 5600,
        'Adaptive Noise Cancelling, 70hr battery life, foldable, multi-point connection, voice assistant',
        'images/jbl_tune_770nc.png',
        {'amazon': (7999, 11999), 'flipkart': (7499, 11999), 'reliance': (8299, 11999)},
    ),

    # ════════════════════════════════════════════════
    # WATCHES (4 products)
    # ════════════════════════════════════════════════
    (
        'Samsung Galaxy Watch 6', 'Samsung', 'Watches', '⌚', 4.2, 8900,
        'Advanced health tracking, BioActive Sensor, sleep analysis, 40hr battery',
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=320&fit=crop&q=80',
        {'amazon': (26999, 32999), 'flipkart': (24999, 32999), 'croma': (27499, 32999)},
    ),
    (
        'Apple Watch Series 9', 'Apple', 'Watches', '⌚', 4.6, 11200,
        'Double tap gesture, 2000 nit display, blood oxygen, carbon neutral, crash detection',
        'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&h=320&fit=crop&q=80',
        {'amazon': (41900, 45900), 'flipkart': (39900, 45900), 'croma': (42900, 45900), 'vijay': (41400, 45900)},
    ),
    (
        'Garmin Fenix 7 Pro Solar', 'Garmin', 'Watches', '⌚', 4.7, 3400,
        'Solar charging, 37-day battery, multi-band GPS, health monitoring, sapphire glass',
        'images/garmin_fenix7_pro.png',
        {'amazon': (79990, 94990), 'flipkart': (77990, 94990), 'croma': (81990, 94990)},
    ),
    (
        'Fossil Gen 6 Hybrid', 'Fossil', 'Watches', '⌚', 4.0, 2800,
        'E-ink display, 2-week battery, activity tracking, sleep tracking, stainless steel case',
        'images/fossil_gen6_watch.png',
        {'amazon': (14995, 19995), 'flipkart': (13995, 19995), 'reliance': (15495, 19995)},
    ),

    # ════════════════════════════════════════════════
    # TELEVISIONS (3 products)
    # ════════════════════════════════════════════════
    (
        'LG 55" OLED C3 TV', 'LG', 'Televisions', '📺', 4.7, 3450,
        '4K OLED evo, α9 AI Processor Gen6, Dolby Vision IQ, 120Hz, G-Sync, webOS 23',
        'https://images.unsplash.com/photo-1593359677879-a4bb92f4834a?w=400&h=320&fit=crop&q=80',
        {'amazon': (139999, 169999), 'flipkart': (134999, 169999), 'croma': (139999, 169999), 'reliance': (136999, 169999)},
    ),
    (
        'Samsung 65" Neo QLED 4K', 'Samsung', 'Televisions', '📺', 4.5, 2100,
        'Neo QLED, Quantum Matrix, Real Depth Enhancer, Object Tracking Sound, 144Hz',
        'https://images.unsplash.com/photo-1571415060716-baff5ea4b8d5?w=400&h=320&fit=crop&q=80',
        {'amazon': (189999, 219999), 'flipkart': (185999, 219999), 'croma': (191999, 219999)},
    ),
    (
        'Sony Bravia XR OLED A95L', 'Sony', 'Televisions', '📺', 4.8, 1200,
        'QD-OLED panel, XR Cognitive Processor, Acoustic Surface Audio+, perfect black, 120Hz',
        'images/sony_bravia_oled_a95l.png',
        {'amazon': (399999, 449999), 'flipkart': (389999, 449999), 'croma': (409999, 449999), 'reliance': (394999, 449999)},
    ),

    # ════════════════════════════════════════════════
    # LAPTOPS (4 products)
    # ════════════════════════════════════════════════
    (
        'Dell XPS 15', 'Dell', 'Laptops', '💻', 4.4, 4200,
        '4K OLED touch, Intel Core i7-13700H, NVIDIA RTX 4060, 16GB RAM, 512GB SSD',
        'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=320&fit=crop&q=80',
        {'amazon': (149999, 169999), 'flipkart': (146999, 169999), 'croma': (152999, 169999)},
    ),
    (
        'MacBook Pro 14" M3', 'Apple', 'Laptops', '💻', 4.8, 9800,
        'M3 chip, Liquid Retina XDR, 18hr battery, ProRes video, 8GB unified memory',
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=320&fit=crop&q=80',
        {'amazon': (198999, 219900), 'flipkart': (194999, 219900), 'croma': (199999, 219900), 'vijay': (197999, 219900)},
    ),
    (
        'HP Spectre x360 14', 'HP', 'Laptops', '💻', 4.5, 3600,
        '2-in-1 convertible, Intel Core Ultra 7, OLED touch display, 17hr battery, midnight blue',
        'images/hp_spectre_x360.png',
        {'amazon': (159999, 179999), 'flipkart': (157999, 179999), 'croma': (162999, 179999)},
    ),
    (
        'ASUS ROG Zephyrus G14', 'ASUS', 'Laptops', '💻', 4.6, 5200,
        'AMD Ryzen 9, RTX 4070, 165Hz QHD display, AniMe Matrix LED, 2.17kg, 10hr battery',
        'images/asus_rog_zephyrus_g14.png',
        {'amazon': (189999, 209999), 'flipkart': (185999, 209999), 'croma': (192999, 209999)},
    ),

    # ════════════════════════════════════════════════
    # CAMERAS (3 products)
    # ════════════════════════════════════════════════
    (
        'Canon EOS R6 Mark II', 'Canon', 'Cameras', '📷', 4.6, 2340,
        '40fps burst, 6K RAW video, In-Body Image Stabilization, dual card slots',
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=320&fit=crop&q=80',
        {'amazon': (269999, 299999), 'flipkart': (264999, 299999), 'croma': (272999, 299999)},
    ),
    (
        'Sony Alpha A7 IV', 'Sony', 'Cameras', '📷', 4.7, 3100,
        '33MP BSI sensor, 4K 60p, Real-time Eye AF, 759 phase-detect AF points',
        'https://images.unsplash.com/photo-1609081219090-a6d81d3085bf?w=400&h=320&fit=crop&q=80',
        {'amazon': (249999, 279999), 'flipkart': (244999, 279999), 'croma': (252999, 279999)},
    ),
    (
        'Nikon Z8 Mirrorless', 'Nikon', 'Cameras', '📷', 4.8, 1800,
        '45.7MP full frame, 8K RAW video, 20fps burst, subject detection AF, weather sealed',
        'images/nikon_z8_camera.png',
        {'amazon': (349999, 389999), 'flipkart': (344999, 389999), 'croma': (354999, 389999)},
    ),

    # ════════════════════════════════════════════════
    # HOME APPLIANCES (3 products)
    # ════════════════════════════════════════════════
    (
        'Dyson V15 Detect', 'Dyson', 'Home Appliances', '🏠', 4.5, 5600,
        'Laser dust detection, HEPA filtration, 60-min runtime, acoustic piezo sensor',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=320&fit=crop&q=80',
        {'amazon': (62900, 72900), 'flipkart': (59900, 72900), 'croma': (63900, 72900), 'reliance': (61900, 72900)},
    ),
    (
        'Dyson Airwrap Multi-Styler', 'Dyson', 'Home Appliances', '🏠', 4.6, 8900,
        'Coanda air styling, curl and dry simultaneously, 6 attachments, heat protection, frizz control',
        'images/dyson_airwrap.png',
        {'amazon': (44900, 54900), 'flipkart': (43900, 54900), 'croma': (45900, 54900), 'reliance': (44400, 54900)},
    ),
    (
        'Philips Air Fryer XXL', 'Philips', 'Home Appliances', '🏠', 4.4, 12400,
        '7.2L TurboStar technology, digital touchscreen, 5 presets, dishwasher-safe, 1725W',
        'images/philips_air_fryer_xxl.png',
        {'amazon': (12995, 17995), 'flipkart': (11995, 17995), 'croma': (13495, 17995), 'reliance': (12495, 17995)},
    ),
]

# ─── Recommendation seed data ─────────────────────────────────────────────────
# Format: (product_index_0based, match_percent, reason)
RECS_SEED = [
    (1,  98, 'Best-selling premium smartphone this season. Price dropped by 4%.'),
    (17, 96, 'MacBook Pro M3 is highest rated laptop in catalog. Limited stock alert.'),
    (0,  92, 'Samsung S24 Ultra tops charts for power users. Best deal on Flipkart.'),
    (6,  90, 'Sony XM5 is best-in-class for noise cancellation. Great deal right now.'),
    (14, 88, 'LG OLED C3 is the #1 rated TV. All-time low price on Flipkart.'),
    (4,  85, 'Xiaomi 14 Ultra — Leica quad camera flagship, best value vs iPhone 15 Pro.'),
    (7,  83, 'AirPods Pro 2 — massive price drop vs retail. USB-C + Spatial Audio.'),
    (22, 82, 'Nikon Z8 — 45.7MP 8K video beast. Best price on Flipkart right now.'),
    (12, 80, 'Garmin Fenix 7 Pro Solar — 37-day battery life, no charging needed for weeks.'),
    (19, 78, 'HP Spectre x360 — best 2-in-1 convertible. OLED touch display at this price.'),
    (20, 75, 'ASUS ROG Zephyrus G14 — RTX 4070 gaming at ₹1.9L, best performance deal.'),
    (24, 72, 'Dyson Airwrap — trending hair styler. Save ₹10K vs retail on Flipkart.'),
]


def seed():
    import sys, io
    # Fix Windows cp1252 terminal encoding
    if sys.stdout.encoding != 'utf-8':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

    app = create_app()
    with app.app_context():
        print("[INFO] Dropping and recreating all tables...")
        db.drop_all()
        db.create_all()

        print("[INFO] Seeding platforms...")
        for p in PLATFORMS:
            db.session.add(Platform(**p))
        db.session.flush()

        print("[INFO] Seeding products & prices...")
        product_records = []
        for (name, brand, cat, emoji, rating, reviews, desc, image, prices) in PRODUCTS_SEED:
            product = Product(
                name=name, brand=brand, category=cat, emoji=emoji,
                rating=rating, reviews=reviews, description=desc,
                image_url=image,
            )
            db.session.add(product)
            db.session.flush()  # get auto-assigned id

            for platform_id, price_data in prices.items():
                # Support both (price, old_price) and (price, old_price, buy_link)
                price    = price_data[0]
                old_price = price_data[1]
                buy_link  = price_data[2] if len(price_data) > 2 else None
                db.session.add(ProductPrice(
                    product_id=product.id,
                    platform_id=platform_id,
                    price=price,
                    old_price=old_price,
                    buy_link=buy_link,
                ))
            product_records.append(product)

        print("[INFO] Seeding recommendations...")
        for (prod_idx, match_pct, reason) in RECS_SEED:
            db.session.add(Recommendation(
                product_id=product_records[prod_idx].id,
                match_percent=match_pct,
                reason=reason,
            ))

        db.session.commit()
        print("[DONE] Seeded %d platforms, %d products, %d recommendations." % (
            len(PLATFORMS), len(product_records), len(RECS_SEED)
        ))
        print("\nProducts by category:")
        cats = {}
        for (name, brand, cat, *_) in PRODUCTS_SEED:
            cats[cat] = cats.get(cat, 0) + 1
        for cat, count in sorted(cats.items()):
            print("  %-20s: %d products" % (cat, count))


if __name__ == '__main__':
    seed()
