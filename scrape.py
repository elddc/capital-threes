# imports
from bs4 import BeautifulSoup
import requests
import json

# path to save to
out_path = "laws.json"

# starting urls
urls = [
    "https://www.ilga.gov/commission/lrb/conent.htm", # constitution
    "https://www.ilga.gov/legislation/glossary.asp", # glossary
]
statutes = "https://www.ilga.gov/legislation/ilcs/ilcs.asp"
base = "https://www.ilga.gov/legislation/ilcs/"

# dict of {law: text}
all_laws = {}

# laws with no content/unexpected format
failed_laws = []

# get HTML from a URL
def get_page(url):
    page = requests.get(url)
    if page.status_code != 200:
        raise Exception(f"error {page.status_code}: could not fetch {url}")

    return page

def make_url(href):
    return f"{base}{href.replace('/legislation/ilcs/', '')}"


# scrape top-level page
soup = BeautifulSoup(get_page(statutes).content, "html.parser")

# get links to subpages
subpages = soup.select("center > table a")
print(f"scraping {len(subpages)} categories of law...")

# scrape each subpage
for subpage in subpages:
    sub_soup = BeautifulSoup(get_page(make_url(subpage.get('href'))).content, "html.parser")

    # get links to individual laws
    laws = sub_soup.select("table ul a")
    print(f"scraping {len(laws)} laws from {subpage.text}...")

    # scrape individual law
    for law in laws:
        print(f"> scraping {law.text}")
        law_soup = BeautifulSoup(get_page(make_url(law.get('href'))).content, "html.parser")

        # save law to dictionary
        law_content = "\n".join([elem.text for elem in law_soup.select("p table")])
        if len(law_content) == 0:
            print("> no law content found, searching for more hyperlinks...")
            full_law = law_soup.find("a", string="View Entire Act")
            if (full_law):
                print("> full law found")
                content_soup = BeautifulSoup(get_page(make_url(full_law.get('href'))).content, "html.parser")
                law_content = "\n".join([elem.text for elem in content_soup.select("p table")])
            else:
                print(f"> full law not found for {subpage.text}: {law.text}")
                failed_laws.append(f"{subpage.text}: {law.text}")
        all_laws[law.text] = law_content

print("\nfinish scraping!")

if failed_laws:
    print("failed to scrape:")
    print(failed_laws)

# write all laws to file
with open(out_path, "w") as f:
    json.dump(all_laws, f)
