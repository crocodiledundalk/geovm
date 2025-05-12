// import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // webpack: (config, { isServer, dev }) => {
  //   // Aliases to ensure a single React instance
  //   config.resolve.alias['react'] = path.resolve('./node_modules/react');
  //   config.resolve.alias['react-dom'] = path.resolve('./node_modules/react-dom');
    
  //   // Important: return the modified config
  //   return config;
  // },
};

export default nextConfig;
