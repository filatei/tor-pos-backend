FROM node
LABEL TORAMA POS
LABEL version="1.0"
RUN echo ' pulling node'
RUN mkdir /usr/src/app

WORKDIR /usr/src/app
COPY . /usr/src/app
RUN ls /usr/src/app
ENV CONNECT_STR mongodb://localhost:27017/torposdb
ENV ACCESS_TOKEN_SECRET dec940c4cfac1c47ebdd71b4d7c6bd561f83859ca41dcb6c18b3dde68b2f5e60f82836cac473beddb9d29928f7870985d63f295a996a219277e2fbddfdc3ff62
ENV REFRESH_TOKEN 594ab65d1a12652e7fe33f84dfab3cf56638ea8a587246a927b242d4e64719f9543eb6f05c69de04fcced22dda8fc747cc231bee8944898c3b614078a4cb48ad
ENV PORT 3000
RUN npm install
EXPOSE 3000
CMD ["node", "server.js"]
