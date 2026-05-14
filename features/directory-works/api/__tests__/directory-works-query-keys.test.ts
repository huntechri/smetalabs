import { describe, expect, it } from "vitest"
import {
  directoryWorksCacheTags,
  directoryWorksQueryKeys,
} from "../directory-works-query-keys"

describe("directory works query keys", () => {
  it("compacts empty params in query keys", () => {
    expect(
      directoryWorksQueryKeys.list({
        q: "",
        status: "active",
        cursor: undefined,
      })
    ).toEqual(["directoryWorks", { status: "active" }])

    expect(
      directoryWorksQueryKeys.aiSearch({
        query: "кирпич",
        category: "",
        limit: 10,
      })
    ).toEqual(["directoryWorksAiSearch", { query: "кирпич", limit: 10 }])
  })

  it("builds workspace-scoped cache tags", () => {
    expect(directoryWorksCacheTags.list("owner-1")).toBe(
      "directory-works:owner-1"
    )
    expect(directoryWorksCacheTags.detail("owner-1", "work-1")).toBe(
      "directory-work:owner-1:work-1"
    )
    expect(directoryWorksCacheTags.aiSearchIndex("owner-1")).toBe(
      "directory-works-ai:owner-1:index"
    )
  })
})
