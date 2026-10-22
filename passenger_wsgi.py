import sys
import os

# إضافة مجلد المشروع إلى مسارات بايثون
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from a2wsgi import ASGIMiddleware
from backend.main import app as fastapi_app

# خادم Phusion Passenger في cPanel يتطلب كائن باسم application
application = ASGIMiddleware(fastapi_app)
