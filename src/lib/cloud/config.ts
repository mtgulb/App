/**
 * Familiedeling er av til disse to verdiene er satt (se docs/SUPABASE.md).
 * Begge er offentlige av design: sikkerheten ligger i tilgangsreglene i databasen.
 * Aldri legg «service_role»-nøkkelen i appen.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Hovedbryter: familiedeling er ikke med i versjon 1. Mens den er `false`, vises ingenting om konto,
 * innlogging eller deling i appen, og ingen nettverkskall til serveren gjøres, uansett om nøklene er satt.
 * Settes til `true` først når Supabase er satt opp og testet (se docs/SUPABASE.md).
 */
export const FAMILY_SHARING_ENABLED = false;

export const isCloudConfigured =
  FAMILY_SHARING_ENABLED && SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
