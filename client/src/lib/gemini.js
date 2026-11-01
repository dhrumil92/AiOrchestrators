// Google Gemini, called directly from the browser with the user's own API key.
// gemini-1.5-* models are retired: try the "latest Flash" alias, then pinned fallbacks.
const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];
let workingModel = null;

export async function geminiGenerate(apiKey, contents) {
  const models = workingModel ? [workingModel, ...GEMINI_MODELS.filter(m => m !== workingModel)] : GEMINI_MODELS;
  let lastErr = null;
  for (const model of models) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && !data.error) {
      workingModel = model;
      return (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('') || 'No response received.';
    }
    lastErr = new Error(data.error?.message || 'HTTP ' + res.status);
    if (!(res.status === 404 || /not found|not supported|deprecated/i.test(lastErr.message))) throw lastErr;
  }
  throw lastErr;
}

export function promptParts(prompt, imageBase64, mimeType = 'image/jpeg') {
  const parts = [];
  if (imageBase64) parts.push({ inline_data: { mime_type: mimeType, data: imageBase64 } });
  parts.push({ text: prompt });
  return [{ parts }];
}

export const SYSTEM_CONTEXT = `You are SuryaBot, a helpful AI assistant for PM Surya Ghar Muft Bijli Yojana (India's rooftop solar scheme launched in 2024). You help households understand rooftop solar installation, government subsidies, vendor selection, and net metering.

Key facts you know:
- The scheme targets 1 crore (10 million) rooftop solar installations
- Subsidy: ₹30,000 for 1kW, ₹60,000 for 2kW, ₹78,000 for 3kW and above (maximum)
- Typical 3kW system: 6 panels of 500W, costs ₹1.5-2.5 lakhs before subsidy
- Net metering: excess solar power sold back to the electricity grid
- Average solar irradiance in India: 4-6 kWh/m²/day
- Panel life: 25 years, inverter life: 10-15 years
- Apply at pmsuryaghar.gov.in with Discom registration
- Popular panel brands in India: Waaree, Adani Solar, Vikram Solar, Tata Power Solar, Loom Solar
- Popular inverter brands: Havells, SolarEdge, Growatt, Solis, Fronius
- Typical payback period after subsidy: about 2-4 years, depending on tariff, location and system size

Always respond in a helpful, friendly manner. Be specific with numbers. Use ₹ for monetary values. Respond in English (or Hindi if the user writes in Hindi).`;

export const voicePrompt = transcript => `Extract solar requirement form fields from this speech transcript: "${transcript}"

Return ONLY valid JSON (no markdown, no explanation):
{
  "name": "full name or null",
  "phone": "phone number digits only or null",
  "address": "full address or null",
  "monthlyBill": numeric_value_or_null,
  "budget": numeric_value_or_null,
  "roofArea": numeric_value_or_null
}

Rules:
- For monetary values, convert words: "1 lakh" = 100000, "50 thousand" = 50000, "2000 rupees" = 2000
- Extract only what is clearly mentioned
- Use null for anything not mentioned`;

export const PHOTO_PROMPT = `You are an expert solar installation consultant. Analyze this rooftop/terrace photo for solar panel installation potential.

Please provide a detailed assessment covering:

**1. Available Clear Area**
- Estimate usable area for solar panels (in sq ft)
- Note any unused or problematic sections

**2. Obstructions Identified**
- List all visible obstructions (water tanks, overhead tanks, staircase rooms, AC outdoor units, chimneys, satellite dishes, parapets, etc.)
- Estimate how much area each obstruction affects

**3. Roof Characteristics**
- Roof type (flat/sloped) and orientation
- Slope angle if visible
- Material (RCC/metal/asbestos etc.)

**4. Shadow & Shading Analysis**
- Potential shadow sources (adjacent buildings, trees, structures)
- Time of day when shading might occur
- Impact on solar generation

**5. Solar Installation Recommendation**
- Recommended panel placement areas
- Estimated number of panels that can fit (using standard 500W panels, 2m×1m each)
- Any structural concerns

**6. Overall Solar Potential Rating**
Rate as: ⭐⭐⭐⭐⭐ Excellent / ⭐⭐⭐⭐ Good / ⭐⭐⭐ Fair / ⭐⭐ Limited / ⭐ Poor

Be specific, practical, and helpful for an Indian household considering PM Surya Ghar scheme.`;

export const sizePrompt = req => `You are a solar energy expert helping an Indian household under PM Surya Ghar Muft Bijli Yojana.

**Household Details:**
- Monthly electricity bill: ₹${req.monthlyBill}
- Budget: ₹${req.budget}
- Roof area available: ${req.roofArea || 'not specified'} sq ft
- Location: ${req.address}

**Please calculate and present:**

## 1. Current Consumption Analysis
- Estimated monthly consumption in kWh (assume ₹8/kWh average tariff)
- Consumption category (low/medium/high)

## 2. Recommended Solar System
- Optimal system size in kW
- Number of panels needed (using 500W panels)
- Expected monthly solar generation (kWh)
- Percentage of bill that will be offset

## 3. PM Surya Ghar Subsidy
- Applicable subsidy amount (₹30,000/kW for 1kW, ₹60,000 for 2kW, ₹78,000 for 3kW+, max ₹78,000)
- Subsidy eligibility confirmation

## 4. Cost & Payback Analysis
- Estimated total system cost (₹55,000/kW installed)
- Cost after subsidy
- Monthly savings (₹8/kWh × units generated)
- Net metering credit if excess generated
- Payback period (years)
- 25-year total savings estimate

## 5. Budget Fit
- Does the budget cover the recommended system? 
- If not, suggest the largest system within budget
- Any financing options to mention

## 6. Next Steps
- 3 specific action items for this household

Format with clear headers, numbers, and ₹ symbols. Be precise and helpful.`;

