FROM --platform=linux/amd64 nikolaik/python-nodejs:python3.11-nodejs18-alpine
ENV NODE_ENV=production

RUN apk add --no-cache git make g++ bash curl

# Create app directory
WORKDIR /usr/src/app

RUN git clone --depth 1 -b fix/cookie+channels-regenerated https://github.com/jimmyfortinx/epg.git .

RUN npm install -g concurrently
RUN npm install
RUN npm install node-cron
RUN npm install xml-js
RUN npm install dayjs
RUN npm install glob
RUN npm install execa
RUN npm install express
RUN npm install serve-handler
# If you are building your code for production
# RUN npm ci --omit=dev

# Bundle app source
COPY cron.js cron.js

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD [ "node", "cron.js" ]