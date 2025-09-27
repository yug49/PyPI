/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,                // automatically register SW
  skipWaiting: true,             // activate new SW immediately
  disable: process.env.NODE_ENV === "development",  // don't use in dev
  // optional: more fine-grained control with runtimeCaching etc.
  // scope: '/', sw: 'sw.js', etc.
});

const nextConfig = withPWA({
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
      "@react-native-async-storage/async-storage": false,
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
});

module.exports = nextConfig;
