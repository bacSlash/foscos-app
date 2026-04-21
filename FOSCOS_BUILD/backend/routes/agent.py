from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from backend.firebase_auth import verify_token
from backend.database import get_db
import uuid

router = APIRouter(prefix="/api/agent", tags=["agent"])


def _get_agent(authorization: str):
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
    user = result.data[0]
    if user["role"] != "agent":
        raise HTTPException(status_code=403, detail="Agent access required")
    return user


class AddClientRequest(BaseModel):
    name: str
    business_name: str
    mobile: str
    business_type: str = ""


@router.post("/clients")
async def add_client(body: AddClientRequest, authorization: str = Header(...)):
    """
    Create a new client user and link them to the agent.
    If a user with this mobile already exists, just link them.
    """
    agent = _get_agent(authorization)
    db = get_db()

    existing = db.table("users").select("id").eq("mobile", body.mobile).execute().data
    if existing:
        client_id = existing[0]["id"]
    else:
        new_user = {
            "id": str(uuid.uuid4()),
            "mobile": body.mobile,
            "name": body.name,
            "role": "fbo",
            "firebase_uid": f"mock_{body.mobile}",
        }
        result = db.table("users").insert(new_user).execute()
        client_id = result.data[0]["id"]

    link_exists = (
        db.table("agent_clients")
        .select("id")
        .eq("agent_id", agent["id"])
        .eq("client_id", client_id)
        .execute()
        .data
    )
    if not link_exists:
        db.table("agent_clients").insert({
            "id": str(uuid.uuid4()),
            "agent_id": agent["id"],
            "client_id": client_id,
            "business_name": body.business_name,
            "business_type": body.business_type,
        }).execute()

    return {"success": True, "client_id": client_id}


@router.get("/clients")
async def list_clients(authorization: str = Header(...)):
    agent = _get_agent(authorization)
    db = get_db()
    clients = (
        db.table("agent_clients")
        .select("*, users!agent_clients_client_id_fkey(name, mobile)")
        .eq("agent_id", agent["id"])
        .execute()
        .data
    )
    return {"clients": clients}
