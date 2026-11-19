// `prepublishOnly`: releases come from the release workflow on a `v*` tag, never from a laptop (EXP-10).
// The workflow sets RELEASE_FROM_CI; it also checks that the tag matches package.json before publishing.
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.RELEASE_FROM_CI !== 'true') {
  console.error(
    '[vue-graphql-explorer] Publishing is done by .github/workflows/release.yml on a v* tag. ' +
      'Push a tag (git tag v1.2.3 && git push origin v1.2.3) instead of running npm publish.',
  );
  process.exit(1);
}
