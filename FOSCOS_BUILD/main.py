from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os

from backend.firebase_auth import init_firebase
from backend.routes.auth import router as auth_router
from backend.routes.applications import router as app_router
from backend.routes.officer import router as officer_router
from backend.routes.consumers import router as consumer_router
from backend.routes.dashboard import router as dashboard_router
from backend.routes.agent import router as agent_router
from backend.config import FIREBASE_WEB_CONFIG, SUPABASE_URL, SUPABASE_ANON_KEY

app = FastAPI(title="FoSCoS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# Include API routers (must be registered before catch-all frontend routes)
app.include_router(auth_router)
app.include_router(app_router)
app.include_router(officer_router)
app.include_router(consumer_router)
app.include_router(dashboard_router)
app.include_router(agent_router)


@app.on_event("startup")
async def startup():
    init_firebase()


@app.get("/api/config")
async def get_public_config():
    return JSONResponse({
        "firebase": FIREBASE_WEB_CONFIG,
        "supabase": {
            "url": SUPABASE_URL,
            "anon_key": SUPABASE_ANON_KEY,
        }
    })


@app.get("/health")
async def health():
    return {"status": "ok"}


# ── Officer portal routes ─────────────────────────────────────────
# Must be registered BEFORE the citizen /{page} catch-all so that
# /officer and /officer/{page} are not swallowed by the citizen route.

_OFFICER_PAGES = {"dashboard", "queue", "applications", "fbo", "monitoring",
                  "inspections", "grievances", "league", "reports", "settings"}

@app.get("/officer")
async def officer_root():
    return FileResponse("frontend/officer.html")

@app.get("/officer/{page}")
async def officer_page(page: str):
    if page not in _OFFICER_PAGES:
        raise HTTPException(status_code=404)
    return FileResponse("frontend/officer.html")


# ── Citizen portal routes ─────────────────────────────────────────
# Each maps to citizen.html; JS reads pathname on load to navigate to
# the correct screen.

_CITIZEN_PAGES = {"login", "dashboard", "track", "apply", "consumer", "agent", "temp-license", "my-licenses"}

@app.get("/")
async def citizen_home():
    return FileResponse("frontend/citizen.html")

@app.get("/{page}")
async def citizen_page(page: str):
    if page not in _CITIZEN_PAGES:
        raise HTTPException(status_code=404)
    return FileResponse("frontend/citizen.html")
