from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Platform(db.Model):
    """E-commerce platform (Amazon, Flipkart, Croma, Reliance, Vijay Sales)."""
    __tablename__ = 'platforms'

    id         = db.Column(db.String(20),  primary_key=True)   # e.g. 'amazon'
    name       = db.Column(db.String(60),  nullable=False)     # e.g. 'Amazon'
    color      = db.Column(db.String(10),  nullable=False)     # hex color
    site_url   = db.Column(db.String(255), nullable=False)     # store root URL

    # Relationship back-ref
    prices = db.relationship('ProductPrice', back_populates='platform', lazy='dynamic')

    def to_dict(self):
        return {
            'id':       self.id,
            'name':     self.name,
            'color':    self.color,
            'site_url': self.site_url,
        }


class Product(db.Model):
    """A product that can be compared across platforms."""
    __tablename__ = 'products'

    id        = db.Column(db.Integer,      primary_key=True)
    name      = db.Column(db.String(255),  nullable=False)
    brand     = db.Column(db.String(100),  nullable=False)
    category  = db.Column(db.String(60),   nullable=False, index=True)
    image_url = db.Column(db.String(500),  nullable=True)
    emoji     = db.Column(db.String(10),   nullable=False, default='📦')
    rating    = db.Column(db.Numeric(3,1), nullable=False, default=4.0)
    reviews   = db.Column(db.Integer,      nullable=False, default=0)
    description = db.Column(db.Text,       nullable=True)

    # Relationship
    prices = db.relationship('ProductPrice', back_populates='product',
                             cascade='all, delete-orphan', lazy='joined')
    recommendations = db.relationship('Recommendation', back_populates='product',
                                      cascade='all, delete-orphan', lazy='dynamic')

    def best_price(self):
        if not self.prices:
            return None
        return min(self.prices, key=lambda p: p.price)

    def to_dict(self):
        best = self.best_price()
        return {
            'id':          self.id,
            'name':        self.name,
            'brand':       self.brand,
            'category':    self.category,
            'image_url':   self.image_url,
            'emoji':       self.emoji,
            'rating':      float(self.rating),
            'reviews':     self.reviews,
            'description': self.description,
            'best_price':  best.price if best else None,
            'best_platform': best.platform.name if best else None,
            'prices': [p.to_dict() for p in sorted(self.prices, key=lambda x: x.price)],
        }


class ProductPrice(db.Model):
    """Price of a product on a specific platform."""
    __tablename__ = 'product_prices'

    id          = db.Column(db.Integer, primary_key=True, autoincrement=True)
    product_id  = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    platform_id = db.Column(db.String(20), db.ForeignKey('platforms.id', ondelete='CASCADE'), nullable=False)
    price       = db.Column(db.Integer,  nullable=False)   # INR, no decimals
    old_price   = db.Column(db.Integer,  nullable=True)    # MRP / strike-through price
    buy_link    = db.Column(db.String(500), nullable=True)  # Direct product URL

    product  = db.relationship('Product',  back_populates='prices')
    platform = db.relationship('Platform', back_populates='prices')

    def to_dict(self):
        return {
            'platform_id':   self.platform_id,
            'platform_name': self.platform.name,
            'platform_color': self.platform.color,
            'platform_url':  self.platform.site_url,
            'price':         self.price,
            'old_price':     self.old_price,
            'buy_link':      self.buy_link or self.platform.site_url,
        }


class Recommendation(db.Model):
    """A product recommendation record (used by the For-You page)."""
    __tablename__ = 'recommendations'

    id            = db.Column(db.Integer, primary_key=True, autoincrement=True)
    product_id    = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    match_percent = db.Column(db.Integer, nullable=False, default=80)
    reason        = db.Column(db.String(255), nullable=False)

    product = db.relationship('Product', back_populates='recommendations')

    def to_dict(self):
        return {
            'product_id':    self.product_id,
            'match_percent': self.match_percent,
            'reason':        self.reason,
            'product':       self.product.to_dict(),
        }


class User(db.Model):
    """Application user — for login / wishlist persistence."""
    __tablename__ = 'users'

    id            = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name          = db.Column(db.String(100), nullable=False)
    email         = db.Column(db.String(150), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at    = db.Column(db.DateTime,    server_default=db.func.now())

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'email': self.email}
