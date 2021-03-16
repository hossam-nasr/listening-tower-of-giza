const dnsPromises = require("dns").promises;
const kill = require("tree-kill");
const { open } = require("fs").promises;
const { startLogging } = require("./helpers.js");
const { DATA_DIRECTORY } = require("./constants.js");

const launchDnsTest = async (domain, number, policy, keylog_file) => {
  try {
    console.log("Starting capture...");
    const pid = await startLogging(domain, "dns", number, policy, keylog_file);

    // DNS Tests
    console.log("Starting DNS Tests...");
    const ips = await dnsTest(domain, number, policy);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    kill(pid);
    return ips;
  } catch (e) {
    console.log("Error running DNS Tests: ", e.message);
  }
};
exports.launchDnsTest = launchDnsTest;

const dnsTest = async (domain, number, policy) => {
  const cloudflareDNS = "1.1.1.1";

  var ret = new Set();
  try {
    let filehandle = null;
    try {
      console.log("Creating DNS .txt file...");
      filehandle = await open(
        `${DATA_DIRECTORY}/${policy}/dns_log_${domain}_${number}.txt`,
        "w"
      );
      filehandle.write(
        `DNS Lookup #${number} for ${domain} using policy ${policy}\n`
      );
      console.log("Successfully created DNS .txt file.");
    } catch (e) {
      console.log("Error creating DNS .txt file");
    }
    if (filehandle) {
      filehandle.write(`DNS servers used: ${dnsPromises.getServers()}\n`);
    }
    const resolver = new dnsPromises.Resolver();
    addresses = await resolver.resolve4(domain);
    addresses.map((address) => {
      ret.add(address);
    });
    if (filehandle) {
      filehandle.write(`Default DNS lookup: ${addresses}\n`);
    }
    resolver.setServers([cloudflareDNS]);
    addresses = await resolver.resolve4(domain);
    addresses.map((address) => {
      ret.add(address);
    });
    if (filehandle) {
      filehandle.write(`Cloudflare DNS lookup: ${addresses}\n`);
      filehandle.close();
    }
  } catch (e) {
    console.log("Error running DNS tests: ", e.message);
  }

  return Array.from(ret);
};
