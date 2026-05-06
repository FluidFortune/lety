# Pisces Moon OS — Lety Build Service
# Copyright (C) 2026 Eric Becker / Fluid Fortune
# SPDX-License-Identifier: AGPL-3.0-or-later

FROM ubuntu:24.04

# System deps
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv \
    git curl ca-certificates \
    nodejs npm \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set up Python venv for PlatformIO (Ubuntu 24 PEP 668 compliance)
RUN python3 -m venv /opt/pio-venv
ENV PATH="/opt/pio-venv/bin:${PATH}"
RUN pip install --upgrade pip platformio

# Pre-install ESP32 platform so first build doesn't take 5 minutes
RUN pio platform install espressif32

# Clone Pisces Moon repo as the build template
ARG PISCES_REPO=https://github.com/FluidFortune/PiscesMoon.git
ARG PISCES_REF=main
RUN git clone --depth 1 --branch ${PISCES_REF} ${PISCES_REPO} /opt/pisces-moon

# Pre-fetch all PlatformIO library dependencies
WORKDIR /opt/pisces-moon
RUN pio pkg install -e esp32s3 || true

# App
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY server.js ./

ENV PISCES_REPO_PATH=/opt/pisces-moon
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
