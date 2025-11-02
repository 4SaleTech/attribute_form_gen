# syntax=docker/dockerfile:1

FROM golang:1.22 as builder
WORKDIR /app
COPY . /app
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    cd cmd/server && go build -o /out/server

FROM gcr.io/distroless/base-debian12
WORKDIR /
COPY --from=builder /out/server /server
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/server"]



