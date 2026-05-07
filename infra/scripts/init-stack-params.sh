#!/usr/bin/env bash

set -eu

#title           :init-stack-params
#description     :This script AWS resources
#author          :Alex Bragg, Unicon, Inc.
#date            :AUG-2024
#version         :0.1

export ARGS=$@
export PATH=$PATH:/usr/local/bin
export AWS_DEFAULT_OUTPUT="json"
export TRACING_ENABLED=false

set -o pipefail

main() {
  getOptions ${ARGS[*]}
  checkDependencies
  getStackVariables
  initParams
  findRedshiftParams
}

die () {
  echo -e >&2 "\n$@\n"
  exit 1
}

printGreen() {
  GREEN='\033[0;32m'
  NC='\033[0m'
  printf >&2 "${GREEN}$@${NC}\n"
}

printYellow() {
  YELLOW='\033[0;33m'
  NC='\033[0m'
  printf >&2 "${YELLOW}$@${NC}\n"
}

getOptions() {
  while [[ $# -gt 0 ]]; do
    key="$1"

    case $key in
      -s|--stack-file)
        export STACK_FILE=$2
        shift
        ;;
      -h|--help)
        printUsage
        exit 0
        ;;
      -v|--verbose)
        set -x
        export VERBOSE="-v"
        export TRACING_ENABLED=true
        ;;
      *)
        printUsage
        die "Invalid option: $key"
        ;;
    esac
    shift
  done

  if [ "foo" = "${STACK_FILE:=foo}" ]; then
    printUsage
  fi

  if [ ! -f "${STACK_FILE}.aws" ]; then
    printUsage
    die "Stacks and basic settings for the target environment ${STACK_FILE}.aws"
  else
    source "${STACK_FILE}.aws"
    export AWS_REGION TEMPLATE_BUCKET STACKS STACK_ORDER PROJECT FARGATE_CLUSTER
    export AWS_PROFILE=$SSO_ACCOUNT_NAME
    export AWS_DEFAULT_REGION=$AWS_REGION
  fi
}

printUsage() {
cat << EOF

This script creates stack parameter files for a new environment

usage: $0 -s stack-file [-h][-v]
  options:
    -s, --stack-file            The stack file name prefix 
                                  (ex. dev-networking or dev-services)
    -v, --verbose               Enable debug output
    -h, --help                  prints this usage

EOF
}

checkDependencies() {
  which aws 2>&1 > /dev/null || die "This script requires the AWS CLI tools installed"
}

getStackVariables() {
  ACCOUNT_ID=$(sed -nr "/^\[profile $SSO_ACCOUNT_NAME\]/ { :l /^sso_account_id[ ]*=/ { s/[^=]*=[ ]*//; p; q;}; n; b l;}" .aws/config)
  export ACCOUNT_ID
}

initParams() {
  for name in "${STACK_ORDER[@]}"; do 
    param_file="cloudformation/${name}.params"
    dev_file=$(echo $param_file | sed s/${STACK_FILE}/dev/)
    printGreen ${param_file}
    cp ${dev_file} ${param_file}
    sed -i s/dev-lif/${STACK_FILE}-lif/g $param_file
    sed -i s/clir-cf-templates/${TEMPLATE_BUCKET}/g $param_file
    sed -i s/us-east-1/${AWS_REGION}/g $param_file
    sed -i s/381492161417/${ACCOUNT_ID}/g $param_file
  done
}

findRedshiftParams() {
  printYellow "Manually update the RedshiftSecretArn parameter in the following:"
  for name in "${STACK_ORDER[@]}"; do 
    param_file="cloudformation/${name}.params"
    set +e
    count=$(grep -c REDSHIFT_CONFIG-mTcD73 ${param_file})
    if [ $count -gt 0 ]; then
      printYellow "    $param_file"
    fi
  done
}

main
