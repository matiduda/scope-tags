#!/bin/bash

# Change folder to test repo
cd ./test/_repo

# Add every file
git add .

# Commit with a generic message
git commit -m "[AUTO] mock repository updated"

# Push to remote
git push