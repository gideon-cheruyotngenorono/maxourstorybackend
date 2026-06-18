import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

// Keep a global singleton in development to avoid exhausting database connections
declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined
}

// Normalize DATABASE_URL: some deployment UIs (or copy/paste) include surrounding
// quotes which become part of the value and cause authentication to fail.
// Strip matching leading/trailing single or double quotes if present.
const rawConnectionString = process.env.DATABASE_URL
const connectionString = rawConnectionString ? rawConnectionString.replace(/^(["'])(.*)\1$/, '$2') : undefined

if (rawConnectionString && rawConnectionString !== connectionString) {
  // Avoid printing secrets; log only a short non-sensitive note for debugging.
  // This will show up in server logs and helps identify misconfigured env values.
  // Example: DATABASE_URL was set with surrounding quotes and has been sanitized.
  // eslint-disable-next-line no-console
  console.warn('[prisma] DATABASE_URL had surrounding quotes — value was sanitized')
}
let prisma: PrismaClient

// Construct a pg Pool and adapter for Prisma v7 which expects an adapter or accelerateUrl
if (!connectionString) {
  // Fallback to constructing without adapter so imports don't completely fail in very constrained envs
  prisma = globalThis.prismaGlobal ?? new PrismaClient()
} else {
  // When connecting to Supabase or when sslmode is required, enable TLS on the pool.
  const needsSsl = /supabase\.co/.test(connectionString || '') || /(sslmode=require|sslmode=verify-full)/.test(connectionString || '') || process.env.PGSSLMODE === 'require'

  const pool = new Pool({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  })

  const adapter = new PrismaPg(pool)
  prisma = globalThis.prismaGlobal ?? new PrismaClient({ adapter })
}

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
