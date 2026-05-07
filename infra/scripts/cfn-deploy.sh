#!/usr/bin/env bash

set -e
set -o pipefail

export ARGS=$@
export AWS_DEFAULT_OUTPUT="json"
export PATH=$PATH:/usr/local/bin:/opt/aws/bin

# Defaults
export CHANGE_SET_ONLY=false
export AWS_DEFAULT_REGION="us-east-1"
export WAIT_FOR_COMPLETION=true


main() {
  getOptions ${ARGS[*]}
  createChangeSet
  executeChangeSet
}

getOptions() {
  while [[ $# -gt 0 ]]; do
    key="$1"

    case $key in
      -s|--stack-name)
        export STACK_NAME=$2
        shift
        ;;
      -t|--template)
        export TEMPLATE=$2
        shift
        ;;
      -p|--parameters)
        export PARAMETERS=$2
        shift
        ;;
      --changeset-name)
        export CHANGE_SET_NAME=$2
        shift
        ;;
      -r|--aws-region)
        export AWS_DEFAULT_REGION=$2
        shift
	;;
      --deployment-role)
        export DEPLOYMENT_ROLE="--role-arn $2"
        shift
	;;
      --changeset-only)
        export CHANGE_SET_ONLY=true
        ;;
      --no-wait-for-completion)
        export WAIT_FOR_COMPLETION=false
        ;;
      --profile)
        export AWS_DEFAULT_PROFILE=$2
        shift
        ;;
      -h|--help)
        printUsage
        exit 0
        ;;
      -v|--verbose)
        set -x
        export VERBOSE="-v"
        ;;
      *)
        printUsage
        die "Invalid option: $key"
        ;;
    esac
    shift
  done

  if [ -z "$STACK_NAME" ]; then
    printUsage
    die "must specify a stack name"
  fi

  if [ -z "$TEMPLATE" ]; then
    printUsage
    die "must specify a template file"
  fi

  if [ -z "$PARAMETERS" ]; then
    printUsage
    die "must specify a parameters file"
  fi

  if [ -z "$CHANGE_SET_NAME" ]; then
    utc=$(date +"%s")
    export CHANGE_SET_NAME="$STACK_NAME-$utc"
  fi
}

printUsage() {
cat << EOF

This script creates or updates a CloudFormation Stack, and supports changing
parameters and templates.

usage: $0 -s stack name -t template file -p parameters file [--changeset-only] [--profile AWS CLI profile name][-v][-h]
  options:
    -s, --stack-name            The top-level stack name to update
    -p, --parameters            A JSON file with the key-value stack parameters
    -t, --template              The S3 URL of the template file for this stack
    -r, --aws-region            The AWS Region (defaults to us-east-1)
    --profile                   AWS CLI credentials config profile name
    --deployment-role           ARN of a service-linked role to pass to CloudFormation
    --changeset-name            The name of the changeset
    --changeset-only            Only create the change set, but do not execute it
    --no-wait-for-completion    Do not wait for stack updates to complete
    -h, --help                  prints this usage
    -v, --verbose               Enables verbose tracing output

EOF
}

die () {
  printf "\e[1m\e[31m\nError: %b\n\e[0m\n" "$@" >&2
  exit 1
}

warn () {
  printf "\e[1m\e[31m\nWarning: %b\n\e[0m\n" "$@" >&2
}

getChangeSetType() {
  aws cloudformation describe-stacks \
    --stack-name $STACK_NAME > /dev/null 2>&1 && echo "UPDATE" || echo "CREATE"
}

removeOldOrFailedChangeSets() {
  name=$(getChangeSetType)
  aws cloudformation describe-change-set \
    --change-set-name $name \
    --stack-name $STACK_NAME
}

createChangeSet() {
  export CHANGE_SET_TYPE=$(getChangeSetType)

  if [ "$CHANGE_SET_TYPE" = "UPDATE" ]; then
    # remove old or failed changesets of the same name
    aws cloudformation delete-change-set \
      --change-set-name $CHANGE_SET_NAME --stack-name $STACK_NAME
  fi

  echo "Creating change set, $CHANGE_SET_NAME, for $STACK_NAME"
  aws cloudformation create-change-set --template-url $TEMPLATE \
      --stack-name $STACK_NAME --parameters file://$PARAMETERS \
      --change-set-name $CHANGE_SET_NAME \
      ${DEPLOYMENT_ROLE} --capabilities CAPABILITY_NAMED_IAM \
      --change-set-type $CHANGE_SET_TYPE
  waitForChangeSetCreation
}

waitForChangeSetCreation() {
  set +e
  aws cloudformation wait change-set-create-complete \
    --stack-name $STACK_NAME \
    --change-set-name $CHANGE_SET_NAME 
  if [ $? -gt 0 ]; then
    reason=$(aws cloudformation describe-change-set \
                 --change-set-name $CHANGE_SET_NAME \
                 --stack-name $STACK_NAME \
                 --query StatusReason --output text)
    if [ "$reason" == "The submitted information didn't contain changes. Submit different information to create a change set." ]; then
      echo "No changes found"
      aws cloudformation delete-change-set \
        --stack-name $STACK_NAME --change-set-name $CHANGE_SET_NAME 
      exit 0
    elif [ "$reason" == "No updates are to be performed." ]; then
      echo "No changes found"
      aws cloudformation delete-change-set \
        --stack-name $STACK_NAME --change-set-name $CHANGE_SET_NAME
      exit 0
    else
      die "Failed to create change set: $reason"
    fi
  fi
  set -e
}

executeChangeSet() {
  if [ "$CHANGE_SET_ONLY" == "false" ]; then
    echo "Executing change set, $CHANGE_SET_NAME, for $STACK_NAME"
    aws cloudformation execute-change-set \
        --change-set-name $CHANGE_SET_NAME \
        --stack-name $STACK_NAME
    waitForCompletion
  fi
}

waitForCompletion() {
  if [ "${WAIT_FOR_COMPLETION}" == "true" ]; then
    change_set_type=$(echo "${CHANGE_SET_TYPE,,}")
    aws cloudformation wait stack-${change_set_type}-complete \
      --stack-name $STACK_NAME 
  fi
}


if [ "$1" != "source" ]; then
  main
fi

