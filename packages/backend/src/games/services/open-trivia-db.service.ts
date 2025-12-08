import { Injectable, BadRequestException } from '@nestjs/common';
import { LoggerService } from '../../services/logger.service';
import { TriviaQuestion, OpenTriviaDbResponse } from '../types/game.types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OpenTriviaDatabaseService {
  private readonly TRIVIA_API_URL = 'https://opentdb.com/api.php';
  private readonly DEFAULT_TIMEOUT = 5000; // 5 seconds

  constructor(private readonly logger: LoggerService) {}

  /**
   * Fetch trivia questions from Open Trivia DB API
   * Supports different difficulties and categories
   */
  async getQuestions(params: {
    amount: number;
    difficulty: 'easy' | 'medium' | 'hard';
    category?: number;
    type?: 'multiple' | 'boolean';
  }): Promise<TriviaQuestion[]> {
    if (params.amount < 1 || params.amount > 50) {
      throw new BadRequestException('Amount must be between 1 and 50');
    }

    const url = new URL(this.TRIVIA_API_URL);
    url.searchParams.append('amount', params.amount.toString());
    url.searchParams.append('difficulty', params.difficulty);
    url.searchParams.append('type', params.type || 'multiple');

    if (params.category) {
      url.searchParams.append('category', params.category.toString());
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT);

      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.logger.warn('Trivia API HTTP error', {
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: OpenTriviaDbResponse = await response.json();

      // Response codes:
      // 0 = success
      // 1 = No Results
      // 2 = Invalid Parameter
      // 3 = Token Not Found
      // 4 = Token Empty
      // 5 = Too many requests (rate limit)
      if (data.response_code !== 0) {
        const errorMessages: Record<number, string> = {
          1: 'No questions available for selected parameters',
          2: 'Invalid parameters provided',
          3: 'Session token not found',
          4: 'Session token is empty',
          5: 'Too many requests - please try again later',
        };

        const message = errorMessages[data.response_code] || `Unknown error (code: ${data.response_code})`;
        this.logger.warn('Trivia API response error', { code: data.response_code });

        // Fallback to safe error message
        throw new Error(message);
      }

      // Parse and decode questions
      return data.results.map(q => ({
        id: uuidv4(),
        question: this.decodeHtml(q.question),
        correct_answer: this.decodeHtml(q.correct_answer),
        incorrect_answers: q.incorrect_answers.map(a => this.decodeHtml(a)),
        difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
        type: q.type,
        category: q.category,
      }));
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        this.logger.error('Network error fetching trivia questions', error.message);
        throw new BadRequestException('Network error - unable to load questions. Please try again.');
      }

      if (error instanceof SyntaxError) {
        this.logger.error('Invalid JSON response from trivia API', error.message);
        throw new BadRequestException('Invalid response from trivia service.');
      }

      this.logger.error('Failed to fetch trivia questions', error instanceof Error ? error.message : 'Unknown error');
      throw new BadRequestException(
        error instanceof Error && error.message
          ? error.message
          : 'Failed to load trivia questions. Please try again.',
      );
    }
  }

  /**
   * Decode HTML entities in text
   * Converts "&quot;" to '"', "&amp;" to "&", etc.
   */
  private decodeHtml(html: string): string {
    if (!html) return '';

    // Map of common HTML entities
    const entities: Record<string, string> = {
      '&quot;': '"',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&apos;': "'",
      '&#039;': "'",
      '&nbsp;': ' ',
      '&#039;': "'",
      '&lsquo;': ''',
      '&rsquo;': ''',
      '&ldquo;': '"',
      '&rdquo;': '"',
      '&hellip;': '…',
      '&ndash;': '–',
      '&mdash;': '—',
      '&deg;': '°',
      '&frac12;': '½',
      '&frac14;': '¼',
      '&frac34;': '¾',
    };

    let decoded = html;
    for (const [entity, char] of Object.entries(entities)) {
      decoded = decoded.replace(new RegExp(entity, 'g'), char);
    }

    // Handle numeric entities like &#123;
    decoded = decoded.replace(/&#(\d+);/g, (match, code) => {
      return String.fromCharCode(parseInt(code, 10));
    });

    // Handle hex entities like &#x1F;
    decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (match, code) => {
      return String.fromCharCode(parseInt(code, 16));
    });

    return decoded;
  }

  /**
   * Test API connectivity
   * Returns true if API is accessible and returning valid responses
   */
  async testConnection(): Promise<boolean> {
    try {
      const questions = await this.getQuestions({
        amount: 1,
        difficulty: 'easy',
      });
      return questions.length > 0;
    } catch (error) {
      this.logger.warn('Trivia API connection test failed', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }
}
