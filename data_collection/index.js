const puppeteer = require("puppeteer");

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("https://example.org");
    await page.screenshot({ path: "example.png" });
    await browser.close();
  } catch (e) {
    console.log("Error: ", e.message);
  }
})();
