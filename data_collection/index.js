const sslkeylog = require("sslkeylog");
const indices = require("./indices.json");
const {
  domain_to_test_number,
  createSslKeyLogFile,
  save_indices,
  createDirsIfNotExist,
  getDataCsvFile,
  getInitialExperimentData,
  saveExperimentData,
  get_run_number,
  get_experiment_id,
  url_to_domain,
  get_url_list,
} = require("./helpers.js");
const { launchDnsTest } = require("./dns.js");
const { launchPageLoadTest } = require("./pageload.js");

const policy = "egypt_control";

(async () => {
  try {
    // setup
    const urls = await get_url_list();
    createDirsIfNotExist();
    const datafilehandle = await getDataCsvFile(policy);
    const run_number = get_run_number(indices, policy);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`Testing url ${i + 1}/${urls.length}: ${url}`);
      const experiment_id = get_experiment_id(indices, policy);
      const domain = url_to_domain(url);
      const testNumber = domain_to_test_number(indices, domain, policy);
      let experiment_data = getInitialExperimentData(
        experiment_id,
        run_number,
        domain,
        url,
        testNumber,
        policy
      );

      // run experiments
      let page_load_res = {
        page_load_success: 0,
        page_load_status: "failure",
      };
      let dns_results = {};
      const keylog_file = await createSslKeyLogFile(domain, testNumber, policy);
      process.env["SSLKEYLOGFILE"] = keylog_file;
      sslkeylog.hookAll();
      dns_results = await launchDnsTest(
        domain,
        testNumber,
        policy,
        keylog_file
      );
      let res = await launchPageLoadTest(url, testNumber, policy, keylog_file);
      page_load_res.page_load_status = res.status;
      page_load_res.page_load_success = res.success;

      // save data
      await saveExperimentData(
        datafilehandle,
        experiment_data,
        dns_results,
        page_load_res
      );
    }

    // save indices
    datafilehandle.close();
    save_indices(indices);
  } catch (e) {
    console.log("Error: ", e.message);
  }
})();
