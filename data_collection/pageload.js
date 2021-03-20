const puppeteer = require("puppeteer");
const kill = require("tree-kill");
const { startLogging } = require("./helpers.js");
const { DATA_DIRECTORY } = require("./constants.js");

const launchPageLoadTest = async (domain, number, policy, keylog_file) => {
  let success = 1;
  let status = "success";
  const pid = await startLogging(
    domain,
    "pageload",
    number,
    policy,
    keylog_file
  );
  try {
    const url = `http://${domain}`;
    console.log("Launching browser...");
    const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    console.log("Navigating to page...");
    await page.goto(url);
    console.log("Capturing screenshot...");
    await page.screenshot({
      path: `${DATA_DIRECTORY}/${policy}/screenshots/screenshot_${domain}_${number}.png`,
    });
    await browser.close();
    console.log("Success!");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (e) {
    console.log("Puppeteer error: ", e.message);
    success = 0;
    status = e.message;
  }
  kill(pid);
  return { success, status };
};
exports.launchPageLoadTest = launchPageLoadTest;
