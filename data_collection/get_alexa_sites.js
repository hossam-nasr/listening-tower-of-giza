const rp = require("request-promise");
const util = require("util");
const { open } = require("fs").promises;

const apiHost = "ats.api.alexa.com";

global.fetch = require("node-fetch");

const callApi = async (apiKey, start, count, country) => {
  let uri = `/api?Action=TopSites&Count=${count}&ResponseGroup=Country&Output=json&Start=${start}`;
  if (country) {
    uri = `${uri}&CountryCode=${country}`;
  }

  const options = {
    host: apiHost,
    path: uri,
    uri: `https://${apiHost}${uri}`,
    json: true,
    headers: {
      "x-api-key": apiKey,
    },
    resolveWithFullResponse: true,
  };

  try {
    const html = await util.promisify(rp)(options);
    const jsonResp = html.body;
    const sites = jsonResp.Ats.Results.Result.Alexa.TopSites.Country.Sites.Site;
    return sites;
  } catch (e) {
    console.log("Error calling API: ", e.message);
  }
};

const getTopSites = async (apiKey, number, country) => {
  let left = number;
  let start = 1;
  let sites = [];
  do {
    let request_num = left > 100 ? 100 : left;
    const new_sites = await callApi(apiKey, start, request_num, country);
    sites = sites.concat(new_sites);
    left -= request_num;
    start += request_num;
  } while (left > 0);
  return sites;
};

(async () => {
  const global_sites = await getTopSites(apiKey, 1000);
  const egypt_sites = await getTopSites(apiKey, 1000, "EG");
  try {
    const globalfilehandle = await open("./alexa_top_1000_sites_global", "w");
    const egyptfilehandle = await open("./alexa_top_1000_sites_egypt", "w");
    await globalfilehandle.write(JSON.stringify(global_sites));
    await egyptfilehandle.write(JSON.stringify(egypt_sites));
    await globalfilehandle.close();
    await egyptfilehandle.close();
  } catch (e) {
    console.log("Error opening files: ", e.message);
  }
  console.log("Global sites length: ", global_sites.length);
  console.log("Egypt sites length: ", egypt_sites.length);
  console.log("Success!");
})();
