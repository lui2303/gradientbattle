FROM node:24-bookworm

RUN corepack enable

WORKDIR /workspace

RUN apt-get update && apt-get install -y \
    git curl bash \
    && rm -rf /var/lib/apt/lists/*
