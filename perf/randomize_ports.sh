#!/bin/bash

# CSV file path
csv_file="airport-codes.csv"

# Read and filter rows based on the "type" column (assuming CSV is comma-separated)
filtered_values=$(awk -F ',' '$2 == "large_airport" {print $1}' "$csv_file")

# Count the number of lines in the CSV (assuming one value per line)
num_lines=$(echo "$column_values" | wc -l)

# Check if there are at least 100 lines
if [ "$num_lines" -lt 100 ]; then
  echo "Not enough values in the first column. There are only $num_lines values."
  exit 1
fi

# Generate a random subset of 100 values
random_subset=$(echo "$column_values" | shuf -n 100)

# Display the random subset
echo "Random Subset of 100 Values:"
echo "$random_subset" | sed 's/^/      - /'
