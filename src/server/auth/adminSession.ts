import 'server-only';
import { cookies } from 'next/headers';
import {
  verifyAdminToken,
  verifyAdminTokenAsync,
  revokeAdminSession,
  createSessionToken,
  getAdminByEmail,
  verifyPassword,
  recordAdminLogin,
} from '@/server/db';

/**
 * Extracts and verifies the admin session from request cookies (sra_admin_session).
 */
export function getAdminFromRequest(req: Request): { sub: string; email: string; role: string } | null {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/sra_admin_session=([^;]+)/);
    if (!match || !match[1]) return null;

    const token = decodeURIComponent(match[1].trim());
    return verifyAdminToken(token);
  } catch (err) {
    console.error('Error extracting admin session from request:', err);
    return null;
  }
}

/**
 * Server Component / Server Action helper to fetch currently authenticated admin.
 */
export async function getAuthenticatedAdmin(): Promise<{ sub: string; email: string; role: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sra_admin_session')?.value;
    if (!token) return null;
    return await verifyAdminTokenAsync(token);
  } catch (err) {
    console.error('Error fetching admin session from cookies:', err);
    return null;
  }
}

export {
  verifyAdminToken,
  verifyAdminTokenAsync,
  revokeAdminSession,
  createSessionToken,
  getAdminByEmail,
  verifyPassword,
  recordAdminLogin,
};
