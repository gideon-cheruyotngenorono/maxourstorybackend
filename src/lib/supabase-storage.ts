import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Use service role for server-side operations (bypasses RLS)
export const supabaseStorage = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Upload file to storage
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
      cacheControl: '3600',
      upsert: true,
    })

  if (error) throw error

  const { data: { publicUrl } } = supabaseStorage.storage
    .from(bucket)
    .getPublicUrl(path)

  return { 
    url: publicUrl, 
    ...data,
    path 
  }
}

// Delete file from storage
export async function deleteFile(bucket: string, path: string) {
  const { error } = await supabaseStorage.storage
    .from(bucket)
    .remove([path])

  if (error) throw error
  return true
}

// Get signed URL for private access
export async function getSignedUrl(bucket: string, path: string, expiresIn: number = 3600) {
  const { data, error } = await supabaseStorage.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) throw error
  return data.signedUrl
}

// Check if file exists
export async function fileExists(bucket: string, path: string) {
  const { data, error } = await supabaseStorage.storage
    .from(bucket)
    .list('', {
      limit: 1,
      offset: 0,
      search: path,
    })

  if (error) throw error
  return data && data.length > 0
}
