# syntax = docker/dockerfile:1

ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

WORKDIR /app

ENV NODE_ENV="production"


# Throw-away build stage to reduce size of final image
FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

COPY package-lock.json package.json ./
RUN npm ci

COPY . .


# Final stage for app image
FROM base

# Install Chrome + Xvfb for headless browser automation
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y wget gnupg ca-certificates xvfb && \
    wget -q -O /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
    apt-get install --no-install-recommends -y /tmp/chrome.deb && \
    rm /tmp/chrome.deb && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build /app /app

EXPOSE 8080
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh
CMD [ "/app/start.sh" ]
