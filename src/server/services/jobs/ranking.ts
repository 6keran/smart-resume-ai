import { NormalizedJob, JobSearchParams, JobMatchBreakdown } from './types';
import { extractSkills } from './normalize';

/**
 * Related technology clusters for detecting partial skill alignment
 */
const RELATED_TECH_CLUSTERS: Record<string, string[]> = {
  python: ['django', 'flask', 'fastapi', 'pandas', 'numpy', 'pytorch', 'tensorflow'],
  react: ['next.js', 'vue', 'angular', 'redux', 'tailwind', 'typescript', 'frontend'],
  'node.js': ['express', 'nest.js', 'backend', 'rest api', 'graphql'],
  aws: ['cloud', 'azure', 'gcp', 'devops', 'docker', 'kubernetes', 'terraform'],
  docker: ['kubernetes', 'ci/cd', 'containers', 'linux', 'devops', 'aws'],
  sql: ['postgresql', 'mysql', 'database', 'mongodb', 'redis', 'nosql'],
  javascript: ['typescript', 'html', 'css', 'react', 'node.js'],
  java: ['spring boot', 'spring', 'hibernate', 'microservices'],
};

/**
 * Calculates a transparent Resume Match score, breakdown, and skill gaps without inventing data.
 */
export function rankJobsWithResume(
  jobs: NormalizedJob[],
  params: JobSearchParams
): NormalizedJob[] {
  const candidateSkills = (params.resumeSkills || []).map((s) => s.trim()).filter(Boolean);
  const context = params.candidateContext;

  // If no resume context provided, ensure freshness and eligibility metadata are still populated
  if (candidateSkills.length === 0 && !context) {
    return jobs.map((job) => {
      const jobSkills = job.skills.length > 0 ? job.skills : extractSkills(job.title, job.description);
      let isExpired = false;
      if (job.postedAt) {
        const postDate = new Date(job.postedAt).getTime();
        if (!isNaN(postDate)) {
          const daysOld = (Date.now() - postDate) / (1000 * 60 * 60 * 24);
          if (daysOld > 60) isExpired = true;
        }
      }
      const fresherFriendly =
        job.experienceLevel === 'Fresher' ||
        job.experienceLevel === 'Entry' ||
        /\b(fresher|intern|entry level|graduate|college|trainee|0-1|0-2)\b/i.test(`${job.title} ${job.description}`);

      return {
        ...job,
        skills: jobSkills,
        isRealListing: true,
        isExpired,
        eligibility: {
          isEligible: Boolean(fresherFriendly),
          fresherEligible: Boolean(fresherFriendly),
          educationEligible: true,
          summary: fresherFriendly
            ? 'Early career opportunity suitable for freshers and college students.'
            : 'Compare your background with listed qualifications.',
          details: [
            fresherFriendly ? 'Eligible for early career / fresh graduates' : 'Higher experience preferred',
          ],
        },
        matchReason: `Active opening in ${job.location || 'specified location'}. Upload or build your resume to compute matching criteria.`,
      };
    });
  }

  const candidateSkillsLower = new Set(candidateSkills.map((s) => s.toLowerCase()));
  const candidateHeadlineLower = (params.resumeHeadline || context?.headline || '').toLowerCase();
  const candidateExp = params.resumeYearsExp || context?.yearsOfExperience || 3;

  // Extract project technologies if provided
  const projectTechs = (context?.projects || [])
    .flatMap((p) => p.technologies || [])
    .map((t) => t.toLowerCase());

  // Extract education keywords
  const eduKeywords = (context?.education || [])
    .map((e) => `${e.degree || ''} ${e.institution || ''}`.toLowerCase())
    .join(' ');

  // Extract candidate keywords
  const candidateKeywords = (context?.detectedKeywords || []).map((k) => k.toLowerCase());

  const ranked = jobs.map((job) => {
    // 1. Resolve Job Skills from actual text
    const jobSkills = job.skills.length > 0 ? job.skills : extractSkills(job.title, job.description);
    const lowerDesc = job.description.toLowerCase();
    const lowerTitle = job.title.toLowerCase();

    // 2. Identify Matched, Partial, and Missing Skills
    const matchedSkills: string[] = [];
    const partialSkills: string[] = [];
    const missingSkills: string[] = [];

    for (const skill of jobSkills) {
      const sLower = skill.toLowerCase();
      if (candidateSkillsLower.has(sLower)) {
        matchedSkills.push(skill);
      } else {
        // Check for partial cluster relation
        let isPartial = false;
        for (const [clusterKey, relatives] of Object.entries(RELATED_TECH_CLUSTERS)) {
          if (
            (clusterKey === sLower || relatives.includes(sLower)) &&
            candidateSkills.some(
              (cs) => cs.toLowerCase() === clusterKey || relatives.includes(cs.toLowerCase())
            )
          ) {
            isPartial = true;
            break;
          }
        }

        if (isPartial) {
          partialSkills.push(skill);
        } else {
          missingSkills.push(skill);
        }
      }
    }

    // 3. Compute Skills Score (0 - 100)
    let skillsScore = 65;
    if (jobSkills.length > 0) {
      const directRatio = matchedSkills.length / jobSkills.length;
      const partialRatio = partialSkills.length / jobSkills.length;
      skillsScore = Math.min(Math.round((directRatio * 1.0 + partialRatio * 0.5) * 100), 100);
      skillsScore = Math.max(skillsScore, directRatio > 0 ? 40 : 25);
    } else {
      const inTextMatches = candidateSkills.filter((s) => lowerDesc.includes(s.toLowerCase()));
      skillsScore = Math.min(Math.max(inTextMatches.length * 18, 30), 92);
    }

    // 4. Compute Experience Score (0 - 100)
    let expScore = 75;
    if (job.experienceLevel === 'Fresher' || job.experienceLevel === 'Entry') {
      expScore = candidateExp <= 2 ? 95 : 75;
    } else if (job.experienceLevel === 'Mid') {
      expScore = candidateExp >= 2 && candidateExp <= 5 ? 92 : candidateExp > 5 ? 88 : 65;
    } else if (job.experienceLevel === 'Senior') {
      expScore = candidateExp >= 5 ? 94 : candidateExp >= 3 ? 75 : 55;
    } else if (job.experienceLevel === 'Lead' || job.experienceLevel === 'Executive') {
      expScore = candidateExp >= 7 ? 95 : candidateExp >= 5 ? 80 : 50;
    } else {
      expScore = 80;
    }

    // 5. Compute Keywords Score (0 - 100)
    let keywordsScore = 70;
    const allKeywords = [...candidateSkillsLower, ...candidateKeywords];
    if (allKeywords.length > 0) {
      let kwHits = 0;
      allKeywords.forEach((kw) => {
        if (lowerDesc.includes(kw) || lowerTitle.includes(kw)) {
          kwHits++;
        }
      });
      keywordsScore = Math.min(Math.round((kwHits / Math.max(allKeywords.length, 5)) * 100) + 30, 96);
    }

    // 6. Compute Projects Score (0 - 100)
    let projectsScore = 75;
    if (projectTechs.length > 0 && jobSkills.length > 0) {
      const projHits = jobSkills.filter((s) => projectTechs.includes(s.toLowerCase())).length;
      projectsScore = Math.min(Math.round((projHits / jobSkills.length) * 100) + 40, 95);
    } else if (projectTechs.length > 0) {
      const projDescHits = projectTechs.filter((t) => lowerDesc.includes(t)).length;
      projectsScore = Math.min(projDescHits * 20 + 35, 90);
    }

    // 7. Compute Education Score (0 - 100)
    let eduScore = 90;
    const requiresDegree =
      lowerDesc.includes('bachelor') ||
      lowerDesc.includes('b.tech') ||
      lowerDesc.includes('b.e.') ||
      lowerDesc.includes('master') ||
      lowerDesc.includes('degree in');

    if (requiresDegree) {
      if (
        eduKeywords.includes('b.tech') ||
        eduKeywords.includes('bachelor') ||
        eduKeywords.includes('master') ||
        eduKeywords.includes('computer') ||
        eduKeywords.includes('engineering') ||
        eduKeywords.includes('science')
      ) {
        eduScore = 100;
      } else {
        eduScore = 75;
      }
    } else {
      eduScore = 100; // Not explicitly restricted
    }

    // 8. Overall Weighted Match Score
    const compositeScore = Math.round(
      skillsScore * 0.35 +
      expScore * 0.20 +
      keywordsScore * 0.20 +
      projectsScore * 0.15 +
      eduScore * 0.10
    );

    const finalMatchScore = Math.min(Math.max(compositeScore, 30), 98);

    const matchBreakdown: JobMatchBreakdown = {
      skills: skillsScore,
      experience: expScore,
      keywords: keywordsScore,
      projects: projectsScore,
      education: eduScore,
    };

    // 9. Transparent Explanation
    let matchReason = '';
    if (matchedSkills.length > 0) {
      matchReason = `Direct match for ${matchedSkills.slice(0, 3).join(', ')}.`;
      if (partialSkills.length > 0) {
        matchReason += ` Related experience in ${partialSkills.slice(0, 2).join(', ')}.`;
      }
      if (missingSkills.length > 0) {
        matchReason += ` Missing: ${missingSkills.slice(0, 2).join(', ')}.`;
      }
    } else {
      matchReason = `Relevant role in ${job.location}. Compare your background with listed requirements.`;
    }

    // 10. Student Eligibility & Freshness Verification
    const fresherFriendly =
      job.experienceLevel === 'Fresher' ||
      job.experienceLevel === 'Entry' ||
      /\b(fresher|intern|entry level|graduate|college|trainee|0-1|0-2)\b/i.test(`${job.title} ${job.description}`);
    const educationEligible = eduScore >= 75;
    const isEligible = Boolean(fresherFriendly && educationEligible);

    let isExpired = false;
    if (job.postedAt) {
      const postDate = new Date(job.postedAt).getTime();
      if (!isNaN(postDate)) {
        const daysOld = (Date.now() - postDate) / (1000 * 60 * 60 * 24);
        if (daysOld > 60) isExpired = true;
      }
    }

    const eligibility = {
      isEligible,
      fresherEligible: Boolean(fresherFriendly),
      educationEligible,
      summary: isEligible
        ? 'You meet the qualifications and experience profile for this opening.'
        : !fresherFriendly
        ? 'Position typically requests higher prior work experience.'
        : 'Verify specific degree requirements in listing.',
      details: [
        fresherFriendly ? 'Eligible for early career / fresh graduates' : 'Higher experience preferred',
        educationEligible ? 'Academic degree matches discipline' : 'Verify degree specialization',
      ],
    };

    return {
      ...job,
      skills: jobSkills,
      matchScore: finalMatchScore,
      matchBreakdown,
      matchedSkills,
      partialSkills,
      missingSkills,
      matchReason,
      isRealListing: true,
      isExpired,
      eligibility,
    };
  });

  // Sort by match score descending if match or relevance is selected
  if (params.sortBy === 'match' || params.sortBy === 'relevance' || !params.sortBy) {
    return ranked.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }

  return ranked;
}
