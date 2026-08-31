export function isAuthorizedCronRequest(req, env = process.env) {
  const secret = env.CRON_SECRET || '';

  if (!secret) {
    return false;
  }

  const authorization = req.get('authorization') || '';
  const cronSecret = req.get('x-cron-secret') || '';

  return authorization === `Bearer ${secret}` || cronSecret === secret;
}
