# Static site served by a tiny Node.js server

FROM node:22-alpine

WORKDIR /app

COPY server.js ./server.js
COPY src ./src

ENV PORT=7856
EXPOSE 7856

CMD ["node", "server.js"]
