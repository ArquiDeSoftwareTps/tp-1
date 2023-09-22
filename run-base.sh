#!/bin/sh
# Establish an alias for concise notation
alias docc='docker-compose -f docker-compose.yml -f node-base.yml'

# ask docker compose to start with 3 replicas for node service
docc up --detach