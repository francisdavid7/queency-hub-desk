/** Round to kobo (2 decimal places) to keep floating-point drift out of totals. */
export const roundMoney = (amount: number) =>
  Math.round((amount + Number.EPSILON) * 100) / 100;

export const formatPrice = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);

export const isValidAmount = (amount: number) =>
  Number.isFinite(amount) && amount >= 0;
