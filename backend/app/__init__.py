import logging
from flask import Flask, jsonify
from flask_cors import CORS
from app.config import Config
from app.database import init_db, db_session
from app.routes import register_routes

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS
    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Credentials"]
    )

    # Initialize Database Schema
    with app.app_context():
        init_db()

    # Register Blueprints
    register_routes(app)

    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db_session.remove()

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'service': 'Eco-Tourism Predictive Dynamic Pricing & Revenue Management API',
            'version': '1.0.0',
            'database': 'Connected'
        }), 200

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'success': False, 'message': 'API endpoint not found'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        db_session.rollback()
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

    logger.info("Eco-Tourism Revenue Management API initialized.")
    return app
