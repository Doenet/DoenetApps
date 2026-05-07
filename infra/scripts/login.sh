#!/usr/bin/env bash
# Must be sourced:  source ./login.sh
export AWS_CONFIG_FILE=$PWD/.aws/config
aws sso login
