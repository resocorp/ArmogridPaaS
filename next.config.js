/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'iot.solarshare.africa',
      },
    ],
  },
}

module.exports = nextConfig
