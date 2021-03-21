const { spawn } = require("child_process");
const { existsSync, mkdirSync } = require("fs");
const { open } = require("fs").promises;
const {
  DATA_DIRECTORY,
  SCREENSHOTS_DIR_NAME,
  DATA_CSV_FILE_NAME,
  fields,
} = require("./constants.js");
const { parse } = require("json2csv");

const url_to_domain = (url) => {
  const regex = /^(?:https?:)?(?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/im;
  return url.match(regex)[1];
};
exports.url_to_domain = url_to_domain;

const startLogging = async (domain, test, number, policy, keylog_file) => {
  console.log(`Starting capture for ${domain}, test ${test} #${number}`);
  // Create .pcap file
  pcapfilepath = `${DATA_DIRECTORY}/${policy}/${test}_pcap_${domain}_${number}.pcap`;
  logfilepath = `${DATA_DIRECTORY}/${policy}/${test}_tshark_log_${domain}_${number}.log`;
  try {
    const filehandle = await open(pcapfilepath, "w");
    await filehandle.chmod(444);
    await filehandle.close();
  } catch (e) {
    console.log("Error creating .pcap file: ", e.message);
  }

  // create log file
  let logfilehandle;
  try {
    logfilehandle = await open(logfilepath, "w");
    await logfilehandle.chmod(444);
  } catch (e) {
    console.log("Error creating tshark log file: ", e.message);
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

  const tsharkProc = spawn("sudo", options);
  const tsharkProcStartPromise = new Promise((resolve) => {
    tsharkProc.stdout.on("data", (data) => {
      if (`${data}`.startsWith("Capturing")) {
        setTimeout(resolve, 500 + Math.round(Math.random() * 1000));
      }
    });

    tsharkProc.stderr.on("data", (data) => {
      if (`${data}`.startsWith("Capturing")) {
        setTimeout(resolve, 500 + Math.round(Math.random() * 1000));
      }
    });
  });

  tsharkProc.on("error", (error) => {
    console.log(`error creating tshark process: ${error.message}`);
  });

  tsharkProc.on("close", (code) => {
    console.log(`tshark child process exited with code ${code}`);
    if (logfilehandle) {
      logfilehandle.close();
    }
  });

  tsharkProc.stdin.on("data", (data) => {
    if (logfilehandle) {
      logfilehandle.write(`${data}\n`);
    }
  });

  tsharkProc.stderr.on("data", (data) => {
    if (logfilehandle) {
      logfilehandle.write(`${data}\n`);
    }
  });

  await tsharkProcStartPromise;
  console.log("Successfully started capturing.");
  return tsharkProc.pid;
};
exports.startLogging = startLogging;

const domain_to_test_number = (indices, domain, policy) => {
  if (!indices[policy]) {
    indices[policy] = {};
  }
  if (!indices[policy][domain]) {
    indices[policy][domain] = 0;
  }
  const number = indices[policy][domain];
  indices[policy][domain] += 1;
  return number;
};
exports.domain_to_test_number = domain_to_test_number;

const get_run_number = (indices, policy) => {
  if (!indices[policy]) {
    indices[policy] = {};
  }
  if (!indices[policy]["run_number"]) {
    indices[policy]["run_number"] = 0;
  }
  const run_number = indices[policy]["run_number"];
  indices[policy]["run_number"] += 1;
  return run_number;
};
exports.get_run_number = get_run_number;

const get_experiment_id = (indices, policy) => {
  if (!indices[policy]) {
    indices[policy] = {};
  }
  if (!indices[policy]["next_experiment_id"]) {
    indices[policy]["next_experiment_id"] = 0;
  }
  const exp_id = indices[policy]["next_experiment_id"];
  indices[policy]["next_experiment_id"] += 1;
  return exp_id;
};
exports.get_experiment_id = get_experiment_id;

const save_indices = async (indices, filehandle) => {
  try {
    await filehandle.truncate();
    await filehandle.write(JSON.stringify(indices), 0);
  } catch (e) {
    console.log("Error updating .json indices: ", e.message);
  }
};
exports.save_indices = save_indices;

const get_indices_file = async () => {
  return await open("./indices.json", "w");
};
exports.get_indices_file = get_indices_file;

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

const createDirsIfNotExist = (policy) => {
  const dir_path = `${DATA_DIRECTORY}/${policy}`;
  const screenshots_path = `${dir_path}/${SCREENSHOTS_DIR_NAME}`;
  if (!existsSync(dir_path)) {
    mkdirSync(dir_path);
  }
  if (!existsSync(screenshots_path)) {
    mkdirSync(screenshots_path);
  }
};
exports.createDirsIfNotExist = createDirsIfNotExist;

const getDataCsvFile = async (policy) => {
  const data_csv_path = `${DATA_DIRECTORY}/${policy}/${DATA_CSV_FILE_NAME}`;
  let datafilehandle;
  try {
    if (!existsSync(data_csv_path)) {
      datafilehandle = await open(data_csv_path, "w");
      await datafilehandle.chmod(444);
      await datafilehandle.write(fields.join(","));
      await datafilehandle.write("\n");
    } else {
      datafilehandle = await open(data_csv_path, "a");
    }
  } catch (e) {
    console.log("Error opening data file: ", e.message);
  }
  return datafilehandle;
};
exports.getDataCsvFile = getDataCsvFile;

const getInitialExperimentData = (
  experiment_id,
  run_number,
  domain,
  url,
  testNumber,
  policy
) => {
  const now = new Date();
  return {
    experiment_id,
    run_number,
    policy,
    domain,
    url,
    experiment_count: testNumber,
    experiment_code: `${domain}_${testNumber}`,
    timestamp: now.getTime(),
    timezone_offset: now.getTimezoneOffset(),
    local_time: now.toLocaleString(),
  };
};
exports.getInitialExperimentData = getInitialExperimentData;

const saveExperimentData = async (
  datafilehandle,
  prev_experiment_data,
  dns_data,
  page_load_data
) => {
  const experiment_data = Object.assign(
    prev_experiment_data,
    page_load_data,
    dns_data
  );

  const csv_string = parse(experiment_data, { fields });
  csv_string_without_title = csv_string.split("\n")[1];
  await datafilehandle.write(csv_string_without_title);
  await datafilehandle.write("\n");
};
exports.saveExperimentData = saveExperimentData;

const get_url_list = async () => {
  const filehandle = await open("urls_to_test.txt", "r");
  const text = await filehandle.readFile();
  filehandle.close();
  return `${text}`.split("\n");
};
exports.get_url_list = get_url_list;
