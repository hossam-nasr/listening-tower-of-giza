const sslkeylog = require("sslkeylog");
const indices = require("./indices.json");
const fs = require("fs");
const { open } = require("fs").promises;
const { parse } = require("json2csv");
const {
  DATA_DIRECTORY,
  SCREENSHOTS_DIR_NAME,
  DATA_CSV_FILE_NAME,
} = require("./constants.js");
const { domain_to_test_number, createSslKeyLogFile } = require("./helpers.js");
const { launchDnsTest } = require("./dns.js");
const { launchPageLoadTest } = require("./pageload.js");

const domain = "madamasr.com";
const policy = "us_control";

const fields = [
  "experiment_id",
  "run_number",
  "policy",
  "domain",
  "experiment_count",
  "experiment_code",
  "timestamp",
  "timezone_offset",
  "local_time",
  "default_dns_servers",
  "default_lookup_status",
  "default_lookup_success",
  "default_lookup_ips",
  "cloudflare_lookup_status",
  "cloudflare_lookup_success",
  "cloudflare_lookup_ips",
  "all_ips",
  "page_load_success",
  "page_load_status",
];

const get_experiment_ids = async (indices, policy) => {
  if (!indices[policy]) {
    indices[policy] = {};
  }
  if (!indices[policy]["next_experiment_id"]) {
    indices[policy]["next_experiment_id"] = 0;
  }
  const experiment_id = indices[policy]["next_experiment_id"];
  indices[policy]["next_experiment_id"] += 1;

  if (!indices[policy]["run_number"]) {
    indices[policy]["run_number"] = 0;
  }
  const run_number = indices[policy]["run_number"];
  indices[policy]["run_number"] += 1;
  try {
    const filehandle = await open("./indices.json", "w");
    await filehandle.write(JSON.stringify(indices));
    await filehandle.close();
  } catch (e) {
    console.log("Error updating .json indices: ", e.message);
  }
  return { experiment_id, run_number };
};

(async () => {
  const dir_path = `${DATA_DIRECTORY}/${policy}`;
  const screenshots_path = `${dir_path}/${SCREENSHOTS_DIR_NAME}`;
  const data_csv_path = `${dir_path}/${DATA_CSV_FILE_NAME}`;
  if (!fs.existsSync(dir_path)) {
    fs.mkdirSync(dir_path);
  }
  if (!fs.existsSync(screenshots_path)) {
    fs.mkdirSync(screenshots_path);
  }

  let datafilehandle;
  try {
    if (!fs.existsSync(data_csv_path)) {
      console.log("I AM HERE");
      console.log("FIELDS ARE ", fields);
      datafilehandle = await open(data_csv_path, "w");
      await datafilehandle.chmod(444);
      datafilehandle.write(fields.join(","));
      datafilehandle.write("\n");
    } else {
      datafilehandle = await open(data_csv_path, "a");
    }
  } catch (e) {
    console.log("Error opening data file: ", e.message);
  }

  const { experiment_id, run_number } = await get_experiment_ids(
    indices,
    policy
  );
  const now = new Date();

  const testNumber = await domain_to_test_number(indices, domain, policy);

  let experiment_data = {
    experiment_id,
    run_number,
    policy,
    domain,
    experiment_count: testNumber,
    experiment_code: `${domain}_${testNumber}`,
    timestamp: now.getTime(),
    timezone_offset: now.getTimezoneOffset(),
    local_time: now.toLocaleString(),
  };

  let page_load_res = {
    page_load_success: 0,
    page_load_status: "failure",
  };
  let dns_results = {};
  try {
    const keylog_file = await createSslKeyLogFile(domain, testNumber, policy);
    process.env["SSLKEYLOGFILE"] = keylog_file;
    sslkeylog.hookAll();
    dns_results = await launchDnsTest(domain, testNumber, policy, keylog_file);
    let res = await launchPageLoadTest(domain, testNumber, policy, keylog_file);
    page_load_res.page_load_status = res.status;
    page_load_res.page_load_success = res.success;
  } catch (e) {
    console.log("Error: ", e.message);
  }

  experiment_data = Object.assign(experiment_data, page_load_res, dns_results);

  const csv_string = parse(experiment_data, { fields });
  csv_string_without_title = csv_string.split("\n")[1];
  datafilehandle.write(csv_string_without_title);
  datafilehandle.write("\n");
  datafilehandle.close();
})();
