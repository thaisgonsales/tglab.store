export type ReviewRating = { rating: number };

export function calculateReviewSummary(reviews: readonly ReviewRating[]) {
  const count = reviews.length;
  const average = count
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / count
    : 0;
  const distribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => review.rating === rating).length,
  }));
  return { average, count, distribution };
}
