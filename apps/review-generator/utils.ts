
/**
 * Generates a random date between May 23, 2024 and today in dd/mm/yyyy format.
 */
export const getRandomDate = (): string => {
  const start = new Date('2024-05-23');
  const end = new Date();
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  
  return `${d}/${m}/${y}`;
};

/**
 * Generates a realistic email based on a name.
 */
export const generateEmail = (name: string): string => {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
  const separators = ['.', '_', '', ''];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const separator = separators[Math.floor(Math.random() * separators.length)];
  const suffix = Math.random() > 0.3 ? Math.floor(Math.random() * 999) : '';
  
  return `${name.toLowerCase().replace(/\s+/g, '')}${separator}${suffix}@${domain}`;
};

/**
 * Returns a random item from an array.
 */
export const getRandomItem = <T,>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};

/**
 * Generates a set of N star ratings (1-5) that average out to a target between 4.1 and 4.9.
 */
export const generateTargetedRatings = (count: number): number[] => {
  const targetAvg = 4.1 + Math.random() * 0.8; // Range 4.1 - 4.9
  const totalSum = Math.round(targetAvg * count);
  
  let ratings: number[] = [];
  let currentSum = 0;
  
  for (let i = 0; i < count; i++) {
    const val = Math.random() > 0.4 ? 5 : 4;
    ratings.push(val);
    currentSum += val;
  }
  
  while (currentSum !== totalSum) {
    const idx = Math.floor(Math.random() * count);
    if (currentSum < totalSum && ratings[idx] < 5) {
      ratings[idx]++;
      currentSum++;
    } else if (currentSum > totalSum && ratings[idx] > 1) {
      ratings[idx]--;
      currentSum--;
    }
  }
  
  return ratings;
};

/**
 * Generates TRUE/FALSE values in a balanced split per batch and shuffles the order.
 * For odd counts, the extra value is randomized between TRUE and FALSE.
 */
export const generateBalancedVerifiedValues = (count: number): string[] => {
  const baseHalf = Math.floor(count / 2);
  const extraTrue = count % 2 === 1 ? (Math.random() > 0.5 ? 1 : 0) : 0;
  const trueCount = baseHalf + extraTrue;
  const falseCount = count - trueCount;
  const values = [
    ...Array(trueCount).fill('TRUE'),
    ...Array(falseCount).fill('FALSE')
  ];

  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }

  return values;
};

/**
 * Formats data for Excel (TSV format).
 */
export const formatForExcelTSV = (data: any[]): string => {
  const rows = data.map(row => [
    row.url,
    row.review.replace(/\n/g, ' '),
    row.starRating,
    row.name,
    row.email,
    row.location,
    `="${row.date}"`,
    row.isVerified
  ].join('\t'));
  
  return rows.join('\n');
};

/**
 * Generates an HTML table string for clipboard.
 */
export const formatForExcelHTML = (data: any[]): string => {
  const rows = data.map(row => `
    <tr>
      <td>${row.url}</td>
      <td>${row.review}</td>
      <td>${row.starRating}</td>
      <td>${row.name}</td>
      <td>${row.email}</td>
      <td>${row.location}</td>
      <td style="mso-number-format:'\\@';">${row.date}</td>
      <td>${row.isVerified}</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <meta http-equiv="content-type" content="text/html; charset=utf-8">
        <style>
          td { border: 1px solid #ccc; }
        </style>
      </head>
      <body>
        <table>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
    </html>
  `;
};
