/**
 * Familiedeling er av til disse to verdiene er satt (se docs/SUPABASE.md).
 * Begge er offentlige av design: sikkerheten ligger i tilgangsreglene i databasen.
 * Aldri legg «service_role»-nøkkelen i appen.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isCloudConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
