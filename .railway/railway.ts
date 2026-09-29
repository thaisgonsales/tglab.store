import {
  defineRailway,
  github,
  preserve,
  project,
  service,
} from "railway/iac";

// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "web";

export default defineRailway(() => {
  const web = service("web", {
    source: github("thaisgonsales/tglab.store"),
    start: "npm run db:migrate:deploy && npm run start -- --hostname 0.0.0.0 --port $PORT",
    healthcheck: "/api/health",
    healthcheckTimeout: 300,
    preDeploy: "npm run db:migrate:deploy && npm run production:audit",
    variables: {
      APP_ENV: preserve(),
      BETTER_AUTH_SECRET: preserve(),
      BETTER_AUTH_URL: preserve(),
      DATABASE_URL: preserve(),
      EMAIL_FROM: preserve(),
      MERCADOPAGO_MODE: preserve(),
      NEXT_PUBLIC_SITE_URL: preserve(),
      PAYMENTS_BANK_TRANSFER_ENABLED: preserve(),
      S3_ACCESS_KEY_ID: preserve(),
      S3_BUCKET: preserve(),
      S3_ENDPOINT: preserve(),
      S3_PRIVATE_BUCKET: preserve(),
      S3_PUBLIC_URL: preserve(),
      S3_REGION: preserve(),
      S3_SECRET_ACCESS_KEY: preserve(),
      STORAGE_DRIVER: preserve(),
      TRANSBANK_MODE: preserve(),
    },
  });
  return project("tglab-store", {
    resources: [web],
  });
});
