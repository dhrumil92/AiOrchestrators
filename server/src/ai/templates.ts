import type { Language } from '../../../shared/api.js';
import type { ComparisonFact, EstimateFacts } from './types.js';

/** Built-in explanations, written from code-calculated facts only. Used when AI is unavailable. */

const rupees = (value: number) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(value))}`;

/** Rules return exact years. Show one decimal, as the comparison screen does: 5.2. */
export const roundYears = (years: number) => Math.round(years * 10) / 10;

/** Comparisons among complete quotes, worked out here so the wording never has to guess. */
export function highlightsFor(chosen: ComparisonFact, quotes: readonly ComparisonFact[]) {
  const complete = quotes.filter((quote) => quote.recommendable);
  const best = (read: (quote: ComparisonFact) => number | null, pick: (...values: number[]) => number) => {
    const values = complete.map(read).filter((value): value is number => value !== null);
    const mine = read(chosen);
    return values.length > 1 && mine !== null && mine === pick(...values);
  };
  return {
    lowestCost: best((quote) => quote.amountYouPayRupees, Math.min),
    longestInverterWarranty: best((quote) => quote.inverterWarrantyYears, Math.max),
    quickestInstall: best((quote) => quote.installDays, Math.min),
  };
}

const ITEM_LABELS: Record<Exclude<Language, 'en'>, Record<string, string>> = {
  hi: {
    price: 'कीमत',
    'panel brand': 'पैनल का ब्रांड',
    'panel watts': 'पैनल के वॉट',
    'made-in-India panel confirmation': 'सब्सिडी के योग्य मेड-इन-इंडिया पैनल की पुष्टि',
    'inverter brand': 'इन्वर्टर का ब्रांड',
    'inverter warranty': 'इन्वर्टर की वारंटी',
    'panel warranty': 'पैनल की वारंटी',
    'install time': 'लगाने का समय',
  },
  gu: {
    price: 'કિંમત',
    'panel brand': 'પેનલની બ્રાન્ડ',
    'panel watts': 'પેનલના વોટ',
    'made-in-India panel confirmation': 'સબસિડી માટે પાત્ર મેડ-ઇન-ઇન્ડિયા પેનલની ખાતરી',
    'inverter brand': 'ઇન્વર્ટરની બ્રાન્ડ',
    'inverter warranty': 'ઇન્વર્ટરની વોરંટી',
    'panel warranty': 'પેનલની વોરંટી',
    'install time': 'લગાવવાનો સમય',
  },
};

function itemList(items: readonly string[], language: Language) {
  if (language === 'en') return items.join(', ');
  return items.map((item) => ITEM_LABELS[language][item] ?? item).join(', ');
}

interface Wording {
  plan(kw: number, generated: number, used: number): string;
  money(subsidy: string, saving: string): string;
  roofLimit: string;
  estimateNote: string;
  someVendor: string;
  suggest(vendor: string): string;
  youPay(amount: string): string;
  moneyBack(years: number): string;
  inverterWarranty(years: number): string;
  panelWarranty(years: number): string;
  installTime(days: number): string;
  lowestCost: string;
  longestInverterWarranty: string;
  quickestInstall: string;
  subsidyAtRisk: string;
  hiddenInstructions: string;
  fixedRules: string;
  cannotSuggest: string;
  noQuotes: string;
  askAbout(vendor: string, items: string): string;
  askGeneral: string;
}

const WORDING: Record<Language, Wording> = {
  en: {
    plan: (kw, generated, used) =>
      `A ${kw} kW system could cover about ${generated} units (kWh), as shown on your bill, a month. Your home uses about ${used} units a month.`,
    money: (subsidy, saving) => `Government subsidy: ${subsidy}. Estimated yearly bill saving: ${saving}.`,
    roofLimit: 'This size is limited by the space on your terrace.',
    estimateNote: 'This is an estimate. A site visit is still needed.',
    someVendor: 'this vendor',
    suggest: (vendor) => `We suggest ${vendor}.`,
    youPay: (amount) => `You pay ${amount} after subsidy.`,
    moneyBack: (years) => `Money back in about ${years} years.`,
    inverterWarranty: (years) => `Inverter warranty: ${years} years.`,
    panelWarranty: (years) => `Panel warranty: ${years} years.`,
    installTime: (days) => `Install time: ${days} days.`,
    lowestCost: 'Lowest cost among complete quotes.',
    longestInverterWarranty: 'Longest inverter warranty among complete quotes.',
    quickestInstall: 'Quickest install among complete quotes.',
    subsidyAtRisk: 'Subsidy at risk: made-in-India panels not confirmed.',
    hiddenInstructions: 'One quote contained hidden instructions. We ignored them.',
    fixedRules: 'This choice comes from fixed scoring rules.',
    cannotSuggest: 'We cannot suggest a quote yet, because each one needs more information.',
    noQuotes: 'There are no quotes to compare yet.',
    askAbout: (vendor, items) => `${vendor}: ask about ${items}.`,
    askGeneral: 'Please ask the vendors for complete quotes.',
  },
  hi: {
    plan: (kw, generated, used) =>
      `${kw} kW का सिस्टम हर महीने लगभग ${generated} यूनिट बिजली बना सकता है। आपके घर में हर महीने लगभग ${used} यूनिट की खपत होती है।`,
    money: (subsidy, saving) => `सरकारी सब्सिडी: ${subsidy}। अनुमानित सालाना बिजली बिल बचत: ${saving}।`,
    roofLimit: 'यह आकार आपकी छत की जगह के कारण सीमित है।',
    estimateNote: 'यह एक अनुमान है। साइट विज़िट अभी भी ज़रूरी है।',
    someVendor: 'यह विक्रेता',
    suggest: (vendor) => `हमारा सुझाव: ${vendor}।`,
    youPay: (amount) => `सब्सिडी के बाद आप ${amount} देंगे।`,
    moneyBack: (years) => `लगभग ${years} साल में पैसा वापस।`,
    inverterWarranty: (years) => `इन्वर्टर की वारंटी: ${years} साल।`,
    panelWarranty: (years) => `पैनल की वारंटी: ${years} साल।`,
    installTime: (days) => `लगाने का समय: ${days} दिन।`,
    lowestCost: 'पूरे कोटेशन में सबसे कम खर्च।',
    longestInverterWarranty: 'पूरे कोटेशन में इन्वर्टर की सबसे लंबी वारंटी।',
    quickestInstall: 'पूरे कोटेशन में सबसे जल्दी लगाया जाएगा।',
    subsidyAtRisk: 'सब्सिडी जोखिम में: मेड-इन-इंडिया पैनल की पुष्टि नहीं हुई है।',
    hiddenInstructions: 'एक कोटेशन में छिपे हुए निर्देश थे। हमने उन्हें नहीं माना।',
    fixedRules: 'यह चुनाव तय स्कोरिंग नियमों से हुआ है।',
    cannotSuggest: 'हम अभी कोई कोटेशन नहीं सुझा सकते, क्योंकि हर कोटेशन में कुछ जानकारी बाकी है।',
    noQuotes: 'अभी तुलना के लिए कोई कोटेशन नहीं है।',
    askAbout: (vendor, items) => `${vendor}: इनके बारे में पूछें: ${items}।`,
    askGeneral: 'कृपया विक्रेताओं से पूरा कोटेशन माँगें।',
  },
  gu: {
    plan: (kw, generated, used) =>
      `${kw} kW ની સિસ્ટમ દર મહિને આશરે ${generated} યુનિટ વીજળી બનાવી શકે છે. તમારા ઘરમાં દર મહિને આશરે ${used} યુનિટ વપરાય છે.`,
    money: (subsidy, saving) => `સરકારી સબસિડી: ${subsidy}. અંદાજિત વાર્ષિક વીજળી બિલ બચત: ${saving}.`,
    roofLimit: 'આ કદ તમારી અગાશીની જગ્યાને કારણે મર્યાદિત છે.',
    estimateNote: 'આ એક અંદાજ છે. સાઇટ મુલાકાત હજુ પણ જરૂરી છે.',
    someVendor: 'આ વિક્રેતા',
    suggest: (vendor) => `અમારું સૂચન: ${vendor}.`,
    youPay: (amount) => `સબસિડી પછી તમે ${amount} ચૂકવશો.`,
    moneyBack: (years) => `આશરે ${years} વર્ષમાં પૈસા પાછા.`,
    inverterWarranty: (years) => `ઇન્વર્ટરની વોરંટી: ${years} વર્ષ.`,
    panelWarranty: (years) => `પેનલની વોરંટી: ${years} વર્ષ.`,
    installTime: (days) => `લગાવવાનો સમય: ${days} દિવસ.`,
    lowestCost: 'પૂર્ણ ક્વોટેશનમાં સૌથી ઓછો ખર્ચ.',
    longestInverterWarranty: 'પૂર્ણ ક્વોટેશનમાં ઇન્વર્ટરની સૌથી લાંબી વોરંટી.',
    quickestInstall: 'પૂર્ણ ક્વોટેશનમાં સૌથી ઝડપી લગાવવાનું કામ.',
    subsidyAtRisk: 'સબસિડી જોખમમાં: મેડ-ઇન-ઇન્ડિયા પેનલની ખાતરી થઈ નથી.',
    hiddenInstructions: 'એક ક્વોટેશનમાં છુપી સૂચનાઓ હતી. અમે તેને અવગણી.',
    fixedRules: 'આ પસંદગી નક્કી કરેલા સ્કોરિંગ નિયમોથી થઈ છે.',
    cannotSuggest: 'અમે હમણાં કોઈ ક્વોટેશન સૂચવી શકતા નથી, કારણ કે દરેકમાં થોડી માહિતી બાકી છે.',
    noQuotes: 'હમણાં સરખામણી માટે કોઈ ક્વોટેશન નથી.',
    askAbout: (vendor, items) => `${vendor}: આ વિશે પૂછો: ${items}.`,
    askGeneral: 'કૃપા કરીને વિક્રેતાઓ પાસેથી પૂર્ણ ક્વોટેશન માંગો.',
  },
};

export function estimateTemplate(facts: EstimateFacts, language: Language): string {
  const words = WORDING[language];
  return [
    words.plan(facts.suggestedKw, Math.round(facts.monthlyGenerationUnits), Math.round(facts.monthlyUnits)),
    words.money(rupees(facts.subsidyRupees), rupees(facts.yearlySavingRupees)),
    facts.limitedByRoof ? words.roofLimit : null,
    words.estimateNote,
  ]
    .filter((line) => line !== null)
    .join(' ');
}

export function recommendationTemplate(
  chosen: ComparisonFact,
  chosenName: string | null,
  quotes: readonly ComparisonFact[],
  language: Language,
): string[] {
  const words = WORDING[language];
  const highlights = highlightsFor(chosen, quotes);
  const join = (lines: (string | null)[]) => lines.filter((line) => line !== null).join(' ');

  return [
    join([
      words.suggest(chosenName ?? words.someVendor),
      chosen.amountYouPayRupees === null ? null : words.youPay(rupees(chosen.amountYouPayRupees)),
      chosen.paybackYears === null ? null : words.moneyBack(roundYears(chosen.paybackYears)),
      highlights.lowestCost ? words.lowestCost : null,
    ]),
    join([
      highlights.longestInverterWarranty ? words.longestInverterWarranty : null,
      chosen.inverterWarrantyYears === null ? null : words.inverterWarranty(chosen.inverterWarrantyYears),
      chosen.panelWarrantyYears === null ? null : words.panelWarranty(chosen.panelWarrantyYears),
      highlights.quickestInstall ? words.quickestInstall : null,
      chosen.installDays === null ? null : words.installTime(chosen.installDays),
    ]),
    join([
      chosen.subsidyAtRisk ? words.subsidyAtRisk : null,
      quotes.some((quote) => quote.injectionFlagged) ? words.hiddenInstructions : null,
    ]),
    words.fixedRules,
  ].filter((line) => line !== '');
}

export function noRecommendationTemplate(
  quotes: readonly { vendorName: string; missingItems: string[] }[],
  language: Language,
): string[] {
  const words = WORDING[language];
  if (quotes.length === 0) return [words.noQuotes];
  const asks = quotes
    .filter((quote) => quote.missingItems.length > 0)
    .map((quote) => words.askAbout(quote.vendorName, itemList(quote.missingItems, language)));
  return [words.cannotSuggest, ...(asks.length > 0 ? asks : [words.askGeneral])];
}
