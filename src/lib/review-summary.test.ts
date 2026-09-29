import { describe, expect, it } from "vitest";

import { calculateReviewSummary } from "@/lib/review-summary";

describe("calculateReviewSummary", () => {
  it("calcula promedio, total y distribución con reseñas reales", () => {
    expect(
      calculateReviewSummary([{ rating: 5 }, { rating: 4 }, { rating: 5 }]),
    ).toEqual({
      average: 14 / 3,
      count: 3,
      distribution: [
        { rating: 5, count: 2 },
        { rating: 4, count: 1 },
        { rating: 3, count: 0 },
        { rating: 2, count: 0 },
        { rating: 1, count: 0 },
      ],
    });
  });

  it("devuelve cero cuando todavía no hay reseñas", () => {
    expect(calculateReviewSummary([])).toEqual({
      average: 0,
      count: 0,
      distribution: [
        { rating: 5, count: 0 },
        { rating: 4, count: 0 },
        { rating: 3, count: 0 },
        { rating: 2, count: 0 },
        { rating: 1, count: 0 },
      ],
    });
  });
});
