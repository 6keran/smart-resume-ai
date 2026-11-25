import 'server-only';

import { cache } from 'react';
import {
  LANDING_EXAMPLE_AFTER_TEXT,
  LANDING_EXAMPLE_BEFORE_TEXT,
  LANDING_SCORE_WEIGHTS,
  LANDING_UPLOAD_FORMATS,
  type LandingAtsExampleData,
  type LandingPageData,
  type LandingScoreKey,
  type LandingScoredExample,
} from '@/components/landing/landingExampleData';
import { ROLE_PROFILES } from '@/lib/career/roleProfiles';
import { RESUME_TEMPLATES } from '@/lib/templates';
import {
  calculateDeterministicAtsScore,
  type DeterministicAtsCalculation,
} from '@/server/services/deterministicAtsEngine';

function scoreForKey(result: DeterministicAtsCalculation, key: LandingScoreKey): number {
  if (key === 'keywords') return result.keywordMatchScore;
  if (key === 'formatting') return result.formattingScore;
  if (key === 'content') return result.contentScore;
  return result.sectionScore;
}

function createScoredExample(
  id: LandingScoredExample['id'],
  label: LandingScoredExample['label'],
  description: string,
  text: string,
): LandingScoredExample {
  const result = calculateDeterministicAtsScore(text);

  return {
    id,
    label,
    description,
    text,
    overallScore: result.overallAtsScore,
    parts: LANDING_SCORE_WEIGHTS.map((part) => ({
      key: part.key,
      label: part.label,
      weight: part.weight,
      score: scoreForKey(result, part.key),
    })),
  };
}

export const getLandingPageData = cache(async (): Promise<LandingPageData> => {
  let atsExample: LandingAtsExampleData;

  try {
    atsExample = {
      status: 'ready',
      examples: [
        createScoredExample(
          'before',
          'Before',
          'Duty-style draft using the candidate\'s original facts.',
          LANDING_EXAMPLE_BEFORE_TEXT,
        ),
        createScoredExample(
          'after',
          'After',
          'The same facts, restructured and expressed more clearly.',
          LANDING_EXAMPLE_AFTER_TEXT,
        ),
      ],
    };
  } catch {
    atsExample = {
      status: 'unavailable',
      message: 'The example score is temporarily unavailable. No estimated score is shown.',
    };
  }

  return {
    atsExample,
    productFacts: {
      templateCount: RESUME_TEMPLATES.length,
      scorePartCount: LANDING_SCORE_WEIGHTS.length,
      roleCount: ROLE_PROFILES.length,
      uploadFormats: [...LANDING_UPLOAD_FORMATS],
    },
  };
});
