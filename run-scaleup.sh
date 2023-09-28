#!/bin/sh

# Establish an alias for concise notation
alias docc="docker-compose -f docker-compose.yml -f node-base.yml"

# Detect whether the host machine is MacOS and append docker.sock to volume mapping
# on the cadvisor container
export MAC_SOCK=$([[ $OSTYPE == 'darwin'* ]] && echo '/docker.sock')

# Ask docker-compose to start with 3 replicas for the node service
docc up --scale node=3 --detach
