const puppeteer = require("puppeteer");
const kill = require("tree-kill");
const { startLogging, url_to_domain } = require("./helpers.js");
const { DATA_DIRECTORY } = require("./constants.js");

const launchPageLoadTest = async (url, number, policy, keylog_file) => {
  let success = 1;
  let status = "success";
  const domain = url_to_domain(url);
  const pid = await startLogging(
    domain,
    "pageload",
    number,
    policy,
    keylog_file
  );
  try {
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
    // wait a random number of seconds (between 2 and 12s) after each trial
    await new Promise((resolve) =>
      setTimeout(resolve, 2000 + Math.round(Math.random() * 10000))
    );
  } catch (e) {
    console.log("Puppeteer error: ", e.message);
    success = 0;
    status = e.message;
  }
  kill(pid);
  return { success, status };
};
exports.launchPageLoadTest = launchPageLoadTest;
