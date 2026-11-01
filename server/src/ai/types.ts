export interface EstimateFacts {
  suggestedKw: number;
  monthlyUnits: number;
  monthlyGenerationUnits: number;
  subsidyRupees: number;
  yearlySavingRupees: number;
  limitedByRoof: boolean;
}

export interface ComparisonFact {
  quoteId: string;
  vendorName: string;
  amountYouPayRupees: number | null;
  paybackYears: number | null;
  subsidyAtRisk: boolean;
  missingItems: string[];
  recommendable: boolean;
  score: number | null;
  inverterWarrantyYears: number | null;
  panelWarrantyYears: number | null;
  installDays: number | null;
  injectionFlagged: boolean;
}

export interface RecommendationFacts {
  recommendedQuoteId: string | null;
  quotes: ComparisonFact[];
}
