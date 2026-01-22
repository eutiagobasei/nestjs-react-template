export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          🚀 {{PROJECT_NAME}}
        </h1>
        <p className="text-gray-600 mb-8">
          Seu projeto está configurado e pronto para desenvolvimento!
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <a
            href="http://localhost:3001/api/v1/health"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <h2 className="font-semibold mb-2">API Health Check →</h2>
            <p className="text-sm text-gray-500">
              Verifique se a API está funcionando
            </p>
          </a>
          
          <a
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <h2 className="font-semibold mb-2">Next.js Docs →</h2>
            <p className="text-sm text-gray-500">
              Documentação do Next.js
            </p>
          </a>
          
          <a
            href="https://docs.nestjs.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <h2 className="font-semibold mb-2">NestJS Docs →</h2>
            <p className="text-sm text-gray-500">
              Documentação do NestJS
            </p>
          </a>
          
          <a
            href="https://www.prisma.io/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <h2 className="font-semibold mb-2">Prisma Docs →</h2>
            <p className="text-sm text-gray-500">
              Documentação do Prisma ORM
            </p>
          </a>
        </div>
      </div>
    </main>
  );
}
