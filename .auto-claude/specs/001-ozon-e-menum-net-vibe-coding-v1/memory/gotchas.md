# Gotchas & Pitfalls

Things to watch out for in this codebase.

## [2026-01-14 08:01]
Next.js 15 with App Router: useSearchParams() can return null during prerendering. Always use optional chaining: searchParams?.get('key')

_Context: Multiple files needed fixing for TypeScript errors during build_

## [2026-01-14 08:01]
QRCode library toBuffer is Node.js only. Use dynamic import for server-only functions to prevent client-side bundling issues

_Context: lib/qrcode/generator.ts had to use dynamic import for toBuffer_
