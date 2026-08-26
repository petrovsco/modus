## Before committing/pushing a change the user can see

A passing build only proves the code compiles. It does not prove the feature
works. If the change touches anything a person can see or click, open the app
and check it before pushing.

**When this applies:** any change to UI, a user flow, a chart or visual, or a
number that gets rendered on screen. Skip it for docs-only, test-only, tooling,
or pure refactors with no visible effect — and say which one you're skipping and
why.

**How:**

- Start the dev server (e.g. `npm run dev`), then drive it with the Playwright
  browser rather than describing what *should* happen.
- Walk the actual path a user takes to reach the change — not just the screen it
  lives on. If a value is logged on one tab and read on another, check both.
- Take a screenshot of the changed area and include what you saw in the summary.
- Check the browser console for errors while you're there.

**Report honestly.** If you could not run it, say so plainly and say what is
therefore unverified. Never write "verified" for something you only reasoned
about.
