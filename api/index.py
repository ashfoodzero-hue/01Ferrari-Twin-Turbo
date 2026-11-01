import os
import requests
from flask import Flask, jsonify

app = Flask(__name__)

bls_key = os.environ.get("BLS_API_KEY", "").replace('"', '').replace("'", "").strip()

@app.route('/api')
def get_bls_data():
    url = "https://bls.gov"
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    # Changed timeline metrics to active present constraints
    payload = {
        "seriesid": ["LNS14000000"],
        "startyear": "2024",
        "endyear": "2026",
        "registrationkey": bls_key
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({"error": f"BLS Server returned status {response.status_code}"}), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500
