export type PasswordStrength = {
  label: string;
  width: `${number}%`;
  color: string;
};

const LEVELS = [
  { label: 'Muito fraca', width: '10%', color: '#dc2626' },
  { label: 'Fraca', width: '25%', color: '#ef4444' },
  { label: 'Razoavel', width: '50%', color: '#f59e0b' },
  { label: 'Boa', width: '75%', color: '#84cc16' },
  { label: 'Forte', width: '100%', color: '#16a34a' },
] as const satisfies readonly PasswordStrength[];

export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;

  return LEVELS[password.length === 0 ? 0 : score];
}
