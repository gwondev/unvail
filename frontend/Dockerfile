FROM node:24-alpine
#최신 LTS 버전인 24-alpine 사용합니다.

WORKDIR /frontend
#컨테이너 내 생성되는 작업폴더입니다.

COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .

EXPOSE 5173
# Cloudflare 라우팅에 맞춘 프론트 포트

CMD ["npm","run","dev"]
