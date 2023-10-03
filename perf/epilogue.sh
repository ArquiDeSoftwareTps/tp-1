#!/bin/sh
echo "artillery-api.errors.ETIMEDOUT:0|g"           | nc -w 0 -u localhost 8125 
echo "artillery-api.errors.ECONNRESET:0|g"          | nc -w 0 -u localhost 8125 
echo "artillery-api.errors.EPIPE:0|g"               | nc -w 0 -u localhost 8125 
echo "artillery-api.rps.count:0|g"           | nc -w 0 -u localhost 8125 
echo "artillery-api.scenarioCounts.0:0|g"           | nc -w 0 -u localhost 8125 
echo "artillery-api.scenarioDuration.max:0|g"       | nc -w 0 -u localhost 8125 
echo "artillery-api.scenarioDuration.median:0|g"    | nc -w 0 -u localhost 8125 
echo "artillery-api.codes.200:0|g"                  | nc -w 0 -u localhost 8125 
