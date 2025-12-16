/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Use webpack instead of Turbopack to avoid ESM module issues
  experimental: {
    turbo: undefined, // Disable Turbopack
  },
  webpack: (config, { isServer }) => {
    // Fix for ESM module resolution
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.tsx'],
    };
    
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Handle ESM modules
    config.module = {
      ...config.module,
      rules: [
        ...config.module.rules,
        {
          test: /\.mjs$/,
          include: /node_modules/,
          type: 'javascript/auto',
        },
      ],
    };
    
    return config;
  },
}

module.exports = nextConfig

