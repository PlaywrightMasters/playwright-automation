# Official Playwright image: Node, the three browsers and their OS libraries.
# The tag must match the @playwright/test version in package.json.
FROM mcr.microsoft.com/playwright:v1.64.1-noble

WORKDIR /app
ENV CI=true

COPY --chown=pwuser:pwuser package.json package-lock.json ./
RUN npm ci && chown -R pwuser:pwuser /app

COPY --chown=pwuser:pwuser . .

# Browse the public site as an unprivileged user.
USER pwuser

CMD ["npx", "playwright", "test"]
