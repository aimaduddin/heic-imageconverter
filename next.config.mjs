/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals.push({
      'sharp': 'commonjs sharp',
      'heic-convert': 'commonjs heic-convert'
    });
    return config;
  }
};

export default nextConfig;
