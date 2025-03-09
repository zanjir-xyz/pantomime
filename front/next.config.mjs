/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: '/apps/apps/pantomime',
  assetPrefix: '/apps/apps/pantomime/',
  trailingSlash: true,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      crypto: false,
    };
    return config;
  },
  typescript: {
    ignoreBuildErrors: true
  }
};

export default nextConfig;

