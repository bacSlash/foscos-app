from fastapi import APIRouter, HTTPException, Header
from backend.firebase_auth import verify_token
from backend.database import get_db

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


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


@router.get("")
async def get_dashboard(authorization: str = Header(...)):
    """
    Returns everything the FBO dashboard needs:
    - User profile
    - Active licenses
    - Pending applications (with documents)
    - Agent client list (if agent)
    """
    user = _get_user(authorization)
    db = get_db()

    licenses = db.table("licenses").select("*").eq("user_id", user["id"]).eq("status", "active").execute().data
    applications = (
        db.table("applications")
        .select("*, documents(*)")
        .eq("user_id", user["id"])
        .order("filed_at", desc=True)
        .execute()
        .data
    )

    agent_clients = []
    if user["role"] == "agent":
        agent_clients = (
            db.table("agent_clients")
            .select("*, users!agent_clients_client_id_fkey(name, mobile, id)")
            .eq("agent_id", user["id"])
            .execute()
            .data
        )

    return {
        "user": user,
        "licenses": licenses,
        "applications": applications,
        "agent_clients": agent_clients,
    }
