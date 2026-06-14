export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;

  const allowedExact = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://run-empire.vercel.app',
    'https://frontend-zeta-tawny-95.vercel.app'
  ];

  if (process.env.FRONTEND_URL) {
    const cleanUrl = process.env.FRONTEND_URL.replace(/\/$/, '');
    allowedExact.push(cleanUrl);
  }

  if (allowedExact.includes(origin)) {
    return true;
  }

  // Allow any Vercel domain (previews, branches, prod)
  if (origin.endsWith('.vercel.app')) {
    return true;
  }

  // Allow any localhost port
  if (/^http:\/\/localhost:\d+$/.test(origin)) {
    return true;
  }

  return false;
}
