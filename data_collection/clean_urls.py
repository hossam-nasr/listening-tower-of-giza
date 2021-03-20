import pandas as pd

bad_traffic_data = pd.read_csv("bad_traffic_domains.txt", header=None)
bad_traffic_urls = ["http://" + domain for domain in list(bad_traffic_data[0])]

ooni_data = pd.read_csv("ooni_urls.csv")
ooni_urls = list(ooni_data.url)

all_urls = bad_traffic_urls + ooni_urls
with open("urls_to_test.txt", "w") as f:
    f.write("\n".join(all_urls))