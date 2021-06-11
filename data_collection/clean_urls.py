import pandas as pd

num_of_top_global_sites = 600
num_of_top_egypt_sites = 400

# Get URLs from Bad Traffic report reported blocked sites
bad_traffic_data = pd.read_csv("bad_traffic_domains.txt", header=None)
bad_traffic_urls = ["http://" + domain for domain in list(bad_traffic_data[0])]

# Get URLS from Citizen Lab gobal and Egypt list, used by OONI probe
ooni_data = pd.read_csv("ooni_urls.csv")
ooni_urls = list(ooni_data.url)

# Get URLs from Alexa top 1000 global sites
global_sites_data = pd.read_json("./alexa_top_1000_sites_global.json")
global_sites_urls = ["http://" + domain for domain in list(global_sites_data.DataUrl)][: num_of_top_global_sites + 1]

# Get URLs from Alexa top Egypt sites
egypt_sites_data = pd.read_json("./alexa_top_1000_sites_egypt.json")
egypt_sites_urls = ["http://" + domain for domain in list(egypt_sites_data.DataUrl)][: num_of_top_egypt_sites + 1]

# Exclude URLs that are broken even in the US
us_control_results = pd.read_csv("../data/us_control/experiments.csv")
broken_urls_set = set(
    list(
        us_control_results[
            (
                us_control_results.page_load_success
                == 0 & ~(us_control_results.page_load_status.str.startswith("Navigation timeout"))
            )
        ].url
    )
)


all_urls = list(set(bad_traffic_urls + ooni_urls + global_sites_urls + egypt_sites_urls) - broken_urls_set)


# with open("all_sites_tested.txt", "w") as f:
#     f.write("\n".join(all_urls))

sites_tested = pd.read_csv("urls_to_test.txt", header=None)
total_sites = pd.read_csv("all_sites_tested.txt", header=None)
urls_excluded = set(set(total_sites[0]) - set(sites_tested[0]))
with open("broken_urls.txt", "w") as f:
    f.write("\n".join(list(urls_excluded)))

print(f"Successfully written {len(urls_excluded)} urls")
