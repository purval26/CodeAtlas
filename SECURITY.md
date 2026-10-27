# Security Policy

The CodeAtlas team takes the security of our application and user data seriously.

---

## ✦ Supported Versions

| Version | Supported          |
| :---    | :---               |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## ✦ Reporting a Vulnerability

If you discover a security vulnerability in CodeAtlas, please do **NOT** open a public issue.

Instead, please report it privately:

1. **Email**: Send details to `purvalradadiya@gmail.com` with the subject line `[SECURITY] CodeAtlas Vulnerability Report`.
2. **Details to Include**:
   - Description of the vulnerability and its potential impact.
   - Steps to reproduce the issue or proof-of-concept code.
   - Any relevant browser, Node.js version, or environment context.

### Response Timeline
- We will acknowledge receipt of your vulnerability report within **48 hours**.
- We will provide a status update or fix verification within **5 business days**.

---

## ✦ Security Design Principles in CodeAtlas

1. **Client-Side API Key Storage**: User-entered API keys are stored strictly in client browser `localStorage` and sent over HTTPS only to your chosen provider via CodeAtlas proxy.
2. **Server-Side Citation Validation**: Every LLM citation is verified against real parsed source files before display, preventing malicious injection of arbitrary paths or external scripts.
3. **Bounded Context Protection**: The retrieval system only feeds repository files that match the requested query, respecting file-size and token limits to protect against memory exhaustion.
