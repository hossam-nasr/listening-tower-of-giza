const { spawn } = require("child_process");
const { open } = require("fs").promises;
const { DATA_DIRECTORY } = require("./constants.js");

const url_to_domain = (url) => {
  const regex = /^(?:https?:)?(?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/im;
  return url.match(regex)[1];
};
exports.url_to_domain = url_to_domain;

const startLogging = async (domain, test, number, policy, keylog_file) => {
  // Create .pcap file
  console.log(
    `Creating .pcap file for test ${test} #${number} for domain ${domain}...`
  );

  pcapfilepath = `${DATA_DIRECTORY}/${policy}/${test}_pcap_${domain}_${number}.pcap`;
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
  console.log("Successfully started capturing.");
  return tsharkProc.pid;
};
exports.startLogging = startLogging;

const domain_to_test_number = async (indices, domain, policy) => {
  if (!indices[policy]) {
    indices[policy] = {}
  }
  if (!indices[policy][domain]) {
    indices[policy][domain] = 0;
  }
  const number = indices[policy][domain];
  indices[policy][domain] += 1;
  try {
    const filehandle = await open("./indices.json", "w");
    await filehandle.write(JSON.stringify(indices));
    await filehandle.close();
  } catch (e) {
    console.log("Error updating .json indices: ", e.message);
  }
  return number;
};
exports.domain_to_test_number = domain_to_test_number;

const createSslKeyLogFile = async (domain, number, policy) => {
  try {
    console.log("Creating SSL keylog file...");
    const filepath = `${DATA_DIRECTORY}/${policy}/keylogfile_${domain}_${number}.log`;
    const filehandle = await open(filepath, "w");
    await filehandle.chmod(444);
    await filehandle.close();
    console.log("Successfully created.");
    return filepath;
  } catch (e) {
    console.log("Error creating SSL keylog file: ", e.message);
  }
};
exports.createSslKeyLogFile = createSslKeyLogFile;
