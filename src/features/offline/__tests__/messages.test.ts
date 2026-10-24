import { describe, expect, it } from 'vitest';
import { queuedFailureMessage } from '../messages';

describe('queuedFailureMessage', () => {
  it('names the change that failed', () => {
    expect(queuedFailureMessage('saveStop', { input: { title: 'Louvre' } }, new Error('x'))).toMatch(
      /^Couldn’t save the stop “Louvre”\. /,
    );
    expect(queuedFailureMessage('savePackingItem', { input: { label: 'Sunscreen' } }, {})).toMatch(
      /^Couldn’t save “Sunscreen”\. /,
    );
    expect(queuedFailureMessage('createTrip', { name: 'Kyoto' }, {})).toMatch(/^Couldn’t create the trip “Kyoto”\. /);
    expect(queuedFailureMessage('saveNote', { input: { body: 'secret' } }, {})).toMatch(/^Couldn’t save your note\. /);
  });

  it('never quotes a note’s text', () => {
    expect(queuedFailureMessage('saveNote', { input: { body: 'secret plans', isPrivate: true } }, {})).not.toContain('secret');
  });

  it('clips long titles', () => {
    const message = queuedFailureMessage('saveStop', { input: { title: 'x'.repeat(80) } }, {});
    expect(message).toContain('…”');
    expect(message.length).toBeLessThan(160);
  });

  it('gives the server’s own sentence when it wrote one for people', () => {
    expect(queuedFailureMessage('updateTrip', {}, { code: 'P0001', message: 'trip dates are out of range' })).toBe(
      'Couldn’t save your changes to the trip. Trip dates are out of range.',
    );
  });

  it('suggests the change may have been made elsewhere otherwise', () => {
    expect(queuedFailureMessage('deleteStop', {}, { code: 'PGRST116', message: 'no rows' })).toBe(
      'Couldn’t delete a stop. It may have been changed or removed by someone else. Make the change again.',
    );
  });

  it('points at the connection for a network failure', () => {
    expect(queuedFailureMessage('setPacked', {}, new TypeError('Network request failed'))).toBe(
      'Couldn’t update a packing item. Check your connection and make the change again.',
    );
  });
});
