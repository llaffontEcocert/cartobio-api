FROM node:14-bullseye-slim

ARG TARGETARCH

RUN apt update && apt install -y unzip libgdal-dev python3 python build-essential cmake

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# If building deps fails, the answer is: aim for pre-built binaries
# https://www.npmjs.com/package/gdal-async#user-content-unit-tested-platforms-with-pre-built-binaries
# And until arm64 prebuilt images are provided, we branch out
# https://github.com/mmomtchev/node-gdal-async/issues/30#issuecomment-1275888379
RUN if [ "arm64" = "$TARGETARCH" ] ; then npm ci --build-from-source --shared_gdal ; else npm ci ; fi

# Bundle app source
COPY ./data ./data
COPY ./lib ./lib
COPY ./migrations ./migrations
COPY ./test ./test
COPY ./*.js ./
COPY ./.eslintrc.js ./.eslintrc.js
COPY ./jsconfig.json ./jsconfig.json

EXPOSE  8000
ENV     NODE_ENV  production
ENV     PORT      8000
ENV     HOST      0.0.0.0

CMD [ "npm", "start" ]
