# Rules: subsidy, sizing, cost and payback

All of these calculations live in code at `server/src/rules/`. The LLM never calculates them. Values come from `server/src/rules/config.ts`, and each value keeps its source so the app can show it.

Checked on 1 November 2026.

## 1. Source status
| Key | Source | Status |
|---|---|---|
| S1 | MNRE, *Guidelines for PM-Surya Ghar: Muft Bijli Yojana, Central Financial Assistance to Residential Consumers*, capex mode. [Copy hosted by Delhi government](https://solar.delhi.gov.in/public/assets/solar/PMSG_Guidelines_for_Residential_CFA_Capex_Mode.pdf) | Read directly |
| S2 | [Delhi Solar Portal: central subsidy](https://solar.delhi.gov.in/page/central-subsidy) | Read directly, updated 1 November 2026 |
| S3 | [GERC tariff schedule for DGVCL, MGVCL, PGVCL and UGVCL, effective 1 April 2026](https://gercin.org/viewdocument/dGFyaWZmc2NoZWR1bGVfcGRmXzE3ODYwOTcyMjFfNzk2NA==) | Read directly |
| S4 | [Mercom: MNRE amendments, 8 July 2025](https://www.mercomindia.com/mnre-revises-central-financial-assistance-norms-under-pm-surya-ghar-program) | Body is paywalled, so the amendment details are unknown |
| S5 | [SolarQuarter: scheme subsidy guidelines, 1 September 2026](https://solarquarter.com/2026/09/01/pm-surya-ghar-scheme-mnre-details-rooftop-solar-subsidy-guidelines-for-residential-consumers/) | Secondary source. Confirms the same rates and DCR rule |
| S6 | [CSE publication on rooftop generation](https://www.cseindia.org/content/downloadreports/13022) and [PIB document](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2022/apr/doc202242850101.pdf) | Summary only, via search results |

**Known gaps**
- The national portal and MNRE's own page could not be read, so S1 is a state-hosted copy.
- The July 2025 amendments could not be read. S2 and S5, both newer, still show the same rates, so we use them. Confirm with the organisers or the portal if time allows.
- The scheme's stated implementation period ends on 31 March 2027 (S1, section 2d). The app should show this date.

## 2. Central subsidy (CFA)
**Source:** S1 sections 5(e) and 5(h). Confirmed by S2 and S5.

Applies to a grid-connected rooftop system on a residential connection, in capex mode, using eligible modules.

| Capacity slice | Standard | Special category states and UTs |
|---|---|---|
| First 2 kW, or part | ₹30,000 per kW | ₹33,000 per kW |
| Third kW, or part | ₹18,000 per kW | ₹19,800 per kW |
| Beyond 3 kW | None | None |
| Maximum | ₹78,000 | ₹85,800 |

Gujarat uses the standard rates. Special category places are Uttarakhand, Himachal Pradesh, J&K, Ladakh, North Eastern states including Sikkim, and the UTs of Andaman & Nicobar and Lakshadweep (S1 section 5g).

```
subsidy(kW) =
  rate1 * min(kW, 2)
  + rate2 * clamp(kW - 2, 0, 1)
```

**Must pass these tests**
| Input | Expected | Origin |
|---|---|---|
| 1.5 kW, standard | ₹45,000 | S1 example i |
| 2.5 kW, standard | ₹69,000 | S1 example ii |
| 6 kW, standard | ₹78,000 | S1 example iii |
| 3 kW, special category | ₹85,800 | Calculated from S1 rates |
| 2.5 kW, DCR false | ₹0 | S1 section 5(m) |

## 3. Subsidy conditions shown to the household
| Rule | Source | App behaviour |
|---|---|---|
| Modules must be domestically manufactured using domestically manufactured cells. Any non-DCR module makes the installation ineligible | S1 5(m) | Each quote has a DCR field. Not confirmed means subsidy is "at risk" and the quote cannot be recommended |
| Subsidy depends on module DC capacity, not inverter size | S1 5(k) | Calculate from panel kW |
| Batteries and other additions do not change the subsidy | S1 5(l) | Calculate from panel kW only |
| Application goes through the National Portal with a valid consumer number | S1 6(a), 6(b) | Show as a next step |
| Installation is eligible only once, and relocated systems are not eligible | S1 5(o) | Show as a note |
| States may add their own subsidy | S1 5(i) | Excluded. Show "state subsidy not included" |

## 4. Sizing
### Scheme guidance
**Source:** S2.

| Average monthly use | Suitable capacity |
|---|---|
| 0 to 150 units | 1 to 2 kW |
| 150 to 300 units | 2 to 3 kW |
| Above 300 units | Above 3 kW |

### App method
1. `energyKw = monthlyUnits / unitsPerKwMonth`
2. `suggestedKw = round up to the nearest 0.5 kW`, minimum 1 kW.
3. `roofLimitKw = usableAreaSqM / sqMPerKw`, rounded down to the nearest 0.5 kW.
4. `finalKw = min(suggestedKw, roofLimitKw)`.
5. Show the scheme band from S2 beside the result. If different, explain why rather than hiding it.

The photo identifies obstructions only. The household confirms usable terrace area, and code uses that confirmed number.

## 5. Assumptions
These values are editable in config and are displayed in "How was this calculated?".

| Assumption | Value | Basis | Status |
|---|---|---|---|
| `unitsPerKwDay` | 4 | S6 reports about 4 to 5 per kW per day | Conservative estimate |
| Days per month | 30 | Simplification | Assumption |
| `unitsPerKwMonth` | 120 | 4 x 30 | Derived |
| `sqMPerKw` | 10 | Common planning figure | **Assumption, no official source found. Verify on site** |
| Net metering offsets used units 1:1 | Yes | Simplification | **Assumption. Rules are set by state regulators** |
| Panel output loss per year | 0% | Keeps simple payback simple | Assumption |
| Tariff growth | 0% | Conservative | Assumption |

## 6. Bill savings and payback
### Gujarat tariff
**Source:** S3, Rate RGP, post-paid, non-BPL.

| Monthly units | Energy charge |
|---|---|
| First 50 | ₹3.05 per unit |
| Next 50 | ₹3.50 per unit |
| Next 150 | ₹4.15 per unit |
| Above 250 | ₹5.20 per unit |

The tariff excludes electricity duty and FPPAS (S3). Savings leave these out, so they are understated. Fixed charges are not reduced. Other rates such as RGP (Rural), BPL, prepaid and smart-meter discounts are out of scope. Torrent Power areas of Ahmedabad and Surat use a different tariff, so the demo uses Vadodara.

### Formulas
```
energyCharge(units) = sum across the slabs above
generated            = kW * unitsPerKwMonth
remainingUnits       = max(monthlyUnits - generated, 0)
monthlySaving        = energyCharge(monthlyUnits) - energyCharge(remainingUnits)
yearlySaving         = monthlySaving * 12
subsidy              = dcrConfirmed ? subsidy(kW) : 0
amountYouPay         = quotePrice - subsidy
paybackYears         = amountYouPay / yearlySaving
```

Round rupees to whole numbers only for display. Payback is simple payback, labelled as an estimate, and excludes financing, maintenance and state subsidy.

## 7. Worked demo values
Input: 300 units a month, standard state, 2.5 kW.

**Energy charge:** (50 x 3.05) + (50 x 3.50) + (150 x 4.15) + (50 x 5.20) = 152.50 + 175 + 622.50 + 260 = **₹1,210 a month**

**Generated:** 2.5 x 120 = **300 units**, leaving 0 units charged for energy.

**Yearly saving:** 1,210 x 12 = **₹14,520**

**Size:** 300 / 120 = 2.5 kW, inside the S2 band of 2 to 3 kW.

| Quote | Price | DCR confirmed | Subsidy | You pay | Payback |
|---|---|---|---|---|---|
| A | ₹1,45,000 | Yes | ₹69,000 | ₹76,000 | 5.2 years |
| B, if eligible | ₹1,25,000 | Not stated | ₹69,000 at risk | ₹56,000 | 3.9 years |
| B, if not eligible | ₹1,25,000 | Not stated | ₹0 | ₹1,25,000 | 8.6 years |
| C | ₹1,60,000 | Yes | ₹69,000 | ₹91,000 | 6.3 years |

Show both Quote B cases. It demonstrates why a missing DCR detail matters.

## 8. Quote ranking
Ranking runs in code and uses only structured fields.

**Required items:** price, panel brand, panel watts, DCR confirmation, inverter brand, inverter warranty, panel warranty, install days.

**Not recommendable:** any required item missing, or DCR not confirmed.

**Score out of 100 for recommendable quotes**
| Part | Points | Calculation |
|---|---|---|
| Amount you pay | 50 | `50 * lowestAmount / amount` |
| Inverter warranty | 20 | `20 * min(years, 10) / 10` |
| Panel warranty | 10 | `10 * min(years, 25) / 25` |
| Speed | 20 | `20 * fastestDays / days` |

Demo result, comparing A and C:
- Quote A: 50 + 16 + 10 + 20 = **96**
- Quote C: 41.8 + 10 + 10 + 14 = **75.8**

Quote A wins. If no quote is recommendable, the app says so and lists what to ask for.

## 9. Benchmark comparison (stretch)
**Source:** S1 section 5(g). Benchmark is ₹50,000 per kW for the first 2 kW and ₹45,000 for the additional kW, set in February 2024.

For 2.5 kW, benchmark cost is ₹1,22,500. Show price as a percentage of this: A 118%, B 102%, C 131%. Label it "compared with the scheme's 2024 benchmark". It is not a market price or a fair-price ruling.
