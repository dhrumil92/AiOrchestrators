import { describe, expect, it } from 'vitest';
import { applyVoiceFields, describeVoice, voiceSummary } from './voiceFill.js';

const blank = { name: 'Ravi', phone: '', address: '', units: '', budget: '', area: '' };

const result = (fields = {}, extra = {}) => ({
  transcript: 'I use 250 units',
  fields: {
    monthlyUnits: null, budgetRupees: null, roofAreaSqm: null, location: null,
    preferredKw: null, roofType: null, obstructions: [], additionalRequirements: [], ...fields,
  },
  missingFields: [], unclearFields: [], source: 'live', ...extra,
});

describe('applyVoiceFields', () => {
  it('fills units, area, budget and address from what was said', () => {
    const { form, voiced } = applyVoiceFields(blank, result({ monthlyUnits: 250, roofAreaSqm: 46.45, budgetRupees: 150000, location: 'Vadodara' }).fields);
    expect(form).toMatchObject({ units: '250', area: '46.45', budget: '150000', address: 'Vadodara' });
    expect(voiced).toEqual(['units', 'budget', 'area', 'address']);
  });

  it('leaves everything else alone and never invents a value', () => {
    const { form, voiced } = applyVoiceFields(blank, result().fields);
    expect(form).toEqual(blank);
    expect(voiced).toEqual([]);
  });

  it('does not clear what the household already typed', () => {
    const typed = { ...blank, units: '300', budget: '90000', address: '12 Park Road, Surat' };
    const { form } = applyVoiceFields(typed, result({ roofAreaSqm: 20 }).fields);
    expect(form).toMatchObject({ units: '300', budget: '90000', address: '12 Park Road, Surat', area: '20' });
  });

  it('keeps a typed address even if another is spoken', () => {
    const { form, voiced } = applyVoiceFields({ ...blank, address: '12 Park Road, Surat' }, result({ location: 'Vadodara' }).fields);
    expect(form.address).toBe('12 Park Road, Surat');
    expect(voiced).not.toContain('address');
  });

  it('does not change the form it was given, so edits made later are never lost', () => {
    const original = { ...blank };
    applyVoiceFields(original, result({ monthlyUnits: 250 }).fields);
    expect(original).toEqual(blank);
  });

  it('lets the household correct a filled value afterwards', () => {
    const { form } = applyVoiceFields(blank, result({ monthlyUnits: 250 }).fields);
    const edited = { ...form, units: '280' };
    expect(edited.units).toBe('280');
  });
});

describe('describeVoice', () => {
  it('lists unclear and missing fields in plain words', () => {
    const d = describeVoice(result({}, { unclearFields: ['roofArea'], missingFields: ['location', 'budget', 'preferredKw'] }));
    expect(d.unclear).toEqual(['terrace area']);
    expect(d.missing).toEqual(['address', 'budget']);
    expect(d.confirmKeys).toEqual(['area']);
  });

  it('shows extra details that the form has no box for', () => {
    const d = describeVoice(result({ preferredKw: 3, roofType: 'flat', obstructions: ['water tank'], additionalRequirements: ['EMI option'] }));
    expect(d.extras).toEqual([
      ['Solar size you asked for', '3 kW'],
      ['Roof type', 'Flat roof'],
      ['On the roof', 'water tank'],
      ['Other wishes', 'EMI option'],
    ]);
  });
});

describe('voiceSummary', () => {
  it('asks to retry when nothing was heard', () => {
    expect(voiceSummary(result({}, { transcript: '' }), 0).kind).toBe('error');
  });
  it('asks the household to check the form after filling it', () => {
    const s = voiceSummary(result({ monthlyUnits: 250 }), 1);
    expect(s.kind).toBe('success');
    expect(s.text).toMatch(/check/i);
  });
  it('says so when speech held nothing to fill in', () => {
    expect(voiceSummary(result(), 0).kind).toBe('info');
  });
});
