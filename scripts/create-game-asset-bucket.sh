#!/usr/bin/env bash
# Create the S3 bucket the built game takes its pictures and sounds from (config game.asset_url),
# once. Anyone may read what is under game/assets/ (it is the game's art, served to every
# player), and any page may read it as a cross-origin request (CORS), which the game needs to
# read the pixels of its pictures. Nothing else in the bucket is public, and nobody but the
# account can write to it.
#
#   aws sso login --profile admin --use-device-code --no-browser
#   scripts/create-game-asset-bucket.sh [bucket]
#
# Then upload the assets (scripts/upload-game-assets.sh) and set GAME_ASSET_URL in production's
# .env to the address this prints.
set -euo pipefail

BUCKET="${1:-${GAME_ASSET_BUCKET:-efto-input-assets}}"
REGION=eu-west-1
PROFILE="${AWS_PROFILE:-admin}"
aws() { command aws --profile "$PROFILE" --region "$REGION" "$@"; }

if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
    echo "Bucket $BUCKET is there already: its settings are put in place again."
else
    aws s3api create-bucket --bucket "$BUCKET" --create-bucket-configuration LocationConstraint="$REGION" >/dev/null
    echo "Created bucket $BUCKET."
fi

# Public reading by a bucket policy only (no object ACLs), so nothing is public by accident
aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false
aws s3api put-bucket-ownership-controls --bucket "$BUCKET" \
    --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'

aws s3api put-bucket-policy --bucket "$BUCKET" --policy "$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "TheGameArtIsPublic",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$BUCKET/game/assets/*"
  }]
}
JSON
)"

aws s3api put-bucket-cors --bucket "$BUCKET" --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 86400
  }]
}'

echo "Done. GAME_ASSET_URL=https://$BUCKET.s3.$REGION.amazonaws.com/game"
