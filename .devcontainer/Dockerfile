# Node version is pinned to match .nvmrc / the "engines" field in package.json.
FROM node:24.15.0-bookworm

# System packages:
#   - Cypress runtime libraries (GTK, NSS, GBM, ...) and xvfb, which Cypress
#     starts automatically when no DISPLAY is set.
#   - default-mysql-client so `mysql` is available for poking at the database.
#   - The usual dev conveniences (git, ssh client, less, procps).
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends \
        ca-certificates curl gnupg git openssh-client less procps \
        default-mysql-client \
        xvfb \
        libgtk2.0-0 libgtk-3-0 libgbm-dev libnotify-dev libnss3 libxss1 \
        libasound2 libxtst6 xauth fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Google Chrome — the Cypress scripts all run with `-b chrome`. Google only
# ships an amd64 .deb, so arm64 hosts get Chromium instead (run Cypress with
# `-b chromium` there).
RUN set -eux; \
    arch="$(dpkg --print-architecture)"; \
    export DEBIAN_FRONTEND=noninteractive; \
    if [ "$arch" = "amd64" ]; then \
        curl -fsSL https://dl.google.com/linux/linux_signing_key.pub \
            | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg; \
        echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] https://dl.google.com/linux/chrome/deb/ stable main" \
            > /etc/apt/sources.list.d/google-chrome.list; \
        apt-get update; \
        apt-get install -y --no-install-recommends google-chrome-stable; \
    else \
        apt-get update; \
        apt-get install -y --no-install-recommends chromium; \
    fi; \
    rm -rf /var/lib/apt/lists/*

# Claude Code, installed globally while we are still root. Its config directory
# is a named volume (see docker-compose.yml), so a login survives rebuilds.
RUN npm install -g @anthropic-ai/claude-code

# The Cypress binary lives outside node_modules; a named volume is mounted here
# so it survives container rebuilds.
ENV CYPRESS_CACHE_FOLDER=/home/node/.cache/Cypress

# The `node` user already exists in the base image. Pre-create the directories
# that get named volumes so they are owned by `node` rather than root.
# Every node_modules directory is backed by a named volume (see
# docker-compose.yml) so that Linux-native installs never collide with whatever
# the host has installed. Creating them here, owned by `node`, makes Docker
# initialise those volumes with the right ownership.
RUN mkdir -p \
        /home/node/.cache/Cypress \
        /home/node/.npm \
        /home/node/.claude \
        /home/node/workspace/node_modules \
        /home/node/workspace/apps/api/node_modules \
        /home/node/workspace/apps/app/node_modules \
        /home/node/workspace/apps/web/node_modules \
    && chown -R node:node /home/node

USER node
WORKDIR /home/node/workspace
