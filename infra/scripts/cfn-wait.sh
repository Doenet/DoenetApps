#!/usr/bin/env bash

cloudformation_tail() {
  local stack="$1"
  local region="$2"
  local lastEvent
  local lastEventId
  local stackStatus=(`aws cloudformation describe-stacks --region $region --stack-name $stack --query Stacks[0].StackStatus --output text`)

  until \
	[ "$stackStatus" = "CREATE_COMPLETE" ] \
	|| [ "$stackStatus" = "CREATE_FAILED" ] \
	|| [ "$stackStatus" = "DELETE_COMPLETE" ] \
	|| [ "$stackStatus" = "DELETE_FAILED" ] \
	|| [ "$stackStatus" = "ROLLBACK_COMPLETE" ] \
	|| [ "$stackStatus" = "ROLLBACK_FAILED" ] \
	|| [ "$stackStatus" = "UPDATE_COMPLETE" ] \
	|| [ "$stackStatus" = "UPDATE_ROLLBACK_COMPLETE" ] \
	|| [ "$stackStatus" = "UPDATE_ROLLBACK_FAILED" ] \
	|| [ -z "$stackStatus" ]; do
	
	eventId=(`aws cloudformation describe-stack-events --region $region --stack $stack --query StackEvents[0].PhysicalResourceId --output text`)
	if [ "$eventId" != "$lastEventId" ]
	then
		echo "Deploying/updating: $eventId"
    lastEventId=$eventId
	fi
	sleep 3
	stackStatus=(`aws cloudformation describe-stacks --region $region --stack-name $stack --query Stacks[0].StackStatus --output text`)
  done

  echo "Stack Status: $stackStatus"
  if [ "$stackStatus" != "CREATE_COMPLETE" ] && [ "$stackStatus" != "UPDATE_COMPLETE" ] && [ "$stackStatus" != "DELETE_COMPLETE" ] && [ ! -z "$stackStatus" ]; then
    exit 1;
  fi
}

SERVICE_STACK_NAME=$1
REGION=$2
cloudformation_tail $SERVICE_STACK_NAME $REGION

