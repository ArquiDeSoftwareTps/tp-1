#!/bin/sh
# Establish an alias for concise notation
alias docc='docker-compose -f docker-compose.yml -f node-base.yml'

# detects whether host machine is MacOS and append dokcer.sock to volume mapping
# on cadvisor container
export MAC_SOCK=`[[ $OSTYPE == 'darwin'* ]] && echo '/docker.sock'`
export ENABLE_RATE_LIMIT=true
export RP_EXTENSION="_rate_limiting"
#export RP_EXTENSION="_rate_limiting_quotes"
# ask docker compose to start with 3 replicas for node service
docc up --detach