/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // /settings was folded into the admin console's Config section.
      { source: '/settings', destination: '/config', permanent: false },
    ]
  },
}

export default nextConfig
