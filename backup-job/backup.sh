#!/bin/bash
set -e

echo "Starting backup process..."

DATE=$(date +%Y-%m-%d_%H-%M)
FILENAME="backup-$DATE.dump"
FILEPATH="/tmp/$FILENAME"

echo "Dumping database..."
pg_dump "$DATABASE_URL" -F c -f "$FILEPATH"

echo "Uploading to Cloudflare R2..."
aws s3 cp "$FILEPATH" "s3://$R2_BUCKET_NAME/$FILENAME" \
  --endpoint-url "https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com"

echo "Cleaning up local file..."
rm "$FILEPATH"

echo "Backup complete: $FILENAME"
