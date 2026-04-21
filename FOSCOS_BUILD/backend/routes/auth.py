from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from backend.firebase_auth import verify_token
from backend.database import get_db
from typing import Optional
import uuid

router = APIRouter(prefix="/api/auth", tags=["auth"])


class VerifyTokenRequest(BaseModel):
    id_token: str
    role: str  # 'fbo' | 'consumer' | 'agent' | 'officer'
    name: Optional[str] = None


@router.post("/verify")
async def verify_and_upsert(body: VerifyTokenRequest):
    """
    Called after Firebase OTP verification on the frontend.
    Verifies the Firebase ID token, then upserts the user in Supabase.
    Returns the user record + a session marker.
    """
    try:
        claims = verify_token(body.id_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    firebase_uid = claims["uid"]
    phone = claims.get("phone_number", "unknown")
    db = get_db()

    # Upsert user
    existing = db.table("users").select("*").eq("firebase_uid", firebase_uid).execute()
    if existing.data:
        user = existing.data[0]
        # Update role/name if provided
        db.table("users").update({
            "role": body.role,
            "name": body.name or user.get("name"),
        }).eq("firebase_uid", firebase_uid).execute()
        user["role"] = body.role
    else:
        new_user = {
            "firebase_uid": firebase_uid,
            "mobile": phone,
            "role": body.role,
            "name": body.name or "",
        }
        result = db.table("users").insert(new_user).execute()
        user = result.data[0]

    return {"user": user, "firebase_uid": firebase_uid}


@router.get("/me")
async def get_me(authorization: str = Header(...)):
    """Returns current user from Supabase given Firebase token."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.split(" ", 1)[1]
    try:
        claims = verify_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    db = get_db()
    result = db.table("users").select("*").eq("firebase_uid", claims["uid"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]
