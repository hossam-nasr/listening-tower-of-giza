const sslkeylog = require("sslkeylog");
const indices = require("./indices.json");
const fs = require("fs");
const { DATA_DIRECTORY } = require("./constants.js");
const { domain_to_test_number, createSslKeyLogFile } = require("./helpers.js");
const { launchDnsTest } = require("./dns.js");
const { launchPageLoadTest } = require("./pageload.js");

const domain = "madamasr.com";
const policy = "us_test";

// Create directories if they don't exist
const dir_path = `${DATA_DIRECTORY}/${policy}`;
const screenshots_path = `${dir_path}/screenshots`;
if (!fs.existsSync(dir_path)) {
  fs.mkdirSync(dir_path);
}
if (!fs.existsSync(screenshots_path)) {
  fs.mkdirSync(screenshots_path);
}

(async () => {
  try {
    const testNumber = await domain_to_test_number(indices, domain, policy);
    const keylog_file = await createSslKeyLogFile(domain, testNumber, policy);
    process.env["SSLKEYLOGFILE"] = keylog_file;
    sslkeylog.hookAll();
    const ips = await launchDnsTest(domain, testNumber, policy, keylog_file);
    console.log("IPs are ", ips);
    await launchPageLoadTest(domain, testNumber, policy, keylog_file);
  } catch (e) {
    console.log("Error: ", e.message);
  }
})();
