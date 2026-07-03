import { supabase } from './supabase';

const BUCKET = 'item-photos';

// Hermes has no Buffer; decode base64 to bytes for supabase-js uploads.
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64ToBytes(b64) {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(len);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (B64_CHARS.indexOf(clean[i]) << 18) |
      (B64_CHARS.indexOf(clean[i + 1]) << 12) |
      ((B64_CHARS.indexOf(clean[i + 2]) & 63) << 6) |
      (B64_CHARS.indexOf(clean[i + 3]) & 63);
    if (p < len) bytes[p++] = (n >> 16) & 255;
    if (p < len) bytes[p++] = (n >> 8) & 255;
    if (p < len) bytes[p++] = n & 255;
  }
  return bytes;
}

/**
 * Upload scan photos for an item. Returns { urls, error } — urls contains
 * whatever uploaded successfully; a partial or total failure never throws,
 * so saving an item is never blocked by photo upload problems.
 */
export async function uploadItemPhotos(userId, photos, itemKey = Date.now()) {
  const urls = [];
  let lastError = null;
  for (let i = 0; i < photos.length; i++) {
    const b64 = photos[i]?.base64;
    if (!b64) continue;
    const path = `${userId}/${itemKey}-${i}.jpg`;
    try {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, base64ToBytes(b64), { contentType: 'image/jpeg', upsert: true });
      if (error) { lastError = error; continue; }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      if (data?.publicUrl) urls.push(data.publicUrl);
    } catch (e) {
      lastError = e;
    }
  }
  return { urls, error: urls.length ? null : lastError };
}
