import { isNewNotice } from '../../src/components/NoticeVisuals';
import { test, expect } from '@playwright/test';
import { deadlineStatus } from '../../src/components/Deadline';

test('deadline labels use Indian calendar dates and distinguish past and upcoming dates', () => {
  const now = new Date('2026-09-09T19:00:00Z'); // Already September 10 in India.
  expect(deadlineStatus('2026-09-09', now)).toMatchObject({ label: 'Closed', tone: 'closed' });
  expect(deadlineStatus('2026-09-10', now)).toMatchObject({ label: 'Closes today', tone: 'urgent' });
  expect(deadlineStatus('2026-09-11', now)).toMatchObject({ label: 'Closes tomorrow', tone: 'urgent' });
  expect(deadlineStatus('2026-09-17', now)).toMatchObject({ label: 'Closes in 7 days', tone: 'urgent' });
  expect(deadlineStatus('2026-09-18', now)).toMatchObject({ label: 'Closing date', tone: 'upcoming' });
  expect(deadlineStatus('invalid', now)).toBeNull();
});

test('new notices exclude future dates and expire after 48 hours', () => {
  const now = Date.parse('2026-09-10T12:00:00Z');
  expect(isNewNotice('2026-09-10T12:00:00Z', now)).toBe(true);
  expect(isNewNotice('2026-09-08T12:00:01Z', now)).toBe(true);
  expect(isNewNotice('2026-09-08T12:00:00Z', now)).toBe(false);
  expect(isNewNotice('2026-09-11T12:00:00Z', now)).toBe(false);
  expect(isNewNotice('invalid', now)).toBe(false);
});
