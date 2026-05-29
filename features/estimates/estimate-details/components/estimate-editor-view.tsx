"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  fetchProjectEstimateMaterialOptions,
  fetchProjectEstimateWorkOptions,
} from "@/features/estimates/api/project-estimate-content-client"
import { EstimateWorkCoefficientDialog } from "./estimate-work-coefficient-dialog"
import { EstimateImportDialog } from "@/features/estimates/components/estimate-import-dialog"
import { exportEstimateToExcel } from "@/features/estimates/lib/estimate-excel-exporter"
import { CreateSectionDialog } from "@/features/estimates/estimate-details/components/create-section-dialog"
import { EstimateEditorContext } from "@/features/estimates/estimate-details/components/estimate-editor-context"
import { EstimateEmptyState } from "@/features/estimates/estimate-details/components/estimate-empty-state"
import { EstimateMaterialPickerDialog } from "@/features/estimates/estimate-details/components/estimate-material-picker-dialog"
import { EstimateSectionCard } from "@/features/estimates/estimate-details/components/estimate-section-card"
import { EstimateWorkPickerDialog } from "@/features/estimates/estimate-details/components/estimate-work-picker-dialog"
import { projectsQueryKeys } from "@/features/projects/api/projects-query-keys"
import { useEstimateEditorState } from "@/features/estimates/estimate-details/hooks/use-estimate-editor-state"

