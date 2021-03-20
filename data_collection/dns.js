const dnsPromises = require("dns").promises;
const kill = require("tree-kill");
const { open } = require("fs").promises;
const { startLogging } = require("./helpers.js");
const { DATA_DIRECTORY } = require("./constants.js");

const launchDnsTest = async (domain, number, policy, keylog_file) => {
  const pid = await startLogging(domain, "dns", number, policy, keylog_file);

  // DNS Tests
  console.log("Starting DNS Tests...");
  const dns_results = await dnsTest(domain);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  kill(pid);
  console.log("Successfully ran DNS tests.");
  return dns_results;
};
exports.launchDnsTest = launchDnsTest;

const dnsTest = async (domain) => {
  const cloudflareDNS = "1.1.1.1";
  const default_dns_servers = dnsPromises.getServers();
  const ips = new Set();
  const resolver = new dnsPromises.Resolver();
  let default_lookup_ips,
    default_lookup_status,
    default_lookup_success,
    cloudflare_lookup_ips,
    cloudflare_lookup_status,
    cloudflare_lookup_success;
  try {
    addresses = await resolver.resolve4(domain);
    default_lookup_success = 1;
    default_lookup_status = "success";
    default_lookup_ips = addresses;
    addresses.map((address) => {
      ips.add(address);
    });
  } catch (e) {
    console.log("Error running DNS on default servers: ", e.message);
    default_lookup_success = 0;
    default_lookup_status = e.message;
    default_lookup_ips = [];
  }
  try {
    resolver.setServers([cloudflareDNS]);
    addresses = await resolver.resolve4(domain);
    cloudflare_lookup_status = "success";
    cloudflare_lookup_success = 1;
    cloudflare_lookup_ips = addresses;
    addresses.map((address) => {
      ips.add(address);
    });
  } catch (e) {
    console.log("Error running DNS on Cloudflare servesrs: ", e.message);
    cloudflare_lookup_status = e.message;
    cloudflare_lookup_success = 0;
    cloudflare_lookup_ips = [];
  }

  return {
    default_dns_servers,
    default_lookup_status,
    default_lookup_success,
    default_lookup_ips,
    cloudflare_lookup_status,
    cloudflare_lookup_success,
    cloudflare_lookup_ips,
    all_ips: Array.from(ips),
  };
};
