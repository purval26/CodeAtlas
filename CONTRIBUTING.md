# Contributing to CodeAtlas

Thank you for your interest in contributing to **CodeAtlas**! We welcome contributions to improve architecture visualization, AST dependency parsing, citation validation, code viewer features, and CLI tools.

---

## ✦ Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat all contributors with respect and professionalism.

---

## ✦ Development Workflow

### 1. Fork and Clone
Fork the repository on GitHub, then clone your fork locally:

```bash
git clone https://github.com/<your-username>/CodeAtlas.git
cd CodeAtlas
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:

```env
OPENROUTER_API_KEY="your_api_key_here"
```

*(Note: CodeAtlas works fully offline with local deterministic AST synthesis even without an API key).*

### 4. Run Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the live app.

---

## ✦ Coding Guidelines

1. **TypeScript First**: Ensure all new modules, functions, and interfaces are strongly typed. Avoid using `any` unless explicitly required for dynamic third-party library boundaries.
2. **Swiss Brutalist Aesthetic**: CodeAtlas follows a clean, high-contrast, technical Swiss Brutalist design language:
   - High-contrast monochromatic foundations (`var(--ink)`, `var(--paper)`, `var(--border)`).
   - Crisp 1px / 1.5px / 2px borders.
   - Monospace typography (`font-mono`) for labels, code paths, metrics, and badges.
   - Equalized button and input row heights.
3. **Preserve Documentation Integrity**: Preserve existing comments, docstrings, and architectural invariants.
4. **Clean Builds**: Always verify that your changes compile cleanly before opening a pull request:
   ```bash
   npm run build
   ```

---

## ✦ Commit Message Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` A new feature (e.g. `feat(canvas): add subway line routing`)
- `fix:` A bug fix (e.g. `fix(viewer): resolve line offset scrolling mismatch`)
- `docs:` Documentation changes (e.g. `docs: update CLI roadmap`)
- `refactor:` Code reorganization without behavioral change
- `perf:` Performance optimizations
- `test:` Adding or updating tests
- `chore:` Tooling, dependencies, or configuration updates

---

## ✦ Pull Request Checklist

Before submitting a Pull Request:

- [ ] My code conforms to the project's TypeScript and styling standards.
- [ ] `npm run build` succeeds without TypeScript or Turbopack errors.
- [ ] Any new feature or bugfix is documented or tested.
- [ ] Commits are clean and descriptive.
- [ ] Sensitive keys, `.env*` files, or prototype workspaces are not committed.
