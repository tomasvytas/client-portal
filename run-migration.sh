#!/bin/bash
# Script to run database migration with production DATABASE_URL

echo "Please enter your DATABASE_URL from Vercel:"
echo "(Go to Vercel Dashboard → Settings → Environment Variables)"
read -s DATABASE_URL

export DATABASE_URL

echo "Running migration..."
npx prisma migrate deploy

echo "Migration complete!"

