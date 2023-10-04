#!/bin/sh
# Running epilogue over statsd selected metrics
./epilogue.sh

export STRESS_LIMIT=500
npm run artillery -- run scenarios/$1.yaml -e $2

# Running epilogue over statsd selected metrics
./epilogue.sh
