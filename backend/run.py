import os
from app import create_app
from app.config import Config

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Eco-Tourism Revenue Management API on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=True)
