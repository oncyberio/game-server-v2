FROM node:20

ENV PORT=2567

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm i

# Copy source code
COPY . .

# Build TypeScript files
RUN npm run build


EXPOSE 2567

# Change the CMD to run the built files
CMD [ "node", "build/index.js" ]