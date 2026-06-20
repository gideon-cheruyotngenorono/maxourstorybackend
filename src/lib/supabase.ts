import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';

// Prefer the service role key so server-side uploads bypass RLS.
// Falls back to anon/publishable keys if service key is not set.
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Broadcast a Realtime event to a channel from the server side.
 *
 * WHY: Calling supabase.channel(name).send() from a serverless route triggers
 * "Realtime send() is automatically falling back to REST" because the channel
 * was never WebSocket-subscribed. This helper calls Supabase's Realtime REST
 * broadcast endpoint directly — no WebSocket, no warning, works on Vercel.
 */
export async function broadcastToChannel(
  channelName: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (!supabaseUrl || !supabaseKey) return;

  try {
    await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: channelName,
            event,
            payload,
          },
        ],
      }),
    });
  } catch (err) {
    // Non-fatal — realtime is best-effort; don't break the main response
    console.warn('[REALTIME_BROADCAST_ERROR]', err);
  }
}


export async function uploadAvatarFile(userId: string, file: File): Promise<{ url: string; path: string; error: string | null }> {
  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `profile.${ext}`;
    const filePath = `${userId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (error) {
      console.error('[SUPABASE_UPLOAD_ERROR]', error);
      return { url: '', path: '', error: error.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return { url: publicUrlData.publicUrl, path: filePath, error: null };
  } catch (err: any) {
    console.error('[SUPABASE_UPLOAD_EXCEPTION]', err);
    return { url: '', path: '', error: err.message };
  }
}

export async function deleteAvatarFile(filePath: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.storage
      .from('avatars')
      .remove([filePath]);

    if (error) {
      console.error('[SUPABASE_DELETE_ERROR]', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('[SUPABASE_DELETE_EXCEPTION]', err);
    return { success: false, error: err.message };
  }
}
