from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from backend.firebase_auth import verify_token
from backend.database import get_db
from typing import Optional
import random, string
from datetime import datetime

router = APIRouter(prefix="/api", tags=["consumers"])


def _get_user_optional(authorization: Optional[str]):
    """Returns user dict or None if no auth header."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        from backend.firebase_auth import verify_token
        claims = verify_token(token)
    except ValueError:
        return None
    db = get_db()
    result = db.table("users").select("*").eq("firebase_uid", claims["uid"]).execute()
    return result.data[0] if result.data else None


@router.get("/fbo/search")
async def search_fbos(q: Optional[str] = None):
    """Search FBOs — public endpoint (no auth required)."""
    db = get_db()
    query = db.table("licenses").select("*")
    if q:
        query = query.ilike("business_name", f"%{q}%")
    result = query.limit(20).execute()
    return result.data


class GrievanceRequest(BaseModel):
    fbo_name: str
    fbo_license: Optional[str] = None
    food_rating: int
    hygiene_rating: int
    premises_rating: int
    issues: list = []
    comments: Optional[str] = None


@router.post("/grievances")
async def submit_grievance(
    body: GrievanceRequest,
    authorization: Optional[str] = Header(None)
):
    user = _get_user_optional(authorization)
    db = get_db()

    complaint_id = "GRV-" + str(datetime.now().year) + "-" + "".join(random.choices(string.digits, k=5))
    while db.table("grievances").select("id").eq("complaint_id", complaint_id).execute().data:
        complaint_id = "GRV-" + str(datetime.now().year) + "-" + "".join(random.choices(string.digits, k=5))

    # Assign priority based on ratings
    avg = (body.food_rating + body.hygiene_rating + body.premises_rating) / 3
    priority = "critical" if avg <= 1.5 else ("high" if avg <= 2.5 else "normal")

    result = db.table("grievances").insert({
        "complaint_id": complaint_id,
        "consumer_id": user["id"] if user else None,
        "fbo_name": body.fbo_name,
        "fbo_license": body.fbo_license,
        "food_rating": body.food_rating,
        "hygiene_rating": body.hygiene_rating,
        "premises_rating": body.premises_rating,
        "issues": body.issues,
        "comments": body.comments,
        "status": "submitted",
        "priority": priority,
    }).execute()

    return result.data[0]


@router.get("/grievances/my")
async def my_grievances(authorization: str = Header(...)):
    user = _get_user_optional(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    db = get_db()
    result = db.table("grievances").select("*").eq("consumer_id", user["id"]).order("filed_at", desc=True).execute()
    return result.data
