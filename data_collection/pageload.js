const puppeteer = require("puppeteer");
const kill = require("tree-kill");
const { startLogging } = require("./helpers.js");
const { DATA_DIRECTORY } = require("./constants.js");

const launchPageLoadTest = async (domain, number, policy, keylog_file) => {
  try {
    const url = `http://${domain}`;
    const pid = await startLogging(
      domain,
      "pageload",
      number,
      policy,
      keylog_file
    );
    const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.goto(url);
    await page.screenshot({
      path: `${DATA_DIRECTORY}/${policy}/screenshots/screenshot_${domain}_${number}.png`,
    });
    await browser.close();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    kill(pid);
  } catch (e) {
    console.log("Puppeteer error: ", e.message);
  }
};
exports.launchPageLoadTest = launchPageLoadTest;
