import { describe, expect, it } from 'vitest';
import { PRIMARY_VIEWS, VENDOR_VIEWS, attentionItems, viewFromHash, winRate } from './vendorView.js';

const none = { notQuoted: 0, active: 0, profileMissing: [], unread: 0 };

describe('viewFromHash', () => {
  it('reads the section from the address', () => {
    expect(viewFromHash('#/enquiries')).toBe('enquiries');
    expect(viewFromHash('#installations')).toBe('installations');
    expect(viewFromHash('#/profile?x=1')).toBe('profile');
  });
  it('falls back to the dashboard for nothing or nonsense', () => {
    expect(viewFromHash('')).toBe('overview');
    expect(viewFromHash(undefined)).toBe('overview');
    expect(viewFromHash('#/home')).toBe('overview');
    expect(viewFromHash('#/admin')).toBe('overview');
  });
});

describe('views', () => {
  it('keeps the phone bar to real sections', () => {
    const ids = VENDOR_VIEWS.map(([id]) => id);
    expect(PRIMARY_VIEWS.every(id => ids.includes(id))).toBe(true);
    expect(PRIMARY_VIEWS.length).toBeLessThan(ids.length);
  });
});

describe('attentionItems', () => {
  it('is empty when the vendor is all caught up', () => {
    expect(attentionItems(none)).toEqual([]);
  });
  it('lists new enquiries first, in plain words', () => {
    const [first] = attentionItems({ ...none, notQuoted: 1, active: 2 });
    expect(first).toMatchObject({ view: 'enquiries', title: '1 new enquiry waiting for your quote' });
    expect(attentionItems({ ...none, notQuoted: 3 })[0].title).toBe('3 new enquiries waiting for your quote');
  });
  it('orders enquiries, installations, profile, then notifications', () => {
    const items = attentionItems({ notQuoted: 2, active: 1, profileMissing: ['GSTIN (valid format)'], unread: 4 });
    expect(items.map(i => i.view)).toEqual(['enquiries', 'installations', 'profile', 'notifications']);
  });
  it('names the missing profile details', () => {
    const [item] = attentionItems({ ...none, profileMissing: ['Mobile number', 'Service area'] });
    expect(item.title).toBe('Finish your business profile (2 details missing)');
    expect(item.text).toBe('Still needed: Mobile number, Service area.');
  });
  it('uses the singular for one detail and one job', () => {
    expect(attentionItems({ ...none, profileMissing: ['Mobile number'] })[0].title).toContain('1 detail missing');
    expect(attentionItems({ ...none, active: 1 })[0].title).toBe('1 installation in progress');
  });
});

describe('winRate', () => {
  it('is a whole percent of decided quotes', () => {
    expect(winRate(1, 3)).toBe(33);
    expect(winRate(2, 2)).toBe(100);
  });
  it('is null before any customer decides', () => {
    expect(winRate(0, 0)).toBeNull();
  });
});
