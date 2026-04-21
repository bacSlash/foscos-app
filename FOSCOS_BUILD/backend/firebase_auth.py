import firebase_admin
from firebase_admin import credentials, auth
from backend.config import FIREBASE_SERVICE_ACCOUNT_PATH
import os

_initialized = False

def init_firebase():
    global _initialized
    if _initialized:
        return
    if os.path.exists(FIREBASE_SERVICE_ACCOUNT_PATH):
        cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
        _initialized = True
    else:
        print(f"WARNING: Firebase service account not found at {FIREBASE_SERVICE_ACCOUNT_PATH}")
        print("OTP verification will be skipped in development mode.")

def verify_token(id_token: str) -> dict:
    """Verify Firebase ID token and return decoded claims."""
    try:
        decoded = auth.verify_id_token(id_token)
        return decoded
    except Exception as e:
        raise ValueError(f"Invalid token: {e}")
