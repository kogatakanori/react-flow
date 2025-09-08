# base
# --------------------------------------------------
  FROM node:23.6-bookworm-slim AS base

# local
# --------------------------------------------------
FROM base AS local

ENV NODE_ENV=local

WORKDIR /client

COPY ./client/package*.json /client/
RUN npm ci
COPY ./client /client

# build
# --------------------------------------------------
FROM local AS build

RUN npm run build

# production
# --------------------------------------------------
FROM build AS production
ENV NODE_ENV=production

COPY --from=build /client/dist /client/dist
COPY --from=build /client/node_modules /client/node_modules

CMD ["npm", "run", "start"]
