import assert from 'node:assert/strict';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { AtsExplainabilityBreakdown } from '../src/components/ats/AtsExplainabilityBreakdown';

console.log('========================================================================');
console.log('🧪 SMART RESUME AI: FEATURE 1 (ATS EXPLAINABILITY) VALIDATION SUITE');
console.log('========================================================================\n');

let totalTests = 0;
let passedTests = 0;

function pass(name, detail = '') {
  totalTests++;
  passedTests++;
  console.log(`  ✅ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
}

// 1. Standard Populated Analysis Test
console.log('--- Test 1: Full Score Breakdown & Category Explanations ---');
{
  const mockAnalysis = {
    overallAtsScore: 91,
    keywordMatchScore: 94,
    formattingScore: 89,
    contentScore: 87,
    sectionScore: 100,
    wordCount: 520,
    readabilityScore: 82,
    bulletStrengthScore: 88,
    detectedKeywords: ['Python', 'SQL', 'React', 'TypeScript', 'Node.js'],
    missingKeywords: ['Docker', 'Kubernetes', 'AWS'],
    detectedSections: ['Work Experience', 'Education', 'Skills', 'Projects'],
    missingSections: [],
    strengths: [],
    weaknesses: [],
    recommendations: [],
    topSuggestions: [],
    summaryFeedback: 'Excellent ATS compatibility.',
    analyzedAt: new Date().toISOString(),
  };

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(AtsExplainabilityBreakdown, { analysis: mockAnalysis })
  );

  // Check Category 1: Keywords
  assert.ok(html.includes('Keyword Match'), 'Renders Keyword Match category');
  assert.ok(html.includes('94%'), 'Displays 94% keyword match score');
  assert.ok(html.includes('Python') && html.includes('React'), 'Displays matched keywords');
  assert.ok(html.includes('Docker') && html.includes('Kubernetes'), 'Displays missing keywords');
  assert.ok(html.includes('Authentic Skills Policy'), 'Includes non-fabrication authentic skills policy');
  pass('Category 1: Keyword Match with matched/missing skills and authenticity notice verified');

  // Check Category 2: Formatting
  assert.ok(html.includes('Formatting &amp; Parseability') || html.includes('Formatting & Parseability'), 'Renders Formatting category');
  assert.ok(html.includes('89%'), 'Displays 89% formatting score');
  assert.ok(html.includes('520 words'), 'Displays exact word count metric');
  assert.ok(html.includes('Table-Free Headers'), 'Displays parseability breakdown');
  pass('Category 2: Formatting & Parseability breakdown verified');

  // Check Category 3: Content Quality
  assert.ok(html.includes('Content Quality &amp; Impact') || html.includes('Content Quality & Impact'), 'Renders Content Quality category');
  assert.ok(html.includes('87%'), 'Displays 87% content score');
  assert.ok(html.includes('82/100'), 'Displays readability index');
  assert.ok(html.includes('88%'), 'Displays bullet strength metric');
  pass('Category 3: Content Quality & Impact breakdown verified');

  // Check Category 4: Section Completeness
  assert.ok(html.includes('Section Completeness'), 'Renders Section Completeness category');
  assert.ok(html.includes('100%'), 'Displays 100% section score');
  assert.ok(html.includes('Work Experience') && html.includes('Education'), 'Displays detected sections');
  pass('Category 4: Section Completeness breakdown verified');
}

// 2. Edge Case: Minimal / Empty / Degraded Analysis Test
console.log('\n--- Test 2: Edge Case Resilience (Degraded / Empty Analysis) ---');
{
  const emptyAnalysis = {
    overallAtsScore: 35,
    keywordMatchScore: 20,
    formattingScore: 40,
    contentScore: 30,
    sectionScore: 50,
    wordCount: 90,
    readabilityScore: 45,
    detectedKeywords: [],
    missingKeywords: ['Python', 'SQL', 'Git'],
    detectedSections: ['Education'],
    missingSections: ['Work Experience', 'Skills'],
    strengths: [],
    weaknesses: [],
    recommendations: [],
    topSuggestions: [],
    summaryFeedback: 'Low ATS compatibility.',
    analyzedAt: new Date().toISOString(),
  };

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(AtsExplainabilityBreakdown, { analysis: emptyAnalysis })
  );

  assert.ok(html.includes('No standard industry keywords matched'), 'Graceful fallback for 0 matched keywords');
  assert.ok(html.includes('Missing Recommended Sections'), 'Renders missing recommended sections alert');
  assert.ok(html.includes('90 words'), 'Renders minimal word count');
  pass('Degraded and empty edge-case input rendered safely without runtime errors');
}

console.log('\n========================================================================');
console.log(`🎉 ALL FEATURE 1 TESTS PASSED: ${passedTests}/${totalTests} PASS!`);
console.log('========================================================================\n');
