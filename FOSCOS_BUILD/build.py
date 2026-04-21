"""
FoSCoS Build Script
Run: python build.py
Concatenates all parts into frontend/citizen.html and frontend/officer.html
"""
import os, glob, sys
# Force UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

CITIZEN_PARTS_ORDER = [
    "parts/citizen/01_head.html",
    "parts/citizen/02_global_ui.html",
    "parts/citizen/03_home.html",
    "parts/citizen/04_auth.html",
    "parts/citizen/05_flow1_setup.html",
    "parts/citizen/06_flow2_details_docs.html",
    "parts/citizen/07_flow3_oss_review_payment.html",
    "parts/citizen/08_dashboard_tracker.html",
    "parts/citizen/09_temp_license.html",
    "parts/citizen/10_consumer.html",
    "parts/citizen/11_agent.html",
    "parts/citizen/12_script.html",
]

OFFICER_PARTS_ORDER = [
    "parts/officer/01_head.html",
    "parts/officer/02_layout.html",
    "parts/officer/03_pages_dashboard_queue.html",
    "parts/officer/04_pages_applications.html",
    "parts/officer/05_pages_fbo_monitoring.html",
    "parts/officer/06_pages_grievances_league_reports.html",
    "parts/officer/07_script.html",
]

os.makedirs("frontend", exist_ok=True)

def build(parts, output):
    built = []
    missing = []
    for part in parts:
        if os.path.exists(part):
            with open(part, "r", encoding="utf-8") as f:
                built.append(f.read())
            print(f"  ✅ {part}")
        else:
            missing.append(part)
            print(f"  ⏳ {part} — not yet written")

    if built:
        with open(output, "w", encoding="utf-8") as f:
            f.write("\n".join(built))
        print(f"\n→ Written: {output} ({len(''.join(built))} chars from {len(built)} parts)\n")
    if missing:
        print(f"  Missing parts ({len(missing)}): {', '.join(os.path.basename(m) for m in missing)}\n")

print("=== Building citizen.html ===")
build(CITIZEN_PARTS_ORDER, "frontend/citizen.html")

print("=== Building officer.html ===")
build(OFFICER_PARTS_ORDER, "frontend/officer.html")

print("Done. Open http://localhost:8000 after: uvicorn main:app --reload")
