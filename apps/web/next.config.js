/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  
  // Configuração para rodar dentro do Docker
  experimental: {
    // Permitir hot reload funcionar com Docker
  },
  
  // Configuração de proxy para a API em desenvolvimento
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
