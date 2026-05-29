import { randomUUID } from "crypto"
import { revalidateTag } from "next/cache"
import { supabase } from "@/db"
import { projectsCacheTags } from "../api/projects-query-keys"
import { ProjectsApiError } from "../api/projects-errors"
import { requireProjectsWriteContext } from "./projects.service"

export type ImportEstimateRow = {
  sectionTitle: string | null
  type: "section" | "work" | "material"
  code: string | null
  title: string
  unitLabel: string | null
  quantity: number | null
  price: number | null
  consumption: number | null
  notes: string | null
  imageUrl?: string | null
}

export async function importProjectEstimateContent(
  projectId: string,
  recordId: string,
  rows: ImportEstimateRow[]
) {
  const context = await requireProjectsWriteContext()
  const workspaceOwnerId = context.workspaceOwnerId
  const userId = context.userId

  // 1. Verify record exists and belongs to workspace
  const { data: record, error: recordError } = await supabase
    .from("project_estimate_records")
    .select("id")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("project_id", projectId)
    .eq("id", recordId)
    .is("archived_at", null)
    .is("deleted_at", null)
    .maybeSingle()

  if (recordError) throw recordError
  if (!record) {
    throw new ProjectsApiError("NOT_FOUND", "Смета не найдена", 404)
  }

  // 2. Pre-fetch existing directory materials to match by code
  const codesToLookup = Array.from(
    new Set(
      rows
        .filter((r) => r.type === "material" && r.code?.trim())
        .map((r) => r.code!.trim())
    )
  )

  const directoryMaterialMap = new Map<
    string,
    { id: string; version: number; imageUrl: string | null }
  >()

  if (codesToLookup.length > 0) {
    const { data: matchedMaterials, error: matchError } = await supabase
      .from("directory_materials")
      .select("id, code, version, image_url")
      .eq("workspace_owner_id", workspaceOwnerId)
      .in("code", codesToLookup)
      .is("deleted_at", null)

    if (!matchError && matchedMaterials) {
      matchedMaterials.forEach((m) => {
        if (m.code) {
          directoryMaterialMap.set(m.code, {
            id: m.id,
            version: m.version,
            imageUrl: m.image_url,
          })
        }
      })
    }
  }

  const materialsToUpdateImage: { id: string; image_url: string }[] = []
  const materialsToInsertInDirectory: any[] = []

  // 3. Parse flat rows into hierarchy
  const sections: {
    id: string
    title: string
    sortOrder: number
    works: {
      id: string
      title: string
      code: string | null
      unitLabel: string
      quantity: number
      price: number
      notes: string | null
      sortOrder: number
      materials: {
        id: string
        title: string
        code: string | null
        directoryMaterialId: string | null
        directoryMaterialVersion: number | null
        unitLabel: string
        quantity: number
        consumption: number | null
        price: number
        notes: string | null
        sortOrder: number
      }[]
    }[]
  }[] = []

  let currentSection: (typeof sections)[number] | null = null
  let currentWork: (typeof sections)[number]["works"][number] | null = null

  let sectionCount = 0
  let workCount = 0
  let materialCount = 0

  for (const row of rows) {
    const title = row.title?.trim()
    if (!title) continue

    if (row.type === "section") {
      sectionCount += 1
      currentSection = {
        id: randomUUID(),
        title,
        sortOrder: sectionCount * 1000,
        works: [],
      }
      sections.push(currentSection)
      currentWork = null
    } else if (row.type === "work") {
      if (!currentSection) {
        sectionCount += 1
        currentSection = {
          id: randomUUID(),
          title: row.sectionTitle?.trim() || "Без раздела",
          sortOrder: sectionCount * 1000,
          works: [],
        }
        sections.push(currentSection)
      }
      workCount += 1
      const unit = row.unitLabel?.trim() || "шт"
      currentWork = {
        id: randomUUID(),
        title,
        code: row.code?.trim() || null,
        unitLabel: unit,
        quantity: row.quantity ?? 0,
        price: row.price ?? 0,
        notes: row.notes?.trim() || null,
        sortOrder: workCount * 1000,
        materials: [],
      }
      currentSection.works.push(currentWork)
    } else if (row.type === "material") {
      if (!currentWork) {
        if (!currentSection) {
          sectionCount += 1
          currentSection = {
            id: randomUUID(),
            title: row.sectionTitle?.trim() || "Без раздела",
            sortOrder: sectionCount * 1000,
            works: [],
          }
          sections.push(currentSection)
        }
        workCount += 1
        currentWork = {
          id: randomUUID(),
          title: "Вспомогательные работы",
          code: null,
          unitLabel: "шт",
          quantity: 1,
          price: 0,
          notes: null,
          sortOrder: workCount * 1000,
          materials: [],
        }
        currentSection.works.push(currentWork)
      }
      materialCount += 1
      const unit = row.unitLabel?.trim() || "шт"
      const code = row.code?.trim() || null
      const importedImageUrl = row.imageUrl?.trim() || null

      let directoryMaterialId: string | null = null
      let directoryMaterialVersion: number | null = null

      if (code) {
        const matched = directoryMaterialMap.get(code)
        if (matched) {
          directoryMaterialId = matched.id
          directoryMaterialVersion = matched.version

          // If imported imageUrl is provided but DB has none, queue image update
          if (importedImageUrl && !matched.imageUrl) {
            materialsToUpdateImage.push({
              id: matched.id,
              image_url: importedImageUrl,
            })
            matched.imageUrl = importedImageUrl // Update cached representation
          }
        } else if (importedImageUrl) {
          // If code not found in directory but has image url, auto-create directory material
          const newId = randomUUID()
          const normName = title.trim().toLowerCase().replace(/\s+/g, " ")
          const dedupe = code

          materialsToInsertInDirectory.push({
            id: newId,
            workspace_owner_id: workspaceOwnerId,
            name: title,
            normalized_name: normName,
            unit_code: unit.toLowerCase(),
            unit_label: unit,
            price_amount: row.price ?? 0,
            currency_code: "RUB",
            category:
              row.sectionTitle?.trim() || currentSection?.title || "Материалы",
            code: code,
            image_url: importedImageUrl,
            dedupe_fingerprint: dedupe,
            search_text: normName,
            status: "active",
            version: 1,
            created_by: userId,
            updated_by: userId,
          })

          directoryMaterialId = newId
          directoryMaterialVersion = 1

          // Save to local map to avoid double inserts in same session
          directoryMaterialMap.set(code, {
            id: newId,
            version: 1,
            imageUrl: importedImageUrl,
          })
        }
      }

      currentWork.materials.push({
        id: randomUUID(),
        title,
        code,
        directoryMaterialId,
        directoryMaterialVersion,
        unitLabel: unit,
        quantity: row.quantity ?? 0,
        consumption: row.consumption ?? null,
        price: row.price ?? 0,
        notes: row.notes?.trim() || null,
        sortOrder: materialCount * 1000,
      })
    }
  }

  // 4. Create new and update existing directory materials
  if (materialsToInsertInDirectory.length > 0) {
    const { error: dirInsertError } = await supabase
      .from("directory_materials")
      .insert(materialsToInsertInDirectory)
    if (dirInsertError) throw dirInsertError
  }

  if (materialsToUpdateImage.length > 0) {
    await Promise.all(
      materialsToUpdateImage.map(async (item) => {
        await supabase
          .from("directory_materials")
          .update({ image_url: item.image_url })
          .eq("workspace_owner_id", workspaceOwnerId)
          .eq("id", item.id)
      })
    )
  }

  // 5. Clear existing sections (cascade deletes works/materials)
  const { error: deleteError } = await supabase
    .from("project_estimate_sections")
    .delete()
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("project_id", projectId)
    .eq("estimate_record_id", recordId)

  if (deleteError) throw deleteError

  // 6. Batch insert new items
  const sectionsData = sections.map((sec, idx) => ({
    id: sec.id,
    workspace_owner_id: workspaceOwnerId,
    project_id: projectId,
    estimate_record_id: recordId,
    title: sec.title,
    number: String(idx + 1),
    sort_order: sec.sortOrder,
    created_by: userId,
    updated_by: userId,
  }))

  const worksData: any[] = []
  const materialsData: any[] = []

  sections.forEach((sec, secIdx) => {
    sec.works.forEach((work, workIdx) => {
      worksData.push({
        id: work.id,
        workspace_owner_id: workspaceOwnerId,
        project_id: projectId,
        estimate_record_id: recordId,
        section_id: sec.id,
        number: `${secIdx + 1}.${workIdx + 1}`,
        code: work.code,
        title: work.title,
        unit_code: work.unitLabel.toLowerCase(),
        unit_label: work.unitLabel,
        quantity: work.quantity,
        price: work.price,
        notes: work.notes,
        sort_order: work.sortOrder,
        created_by: userId,
        updated_by: userId,
      })

      work.materials.forEach((mat, matIdx) => {
        materialsData.push({
          id: mat.id,
          workspace_owner_id: workspaceOwnerId,
          project_id: projectId,
          estimate_record_id: recordId,
          section_id: sec.id,
          work_id: work.id,
          number: `${secIdx + 1}.${workIdx + 1}.${matIdx + 1}`,
          code: mat.code,
          directory_material_id: mat.directoryMaterialId,
          directory_material_version: mat.directoryMaterialVersion,
          title: mat.title,
          unit_code: mat.unitLabel.toLowerCase(),
          unit_label: mat.unitLabel,
          quantity: mat.quantity,
          consumption: mat.consumption,
          price: mat.price,
          notes: mat.notes,
          sort_order: mat.sortOrder,
          created_by: userId,
          updated_by: userId,
        })
      })
    })
  })

  if (sectionsData.length > 0) {
    const { error: sectionInsertErr } = await supabase
      .from("project_estimate_sections")
      .insert(sectionsData)
    if (sectionInsertErr) throw sectionInsertErr
  }

  if (worksData.length > 0) {
    const { error: workInsertErr } = await supabase
      .from("project_estimate_works")
      .insert(worksData)
    if (workInsertErr) throw workInsertErr
  }

  if (materialsData.length > 0) {
    const { error: materialInsertErr } = await supabase
      .from("project_estimate_materials")
      .insert(materialsData)
    if (materialInsertErr) throw materialInsertErr
  }

  // 7. Revalidate Cache
  revalidateTag(
    `projects:${workspaceOwnerId}:detail:${projectId}:estimate-records`,
    "max"
  )
  revalidateTag(projectsCacheTags.detail(workspaceOwnerId, projectId), "max")
  revalidateTag(projectsCacheTags.list(workspaceOwnerId), "max")

  return { success: true }
}
