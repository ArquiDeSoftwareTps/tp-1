import http.client
import sys

NUMBER_OF_REQUESTS = int(sys.argv[1:][0])



payload = ""

headers = { 'User-Agent': "insomnia/8.1.0" }

for i in range(0, NUMBER_OF_REQUESTS):
    conn = http.client.HTTPConnection("localhost:5555")
    conn.request("GET", "/api/ping", payload, headers)
    res = conn.getresponse()
    print("Request[" + str(i) + "] Status code " + str(res.status))
