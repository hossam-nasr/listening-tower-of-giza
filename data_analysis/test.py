import pandas as pd
import numpy as np
import functools
from matplotlib import pylab as plt

data = pd.read_csv('./testcsv.txt', delimiter='\t',
            names=
                ('time_epoch ipid ipttl dstip srcip tcpsrcport tcpdstport tcplen tcpstream tcpseq tcpwindowsize tcpack tcpflags tcpflagsrst tcpflagsstr '
                'initial_rtt ack_rtt response_time total_tcp_rst cflowrst tsval tsecr tcptimestamp host code user_agent location').split())


data['intid'] = data.id.apply(functools.partial(int, base=16))
data.time_epoch -= data.time_epoch.min()

