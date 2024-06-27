from flask import Flask, request
from flask_cors import CORS

from bs4 import BeautifulSoup
import requests

app = Flask(__name__)
CORS(app)

def get_page(url):
    page = requests.get(url)
    if page.status_code != 200:
        raise Exception(f"error {page.status_code}: could not fetch {url}")

    return page


@app.get("/scrape")
async def chat():
    print(request.args.keys())
    url = request.args.get("url")
    print(url)
    soup = BeautifulSoup(get_page(url).content, "html.parser")
    return soup.text
