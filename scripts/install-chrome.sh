#!/bin/bash

echo "Installing Chrome for Puppeteer..."

# Update package list
apt-get update

# Install dependencies
apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    apt-transport-https

# Add Google's signing key
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -

# Add Chrome repository
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list

# Update package list again
apt-get update

# Install Chrome
apt-get install -y google-chrome-stable

# Verify installation
google-chrome --version

echo "Chrome installation completed!"