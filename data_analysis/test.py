import os
import pandas as pd
import numpy as np
import functools
from matplotlib import pylab as plt

DATA_DIRECTORY = "../data"
domain = "aljazeera.net"
testnum = 11
test_code = f"{domain}_{testnum}"
policy = "test"

print("Converting .pcap to .csv")
code = os.system(
    f'tshark -2 -r {DATA_DIRECTORY}/{policy}/pageload_pcap_{test_code}.pcap -T fields -e frame.time_epoch -e ip.id -e ip.ttl -e ip.dst -e ip.src -e tcp.srcport -e tcp.dstport -e tcp.len -e tcp.stream -e tcp.seq -e tcp.window_size -e tcp.ack -e tcp.flags -e tcp.flags.reset -e tcp.flags.str -e tcp.analysis.initial_rtt -e tcp.analysis.ack_rtt -e rtitcp.response_time -e cflow.total_tcp_rst -e cflow.tcpflags.rst -e tcp.options.timestamp.tsval -e tcp.options.timestamp.tsecr -e tcp.options.timestamp -e http.host -e http.response.code -e http.user_agent -e http.location -o "tls.keylog_file: {DATA_DIRECTORY}/{policy}/keylogfile_{test_code}.log" > {DATA_DIRECTORY}/{policy}/csv_{test_code}.csv'
)
if code != 0:
    print("Error converting .pcap to .csv")
    exit(1)
print("Conversion successful.")
print("Reading data")
data = pd.read_csv(
    f"{DATA_DIRECTORY}/{policy}/csv_{test_code}.csv",
    delimiter="\t",
    names=(
        "time_epoch ipid ipttl dstip srcip tcpsrcport tcpdstport tcplen tcpstream tcpseq tcpwindowsize tcpack tcpflags tcpflagsrst tcpflagsstr "
        "initial_rtt ack_rtt response_time total_tcp_rst cflowrst tsval tsecr tcptimestamp host code user_agent location"
    ).split(),
)
data["intid"] = data.ipid.apply(functools.partial(int, base=16))
data.time_epoch -= data.time_epoch.min()

tcpdata = data[(~data.tcpstream.isnull())]
domaindata = tcpdata[(tcpdata.host == domain)]

streamarr = []
for streamid in tcpdata.tcpstream.unique():
    streampackets = tcpdata[(tcpdata.tcpstream == streamid)][
        "time_epoch dstip srcip tcpsrcport tcpdstport tcpseq tcpflagsrst tcpflagsstr initial_rtt ack_rtt response_time total_tcp_rst tsval tsecr".split()
    ]
    streaminfo = {
        "streamid": streamid,
        "time_epoch_start": streampackets["time_epoch"].iloc[0],
        "time_epoch_end": streampackets["time_epoch"].iloc[-1],
        "ip1": streampackets["srcip"].iloc[0],
        "ip2": streampackets["dstip"].iloc[0],
        "port1": streampackets["tcpsrcport"].iloc[0],
        "port2": streampackets["tcpdstport"].iloc[0],
        "initial_rtt": streampackets[(~streampackets.initial_rtt.isnull())]["initial_rtt"].iloc[0]
        if streampackets[(~streampackets.initial_rtt.isnull())]["initial_rtt"].size > 0
        else None,
        "ack_rtt_avg": streampackets.ack_rtt.mean(),
        "num_rst": streampackets.tcpflagsrst.sum(),
    }
    streamarr.append(streaminfo)
streamdata = pd.DataFrame.from_dict(streamarr)

domainstreamsarr = []
for streamid in domaindata.tcpstream.unique():
    streampackets = domaindata[(domaindata.tcpstream == streamid)][
        "time_epoch dstip srcip tcpsrcport tcpdstport tcpseq tcpflagsrst tcpflagsstr initial_rtt ack_rtt response_time total_tcp_rst tsval tsecr".split()
    ]
    streaminfo = {
        "streamid": streamid,
        "time_epoch_start": streampackets["time_epoch"].iloc[0],
        "time_epoch_end": streampackets["time_epoch"].iloc[-1],
        "ip1": streampackets["srcip"].iloc[0],
        "ip2": streampackets["dstip"].iloc[0],
        "port1": streampackets["tcpsrcport"].iloc[0],
        "port2": streampackets["tcpdstport"].iloc[0],
        "initial_rtt": streampackets[(~streampackets.initial_rtt.isnull())]["initial_rtt"].iloc[0]
        if streampackets[(~streampackets.initial_rtt.isnull())]["initial_rtt"].size > 0
        else None,
        "ack_rtt_avg": streampackets.ack_rtt.mean(),
        "num_rst": streampackets.tcpflagsrst.sum(),
    }
    domainstreamsarr.append(streaminfo)
domainstreamdata = pd.DataFrame.from_dict(domainstreamsarr)

print("Done.")