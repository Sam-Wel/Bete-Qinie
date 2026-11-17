// Ethiopic (ግዕዝ) numerals: ፩–፱, ፲–፺, ፻ (hundred) and ፼ (ten thousand). A number is
// read in pairs of digits from the right; ፻ follows every other pair and ፼ the ones
// between, so 2002 is ፳፻፪ (20 hundreds and 2). A lone 1 before ፻ or ፼ is not
// written (100 is ፻, 10,000 is ፼), except where it counts ten-thousands inside a
// larger number (1,010,000 is ፻፩፼). There is no zero.
const ONES = ["", "፩", "፪", "፫", "፬", "፭", "፮", "፯", "፰", "፱"];
const TENS = ["", "፲", "፳", "፴", "፵", "፶", "፷", "፸", "፹", "፺"];

export function toGeez(n) {
  if (!Number.isSafeInteger(n) || n < 1) return String(n);
  let digits = String(n);
  if (digits.length % 2) digits = `0${digits}`;
  const pairs = digits.match(/../g);
  return pairs
    .map((pair, i) => {
      const pos = pairs.length - 1 - i; // 0 is the last pair
      const value = Number(pair);
      let part = TENS[Number(pair[0])] + ONES[Number(pair[1])];
      if (pos > 0 && value === 1 && (i === 0 || pos % 2 === 1)) part = "";
      if (pos % 2 === 1) return value ? `${part}፻` : part;
      return pos > 0 ? `${part}፼` : part;
    })
    .join("");
}
