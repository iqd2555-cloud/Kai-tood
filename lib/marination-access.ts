export const MARINATION_ALLOWED_EMAILS = [
  "sorrawisaaemprathom20mar2530@gmail.com",
  "iqd2555@gmail.com",
  "kommuangkham@gmail.com",
] as const;

export function canAccessMarinationByEmail(email: string | null | undefined) {
  const normalizedEmail = email?.toLowerCase();
  return normalizedEmail ? MARINATION_ALLOWED_EMAILS.includes(normalizedEmail as (typeof MARINATION_ALLOWED_EMAILS)[number]) : false;
}
