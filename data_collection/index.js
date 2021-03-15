const puppeteer = require("puppeteer");
const dnsPromises = require("dns").promises;
const { spawn } = require("child_process");
const { open } = require("fs").promises;
const kill = require("tree-kill");
const sslkeylog = require("sslkeylog");
const indices = require("./indices.json");

const domain = "aljazeera.net";
const policy = "test";

const url_to_domain = (url) => {
  const regex = /^(?:https?:)?(?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/im;
  return url.match(regex)[1];
};

const startLogging = async (domain, test, number, policy, keylog_file) => {
  // Create .pcap file
  console.log(
    `Creating .pcap file for test ${test} #${number} for domain ${domain}...`
  );

  pcapfilepath = `../data/${policy}/${test}_pcap_${domain}_${number}.pcap`;
  try {
    const filehandle = await open(pcapfilepath, "w");
    await filehandle.chmod(444);
    await filehandle.close();
    console.log("Successfully created .pcap file.");
  } catch (e) {
    console.log("Error creating .pcap file: ", e.message);
  }

  // Spawn tshark process
  let options = ["tshark", "-w", pcapfilepath];
  if (test === "dns") {
    options = [...options, "-f", "udp port 53"];
  } else {
    /// TODO
    options = [
      ...options,
      "-o",
      `tls.keylog_file: ${keylog_file}`,
      "-f",
      "udp port 53 or tcp port 80 or tcp port 443",
    ];
  }
  console.log("Creating tshark logging process...");
  const tsharkProc = spawn("sudo", options);
  const tsharkProcStartPromise = new Promise((resolve) => {
    tsharkProc.stdout.on("data", (data) => {
      if (`${data}`.startsWith("Capturing")) {
        setTimeout(resolve, 100);
      }
    });

    tsharkProc.stderr.on("data", (data) => {
      if (`${data}`.startsWith("Capturing")) {
        setTimeout(resolve, 100);
      }
    });
  });

  tsharkProc.on("error", (error) => {
    console.log(`error creating tshark process: ${error.message}`);
  });

  tsharkProc.on("close", (code) => {
    console.log(`tshark child process exited with code ${code}`);
  });

  await tsharkProcStartPromise;
  return tsharkProc.pid;
};

const dnsTest = async (domain, number, policy) => {
  const cloudflareDNS = "1.1.1.1";

  var ret = new Set();
  try {
    let filehandle = null;
    try {
      console.log("Creating DNS .txt file...");
      filehandle = await open(
        `../data/${policy}/dns_log_${domain}_${number}.txt`,
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

launchPageLoadTest = async (domain, number, policy, keylog_file) => {
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
      path: `../data/${policy}/screenshots/screenshot_${domain}_${number}.png`,
    });
    await browser.close();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    kill(pid);
  } catch (e) {
    console.log("Puppeteer error: ", e.message);
  }
};

const domain_to_test_number = async (domain) => {
  if (!indices[domain]) {
    indices[domain] = 0;
  }
  const number = indices[domain];
  indices[domain] += 1;
  try {
    const filehandle = await open("./indices.json", "w");
    await filehandle.write(JSON.stringify(indices));
    await filehandle.close();
  } catch (e) {
    console.log("Error updating .json indices: ", e.message);
  }
  return number;
};

const createSslKeyLogFile = async (domain, number, policy) => {
  try {
    console.log("Creating SSL keylog file...");
    const filepath = `../data/${policy}/keylogfile_${domain}_${number}.log`;
    const filehandle = await open(filepath, "w");
    await filehandle.chmod(444);
    await filehandle.close();
    console.log("Successfully created.");
    return filepath;
  } catch (e) {
    console.log("Error creating SSL keylog file: ", e.message);
  }
};

(async () => {
  try {
    const testNumber = await domain_to_test_number(domain);
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
