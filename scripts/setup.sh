#!/bin/sh

GOOGLE_PROJECT_ID=${GOOGLE_PROJECT_ID:-"default-project-id"}

echo "Setting up your environment... GOOGLE_PROJECT_ID: ${GOOGLE_PROJECT_ID}"

gcloud config set project $GOOGLE_PROJECT_ID
gcloud auth application-default login  --scopes="https://www.googleapis.com/auth/cloud-platform"

echo "Environment setup complete."