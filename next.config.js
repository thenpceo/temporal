/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "@temporalio/client",
    "@temporalio/worker",
    "@temporalio/workflow",
    "@temporalio/activity",
  ],
};

module.exports = nextConfig;
