const branch = process.env.VERCEL_GIT_COMMIT_REF ?? ""
const primaryBranches = new Set(["master", "main"])

if (primaryBranches.has(branch)) {
  console.log(`Building primary branch: ${branch}`)
  process.exit(1)
}

console.log(`Ignoring Vercel build for non-primary branch: ${branch || "unknown"}`)
process.exit(0)
