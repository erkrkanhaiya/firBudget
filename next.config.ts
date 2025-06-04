
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [
      // Removed the redirect from '/' to '/login'
      // Add other redirects here if needed
    ]
  },
  allowedDevOrigins: ['https://6000-firebase-studio-1748230088871.cluster-htdgsbmflbdmov5xrjithceibm.cloudworkstations.dev'],
};

export default nextConfig;
