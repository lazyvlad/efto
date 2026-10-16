#!/usr/bin/env bash
# Upload the built game's pictures and sounds (public/game/assets) to its S3 bucket
# (scripts/create-game-asset-bucket.sh), before a release is deployed. Only new and changed
# files go up, and none is deleted: a player still on the previous version keeps finding his.
#
#   aws sso login --profile admin --use-device-code --no-browser
#   scripts/upload-game-assets.sh [bucket]
set -euo pipefail

BUCKET="${1:-${GAME_ASSET_BUCKET:-efto-input-assets}}"
PROFILE="${AWS_PROFILE:-admin}"
cd "$(dirname "$0")/.."
SOURCE=public/game/assets
TARGET="s3://$BUCKET/game/assets"

# Each kind with its own type (S3 serves what it is told), kept a day by browsers: pictures
# redrawn under the same name are asked for with a new ?v= by the game
known=()
for pair in webp:image/webp png:image/png jpg:image/jpeg mp3:audio/mpeg wav:audio/wav ogg:audio/ogg woff2:font/woff2; do
    ext="${pair%%:*}"
    known+=(--exclude "*.$ext")
    aws s3 sync "$SOURCE" "$TARGET" --profile "$PROFILE" --only-show-errors \
        --exclude '*' --include "*.$ext" \
        --content-type "${pair#*:}" --cache-control 'public, max-age=86400'
done
# Anything else, typed by its extension
aws s3 sync "$SOURCE" "$TARGET" --profile "$PROFILE" --only-show-errors "${known[@]}" \
    --cache-control 'public, max-age=86400'

echo "Uploaded $(find "$SOURCE" -type f | wc -l) files to $TARGET (only the new and changed ones were sent)."
