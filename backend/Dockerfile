# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code (Cache bust: 1)
COPY . .

# Build the binaries
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/server/main.go
RUN CGO_ENABLED=0 GOOS=linux go build -o seed ./cmd/seed

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binaries from builder
COPY --from=builder /app/main .
COPY --from=builder /app/seed .
# Copy .env.example just as reference if needed, but we use environment variables
COPY --from=builder /app/.env.example .

EXPOSE 8080

CMD ["./main"]
