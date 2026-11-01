/**
 * Layers 1 and 2 of docs/ARCHITECTURE.md section 7. Detection is for visibility only: ranking never
 * reads notes, so a phrase missed here still cannot change the recommendation.
 */

export interface ProcessedNotes {
  clean: string | null;
  flagged: boolean;
  reason: string | null;
  removedText: string | null;
}

const EMPTY: ProcessedNotes = { clean: null, flagged: false, reason: null, removedText: null };

const NAMED_ENTITIES: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(text: string): string {
  return text.replace(/&(?:#(\d{1,7})|#x([0-9a-f]{1,6})|(\w+));/gi, (match, decimal, hex, name) => {
    if (name) return NAMED_ENTITIES[name.toLowerCase()] ?? match;
    const code = decimal ? Number(decimal) : Number.parseInt(hex, 16);
    return code <= 0x10ffff ? String.fromCodePoint(code) : match;
  });
}

/** NFKC, then drops zero-width, bidi, tag, variation and control characters. */
function removeInvisible(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/[\p{Cf}\p{Cc}\u{FE00}-\u{FE0F}\u{E0100}-\u{E01EF}]/gu, '');
}

function stripHtml(text: string): string {
  let current = text;
  let previous: string;
  do {
    previous = current;
    current = current
      .replace(/<!--[\s\S]*?(?:-->|$)/g, ' ')
      .replace(/<(script|style)\b[\s\S]*?(?:<\/\1\s*>|$)/gi, ' ')
      .replace(/<\/?[a-z!][^>]*(?:>|$)/gi, ' ');
  } while (current !== previous);
  return current;
}

const collapse = (text: string) => text.replace(/\s+/g, ' ').trim();

const LOOKALIKES: Record<string, string> = {
  а: 'a',
  е: 'e',
  і: 'i',
  о: 'o',
  р: 'p',
  с: 'c',
  у: 'y',
  х: 'x',
  ѕ: 's',
  ј: 'j',
  α: 'a',
  ε: 'e',
  ι: 'i',
  ο: 'o',
  ρ: 'p',
  τ: 't',
  ν: 'v',
};
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };

function canonical(text: string): string {
  return text
    .toLowerCase()
    .replace(/[аеіорсухѕјαειορτν]/g, (letter) => LOOKALIKES[letter] ?? letter)
    .replace(/(?<=\p{L})[013457@$]|[013457@$](?=\p{L})/gu, (digit) => LEET[digit] ?? digit)
    .replace(/[़઼]/g, '');
}

interface Rule {
  reason: string;
  pattern: RegExp;
}

const IGNORE_RULES = 'Tried to make the AI ignore its instructions';
const CHANGE_RANKING = 'Tried to change the ranking';
const ROLE_MARKER = 'Pretended to be a system message';

const NOUN = '(?:instruction|rule|prompt|direction|guideline|command|message|context)';
const THING = '(?:vendor|quote|company|offer|bid|supplier)';

