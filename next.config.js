/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/gifs/**',
      },
      {
        protocol: 'https',
        hostname: '*.up.railway.app',
        port: '',
        pathname: '/api/gifs/**',
      },
    ],
    domains: ['flagcdn.com'],
  },
};

module.exports = nextConfig; 