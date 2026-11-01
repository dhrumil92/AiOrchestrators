// Turns a voice result from the server into form values and review notes.
// Nothing here talks to the server: a voice result only fills the form. The household reviews it
// and posts the request with the normal submit button.

const ROOF_TYPES = { flat: 'Flat roof', sloped: 'Sloped roof', sheet: 'Sheet roof' };
const FIELD_LABELS = {
  monthlyUnits: 'monthly units',
  roofArea: 'terrace area',
  location: 'address',
  budget: 'budget',
  preferredKw: 'solar size (kW)',
};
// Which form field each voice field fills.
const FORM_KEY = { monthlyUnits: 'units', roofArea: 'area', location: 'address', budget: 'budget' };

const label = name => FIELD_LABELS[name] ?? name;

/**
 * Returns the form with spoken values filled in, and the form keys that came from voice.
 * Values that were not said never clear what is already typed. A typed address is kept.
 */
export function applyVoiceFields(form, fields) {
  const next = { ...form };
  const voiced = [];
  const put = (key, value) => { next[key] = String(value); voiced.push(key); };
  if (fields.monthlyUnits != null) put('units', fields.monthlyUnits);
  if (fields.budgetRupees != null) put('budget', fields.budgetRupees);
  if (fields.roofAreaSqm != null) put('area', fields.roofAreaSqm);
  if (fields.location && !form.address.trim()) put('address', fields.location);
  return { form: next, voiced };
}

/** What to show the household after a recording: what to check, what is missing, what else was heard. */
export function describeVoice(result) {
  const { fields } = result;
  const extras = [];
  if (fields.preferredKw != null) extras.push(['Solar size you asked for', `${fields.preferredKw} kW`]);
  if (fields.roofType) extras.push(['Roof type', ROOF_TYPES[fields.roofType]]);
  if (fields.obstructions.length) extras.push(['On the roof', fields.obstructions.join(', ')]);
  if (fields.additionalRequirements.length) extras.push(['Other wishes', fields.additionalRequirements.join('; ')]);
  return {
    unclear: result.unclearFields.map(label),
    missing: result.missingFields.filter(name => name !== 'preferredKw').map(label),
    extras,
    // Form keys the household should double-check because the speech was unclear.
    confirmKeys: result.unclearFields.map(name => FORM_KEY[name]).filter(Boolean),
  };
}

/** The sentence shown after a recording is processed. */
export function voiceSummary(result, voicedCount) {
  if (!result.transcript) return { text: 'We could not hear that. Please try again or type.', kind: 'error' };
  if (voicedCount) return { text: 'Form filled from your voice. Please check every value, then post.', kind: 'success' };
  return { text: 'We heard you, but found nothing to fill in. Please type the details.', kind: 'info' };
}
