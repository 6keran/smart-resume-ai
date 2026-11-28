# Security Policy

Thank you for helping keep Smart Resume AI and its users safe. This is a student-built project maintained on a best-effort basis, but we take security reports seriously.

## Supported versions

Only the latest code on the `main` branch (and the branch currently deployed for staging) receives security fixes. Older commits and forks are not supported.

## How to report a vulnerability

**Please do not open a public issue, pull request or discussion for a security problem.**

Report it privately in one of these ways:

1. **GitHub private vulnerability reporting (preferred):** open the repository's **Security** tab and choose **Report a vulnerability**.
2. **Email:** [FILL: security contact email]. Use the subject line `Security report: Smart Resume AI`.

Please include:

- a clear description of the problem and its impact (what an attacker could do);
- the affected page, API route or file, and the commit or deployment you tested;
- step-by-step instructions to reproduce it, with a proof of concept if possible;
- any suggested fix.

Do **not** include real personal data, passwords or API keys in your report. If you accidentally obtained someone's data while testing, stop, do not keep or share it, and tell us.

## What to expect

This is a small team, so these are targets, not guarantees:

- acknowledgement within **7 days**;
- an initial assessment within **14 days**;
- we will keep you informed, fix confirmed issues as quickly as we reasonably can, and credit you in the release notes if you wish.

We do not run a paid bug bounty program.

## Scope

In scope:

- authentication, sessions and access control (for example reading or changing another user's data, or reaching admin functions without permission);
- injection (SQL, script, prompt injection that bypasses the documented safeguards);
- file upload handling, resume parsing and AI request handling;
- exposure of secrets, personal data or internal configuration;
- security misconfiguration in the code and documented deployment steps.

Out of scope:

- denial-of-service or volume-based attacks, and automated scanning that generates heavy traffic;
- social engineering or phishing of maintainers or users, and physical attacks;
- findings that need a compromised device or browser;
- missing best-practice headers without a demonstrated impact;
- vulnerabilities in third-party services (Vercel, Neon, Google Gemini, job or course providers) - please report those to the provider;
- the results of scraping or unofficial third-party endpoints that we do not control.

## Rules for testing

- Test only with accounts you created yourself, and never access, modify or delete data that is not yours.
- Do not degrade the service for others and do not run load tests.
- Give us reasonable time to fix an issue before you disclose it publicly.

We will not take legal action against researchers who follow these rules and report in good faith.

## Handling of secrets

Never commit API keys, database URLs or session secrets. If you find a secret in this repository or its history, report it privately. Maintainers will revoke and rotate the secret immediately.
