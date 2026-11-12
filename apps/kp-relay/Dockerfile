FROM oven/bun:1.2.23-slim
WORKDIR /app
COPY src ./src
USER bun
ENV PORT=8788
EXPOSE 8788
CMD ["bun", "src/index.ts"]
