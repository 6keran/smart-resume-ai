export const LANDING_EXAMPLE_CANDIDATE = {
  name: 'Example Candidate',
  role: 'Data Analyst',
} as const;

export const LANDING_SCORE_WEIGHTS = [
  { key: 'keywords', label: 'Keywords', weight: 0.35 },
  { key: 'formatting', label: 'Formatting', weight: 0.25 },
  { key: 'content', label: 'Content', weight: 0.25 },
  { key: 'sections', label: 'Sections', weight: 0.15 },
] as const;

export const LANDING_UPLOAD_FORMATS = ['PDF', 'DOCX', 'TXT'] as const;

export const LANDING_EXAMPLE_BEFORE_TEXT = `EXAMPLE CANDIDATE
Data Analyst

SUMMARY
I am a final-year B.Sc. Statistics student at Northbridge University and expect to graduate in May 2027. I am interested in entry-level data analyst roles. I have used SQL, PostgreSQL, Python, pandas, Excel, and Power BI in coursework, a campus job, and projects. I am comfortable with data cleaning, data visualization, basic regression, and presenting findings to nontechnical people.

EXPERIENCE
Student Data Assistant | Northbridge University Career Centre | January 2026 - April 2026
Worked 8 hours each week helping the career centre with student survey data. Responsible for combining 7 Excel spreadsheets containing 1,860 survey responses. I checked column names, corrected 143 duplicate records, and filled in category labels that staff had confirmed. Helped prepare a weekly summary for two career advisers and explained where response totals came from. I also kept a short data dictionary so the spreadsheets could be understood later.

PROJECTS
Campus Library Usage Dashboard | Course project
Worked with 12,480 anonymized library checkout records. I used Excel to review missing dates and category labels, PostgreSQL and SQL to group checkouts by month and subject, and Python with pandas to compare totals. Made a 6-page Power BI dashboard showing monthly activity, popular subjects, and borrowing patterns. Presented the dashboard to a class of 24 students and answered questions about the cleaning steps.

Retail Sales Analysis | Team project
Worked in a team of 4 on 18,250 retail transaction records. My duties included writing SQL joins, checking product and store fields, making Python charts, and helping prepare a 12-minute presentation. We used Git to share notebooks and query files.

EDUCATION
B.Sc. Statistics | Northbridge University | Expected May 2027
GPA: 3.6/4.0
Relevant coursework: Regression Analysis, Database Systems, Data Visualization.

SKILLS
SQL, PostgreSQL, Python, pandas, Excel, Power BI, Git, data cleaning, data visualization, basic regression, presentation.

CERTIFICATION
Completed the Microsoft Learn Power BI learning path in November 2025.`;

export const LANDING_EXAMPLE_AFTER_TEXT = `EXAMPLE CANDIDATE
Data Analyst

PROFESSIONAL SUMMARY
Final-year B.Sc. Statistics student at Northbridge University, graduating in May 2027 and seeking an entry-level data analyst role. Applied SQL, PostgreSQL, Python, pandas, Excel, and Power BI across coursework, a campus position, and two projects. Experienced in cleaning data, creating visualizations, using basic regression, and presenting findings to nontechnical audiences.

EXPERIENCE
Student Data Assistant | Northbridge University Career Centre | January 2026 - April 2026
- Combined 7 Excel spreadsheets containing 1,860 student survey responses during an 8-hour-per-week campus role.
- Checked column names, corrected 143 duplicate records, and completed category labels using information confirmed by career centre staff.
- Prepared a weekly summary for two career advisers and explained the source of each response total.
- Created a concise data dictionary so staff could understand the spreadsheets later.

PROJECTS
Campus Library Usage Dashboard | Course project
- Analyzed 12,480 anonymized library checkout records.
- Reviewed missing dates and category labels in Excel, grouped monthly and subject-level checkouts with SQL in PostgreSQL, and compared totals with Python and pandas.
- Built a 6-page Power BI dashboard covering monthly activity, popular subjects, and borrowing patterns.
- Presented the dashboard to a class of 24 students and answered questions about the cleaning process.

Retail Sales Analysis | Team project
- Collaborated in a team of 4 to examine 18,250 retail transaction records.
- Wrote SQL joins, checked product and store fields, and created Python charts.
- Helped prepare a 12-minute presentation.
- Used Git with the team to share notebooks and query files.

EDUCATION
B.Sc. Statistics | Northbridge University | Expected May 2027
GPA: 3.6/4.0
Relevant coursework: Regression Analysis, Database Systems, Data Visualization.

SKILLS
SQL, PostgreSQL, Python, pandas, Excel, Power BI, Git, data cleaning, data visualization, basic regression, presentation.

CERTIFICATION
Microsoft Learn Power BI learning path | Completed November 2025`;

export type LandingScoreKey = (typeof LANDING_SCORE_WEIGHTS)[number]['key'];

export interface LandingScorePart {
  key: LandingScoreKey;
  label: string;
  weight: number;
  score: number;
}

export interface LandingScoredExample {
  id: 'before' | 'after';
  label: 'Before' | 'After';
  description: string;
  text: string;
  overallScore: number;
  parts: LandingScorePart[];
}

export type LandingAtsExampleData =
  | {
      status: 'ready';
      examples: LandingScoredExample[];
    }
  | {
      status: 'unavailable';
      message: string;
    };

export interface LandingProductFacts {
  templateCount: number;
  scorePartCount: number;
  roleCount: number;
  uploadFormats: string[];
}

export interface LandingPageData {
  atsExample: LandingAtsExampleData;
  productFacts: LandingProductFacts;
}
