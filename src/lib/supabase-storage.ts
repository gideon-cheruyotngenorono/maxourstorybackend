import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Use service role key for server-side operations
export const supabaseStorage = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Function to upload file to any bucket
export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer | File,
  contentType: string
) {
  const { data, error } = await supabaseStorage.storage
    .from(bucket)
    .upload(path, file, {
      contentType,
      upsert: false,
    })

  if (error) throw error

  const { data: { publicUrl } } = supabaseStorage.storage
    .from(bucket)
    .getPublicUrl(path)

  return { url: publicUrl, path, ...data }
}

// Function to delete file
export async function deleteFile(bucket: string, path: string) {
  const { error } = await supabaseStorage.storage
    .from(bucket)
    .remove([path])

  if (error) throw error
  return true
}

// Function to get signed URL (for private buckets)
export async function getSignedUrl(bucket: string, path: string, expiresIn: number = 60) {
  const { data, error } = await supabaseStorage.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) throw error
  return data.signedUrl
}
