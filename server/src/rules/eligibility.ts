import type { EligibilityBody, EligibilityResult } from '../../../shared/api.js';

/**
 * Quick household check against the scheme's applicant rules (docs/RULES.md section 10, source S7).
 * It is a guide only: the National Portal and the electricity company decide. Nothing is stored.
 */

const CONNECTION_REASONS: Record<Exclude<EligibilityBody['connection'], 'residential'>, string> = {
  commercial: 'Shop and office connections do not get the household subsidy. It is only for homes.',
  industrial: 'Factory connections do not get the household subsidy. It is only for homes.',
  none: 'You need a home electricity connection, linked to your local electricity company (DISCOM).',
};

/** The official steps after this check, in order. S7. */
export const NEXT_STEPS = [
  'Register on the PM Surya Ghar National Portal with your state, electricity company (DISCOM), consumer number and mobile number.',
  'Apply for a rooftop solar system and wait for your electricity company to approve that it can be connected.',
  'Choose a vendor that is registered on the portal and get the system installed.',
  'Apply for the net meter.',
  'Your electricity company inspects the system and switches it on.',
  'Give your bank details and a cancelled cheque on the portal to receive the subsidy.',
];

export function checkEligibility(answers: EligibilityBody): EligibilityResult {
  const reasons: string[] = [];
  if (!answers.isIndianCitizen) reasons.push('The scheme is only for Indian citizens.');
  if (answers.connection !== 'residential') reasons.push(CONNECTION_REASONS[answers.connection]);
  if (!answers.gridConnected) {
    reasons.push('The subsidy is only for rooftop systems connected to the electricity grid, not for systems that run alone.');
  }
  if (answers.receivedSubsidyBefore) {
    reasons.push('A home can receive the central subsidy only once, and this one has already had it.');
  }
  return reasons.length === 0
    ? { status: 'likely_eligible', reasons: [], nextSteps: NEXT_STEPS }
    : { status: 'not_eligible', reasons, nextSteps: [] };
}