/** Matched against text with all spaces and punctuation removed, which defeats spacing tricks. */
const SQUEEZED_RULES: Rule[] = [
  {
    reason: IGNORE_RULES,
    pattern: new RegExp(
      `(?:ignore|disregard|forget|override|bypass)(?:all|any|every|the|your|these|those|of|my)*` +
        `(?:(?:previous|prior|above|earlier|preceding|former|original|system)${NOUN}|above|instruction|prompt|guideline|scoringrule|rankingrule)`,
      'u',
    ),
  },
  { reason: IGNORE_RULES, pattern: /newinstructions|systemprompt|developermessage|jailbreak/u },
  {
    reason: CHANGE_RANKING,
    pattern: new RegExp(
      `rank(?:this|our|my|the)?(?:${THING}|us|me|it)?(?:as|at|in)?(?:the)?(?:first|top|highest|best|numberone|number1|1st|#?1)`,
      'u',
    ),
  },
  {
    reason: CHANGE_RANKING,
    pattern: new RegExp(
      `(?:put|place|list|keep|move|mark|show)(?:this|our|my|the)${THING}(?:at|on|as|in)?(?:the)?(?:first|top|highest|numberone|number1)`,
      'u',
    ),
  },
  {
    reason: CHANGE_RANKING,
    pattern: new RegExp(
      `(?:must|always|only|should)(?:recommend|select|choose|pick)(?:this|our|my|the)?${THING}` +
        `|(?:recommend|select|choose|pick)(?:this|our|my)${THING}(?:first|only|regardless|overothers|aboveothers)`,
      'u',
    ),
  },
  {
    reason: CHANGE_RANKING,
    pattern: new RegExp(
      `give(?:this|our|my|the)?(?:${THING}|us|me)?(?:the)?(?:highest|top|maximum|max|full|best)(?:score|rank|ranking|rating|points)`,
      'u',
    ),
  },
  // Hindi, in Devanagari and in Latin letters.
  {
    reason: IGNORE_RULES,
    pattern:
      /(?:निर्देश|आदेश|नियम|हिदायत|इंस्ट्रक्शन).{0,20}?(?:अनदेखा|नजरअंदाज|भूल|इग्नोर|मतमान)|(?:अनदेखा|नजरअंदाज|भूल|इग्नोर).{0,20}?(?:निर्देश|आदेश|हिदायत|इंस्ट्रक्शन)/u,
  },
  {
    reason: IGNORE_RULES,
    pattern: /(?:nirdesh|hidayat|niyam|instruction)(?:on|o)?(?:ko)?(?:ignore|bhool|bhul|nazarandaz|najarandaz|andekha)/u,
  },
  {
    reason: CHANGE_RANKING,
    pattern:
      /(?:इस|इसी|हमारे|हमारी|मेरे|मेरी)(?:विक्रेता|वेंडर|कंपनी|कोटेशन|कोट|दुकानदार).{0,12}?(?:पहले|प्रथम|सबसेऊपर|सबसेऊंचा|नंबरएक|नंबर1|टॉप|सर्वोच्च).{0,12}?(?:रखो|रखें|रखिए|करो|करें|दो|दें|बताओ|बताएं|बनाओ|बनाएं|चुनो|चुनें)/u,
  },
  {
    reason: CHANGE_RANKING,
    pattern: /(?:vendor|quote|company)ko(?:pehle|pahle|sabseupar|numberek|number1|top)(?:rakho|rakhen|karo|karen|do|batao)/u,
  },
  { reason: IGNORE_RULES, pattern: /सिस्टमप्रॉम्प्ट/u },
  // Gujarati.
  {
    reason: IGNORE_RULES,
    pattern:
      /(?:સૂચના|સુચના|આદેશ|નિયમ|ઇન્સ્ટ્રક્શન).{0,20}?(?:અવગણ|ભૂલી|ભુલી|ઇગ્નોર|નમાન)|(?:અવગણ|ભૂલી|ઇગ્નોર).{0,20}?(?:સૂચના|સુચના|આદેશ)/u,
  },
  {
    reason: CHANGE_RANKING,
    pattern:
      /(?:આ|અમારા|અમારી|મારા|મારી)(?:વિક્રેતા|વેન્ડર|કંપની|ક્વોટેશન|ક્વોટ).{0,12}?(?:પ્રથમ|પહેલા|પહેલું|પહેલો|ટોચ|ટોપ|સૌથીઉપર|નંબરએક|નંબર1).{0,12}?(?:રાખો|રાખજો|મૂકો|કરો|બતાવો|આપો|પસંદ)/u,
  },
  { reason: IGNORE_RULES, pattern: /સિસ્ટમપ્રોમ્પ્ટ/u },
];

/**
 * Matched against text with spacing kept, because these need word boundaries. "system:" only counts
 * as its own label: "Solar system: 2.5 kW" stays clean.
 */
const SPACED_RULES: Rule[] = [
  { reason: ROLE_MARKER, pattern: /(?:^|[.!?\]|>#] ?)(?:system|assistant|developer|सिस्टम|સિસ્ટમ) ?:(?! ?\d)/u },
  { reason: ROLE_MARKER, pattern: /\[\/?inst\]|<\|?im_start\|?>|<<sys>>/u },
  { reason: IGNORE_RULES, pattern: /\b(?:you are now|as an ai|language model)\b/u },
];

/** Joins runs of single letters, so "s y s t e m :" reads as "system:". */
const joinSingleLetters = (text: string) =>
  text.replace(/(?<![\p{L}\p{M}])(?:\p{L}\p{M}* ){2,}\p{L}\p{M}*(?![\p{L}\p{M}])/gu, (run) => run.replaceAll(' ', ''));

function detect(text: string): string | null {
  const base = canonical(text);
  const squeezed = base.replace(/[^\p{L}\p{M}\p{N}#]/gu, '');
  const spaced = joinSingleLetters(collapse(base.replace(/[^\p{L}\p{M}\p{N}:#|<>[\]/_!?.]/gu, ' ')));
  const hit =
    SQUEEZED_RULES.find((rule) => rule.pattern.test(squeezed)) ??
    SPACED_RULES.find((rule) => rule.pattern.test(spaced));
  return hit?.reason ?? null;
}

export function processVendorNotes(raw: string | null): ProcessedNotes {
  if (!raw) return EMPTY;

  const decoded = removeInvisible(decodeEntities(decodeEntities(removeInvisible(raw))));
  const visible = collapse(stripHtml(decoded));
  // The markup is checked too: instructions can hide in comments and attributes.
  const reason = detect(visible) ?? detect(decoded);

  if (reason !== null) {
    return { clean: null, flagged: true, reason, removedText: visible || collapse(decoded) };
  }
  return visible ? { clean: visible, flagged: false, reason: null, removedText: null } : EMPTY;
}
