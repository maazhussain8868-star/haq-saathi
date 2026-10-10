/**
 * Hero Module 1: Farmer 72-Hour Clock (PMFBY Operational Guidelines)
 * Deterministic rules engine for localized crop loss claims.
 */

export const PERIL_TYPES = {
  HAILSTORM: 'hailstorm',
  LANDSLIDE: 'landslide',
  INUNDATION: 'inundation',
  CLOUDBURST: 'cloudburst',
  LIGHTNING_FIRE: 'lightning_fire',
  POST_HARVEST_RAIN: 'post_harvest_rain',
  WIDESPREAD_LOSS: 'widespread_loss'
};

export const FARMER_STATUS = {
  WITHIN_72H: 'WITHIN_72H',
  WINDOW_EXPIRED: 'WINDOW_EXPIRED',
  WIDESPREAD_AREA_LOSS: 'WIDESPREAD_AREA_LOSS',
  POST_HARVEST_EXPIRED: 'POST_HARVEST_EXPIRED',
  NOT_ENROLLED: 'NOT_ENROLLED'
};

/**
 * Evaluates PMFBY claim intimation window
 * @param {object} params
 * @param {string} params.perilType
 * @param {Date|string|number} params.eventDateTime
 * @param {Date|string|number} [params.nowDateTime]
 * @param {boolean} params.enrolled
 * @param {number} [params.daysSinceHarvest]
 * @returns {object} { status, hoursLeft, hoursElapsed, urgency, message, steps, evidenceChecklist }
 */
export function evaluateFarmer72h({
  perilType = PERIL_TYPES.HAILSTORM,
  eventDateTime,
  nowDateTime = new Date(),
  enrolled = true,
  daysSinceHarvest = null
} = {}) {
  const steps = [
    { step: 1, action: 'Call toll-free 14447 immediately', detail: 'Mandatory: obtain an SMS docket ticket number directly from PMFBY central system.' },
    { step: 2, action: 'Crop Insurance Mobile App', detail: 'Upload geotagged, timestamped crop loss photos of the affected field.' },
    { step: 3, action: 'Notify Bank / CSC / Agriculture Officer', detail: 'Submit written loss intimation form with premium deduction receipt.' },
    { step: 4, action: 'Joint Loss Assessment Survey', detail: 'Insurance company must depute a surveyor within 48 hours of intimation.' }
  ];

  const evidenceChecklist = [
    'PMFBY premium deduction receipt or KCC passbook entry',
    'SMS ticket number from helpline 14447',
    'Geotagged photos showing standing/cut crop damage',
    'Land revenue record (7/12 extract, Khasra/Khatauni)'
  ];

  // 1. Enrollment check
  if (!enrolled) {
    return {
      status: FARMER_STATUS.NOT_ENROLLED,
      hoursLeft: 0,
      hoursElapsed: 0,
      urgency: 'INELIGIBLE',
      message: 'Farmer is not enrolled under PMFBY / KCC for the current season. Individual claim under PMFBY is not admissible.',
      fix: 'Apply for PMFBY coverage before seasonal cut-off date (Kharif: 31 July, Rabi: 31 Dec) or check state disaster relief SDRF/NDRF grants.',
      steps,
      evidenceChecklist
    };
  }

  // 2. Widespread area loss check
  if (perilType === PERIL_TYPES.WIDESPREAD_LOSS || perilType === 'widespread' || perilType.includes('widespread')) {
    return {
      status: FARMER_STATUS.WIDESPREAD_AREA_LOSS,
      hoursLeft: 0,
      hoursElapsed: 0,
      urgency: 'INFORMATIONAL',
      message: 'No individual intimation needed. Loss is assessed by State Govt via Crop Cutting Experiments (CCE) area yield approach. Check claim status on pmfby.gov.in.',
      fix: 'Track notified area indemnity and bank settlement on pmfby.gov.in or contact District Agriculture Officer.',
      steps: [
        { step: 1, action: 'Check Area Notification', detail: 'State Agriculture Dept conducts CCE crop cutting experiments.' },
        { step: 2, action: 'Track Portal', detail: 'Compensation is credited directly to Aadhaar-linked bank accounts.' }
      ],
      evidenceChecklist
    };
  }

  // 3. Post-harvest window check (strictly within 14 days of harvest)
  if (perilType === PERIL_TYPES.POST_HARVEST_RAIN && daysSinceHarvest !== null && daysSinceHarvest > 14) {
    return {
      status: FARMER_STATUS.POST_HARVEST_EXPIRED,
      hoursLeft: 0,
      hoursElapsed: daysSinceHarvest * 24,
      urgency: 'EXPIRED',
      message: 'Post-harvest PMFBY coverage strictly covers crops kept in cut-and-spread condition in the field up to 14 days from harvesting.',
      fix: 'Since crop was harvested >14 days ago, PMFBY post-harvest clause is not maintainable. Inquire about local Mandi or storage insurance.',
      steps,
      evidenceChecklist
    };
  }

  // 4. Calculate 72-hour window
  const eventTime = new Date(eventDateTime).getTime();
  const currentTime = new Date(nowDateTime).getTime();

  if (isNaN(eventTime)) {
    return {
      status: FARMER_STATUS.WITHIN_72H,
      hoursLeft: 72,
      hoursElapsed: 0,
      urgency: 'URGENT',
      message: 'Event date/time required. Standard 72-hour clock applies.',
      fix: 'Call 14447 immediately to log intimation with approximate calamity time.',
      steps,
      evidenceChecklist
    };
  }

  const hoursElapsed = Math.max(0, (currentTime - eventTime) / (1000 * 60 * 60));
  const hoursLeft = Math.max(0, 72 - hoursElapsed);

  if (hoursElapsed > 72) {
    return {
      status: FARMER_STATUS.WINDOW_EXPIRED,
      hoursLeft: 0,
      hoursElapsed: Math.round(hoursElapsed),
      urgency: 'EXPIRED',
      message: `Individual claim window (72 hours) likely missed (${Math.round(hoursElapsed)} hours elapsed). Still contact District Agriculture Officer or 14447, no promises.`,
      fix: 'Lodge intimation on 14447 and submit a written representation to the District Collector / Agriculture Officer explaining unavoidable delay.',
      steps,
      evidenceChecklist
    };
  }

  const roundedHoursLeft = Math.round(hoursLeft * 10) / 10;
  const urgency = roundedHoursLeft <= 24 ? 'CRITICAL' : 'URGENT';

  return {
    status: FARMER_STATUS.WITHIN_72H,
    hoursLeft: roundedHoursLeft,
    hoursElapsed: Math.round(hoursElapsed * 10) / 10,
    urgency,
    message: `${roundedHoursLeft} hours left of the mandatory 72-hour individual intimation window!`,
    fix: 'Call toll-free 14447 now to get SMS ticket number, then upload geotagged photos on Crop Insurance App.',
    steps,
    evidenceChecklist
  };
}
