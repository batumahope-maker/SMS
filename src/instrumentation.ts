// Pre-initialise Prisma on server startup so the first request is fast
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { db } = await import('@/lib/db');
    // Warm up the connection pool
    await db.$queryRaw`SELECT 1`.catch(() => {});
  }
}
