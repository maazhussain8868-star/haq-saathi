import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { preflightBank, preflightConsumer, preflightPolice, PREFLIGHT_STATUS } from '../src/engine/preflight.js';
import { runPreflightBenchmark } from '../scripts/test-preflight.js';

describe('Phase 2B: Deterministic Pre-Flight Rules Engine', () => {
  describe('RBI Banking Ombudsman Pre-flight Rules', () => {
    it('catches missing prior written complaint and returns WAIT status', () => {
      const res = preflightBank({ hasWrittenComplaint: false });
      assert.equal(res.status, PREFLIGHT_STATUS.WAIT);
      assert.equal(res.isDefective, true);
      assert.ok(res.fix.includes('formal written complaint'));
    });

    it('catches premature filing before 30-day waiting period', () => {
      const res = preflightBank({ hasWrittenComplaint: true, daysSinceComplaint: 12, isRejectedByBank: false });
      assert.equal(res.status, PREFLIGHT_STATUS.WAIT);
      assert.equal(res.isDefective, true);
      assert.equal(res.daysToWait, 18);
      assert.ok(res.reason.includes('bank has 30 days'));
    });

    it('catches time-barred complaints (> 1 year after bank reply)', () => {
      const res = preflightBank({
        hasWrittenComplaint: true,
        daysSinceComplaint: 400,
        isRejectedByBank: true,
        daysSinceReply: 380
      });
      assert.equal(res.status, PREFLIGHT_STATUS.TIME_BARRED);
      assert.equal(res.isDefective, true);
      assert.ok(res.fix.includes('Consumer Commission or a Civil Court'));
    });

    it('approves ready bank complaint after 30 days without reply', () => {
      const res = preflightBank({ hasWrittenComplaint: true, daysSinceComplaint: 35, isRejectedByBank: false });
      assert.equal(res.status, PREFLIGHT_STATUS.READY);
      assert.equal(res.isDefective, false);
      assert.ok(res.fix.includes('cms.rbi.org.in'));
    });

    it('approves immediate filing if bank rejected earlier', () => {
      const res = preflightBank({
        hasWrittenComplaint: true,
        daysSinceComplaint: 8,
        isRejectedByBank: true,
        daysSinceReply: 1
      });
      assert.equal(res.status, PREFLIGHT_STATUS.READY);
      assert.equal(res.isDefective, false);
    });
  });

  describe('Consumer Commission Pre-flight Rules', () => {
    it('accurately picks District Commission for consideration <= 50 Lakhs', () => {
      const res = preflightConsumer({ considerationPaid: 450000, daysSinceCauseOfAction: 30 });
      assert.equal(res.status, PREFLIGHT_STATUS.READY);
      assert.ok(res.forum.includes('District Consumer'));
    });

    it('accurately picks State Commission for consideration > 50 Lakhs to 2 Crore', () => {
      const res = preflightConsumer({ considerationPaid: 8000000, daysSinceCauseOfAction: 60 });
      assert.equal(res.status, PREFLIGHT_STATUS.READY);
      assert.ok(res.forum.includes('State Consumer'));
    });

    it('accurately picks National Commission for consideration > 2 Crore', () => {
      const res = preflightConsumer({ considerationPaid: 25000000, daysSinceCauseOfAction: 60 });
      assert.equal(res.status, PREFLIGHT_STATUS.READY);
      assert.ok(res.forum.includes('National Consumer'));
    });

    it('catches time-barred consumer cases (> 2 years)', () => {
      const res = preflightConsumer({ considerationPaid: 50000, daysSinceCauseOfAction: 750 });
      assert.equal(res.status, PREFLIGHT_STATUS.TIME_BARRED);
      assert.equal(res.isDefective, true);
      assert.ok(res.reason.includes('strictly 2 years'));
    });
  });

  describe('Police / BNSS Refusal Ladder Pre-flight Rules', () => {
    it('halts user if police station has not been approached yet', () => {
      const res = preflightPolice({ approachedStation: false });
      assert.equal(res.status, PREFLIGHT_STATUS.WAIT);
      assert.equal(res.isDefective, true);
      assert.ok(res.fix.includes('approach the police station'));
    });

    it('clears user to escalate to SP after station refusal', () => {
      const res = preflightPolice({ approachedStation: true, stationRefused: true, sentToSP: false });
      assert.equal(res.status, PREFLIGHT_STATUS.READY);
      assert.equal(res.isDefective, false);
      assert.ok(res.fix.includes('BNSS s.173(4)'));
    });

    it('clears user to approach Magistrate if SP does not act after 15 days', () => {
      const res = preflightPolice({
        approachedStation: true,
        stationRefused: true,
        sentToSP: true,
        daysSinceSP: 16
      });
      assert.equal(res.status, PREFLIGHT_STATUS.READY);
      assert.equal(res.isDefective, false);
      assert.ok(res.fix.includes('BNSS s.175(3)'));
    });
  });

  describe('Pre-flight Benchmark Summary', () => {
    it('achieves 100% defect catch rate across all benchmark test cases', () => {
      const report = runPreflightBenchmark();
      assert.equal(report.defectiveCatchRate, 100);
      assert.equal(report.overallAccuracy, 100);
    });
  });
});
