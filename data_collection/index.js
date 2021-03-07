const puppeteer = require("puppeteer");
const dnsPromises = require("dns").promises;
const { spawn } = require("child_process");
const { open } = require("fs").promises;
const kill = require("tree-kill");

const url = "https://www.aljazeera.net/";
const policy = "test";

const url_to_domain = (url) => {
  const regex = /^(?:https?:)?(?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/im;
  return url.match(regex)[1];
};

const dnsTest = async (domain, policy) => {
  const cloudflareDNS = "1.1.1.1";

  var ret = new Set();
  try {
    let filehandle = null;
    try {
      console.log("Creating DNS .txt file...");
      filehandle = await open(`../data/${policy}/dnslog_${domain}.txt`, "w");
      filehandle.write(`DNS Lookup for ${domain} using policy ${policy}\n`);
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

const launchDnsTest = async (domain, policy) => {
  console.log("Creating DNS .pcap file...");

  pcapfilepath = `../data/${policy}/dnspcap_${domain}.pcap`;
  try {
    const filehandle = await open(pcapfilepath, "w");
    await filehandle.chmod(444);
    await filehandle.close();
    console.log("Successfully created DNS .pcap file.");
  } catch (e) {
    console.log("Error creating .pcap file: ", e.message);
  }

  console.log("Creating tshark DNS logging process...");
  const dnsLogProc = spawn("sudo", [
    "tshark",
    "-w",
    pcapfilepath,
    "-f",
    "udp port 53",
  ]);

  const dnsLogProcStartPromise = new Promise((resolve) => {
    dnsLogProc.stdout.on("data", (data) => {
      if (`${data}`.startsWith("Capturing")) {
        setTimeout(resolve, 100);
      }
    });

    dnsLogProc.stderr.on("data", (data) => {
      if (`${data}`.startsWith("Capturing")) {
        setTimeout(resolve, 100);
      }
    });
  });

  dnsLogProc.stderr.on("data", (data) => {
    console.log(`tshark stderr: ${data}`);
  });

  dnsLogProc.stdout.on("data", (data) => {
    console.log(`tshark stdout: ${data}`);
  });

  dnsLogProc.on("error", (error) => {
    console.log(`error creating DNS tshark process: ${error.message}`);
  });

  dnsLogProc.on("close", (code) => {
    console.log(`tshark child process exited with code ${code}`);
  });

  await dnsLogProcStartPromise;

  // DNS Tests
  console.log("Starting DNS Tests...");
  const ips = await dnsTest(domain, policy);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  kill(dnsLogProc.pid);
  return ips;
};

(async () => {
  try {
    const domain = url_to_domain(url);
    const ips = await launchDnsTest(domain, policy);
    console.log("IPs are ", ips);

    // (async () => {
    //   try {
    //     const browser = await puppeteer.launch();
    //     const page = await browser.newPage();
    //     await page.goto("https://madamasr.com");
    //     await page.screenshot({ path: "example.png" });
    //     await browser.close();
    //   } catch (e) {
    //     console.log("Error: ", e.message);
    //   }
    // })();
  } catch (e) {
    console.log("Error: ", e.message);
  }
})();
