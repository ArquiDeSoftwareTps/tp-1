#!/bin/sh
echo "artillery-api.errors.ETIMEDOUT:0|g"           | nc -w 0 -u localhost 8125 
echo "artillery-api.errors.ECONNRESET:0|g"          | nc -w 0 -u localhost 8125 
echo "artillery-api.errors.EPIPE:0|g"               | nc -w 0 -u localhost 8125 
echo "artillery-api.rps.count:0|g"                  | nc -w 0 -u localhost 8125 
echo "artillery-api.scenarioCounts.0:0|g"           | nc -w 0 -u localhost 8125 
echo "artillery-api.scenarioDuration.max:0|g"       | nc -w 0 -u localhost 8125 
echo "artillery-api.scenarioDuration.median:0|g"    | nc -w 0 -u localhost 8125 
echo "artillery-api.codes.200:0|g"                  | nc -w 0 -u localhost 8125 
echo "artillery-api.codes.429:0|g"                  | nc -w 0 -u localhost 8125 
echo "artillery-api.codes.500:0|g"                  | nc -w 0 -u localhost 8125
echo "artillery-api.codes.502:0|g"                  | nc -w 0 -u localhost 8125  
echo "metar_api_full:0|ms"                          | nc -w 0 -u localhost 8125 
echo "metar_api_request:0|ms"                       | nc -w 0 -u localhost 8125 
echo "quote_api_full:0|ms"                          | nc -w 0 -u localhost 8125 
echo "quote_api_request:0|ms"                       | nc -w 0 -u localhost 8125 
echo "spaceflight_news_api_full|ms"                 | nc -w 0 -u localhost 8125 
echo "spaceflight_news_api_request:0|ms"            | nc -w 0 -u localhost 8125 

