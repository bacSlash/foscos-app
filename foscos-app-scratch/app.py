from flask import Flask, render_template

app = Flask(__name__)


def placeholder(page_name, page_id):
    """Render the shared placeholder template with page metadata."""
    return render_template('_placeholder.html', page_name=page_name, page_id=page_id)


# ── Home ─────────────────────────────────────────────────────
@app.route('/')
def home():
    return render_template('index.html')


# ── Navbar links ──────────────────────────────────────────────
@app.route('/regulations')
def regulations():
    return placeholder('Regulations', 'regulations')

@app.route('/latest-updates')
def latest_updates():
    return placeholder('Latest Updates', 'latest-updates')

@app.route('/about-fssai')
def about_fssai():
    return placeholder('About FSSAI', 'about-fssai')


# ── Hero CTA ──────────────────────────────────────────────────
@app.route('/help')
def help_page():
    return placeholder('Hello — How Can We Help?', 'help')


# ── Service cards ─────────────────────────────────────────────
@app.route('/apply-permanent-license')
def permanent_license():
    return placeholder('Apply for Permanent License', 'apply-permanent-license')

@app.route('/temporary-license')
def temporary_license():
    return placeholder('Temporary License', 'temporary-license')

@app.route('/renew-license')
def renew_license():
    return placeholder('Renew License', 'renew-license')

@app.route('/check-status')
def check_status():
    return placeholder('Check License Status', 'check-status')

@app.route('/one-stop-shop')
def one_stop_shop():
    return placeholder('One Stop Shop', 'one-stop-shop')

@app.route('/consumer-corner')
def consumer_corner():
    return placeholder('Consumer Corner', 'consumer-corner')


# ── Updates "View All" ────────────────────────────────────────
@app.route('/updates')
def updates():
    return placeholder('Latest Updates & Regulations', 'updates')


if __name__ == '__main__':
    app.run(debug=True, port=5000)
