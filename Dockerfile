FROM node:22-alpine AS frontend
WORKDIR /app/webui/frontend
COPY webui/frontend/package.json webui/frontend/package-lock.json ./
RUN npm ci
COPY webui/frontend/ ./
RUN npm run build

FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend /app/webui/internal/assets/build/ webui/internal/assets/build/
RUN CGO_ENABLED=0 go build -o /workwebui ./cmd/workwebui

FROM alpine:3.21
RUN apk add --no-cache ca-certificates
COPY --from=builder /workwebui /usr/local/bin/workwebui
EXPOSE 5040
ENTRYPOINT ["workwebui"]
