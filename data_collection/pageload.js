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
  let browser;
  try {
    console.log("Launching browser...");
    browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    console.log("Navigating to page...");
    await page.goto(url);
    console.log("Capturing screenshot...");
    if (url != "https://www.defenceweb.co.za/") {
      await page.screenshot({
        path: `${DATA_DIRECTORY}/${policy}/screenshots/screenshot_${domain}_${number}.png`,
      });
    }
    console.log("Success!");
  } catch (e) {
    console.log("Puppeteer error: ", e.message);
    success = 0;
    status = e.message;
  }

  if (browser) {
    await browser.close();
  }
  // wait a random number of seconds (between 2 and 12s) after each trial
  const seconds = 2 + Math.round(Math.random() * 10);
  console.log(`Waiting ${seconds}s...`);
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  kill(pid);
  return { success, status };
};
exports.launchPageLoadTest = launchPageLoadTest;
