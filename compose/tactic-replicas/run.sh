#!/bin/sh
# Establish an alias for concise notation
alias docc='docker-compose'

# ask docker compose to start with 3 replicas for node service
docc up --detach --scale node=3
