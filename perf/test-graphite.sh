#!/bin/bash

# Graphite server settings
GRAPHITE_HOST="localhost"
GRAPHITE_PORT=8125

# Metric details
METRIC_PATH="stats.gauges.artillery-api.scenarioCounts.0"
METRIC_VALUE=0
TIMESTAMP=$(date +%s)

# Send metric to Graphite
echo "$METRIC_PATH $METRIC_VALUE $TIMESTAMP" | nc "$GRAPHITE_HOST" "$GRAPHITE_PORT"

# Check the exit status of nc
if [ $? -eq 0 ]; then
  echo "Metric sent successfully."
else
  echo "Failed to send metric."
fi
