FROM node:16.14.0


LABEL FIDO POS STAND-ALONE
# RUN echo ' pulling node'
# RUN mkdir /usr/src/app

WORKDIR /app
COPY . .
# we need to mount local machine user home dir
# RUN touch  ~/.token.json
# RUN cp ~/.token.json ~/.token.json
RUN apt-get update -y
RUN apt-get install build-essential libcups2-dev libudev-dev libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev -y
RUN npm ci usb
# RUN npm install pm2 -g
ENV CONNECT_STR mongodb://localhost:27017/torposdb
ENV PORT 3500
RUN npm ci 

# CMD ["pm2-runtime", "ecosystem.config.js"]
# CMD ["npm", "start"]
CMD ["npm", "run", "dev"]
EXPOSE 3500
