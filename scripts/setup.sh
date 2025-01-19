#!/bin/sh

GOOGLE_PROJECT_ID="********"

echo "Setting up your environment..."

gcloud config set project $GOOGLE_PROJECT_ID
gcloud auth application-default login  --scopes="https://www.googleapis.com/auth/cloud-platform"

echo "Environment setup complete."