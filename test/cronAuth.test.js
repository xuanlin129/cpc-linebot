import test from 'node:test';
import assert from 'node:assert/strict';
import { isAuthorizedCronRequest } from '../services/cronAuth.js';

test('authorizes cron requests by bearer token', () => {
  const request = createRequest({ authorization: 'Bearer secret' });

  assert.equal(isAuthorizedCronRequest(request, { CRON_SECRET: 'secret' }), true);
});

test('authorizes cron requests by x-cron-secret header', () => {
  const request = createRequest({ 'x-cron-secret': 'secret' });

  assert.equal(isAuthorizedCronRequest(request, { CRON_SECRET: 'secret' }), true);
});

test('rejects cron requests when no secret is configured', () => {
  const request = createRequest({ authorization: 'Bearer secret' });

  assert.equal(isAuthorizedCronRequest(request, {}), false);
});

function createRequest(headers) {
  return {
    get(name) {
      return headers[name.toLowerCase()] || '';
    },
  };
}
