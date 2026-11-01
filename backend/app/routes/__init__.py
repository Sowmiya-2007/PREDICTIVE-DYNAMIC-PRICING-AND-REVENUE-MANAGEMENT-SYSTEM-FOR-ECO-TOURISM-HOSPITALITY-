from app.routes.auth_routes import auth_bp
from app.routes.property_routes import property_bp
from app.routes.event_routes import event_bp
from app.routes.prediction_routes import pred_bp
from app.routes.recommendation_routes import recommendation_bp
from app.routes.analytics_routes import analytics_bp
from app.routes.data_routes import data_bp
from app.routes.weather_routes import weather_bp
from app.routes.booking_routes import booking_bp

def register_routes(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(property_bp)
    app.register_blueprint(event_bp)
    app.register_blueprint(pred_bp)
    app.register_blueprint(recommendation_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(data_bp)
    app.register_blueprint(weather_bp)
    app.register_blueprint(booking_bp)

