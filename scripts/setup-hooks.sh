#!/bin/sh
# Install the version-controlled git hooks. Run once after cloning.
# (Also invoked automatically by the npm `prepare` script once the app is scaffolded.)
set -e
git config core.hooksPath .githooks
chmod +x .githooks/* 2>/dev/null || true
echo "Git hooks installed: core.hooksPath=.githooks"
