import { PrismaClient } from '@prisma/client'

// Connection retry configuration
const MAX_RETRIES = 5
const RETRY_DELAY = 2000 // 2 seconds

// Prisma client with optimized connection settings for Railway
const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
  return client
}

// Singleton pattern for Prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Connection test with retry logic
export async function connectWithRetry(retries = MAX_RETRIES): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect()
      console.log('✅ Database connected successfully')
      return true
    } catch (error) {
      console.error(`❌ Database connection attempt ${i + 1}/${retries} failed:`, error)
      
      if (i < retries - 1) {
        console.log(`⏳ Retrying in ${RETRY_DELAY}ms...`)
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      }
    }
  }
  
  console.error('❌ All database connection attempts failed')
  return false
}

// Graceful shutdown
export async function disconnectPrisma() {
  await prisma.$disconnect()
  console.log('👋 Database disconnected')
}

// Health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}
