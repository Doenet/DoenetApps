#!/bin/bash -eu

#title           :deploy
#description     :This script AWS resources
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
  uploadTemplates
  updateStacks
  updateSamStacks
  updateEcs
}

printError() {
  RED='\033[0;31m'
  NC='\033[0m'
  printf >&2 "\n${RED}$@${NC}\n"
}

die() {
  printError "$@\n"
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
      --only-stack)
        export ONLY_STACK=$2
        shift
        ;;
      --update-ecs)
        export UPDATE_ECS=1
        ;;
      --update-sam)
        export UPDATE_SAM=1
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

  if [ ! -z ${ONLY_STACK-""} ]; then
    if [[ ! -v STACKS[$ONLY_STACK] ]]; then
      die "No configuration for $ONLY_STACK found in the stack file"
    fi
  fi
}

printUsage() {
cat << EOF

This script creates or updates AWS resources

usage: $0 -s stack-file [-h][-v]
  options:
    -s, --stack-file            The stack file name prefix 
                                  (ex. dev-networking or dev-services)
    --only-stack                Target a single stack for deployment
    --update-ecs                Trigger a service update in all ECS services
    --update-sam                Trigger a SAM deployment
    -v, --verbose               Enable debug output
    -h, --help                  prints this usage

EOF
}

checkDependencies() {
  which aws 2>&1 > /dev/null || die "This script requires the AWS CLI tools installed"
#  which docker 2>&1 > /dev/null || die "This script requires docker installed"

  # Check Bash version
  major_version=$(echo "$BASH_VERSION" | cut -d'.' -f1)
  if (( major_version < 4 )); then
    die "Bash version 4.0 or newer required."
  fi
}

login() {
  if [ ! -z ${AWS_SESSION_TOKEN-""} ]; then
    echo "session variables already set"
    unset AWS_PROFILE
    return
  fi
  printGreen "Login to AWS SSO"
  source ./scripts/login.sh || die "You may need to edit $PWD/.aws/config and add the missing profile"
}

uploadTemplates() {
  printGreen "Uploading templates to s3://${TEMPLATE_BUCKET}"
  aws s3 sync --size-only --exclude="*" --include="*.yml" --include="*.params" cloudformation s3://${TEMPLATE_BUCKET}/${STACK_FILE}-${PROJECT}
}

updateStacks() {
  if [ ! -z ${ONLY_STACK-""} ]; then
    unset STACK_ORDER
    STACK_ORDER=( $ONLY_STACK )
  fi

  for name in "${STACK_ORDER[@]}"; do 
    printGreen "Deploying Cloudformation stack ${name}"
    param_file="cloudformation/${name}.params"
    ./scripts/cfn-deploy.sh -s $name -t "https://${TEMPLATE_BUCKET}.s3.amazonaws.com/${STACK_FILE}-${PROJECT}/${STACKS[$name]}.yml" -r ${AWS_REGION} -p "${param_file}" --no-wait-for-completion --changeset-name ${name}-${STACK_FILE};
    ./scripts/cfn-wait.sh ${name} ${AWS_REGION};
  done
}

updateSamStacks() {
  if [ -z ${UPDATE_SAM-""} ]; then
    return
  fi

  for samStack in "${SAM_STACKS[@]}"; do
    printGreen "Deploying SAM stack ${samStack}"
    (cd sam && ./deploy-sam.sh -s ../$STACK_FILE -d $samStack)
  done
}

updateEcs() {
  if [ -z ${UPDATE_ECS-""} ]; then
    return
  fi

  if aws ecs list-clusters | \
    grep -q ${FARGATE_CLUSTER}; then
    echo "cluster \"${FARGATE_CLUSTER}\" exists"
  else
    echo "cluster \"${FARGATE_CLUSTER}\" does not exist"
    exit 1
  fi

  services=($(aws ecs list-services --cluster ${FARGATE_CLUSTER} | jq -r '.serviceArns[]'))

  for service in "${services[@]}"; do
    service=${service##*/}
    echo "Forcing new deployment on $service"
    aws ecs update-service \
      --cluster  ${FARGATE_CLUSTER} \
      --service $service \
      --force-new-deployment > /dev/null
  done
}

main