export function comparePrompt(req, quotes) {
  const quotesText = quotes.map((q, i) => {
    const kw = ((q.panelWatts * q.numPanels) / 1000).toFixed(2);
    return `**Quote ${i + 1} — ${q.vendorName}:**
- Price: ₹${q.price.toLocaleString()}
- System: ${q.numPanels} × ${q.panelBrand} ${q.panelWatts}W panels = ${kw}kW
- Inverter: ${q.inverterBrand} (${q.inverterType})
- Warranty: ${q.warranty} years
- Timeline: ${q.timeline}
- Notes: ${q.notes || 'None'}`;
  }).join('\n\n');
  return `You are a trusted solar advisor helping an Indian household choose the best rooftop solar vendor under PM Surya Ghar Muft Bijli Yojana.

**Household Requirement:**
- Address: ${req.address}
- Monthly bill: ₹${req.monthlyBill}
- Budget: ₹${req.budget}
- Roof area: ${req.roofArea || 'not specified'} sq ft

**Vendor Quotes Received:**
${quotesText}

**Your Analysis Should Cover:**

## 1. Quote Summary Table
Create a comparison table with: Vendor | System Size | Price | Price/kW | Warranty | Timeline

## 2. Value Analysis
- Price per kW for each quote (lower is better)
- System size adequacy for the monthly bill
- Which quote offers best value for money?

## 3. Red Flags & Concerns
- Flag unusually high or low prices (market rate: ₹50,000-70,000/kW installed)
- Missing or inadequate warranty
- Suspicious panel/inverter brands
- Unrealistic timelines

## 4. Missing Information
- What important details did each vendor not mention?
- What questions should the customer ask?

## 5. Subsidy Impact
- Calculate PM Surya Ghar subsidy for each system size
- Net cost after subsidy for each quote

## 6. Final Recommendation
**Winner: [Vendor Name]** — with 4-5 specific reasons why.
Also mention which quote is the runner-up and why.

Be direct, honest, and practical. The household's money is at stake!`;
}

export function reportPrompt(req, quotes) {
  const quoteSummary = quotes.length > 0
    ? quotes.map(q => `${q.vendorName}: ₹${q.price.toLocaleString()} for ${((q.panelWatts * q.numPanels) / 1000).toFixed(1)}kW (${q.inverterType}, ${q.warranty}yr warranty)`).join('; ')
    : 'No quotes received yet';
  return `Generate a comprehensive solar advisory report for an Indian household under PM Surya Ghar Muft Bijli Yojana.

**Property Details:**
- Address: ${req.address}
- Monthly electricity bill: ₹${req.monthlyBill}
- Budget: ₹${req.budget}
- Roof area: ${req.roofArea || 'unknown'} sq ft
- Photo available: ${req.photo ? 'Yes' : 'No'}
- Quotes received: ${quotes.length > 0 ? quotes.length : 'None yet'}
${quotes.length > 0 ? `- Quote summary: ${quoteSummary}` : ''}

Create a well-structured report with:

# ☀️ Solar Advisory Report

## Executive Summary (2-3 sentences)

## Recommended System Size
(Based on bill and roof area)

## PM Surya Ghar Subsidy
(Exact amounts for recommended system)

## Cost Breakdown
(Gross cost, subsidy, net cost, EMI options)

## Expected Benefits
(Monthly savings, payback period, 25-year savings, CO2 offset)

## ${quotes.length > 0 ? 'Quote Analysis & Recommendation' : 'Getting Quotes — What to Look For'}
${quotes.length > 0 ? '(Compare quotes and recommend best vendor)' : '(What to ask vendors, red flags to watch)'}

## Application Process
(Step-by-step for PM Surya Ghar application)

## Key Risks & Mitigation
(Monsoon, shade, maintenance)

## Conclusion & Next Steps

Be specific with numbers. Use ₹ for all monetary values.`;
}

export function quotePrompt(req, quote, subsidy) {
  const kw = ((quote.panelWatts * quote.numPanels) / 1000).toFixed(2);
  const pricePerKw = (quote.price / parseFloat(kw)).toFixed(0);
  return `Analyze this specific solar quote for an Indian household:

**Household:** Monthly bill ₹${req.monthlyBill}, Budget ₹${req.budget}, Address: ${req.address}

**Quote Details:**
- Vendor: ${quote.vendorName} (${quote.vendorPhone})
- Total Price: ₹${quote.price.toLocaleString()}
- System: ${quote.numPanels} × ${quote.panelBrand} ${quote.panelWatts}W = ${kw}kW
- Price per kW: ₹${pricePerKw}
- Inverter: ${quote.inverterBrand} (${quote.inverterType})
- Warranty: ${quote.warranty} years
- Timeline: ${quote.timeline}
- PM Surya Ghar Subsidy applicable: ₹${subsidy.toLocaleString()}
- Net cost after subsidy: ₹${Math.max(0, quote.price - subsidy).toLocaleString()}
- Additional notes: ${quote.notes || 'None'}

**Please assess:**
1. Is the price fair? (Market rate: ₹50,000–70,000/kW installed)
2. Is the system size adequate for this household's bill?
3. Are ${quote.panelBrand} panels reputable? Any concerns?
4. Is ${quote.inverterBrand} a trusted brand?
5. Is ${quote.warranty}-year warranty adequate? (Standard is 25yr panel, 5yr inverter)
6. Is the timeline realistic?
7. What's missing from this quote?
8. What questions to ask this vendor?
9. Overall verdict: Accept / Negotiate / Avoid?

Be direct and helpful.`;
}
