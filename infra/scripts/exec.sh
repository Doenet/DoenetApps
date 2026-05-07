#!/usr/bin/env bash

set -eu

#title           :exec
#description     :This script helps you exec into a running Fargate container
#author          :Alex Bragg, Unicon, Inc.
#date            :FEB-2022
#version         :0.1

export ARGS=$@
export PATH=$PATH:/usr/local/bin
export AWS_DEFAULT_OUTPUT="json"
export TRACING_ENABLED=false

set -o pipefail

main() {
  getOptions ${ARGS[*]}
  checkDependencies
  login
  execInto
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

This script helps you exec into a running Fargate container

usage: $0 -s stack-file -c container [-h][-v]
  options:
    -s, --stack-file            The stack file name prefix 
                                  (ex. dev-networking or dev-services)
    -v, --verbose               Enable debug output
    -h, --help                  prints this usage

EOF
}

checkDependencies() {
  which aws 2>&1 > /dev/null || die "This script requires the AWS CLI tools installed"
  which jq 2>&1 > /dev/null || die "This script requires the jq tool installed"
  session-manager-plugin 2>&1 > /dev/null || die "This script requires the session-manager-plugin.  See https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html"
}

login() {
  printGreen "Login to AWS SSO"
  source ./scripts/login.sh || die "You may need to edit $PWD/.aws/config and add the missing profile"
}

findService() {
  declare -A serviceNames
  services=( $(aws ecs list-services --cluster ${FARGATE_CLUSTER} | jq -r '.serviceArns[]') )
  for service in "${services[@]}"; do
    serviceNames[${service##*/}]=$service
  done

  PS3='Select the service: '
  select ch in "${!serviceNames[@]}"; do
    if [[ 1 -le $REPLY && $REPLY -le ${#serviceNames[@]} ]]; then
      export SERVICE=$ch
      export SERVICE_ARN=${serviceNames[$ch]}
      break
    else
      echo "Invalid choice"
    fi
  done
}

findTask() {
  declare -A taskIds
  findService
  tasks=( $(aws ecs list-tasks --cluster ${FARGATE_CLUSTER} --service-name ${SERVICE} | jq -r '.taskArns[]') )
  for task in "${tasks[@]}"; do
    taskIds[${task##*/}]=$task
  done

  if [[ ${#tasks[@]} -gt 1 ]]; then
    PS3='Select the task: '
    select ch in "${!taskIds[@]}"; do
      if [[ 1 -le $REPLY && $REPLY -le ${#tasks[@]} ]]; then
        export TASK=$ch
        export TASK_ARN=${taskIds[$ch]}
        break
      else
        echo "Invalid choice"
      fi
    done
  else
    export TASK=${tasks[0]##*/}
    export TASK_ARN=${tasks[0]}
  fi
}

findContainer() {
  declare -A containerNames
  findTask
  containers=( $(aws ecs describe-tasks --cluster ${FARGATE_CLUSTER} --tasks ${TASK_ARN} | jq -r '.tasks[].containers[].name') )
  for container in "${containers[@]}"; do
    containerNames[${container##*/}]=$container
  done
  if [[ ${#containers[@]} -gt 1 ]]; then
    PS3='Select the container: '
    select ch in "${!containerNames[@]}"; do
      if [[ 1 -le $REPLY && $REPLY -le ${#containers[@]} ]]; then
        export CONTAINER=$ch
        break
      else
        echo "Invalid choice"
      fi
    done
  else
    export CONTAINER=${containers[0]}
  fi
}

execInto() {
  findContainer
  aws ecs execute-command \
    --cluster ${FARGATE_CLUSTER} \
    --task ${TASK_ARN} \
    --container ${CONTAINER} \
    --command "/bin/sh" \
    --interactive
}

main
