import { describe, expect, it } from 'vitest';
import { greeting, nextStep, requestStatus, summarize, viewFromHash } from './householdView.js';

const LAST = 5;
const req = (id, extra = {}) => ({ id: String(id), status: 'open', createdAt: `2026-11-0${id}T10:00:00Z`, ...extra });
const quote = (requestId, extra = {}) => ({ id: `q${requestId}${Math.random()}`, requestId: String(requestId), status: 'submitted', ...extra });

describe('viewFromHash', () => {
  it('reads the view from the address', () => {
    expect(viewFromHash('#/requests')).toBe('requests');
    expect(viewFromHash('#/new')).toBe('new');
    expect(viewFromHash('#requests')).toBe('requests');
    expect(viewFromHash('#/learn?x=1')).toBe('learn');
  });
  it('falls back to home for nothing or nonsense', () => {
    expect(viewFromHash('')).toBe('home');
    expect(viewFromHash(undefined)).toBe('home');
    expect(viewFromHash('#/admin')).toBe('home');
  });
});

describe('greeting', () => {
  it('follows the time of day', () => {
    expect(greeting(8)).toBe('Good morning');
    expect(greeting(14)).toBe('Good afternoon');
    expect(greeting(20)).toBe('Good evening');
  });
});

describe('requestStatus', () => {
  it('waits for quotes when there are none', () => {
    expect(requestStatus(req(1), [], LAST)).toMatchObject({ key: 'waiting', step: 1 });
  });
  it('counts quotes to compare', () => {
    expect(requestStatus(req(1), [quote(1)], LAST).label).toBe('1 quote to compare');
    expect(requestStatus(req(1), [quote(1), quote(1)], LAST)).toMatchObject({ key: 'quotes', label: '2 quotes to compare', step: 2 });
  });
  it('is installing after a quote is accepted, then installed at the last stage', () => {
    expect(requestStatus(req(1, { status: 'closed' }), [quote(1, { status: 'accepted', installStage: 2 })], LAST)).toMatchObject({ key: 'installing', step: 4 });
    expect(requestStatus(req(1, { status: 'closed' }), [quote(1, { status: 'accepted', installStage: LAST })], LAST)).toMatchObject({ key: 'completed', step: 5 });
  });
  it('is closed when it ended without an accepted quote', () => {
    expect(requestStatus(req(1, { status: 'closed' }), [], LAST).key).toBe('closed');
  });
});

describe('nextStep', () => {
  it('asks a new household to post a request', () => {
    expect(nextStep([], [], LAST)).toMatchObject({ step: 0, cta: { view: 'new' } });
  });
  it('puts new quotes before everything else', () => {
    const requests = [req(1), req(2), req(3)];
    const quotes = [quote(2), quote(3, { status: 'accepted', installStage: 1 })];
    expect(nextStep(requests, quotes, LAST)).toMatchObject({ step: 2, requestId: '2', cta: { view: 'requests', requestId: '2' } });
  });
  it('then follows a live installation, then a waiting request', () => {
    expect(nextStep([req(1), req(3)], [quote(3, { status: 'accepted', installStage: 1 })], LAST)).toMatchObject({ step: 4, requestId: '3' });
    expect(nextStep([req(1)], [], LAST)).toMatchObject({ step: 1, requestId: '1' });
  });
  it('picks the newest request when two are equally urgent', () => {
    expect(nextStep([req(1), req(2)], [], LAST).requestId).toBe('2');
  });
  it('suggests a new request when the only one is closed', () => {
    expect(nextStep([req(1, { status: 'closed' })], [], LAST)).toMatchObject({ step: 5, cta: { view: 'new' } });
  });
  it('reminds a finished household about the subsidy claim', () => {
    const done = nextStep([req(1, { status: 'closed' })], [quote(1, { status: 'accepted', installStage: LAST })], LAST);
    expect(done.title).toMatch(/installed/);
    expect(done.text).toMatch(/subsidy/);
  });
});

describe('summarize', () => {
  it('counts what the tiles show', () => {
    const requests = [req(1), req(2), req(3, { status: 'closed' })];
    const quotes = [quote(1), quote(1), quote(3, { status: 'accepted', installStage: 2 })];
    expect(summarize(requests, quotes, LAST)).toEqual({ requests: 3, quotes: 3, toCompare: 1, installing: 1, completed: 0 });
  });
});
