from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form
from pydantic import BaseModel
from backend.firebase_auth import verify_token
from backend.database import get_db
from typing import Optional
import json, random, string
from datetime import datetime

router = APIRouter(prefix="/api/applications", tags=["applications"])


def _get_user(authorization: str):
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
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]


def _gen_app_number():
    year = datetime.now().year
    digits = "".join(random.choices(string.digits, k=5))
    return f"FSSAI-{year}-{digits}"


class CreateApplicationRequest(BaseModel):
    tier: str           # 'basic' | 'state' | 'central' | 'temp'
    details: dict
    cart: list = []
    fee_total: int = 0
    duration: int = 1


@router.post("")
async def create_application(body: CreateApplicationRequest, authorization: str = Header(...)):
    user = _get_user(authorization)
    db = get_db()

    app_number = _gen_app_number()
    # Ensure unique
    while db.table("applications").select("id").eq("app_number", app_number).execute().data:
        app_number = _gen_app_number()

    result = db.table("applications").insert({
        "app_number": app_number,
        "user_id": user["id"],
        "tier": body.tier,
        "status": "submitted",
        "details": body.details,
        "cart": body.cart,
        "fee_total": body.fee_total,
        "duration": body.duration,
    }).execute()

    app = result.data[0]

    # Seed required document rows based on tier
    docs = _required_docs(body.tier)
    for doc in docs:
        db.table("documents").insert({
            "application_id": app["id"],
            "user_id": user["id"],
            "doc_key": doc["key"],
            "doc_label": doc["label"],
            "status": "pending",
        }).execute()

    return app


@router.get("")
async def list_applications(authorization: str = Header(...)):
    user = _get_user(authorization)
    db = get_db()
    result = db.table("applications").select("*, documents(*)").eq("user_id", user["id"]).order("filed_at", desc=True).execute()
    return result.data


@router.get("/{app_id}")
async def get_application(app_id: str, authorization: str = Header(...)):
    user = _get_user(authorization)
    db = get_db()
    result = db.table("applications").select("*, documents(*)").eq("id", app_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Application not found")
    app = result.data[0]
    if app["user_id"] != user["id"] and user["role"] not in ("officer",):
        raise HTTPException(status_code=403, detail="Forbidden")
    return app


@router.post("/{app_id}/documents/{doc_id}/upload")
async def upload_document(
    app_id: str,
    doc_id: str,
    file: UploadFile = File(...),
    authorization: str = Header(...)
):
    """
    Receives a file upload, stores it in Supabase Storage under
    {user_id}/{app_id}/{doc_id}/{filename}, updates the document row.
    """
    user = _get_user(authorization)
    db = get_db()

    # Verify doc belongs to user
    doc_result = db.table("documents").select("*").eq("id", doc_id).execute()
    if not doc_result.data:
        raise HTTPException(status_code=404, detail="Document not found")
    doc = doc_result.data[0]
    if doc["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Upload to Supabase Storage
    file_bytes = await file.read()
    storage_path = f"{user['id']}/{app_id}/{doc_id}/{file.filename}"

    try:
        db.storage.from_("documents").upload(
            storage_path,
            file_bytes,
            {"content-type": file.content_type or "application/octet-stream"}
        )
    except Exception as e:
        # If file already exists, update it
        try:
            db.storage.from_("documents").update(
                storage_path,
                file_bytes,
                {"content-type": file.content_type or "application/octet-stream"}
            )
        except Exception as e2:
            raise HTTPException(status_code=500, detail=f"Upload failed: {e2}")

    # Update document row
    db.table("documents").update({
        "storage_path": storage_path,
        "file_name": file.filename,
        "mime_type": file.content_type,
        "status": "pending",  # officer must review
    }).eq("id", doc_id).execute()

    return {"success": True, "storage_path": storage_path, "status": "pending"}


def _required_docs(tier: str) -> list:
    base = [
        {"key": "photo_id", "label": "Photo Identity Proof"},
        {"key": "address_proof", "label": "Address Proof (geotagged photos)"},
        {"key": "food_items_list", "label": "List of Food Items"},
    ]
    state_extra = [
        {"key": "food_safety_plan", "label": "Food Safety Plan"},
        {"key": "water_test_report", "label": "Water Test Report"},
        {"key": "pan_itr", "label": "PAN Card / ITR"},
        {"key": "ownership_deed", "label": "Partnership / Ownership Deed"},
    ]
    central_extra = [
        {"key": "gst_certificate", "label": "GST Certificate"},
        {"key": "noc_municipality", "label": "NOC from Municipality"},
    ]
    temp_docs = [
        {"key": "photo_id", "label": "Photo Identity Proof"},
        {"key": "proof_of_establishment", "label": "Proof of Establishment"},
    ]

    if tier == "basic":
        return base
    elif tier == "state":
        return base + state_extra
    elif tier == "central":
        return base + state_extra + central_extra
    elif tier == "temp":
        return temp_docs
    return base
