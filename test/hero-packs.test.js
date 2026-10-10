import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateFarmer72h, PERIL_TYPES, FARMER_STATUS } from '../src/engine/farmer72h.js';
import { evaluateLegalAid } from '../src/engine/legalaid.js';
import { evaluateMsmeInvoice, MSME_STATUS, CURRENT_RBI_BANK_RATE } from '../src/engine/msme_invoice.js';
import { preflightBank, PREFLIGHT_STATUS } from '../src/engine/preflight.js';

describe('Phase 2C: Hero Pack Engine (40 Unit Tests Without LLM)', () => {
  // -------------------------------------------------------------
  // MODULE 1: Farmer 72-Hour Clock (PMFBY) (10 Tests)
  // -------------------------------------------------------------
  describe('Module 1: Farmer 72-Hour Clock (PMFBY)', () => {
    it('1. Hailstorm 10 hours ago is within window with urgent status', () => {
      const now = new Date();
      const eventTime = new Date(now.getTime() - 10 * 60 * 60 * 1000);
      const res = evaluateFarmer72h({ perilType: PERIL_TYPES.HAILSTORM, eventDateTime: eventTime, nowDateTime: now, enrolled: true });
      assert.equal(res.status, FARMER_STATUS.WITHIN_72H);
      assert.equal(res.hoursLeft, 62);
      assert.equal(res.urgency, 'URGENT');
    });

    it('2. Hailstorm 60 hours ago has CRITICAL urgency (<=24h remaining)', () => {
      const now = new Date();
      const eventTime = new Date(now.getTime() - 60 * 60 * 60 * 1000);
      const res = evaluateFarmer72h({ perilType: PERIL_TYPES.HAILSTORM, eventDateTime: eventTime, nowDateTime: now });
      assert.equal(res.status, FARMER_STATUS.WITHIN_72H);
      assert.equal(res.hoursLeft, 12);
      assert.equal(res.urgency, 'CRITICAL');
    });

    it('3. Cloudburst 80 hours ago is flagged WINDOW_EXPIRED', () => {
      const now = new Date();
      const eventTime = new Date(now.getTime() - 80 * 60 * 60 * 1000);
      const res = evaluateFarmer72h({ perilType: PERIL_TYPES.CLOUDBURST, eventDateTime: eventTime, nowDateTime: now });
      assert.equal(res.status, FARMER_STATUS.WINDOW_EXPIRED);
      assert.equal(res.hoursLeft, 0);
      assert.ok(res.message.includes('Individual claim window (72 hours) likely missed'));
    });

    it('4. Lightning fire 71.5 hours ago has 0.5 hours remaining', () => {
      const now = new Date();
      const eventTime = new Date(now.getTime() - 71.5 * 60 * 60 * 1000);
      const res = evaluateFarmer72h({ perilType: PERIL_TYPES.LIGHTNING_FIRE, eventDateTime: eventTime, nowDateTime: now });
      assert.equal(res.status, FARMER_STATUS.WITHIN_72H);
      assert.equal(res.hoursLeft, 0.5);
    });

    it('5. Widespread drought requires area approach (no individual intimation needed)', () => {
      const res = evaluateFarmer72h({ perilType: PERIL_TYPES.WIDESPREAD_LOSS });
      assert.equal(res.status, FARMER_STATUS.WIDESPREAD_AREA_LOSS);
      assert.ok(res.message.includes('No individual intimation needed'));
    });

    it('6. Widespread pest loss categorized under area yield approach', () => {
      const res = evaluateFarmer72h({ perilType: 'widespread_pest' });
      assert.equal(res.status, FARMER_STATUS.WIDESPREAD_AREA_LOSS);
    });

    it('7. Post-harvest rain within 14 days of harvest is eligible for 72h individual claim', () => {
      const now = new Date();
      const eventTime = new Date(now.getTime() - 15 * 60 * 60 * 1000);
      const res = evaluateFarmer72h({ perilType: PERIL_TYPES.POST_HARVEST_RAIN, eventDateTime: eventTime, nowDateTime: now, daysSinceHarvest: 6 });
      assert.equal(res.status, FARMER_STATUS.WITHIN_72H);
    });

    it('8. Post-harvest rain past 14 days is flagged POST_HARVEST_EXPIRED', () => {
      const res = evaluateFarmer72h({ perilType: PERIL_TYPES.POST_HARVEST_RAIN, daysSinceHarvest: 20 });
      assert.equal(res.status, FARMER_STATUS.POST_HARVEST_EXPIRED);
      assert.ok(res.message.includes('strictly covers crops kept in cut-and-spread condition'));
    });

    it('9. Non-enrolled farmer is flagged NOT_ENROLLED with seasonal cutoff fix', () => {
      const res = evaluateFarmer72h({ enrolled: false });
      assert.equal(res.status, FARMER_STATUS.NOT_ENROLLED);
      assert.ok(res.fix.includes('seasonal cut-off date'));
    });

    it('10. Landslide calamity provides 14447 helpline and surveyor timeline steps', () => {
      const now = new Date();
      const res = evaluateFarmer72h({ perilType: PERIL_TYPES.LANDSLIDE, eventDateTime: now, nowDateTime: now });
      assert.ok(res.steps[0].action.includes('14447'));
      assert.ok(res.steps[3].detail.includes('within 48 hours'));
    });
  });

  // -------------------------------------------------------------
  // MODULE 2: Free Legal Aid Checker (s.12 LSA Act) (10 Tests)
  // -------------------------------------------------------------
  describe('Module 2: Free Legal Aid Checker (s.12 LSA Act)', () => {
    it('11. Woman applicant is 100% eligible without any income test', () => {
      const res = evaluateLegalAid({ woman: true, annual_income: 2500000 });
      assert.equal(res.eligible, true);
      assert.equal(res.requiresIncomeTest, false);
      assert.ok(res.eligibleCategories[0].includes('Woman'));
    });

    it('12. Child under 18 is eligible without income test', () => {
      const res = evaluateLegalAid({ child: true, annual_income: 1000000 });
      assert.equal(res.eligible, true);
      assert.equal(res.requiresIncomeTest, false);
    });

    it('13. Scheduled Caste (SC) applicant is eligible without income test', () => {
      const res = evaluateLegalAid({ sc_st: true, annual_income: 1500000 });
      assert.equal(res.eligible, true);
      assert.equal(res.requiresIncomeTest, false);
      assert.ok(res.eligibleCategories[0].includes('Scheduled Caste'));
    });

    it('14. Scheduled Tribe (ST) applicant is eligible without income test', () => {
      const res = evaluateLegalAid({ sc_st: true });
      assert.equal(res.eligible, true);
    });

    it('15. Person with disability is eligible under Section 12(d)', () => {
      const res = evaluateLegalAid({ disability: true });
      assert.equal(res.eligible, true);
      assert.equal(res.requiresIncomeTest, false);
    });

    it('16. Industrial workman injured or disputing is eligible under Section 12(f)', () => {
      const res = evaluateLegalAid({ industrial_workman: true });
      assert.equal(res.eligible, true);
      assert.equal(res.requiresIncomeTest, false);
    });

    it('17. Person in custody/detention is eligible under Section 12(g)', () => {
      const res = evaluateLegalAid({ in_custody: true });
      assert.equal(res.eligible, true);
      assert.equal(res.requiresIncomeTest, false);
    });

    it('18. Disaster or trafficking victim is eligible under Section 12(e)', () => {
      const res = evaluateLegalAid({ victim: true });
      assert.equal(res.eligible, true);
      assert.equal(res.requiresIncomeTest, false);
    });

    it('19. General low-income citizen below state limit is eligible with state notice', () => {
      const res = evaluateLegalAid({ annual_income: 180000, state: 'Maharashtra' });
      assert.equal(res.eligible, true);
      assert.equal(res.requiresIncomeTest, true);
      assert.ok(res.incomeLimitNotice.includes('Verify state limit'));
    });

    it('20. General high-income citizen above limit is routed to Tele-Law ₹30 consultation', () => {
      const res = evaluateLegalAid({ annual_income: 1200000, state: 'Delhi' });
      assert.equal(res.eligible, false);
      assert.equal(res.requiresIncomeTest, true);
      assert.ok(res.handoffs[0].fee.includes('₹30'));
    });
  });

  // -------------------------------------------------------------
  // MODULE 3: MSME Delayed Payment & Interest Calculator (10 Tests)
  // -------------------------------------------------------------
  describe('Module 3: MSME Delayed Payment (MSMED Act)', () => {
    it('21. Micro enterprise without written contract has 15-day limit and is overdue after 30 days', () => {
      const invDate = new Date('2026-08-01');
      const curDate = new Date('2026-08-31'); // 30 days later
      const res = evaluateMsmeInvoice({
        isUdyamRegistered: true,
        enterpriseType: 'micro',
        invoiceDate: invDate,
        writtenAgreementDays: null,
        principalAmount: 200000,
        currentDate: curDate
      });
      assert.equal(res.status, MSME_STATUS.OVERDUE);
      assert.equal(res.statutoryLimitDays, 15);
      assert.equal(res.daysOverdue, 15);
      assert.ok(res.indicativeInterest > 0);
    });

    it('22. Small IT services firm with 30-day contract is overdue after 60 days', () => {
      const invDate = new Date('2026-07-01');
      const curDate = new Date('2026-08-30'); // 60 days later
      const res = evaluateMsmeInvoice({
        isUdyamRegistered: true,
        enterpriseType: 'small',
        invoiceDate: invDate,
        writtenAgreementDays: 30,
        principalAmount: 500000,
        currentDate: curDate
      });
      assert.equal(res.status, MSME_STATUS.OVERDUE);
      assert.equal(res.daysOverdue, 30);
    });

    it('23. Contract specifying 90 days is strictly capped at statutory maximum 45 days', () => {
      const invDate = new Date('2026-08-01');
      const curDate = new Date('2026-09-25'); // 55 days later
      const res = evaluateMsmeInvoice({
        isUdyamRegistered: true,
        enterpriseType: 'micro',
        invoiceDate: invDate,
        writtenAgreementDays: 90,
        principalAmount: 100000,
        currentDate: curDate
      });
      assert.equal(res.statutoryLimitDays, 45); // Capped at 45!
      assert.equal(res.daysOverdue, 10);
    });

    it('24. Medium enterprise is excluded from Chapter V delayed payment protection', () => {
      const res = evaluateMsmeInvoice({
        isUdyamRegistered: true,
        enterpriseType: 'medium',
        invoiceDate: '2026-08-01',
        principalAmount: 1000000
      });
      assert.equal(res.status, MSME_STATUS.MEDIUM_EXCLUDED);
      assert.equal(res.isCovered, false);
      assert.ok(res.message.includes('Medium enterprises are excluded'));
    });

    it('25. Unregistered supplier is flagged NOT_REGISTERED', () => {
      const res = evaluateMsmeInvoice({
        isUdyamRegistered: false,
        invoiceDate: '2026-08-01',
        principalAmount: 300000
      });
      assert.equal(res.status, MSME_STATUS.NOT_REGISTERED);
      assert.equal(res.isCovered, false);
    });

    it('26. Invoice within 10 days of delivery is within credit period', () => {
      const invDate = new Date('2026-09-01');
      const curDate = new Date('2026-09-10'); // 9 days later
      const res = evaluateMsmeInvoice({
        isUdyamRegistered: true,
        invoiceDate: invDate,
        writtenAgreementDays: 30,
        principalAmount: 200000,
        currentDate: curDate
      });
      assert.equal(res.status, MSME_STATUS.WITHIN_CREDIT_PERIOD);
      assert.equal(res.daysOverdue, 0);
      assert.equal(res.indicativeInterest, 0);
    });

    it('27. Statutory interest rate is exactly 3x RBI bank rate', () => {
      const res = evaluateMsmeInvoice({
        isUdyamRegistered: true,
        invoiceDate: '2026-07-01',
        principalAmount: 100000,
        bankRate: CURRENT_RBI_BANK_RATE
      });
      assert.equal(res.interestRate, CURRENT_RBI_BANK_RATE * 3);
    });

    it('28. Already paid invoice returns status PAID with 0 interest', () => {
      const res = evaluateMsmeInvoice({ paymentReceived: true, principalAmount: 50000 });
      assert.equal(res.status, MSME_STATUS.PAID);
      assert.equal(res.indicativeInterest, 0);
    });

    it('29. Output contains Section 43B(h) buyer tax disallowance notice', () => {
      const res = evaluateMsmeInvoice({ isUdyamRegistered: true, invoiceDate: '2026-08-01' });
      assert.ok(res.taxNotice.includes('Section 43B(h) Income Tax Act'));
    });

    it('30. Escalation steps include Demand Notice, MSME ODR, and MSEFC Arbitration', () => {
      const res = evaluateMsmeInvoice({ isUdyamRegistered: true, invoiceDate: '2026-08-01' });
      assert.equal(res.steps.length, 3);
      assert.ok(res.steps[1].detail.includes('MSME ODR'));
    });
  });

  // -------------------------------------------------------------
  // MODULE 4: Banking Pre-Flight (RBI Ombudsman) (10 Tests)
  // -------------------------------------------------------------
  describe('Module 4: Banking Pre-Flight (RBI Ombudsman)', () => {
    it('31. Missing written complaint to bank returns status WAIT', () => {
      const res = preflightBank({ hasWrittenComplaint: false });
      assert.equal(res.status, PREFLIGHT_STATUS.WAIT);
    });

    it('32. Only 5 days elapsed returns WAIT with 25 days remaining', () => {
      const res = preflightBank({ hasWrittenComplaint: true, daysSinceComplaint: 5, isRejectedByBank: false });
      assert.equal(res.status, PREFLIGHT_STATUS.WAIT);
      assert.equal(res.daysToWait, 25);
    });

    it('33. 20 days elapsed returns WAIT with 10 days remaining', () => {
      const res = preflightBank({ hasWrittenComplaint: true, daysSinceComplaint: 20, isRejectedByBank: false });
      assert.equal(res.status, PREFLIGHT_STATUS.WAIT);
      assert.equal(res.daysToWait, 10);
    });

    it('34. 35 days elapsed without reply returns READY TO FILE', () => {
      const res = preflightBank({ hasWrittenComplaint: true, daysSinceComplaint: 35, isRejectedByBank: false });
      assert.equal(res.status, PREFLIGHT_STATUS.READY);
      assert.equal(res.isDefective, false);
    });

    it('35. Formally rejected after 8 days returns READY immediately', () => {
      const res = preflightBank({ hasWrittenComplaint: true, daysSinceComplaint: 8, isRejectedByBank: true, daysSinceReply: 1 });
      assert.equal(res.status, PREFLIGHT_STATUS.READY);
      assert.equal(res.isDefective, false);
    });

    it('36. Bank rejected 400 days ago returns TIME_BARRED (> 1 year)', () => {
      const res = preflightBank({ hasWrittenComplaint: true, isRejectedByBank: true, daysSinceReply: 400 });
      assert.equal(res.status, PREFLIGHT_STATUS.TIME_BARRED);
    });

    it('37. Bank complaint filed 420 days ago without reply returns TIME_BARRED (> 1 year 30 days)', () => {
      const res = preflightBank({ hasWrittenComplaint: true, daysSinceComplaint: 420, isRejectedByBank: false });
      assert.equal(res.status, PREFLIGHT_STATUS.TIME_BARRED);
    });

    it('38. Disputed credit card fraud after 31 days returns READY', () => {
      const res = preflightBank({ hasWrittenComplaint: true, daysSinceComplaint: 31, isRejectedByBank: false });
      assert.equal(res.status, PREFLIGHT_STATUS.READY);
    });

    it('39. Complaint filed yesterday (1 day) requires 29 days wait', () => {
      const res = preflightBank({ hasWrittenComplaint: true, daysSinceComplaint: 1, isRejectedByBank: false });
      assert.equal(res.daysToWait, 29);
      assert.equal(res.status, PREFLIGHT_STATUS.WAIT);
    });

    it('40. Time-barred output directs to Consumer Commission or Civil Court remedy', () => {
      const res = preflightBank({ hasWrittenComplaint: true, daysSinceComplaint: 450 });
      assert.ok(res.fix.includes('Consumer'));
    });
  });
});
