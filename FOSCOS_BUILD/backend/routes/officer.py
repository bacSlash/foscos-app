from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from backend.firebase_auth import verify_token
from backend.database import get_db
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/api/officer", tags=["officer"])


def _require_officer(authorization: str):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    try:
        claims = verify_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    db = get_db()
    result = db.table("users").select("*").eq("firebase_uid", claims["uid"]).execute()
    if not result.data:
        raise HTTPException(status_code=403, detail="Officer not found")
    user = result.data[0]
    if user["role"] != "officer":
        raise HTTPException(status_code=403, detail="Officer access required")
    return user


# ─── APPLICATIONS ─────────────────────────────────────────────────────────────

@router.get("/applications")
async def list_all_applications(
    status: Optional[str] = None,
    authorization: str = Header(...)
):
    _require_officer(authorization)
    db = get_db()
    query = db.table("applications").select("*, users(name, mobile), documents(*)")
    if status and status != "all":
        query = query.eq("status", status)
    result = query.order("filed_at", desc=True).execute()
    return result.data


@router.get("/applications/{app_id}")
async def get_application_detail(app_id: str, authorization: str = Header(...)):
    _require_officer(authorization)
    db = get_db()
    result = db.table("applications").select("*, users(name, mobile, email), documents(*)").eq("id", app_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Not found")
    return result.data[0]


class UpdateAppStatusRequest(BaseModel):
    status: str
    note: Optional[str] = None


@router.patch("/applications/{app_id}/status")
async def update_application_status(
    app_id: str,
    body: UpdateAppStatusRequest,
    authorization: str = Header(...)
):
    officer = _require_officer(authorization)
    db = get_db()
    valid_statuses = ("submitted", "docs_review", "under_review", "inspection", "approved", "rejected")
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    db.table("applications").update({
        "status": body.status,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", app_id).execute()
    return {"success": True, "status": body.status}


# ─── DOCUMENTS ────────────────────────────────────────────────────────────────

class ReviewDocRequest(BaseModel):
    status: str   # 'verified' | 'flagged' | 'missing'
    officer_note: Optional[str] = None


@router.patch("/documents/{doc_id}/review")
async def review_document(
    doc_id: str,
    body: ReviewDocRequest,
    authorization: str = Header(...)
):
    """Officer approves or flags a document. Triggers Supabase Realtime → citizen frontend updates."""
    officer = _require_officer(authorization)
    if body.status not in ("verified", "flagged", "missing"):
        raise HTTPException(status_code=400, detail="Invalid status")
    db = get_db()
    db.table("documents").update({
        "status": body.status,
        "officer_note": body.officer_note,
        "reviewed_at": datetime.utcnow().isoformat(),
        "reviewed_by": officer["id"],
    }).eq("id", doc_id).execute()
    return {"success": True, "doc_id": doc_id, "status": body.status}


@router.get("/documents/{doc_id}/signed-url")
async def get_document_signed_url(doc_id: str, authorization: str = Header(...)):
    """Returns a temporary signed URL so the officer can view the uploaded file."""
    _require_officer(authorization)
    db = get_db()
    result = db.table("documents").select("storage_path").eq("id", doc_id).execute()
    if not result.data or not result.data[0].get("storage_path"):
        raise HTTPException(status_code=404, detail="Document not found or not yet uploaded")
    path = result.data[0]["storage_path"]
    signed = db.storage.from_("documents").create_signed_url(path, expires_in=3600)
    return {"signed_url": signed["signedURL"]}


# ─── GRIEVANCES ───────────────────────────────────────────────────────────────

@router.get("/grievances")
async def list_grievances(status: Optional[str] = None, authorization: str = Header(...)):
    _require_officer(authorization)
    db = get_db()
    query = db.table("grievances").select("*")
    if status and status != "all":
        query = query.eq("status", status)
    result = query.order("filed_at", desc=True).execute()
    return result.data


class UpdateGrievanceRequest(BaseModel):
    status: str
    priority: Optional[str] = None


@router.patch("/grievances/{griev_id}")
async def update_grievance(
    griev_id: str,
    body: UpdateGrievanceRequest,
    authorization: str = Header(...)
):
    officer = _require_officer(authorization)
    db = get_db()
    update_data = {"status": body.status}
    if body.priority:
        update_data["priority"] = body.priority
    if body.status == "resolved":
        update_data["resolved_at"] = datetime.utcnow().isoformat()
    update_data["officer_id"] = officer["id"]
    db.table("grievances").update(update_data).eq("id", griev_id).execute()
    return {"success": True}


# ─── DASHBOARD STATS ──────────────────────────────────────────────────────────

@router.get("/stats")
async def get_officer_stats(authorization: str = Header(...)):
    _require_officer(authorization)
    db = get_db()
    pending = db.table("applications").select("id", count="exact").in_("status", ["submitted", "docs_review", "under_review"]).execute()
    approved_today = db.table("applications").select("id", count="exact").eq("status", "approved").gte("updated_at", datetime.utcnow().date().isoformat()).execute()
    open_grievances = db.table("grievances").select("id", count="exact").neq("status", "resolved").execute()
    inspections = db.table("inspections").select("id", count="exact").eq("status", "scheduled").execute()
    return {
        "pending_applications": pending.count or 0,
        "approved_today": approved_today.count or 0,
        "open_grievances": open_grievances.count or 0,
        "inspections_scheduled": inspections.count or 0,
    }
