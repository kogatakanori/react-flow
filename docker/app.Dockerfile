# base
# --------------------------------------------------
  FROM node:23.6-bookworm-slim AS base

# local
# --------------------------------------------------
FROM base AS local

ENV NODE_ENV=local

WORKDIR /app

COPY ./app/package*.json /app/
RUN npm ci
COPY ./app /app

# build
# --------------------------------------------------
FROM local AS build

RUN npm run build

# production
# --------------------------------------------------
FROM build AS production
ENV NODE_ENV=production

COPY --from=build /app/dist /app/dist
COPY --from=build /app/node_modules /app/node_modules

CMD ["npm", "run", "start"]
