from playwright.sync_api import sync_playwright
import os

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:3000/admin-login.html")
    page.locator("#username").fill("admin")
    page.locator("#password").fill(os.environ.get('ADMIN_PASSWORD'))
    page.locator("text=Login").click()
    page.goto("http://localhost:3000/admin.html")
    page.screenshot(path="jules-scratch/verification/admin_verification.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
