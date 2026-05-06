export type LanguageMode = 'english' | 'hinglish';
export type AIProvider = 'openai' | 'openrouter';

type GenerateParams = {
  url: string;
  count: number;
  languageMode: LanguageMode;
  englishPercentage: number;
  provider: AIProvider;
  signal?: AbortSignal;
  onChunk?: (chunkReviews: string[], startIndex: number) => void;
};

export class ReviewGeneratorService {
  private readonly chunkSize = 10;
  private readonly chunkConcurrency = 3;
  private readonly maxRetriesPerChunk = 2;

  private async generateChunk({
    url,
    count,
    languageMode,
    englishPercentage = 50,
    provider,
    signal
  }: GenerateParams): Promise<string[]> {
    let distributionRequirement = '';

    if (languageMode === 'english') {
      distributionRequirement = 'STRICT REQUIREMENT: All reviews must be in pure, standard English. No Hindi words allowed.';
    } else {
      const englishCount = Math.floor(count * (englishPercentage / 100));
      const hindiCount = count - englishCount;
      distributionRequirement = `
        STRICT BATCH DISTRIBUTION (Total ${count} reviews):
        - Exactly ${englishCount} reviews must be in pure English.
        - Exactly ${hindiCount} reviews must be in Romanized Hindi (Hindi words written in English/Latin script).

        Romanized Hindi Example: 'Product bahut accha hai', 'Quality top notch hai but price thoda high hai'.
        DO NOT use Devanagari (Hindi) characters. Use only English letters.
      `;
    }

    const prompt = `
      Product URL: ${url}

      Task: Generate exactly ${count} unique, highly satisfactory product reviews.

      ${distributionRequirement}

      Guidelines:
      - Sentiment: 5-star, extremely happy customers.
      - Style: Casual, human-like, varied lengths (1-3 lines).
      - Authenticity: Use common Indian digital slang like 'paisa vasool', 'must buy', 'shandar', 'zabardast'.
      - Output: Return ONLY a valid JSON array of strings. No prose, no markdown.
    `;

    try {
      const response = await fetch('/api/generate-reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal,
        body: JSON.stringify({
          url,
          count,
          languageMode,
          englishPercentage,
          provider,
          prompt
        })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || `API error (${response.status}).`);
      }

      if (!Array.isArray(data?.reviews)) {
        throw new Error('Server did not return a valid reviews array.');
      }

      return data.reviews
        .filter((item: unknown): item is string => typeof item === 'string')
        .slice(0, count);
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to generate reviews.');
    }
  }

  async generateReviews({
    url,
    count,
    languageMode,
    englishPercentage = 50,
    provider,
    signal,
    onChunk
  }: GenerateParams): Promise<string[]> {
    if (count <= this.chunkSize) {
      return this.generateChunk({ url, count, languageMode, englishPercentage, provider, signal });
    }

    const chunks: number[] = [];
    const chunkStartIndexes: number[] = [];
    let remaining = count;
    let cursor = 0;
    while (remaining > 0) {
      const nextSize = Math.min(this.chunkSize, remaining);
      chunks.push(nextSize);
      chunkStartIndexes.push(cursor);
      cursor += nextSize;
      remaining -= nextSize;
    }

    const orderedResults: string[][] = new Array(chunks.length);
    let nextChunkIndex = 0;

    const worker = async (): Promise<void> => {
      while (true) {
        if (signal?.aborted) return;
        const index = nextChunkIndex++;
        if (index >= chunks.length) return;
        const chunkCount = chunks[index];
        let lastError: unknown = null;

        for (let attempt = 1; attempt <= this.maxRetriesPerChunk; attempt++) {
          try {
            const result = await this.generateChunk({
              url,
              count: chunkCount,
              languageMode,
              englishPercentage,
              provider,
              signal
            });

            if (result.length === chunkCount) {
              orderedResults[index] = result;
              onChunk?.(result, chunkStartIndexes[index]);
              lastError = null;
              break;
            }

            lastError = new Error(`Model returned ${result.length}/${chunkCount} reviews for one chunk.`);
          } catch (error) {
            lastError = error;
            if (signal?.aborted) throw error;
          }
        }

        if (lastError) throw lastError;
      }
    };

    const workers = Array(Math.min(this.chunkConcurrency, chunks.length))
      .fill(0)
      .map(() => worker());

    await Promise.all(workers);

    return orderedResults.flat().slice(0, count);
  }
}
