const sslkeylog = require("sslkeylog");
const indices = require("./indices.json");
const { domain_to_test_number, createSslKeyLogFile } = require("./helpers.js");
const { launchDnsTest } = require("./dns.js");
const { launchPageLoadTest } = require("./pageload.js");

const domain = "madamasr.com";
const policy = "egypt_control";

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