export function EstimateEditorView({
  projectId,
  recordId,
}: {
  projectId: string
  recordId: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    content,
    loading,
    loadError,
    mutationError,
    saving,
    savingIds,
    sectionOpen,
    coefficientOpen,
    workDialog,
    materialDialog,
    archiveRequest,
    workSearch,
    materialSearch,
    importOpen,
    estimateSearch,
    searchActive,
    deferredSearch,
    visibleSections,
    sectionIndexMap,
    workParams,
    materialParams,
    canSearchWorks,
    canSearchMaterials,
    addedWorkCodes,
    addedMaterialCodes,
    setWorkSearch,
    setMaterialSearch,
    setImportOpen,
    setArchiveRequest,
    applyWorkCoefficient,
    refetch,
    save,
    moveSection,
    moveWork,
    openWorkDialog,
    openReplaceWorkDialog,
    openMaterialDialog,
    confirmArchive,
    createSection,
    addDirectoryWork,
    replaceDirectoryWork,
    addDirectoryMaterial,
    handleSectionOpenChange,
    handleCoefficientOpenChange,
    handleWorkPickerOpenChange,
    handleMaterialPickerOpenChange,
    handleArchiveOpenChange,
    handleWorkSelect,
    handleMaterialSelect,
  } = useEstimateEditorState(projectId, recordId)

  React.useEffect(() => {
    const handleExport = () => {
      if (content) {
        exportEstimateToExcel(content)
      }
    }
    window.addEventListener("project-estimate:export", handleExport)
    return () => {
      window.removeEventListener("project-estimate:export", handleExport)
    }
  }, [content])

  const workOptions = useQuery({
    queryKey: projectsQueryKeys.estimateWorkOptions(
      projectId,
      recordId,
      workParams
    ),
    queryFn: () =>
      fetchProjectEstimateWorkOptions({
        projectId,
        recordId,
        params: workParams,
      }),
    enabled: workDialog.open && canSearchWorks,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  })

  const materialOptions = useQuery({
    queryKey: projectsQueryKeys.estimateMaterialOptions(
      projectId,
      recordId,
      materialParams
    ),
    queryFn: () =>
      fetchProjectEstimateMaterialOptions({
        projectId,
        recordId,
        params: materialParams,
      }),
    enabled: materialDialog.open && canSearchMaterials,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  })

  const clearEstimateSearch = React.useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("q")
    router.replace(pathname + (params.size ? `?${params.toString()}` : ""))
  }, [pathname, router, searchParams])

  const contextValue = React.useMemo(
    () => ({
      savingIds,
      reorderDisabled: searchActive,
      onSave: save,
      onArchive: setArchiveRequest,
      onMoveSection: moveSection,
      onMoveWork: moveWork,
      onAddSection: () => handleSectionOpenChange(true),
      onAddWork: openWorkDialog,
      onAddMaterial: openMaterialDialog,
      onReplaceWork: openReplaceWorkDialog,
    }),
    [
      savingIds,
      searchActive,
      save,
      setArchiveRequest,
      moveSection,
      moveWork,

      openWorkDialog,
      openMaterialDialog,
      openReplaceWorkDialog,
    ]
  )

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-md" />
        ))}
      </div>
    )
  }

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Ошибка загрузки сметы</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-3">
          <p>{loadError}</p>
          <Button onClick={() => refetch()} variant="outline" className="w-fit">
            Повторить
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const isEmpty = visibleSections.length === 0
  const hasNoData =
    content?.sections.length === 0 ||
    (content?.sections.length === 1 && content?.sections[0]?.worksAmount === 0)

  return (
    <EstimateEditorContext.Provider value={contextValue}>
      <div className="@container/estimate flex min-h-full flex-col">
        {mutationError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Ошибка сохранения</AlertTitle>
            <AlertDescription>{mutationError}</AlertDescription>
          </Alert>
        ) : null}

        {hasNoData && !searchActive ? (
          <EstimateEmptyState onCreateClick={() => openWorkDialog("")} />
        ) : isEmpty && searchActive ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed py-12 text-center">
            <h3 className="text-sm font-medium">Ничего не найдено</h3>
            <p className="text-sm text-muted-foreground">
              По запросу «{deferredSearch}» ничего не найдено.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={clearEstimateSearch}
            >
              Сбросить поиск
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 pb-32 lg:gap-8">
            {visibleSections.map((section) => (
              <EstimateSectionCard
                key={section.id}
                section={section}
                sectionIndex={sectionIndexMap.get(section.id) ?? 0}
                sectionsCount={content?.sections.length ?? 0}
              />
            ))}
          </div>
        )}

        <CreateSectionDialog
          open={sectionOpen}
          onOpenChange={handleSectionOpenChange}
          onConfirm={({ name }) => createSection(name)}
        />
        <EstimateWorkPickerDialog
          state={workDialog}
          saving={saving}
          query={workSearch}
          onQueryChange={setWorkSearch}
          options={workOptions.data?.data ?? []}
          loading={workOptions.isLoading}
          addedCodes={addedWorkCodes}
          onOpenChange={handleWorkPickerOpenChange}
          onSelect={handleWorkSelect}
          onDirectorySubmit={addDirectoryWork}
        />
        <EstimateMaterialPickerDialog
          state={materialDialog}
          saving={saving}
          query={materialSearch}
          onQueryChange={setMaterialSearch}
          options={materialOptions.data?.data ?? []}
          loading={materialOptions.isLoading}
          addedCodes={addedMaterialCodes}
          onOpenChange={handleMaterialPickerOpenChange}
          onSelect={handleMaterialSelect}
          onDirectorySubmit={addDirectoryMaterial}
        />
        <EstimateWorkCoefficientDialog
          open={coefficientOpen}
          onOpenChange={handleCoefficientOpenChange}
          projectId={projectId}
          recordId={recordId}
          saving={saving}
          applyWorkCoefficient={applyWorkCoefficient}
        />

        <AlertDialog
          open={archiveRequest !== null}
          onOpenChange={handleArchiveOpenChange}
        >
          <AlertDialogContent className="sm:max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>{archiveRequest?.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {archiveRequest?.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={confirmArchive}>
                Архивировать
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <EstimateImportDialog
          projectId={projectId}
          recordId={recordId}
          open={importOpen}
          onOpenChange={setImportOpen}
          onImportSuccess={refetch}
        />
      </div>
    </EstimateEditorContext.Provider>
  )
}
