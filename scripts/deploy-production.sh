#!/bin/bash
# Deploy the game to production (izbozobuzi.me) through AWS Systems Manager: runs the server's
# own copy of scripts/production/input-deploy as ec2-user and prints what it said. Nothing is
# installed on the server for it, and no key is kept for it. Needs an AWS login with the admin profile:
#   aws sso login --profile admin --use-device-code --no-browser
set -euo pipefail
PROFILE=${AWS_PROFILE_DEPLOY:-admin}
REGION=eu-west-1
INSTANCE=i-0479ce4ea6620b927   # izbozobuzi.me (the instance named itscans.com)

aws sts get-caller-identity --profile "$PROFILE" >/dev/null || {
    echo "Not logged in: aws sso login --profile $PROFILE --use-device-code --no-browser" >&2
    exit 1
}

id=$(aws ssm send-command --profile "$PROFILE" --region "$REGION" --instance-ids "$INSTANCE" \
    --document-name AWS-RunShellScript --comment "I N P U T deploy" \
    --parameters 'commands=["sudo -u ec2-user DEPLOY_BY=ssm bash /srv/www/izbozobuzi.me/html/scripts/production/input-deploy"]' \
    --query Command.CommandId --output text)

status=Pending
for _ in $(seq 1 150); do
    sleep 2
    status=$(aws ssm get-command-invocation --profile "$PROFILE" --region "$REGION" \
        --command-id "$id" --instance-id "$INSTANCE" --query Status --output text 2>/dev/null || echo Pending)
    case "$status" in Success|Failed|Cancelled|TimedOut) break ;; esac
done

aws ssm get-command-invocation --profile "$PROFILE" --region "$REGION" --command-id "$id" \
    --instance-id "$INSTANCE" --query '[StandardOutputContent,StandardErrorContent]' --output text
echo "Deploy: $status"
[ "$status" = Success ]
