/** @type {import('next').NextConfig} */

const appPath = process.env.NEXT_PUBLIC_APP_PATH || ''

const nextConfig = {
  output: 'standalone',
  basePath: appPath ? `/${appPath}` : '',
  reactStrictMode: true,
  poweredByHeader: false,
}

module.exports = nextConfig