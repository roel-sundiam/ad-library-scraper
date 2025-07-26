# Use official Apify image with Node.js and Chrome
FROM apify/actor-node:18

# Copy source code
COPY . ./

# Install NPM packages
RUN npm install --include=dev

# Set up Chrome for stealth mode
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/opt/google/chrome/chrome

# Run the scraper
CMD npm start