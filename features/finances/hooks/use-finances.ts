"use client"

import { useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useProjectEstimateContent } from "@/features/estimates/hooks/use-project-estimate-content"
import {
  fetchEstimatePayments,
  addProjectEstimatePayment,
  updateProjectEstimatePayment,
  deleteProjectEstimatePayment,
} from "@/features/finances/api/finances-client"
import { fetchEstimatePurchases } from "@/features/purchases/api/purchases-client"
import type { FinanceSection, FinancePayment } from "@/features/finances/types"
import type { PurchaseRow } from "@/types/purchase"
import type { ProjectEstimateContentRecord } from "@/types/project-estimate-content"

interface UseFinancesResult {
  sections: FinanceSection[]
  payments: FinancePayment[]
  loading: boolean
  loadError: string | null
  refetch: () => Promise<void>
  addPayment: (payment: Omit<FinancePayment, "paymentId">) => void
  updatePayment: (paymentId: string, updates: Partial<Omit<FinancePayment, "paymentId">>) => void
  deletePayment: (paymentId: string) => void
  record: ProjectEstimateContentRecord | null
  totalPurchasesAmount: number
}

const financesQueryKeys = {
  all: ["estimatePayments"] as const,
  list: (projectId: string, estimateId: string) =>
    [...financesQueryKeys.all, "list", projectId, estimateId] as const,
}

const EMPTY_PURCHASES: PurchaseRow[] = []

export function useFinances(projectId: string, estimateId: string): UseFinancesResult {
  const queryClient = useQueryClient()
  const queryKey = financesQueryKeys.list(projectId, estimateId)

  const {
    content,
    loading: estimateLoading,
    loadError: estimateError,
    refetch: refetchEstimate,
  } = useProjectEstimateContent(projectId, estimateId)

  // Fetch payments list
  const paymentsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetchEstimatePayments({ projectId, estimateId })
      return response.data
    },
    staleTime: 10_000,
  })

  const payments = useMemo(() => paymentsQuery.data ?? [], [paymentsQuery.data])

  // Fetch purchases list for actual materials sum
  const purchasesQuery = useQuery({
    queryKey: ["estimatePurchases", "list", { projectId, estimateId }],
    queryFn: () => fetchEstimatePurchases({ projectId, estimateId }),
    staleTime: 30_000,
  })

  const purchasesData: PurchaseRow[] | null = purchasesQuery.data?.data ?? null

  const fallbackPurchases: PurchaseRow[] = purchasesData !== null ? purchasesData : EMPTY_PURCHASES
  const totalPurchasesAmount = fallbackPurchases.reduce((sum: number, p: PurchaseRow) => sum + (p.factTotal ?? 0), 0)

  // Mutations with Optimistic UI updates
  const addMutation = useMutation({
    mutationFn: (input: Omit<FinancePayment, "paymentId">) =>
      addProjectEstimatePayment(projectId, estimateId, input),
    onMutate: async (newPaymentData) => {
      await queryClient.cancelQueries({ queryKey })
      const previousPayments = queryClient.getQueryData<FinancePayment[]>(queryKey) || []

      const tempPayment: FinancePayment = {
        ...newPaymentData,
        paymentId: `temp-${Date.now()}`,
        isPending: true,
      }

      queryClient.setQueryData<FinancePayment[]>(queryKey, [...previousPayments, tempPayment])

      return { previousPayments }
    },
    onError: (err: Error, newPayment, context) => {
      if (context?.previousPayments) {
        queryClient.setQueryData(queryKey, context.previousPayments)
      }
      toast.error(err.message || "Не удалось добавить платёж")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
    onSuccess: () => {
      toast.success("Платёж успешно добавлен")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      paymentId,
      input,
    }: {
      paymentId: string
      input: Partial<Omit<FinancePayment, "paymentId">>
    }) => updateProjectEstimatePayment(projectId, estimateId, paymentId, input),
    onMutate: async ({ paymentId, input }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousPayments = queryClient.getQueryData<FinancePayment[]>(queryKey) || []

      const updatedPayments = previousPayments.map((p) =>
        p.paymentId === paymentId ? { ...p, ...input, isUpdating: true } : p
      )

      queryClient.setQueryData<FinancePayment[]>(queryKey, updatedPayments)

      return { previousPayments }
    },
    onError: (err: Error, variables, context) => {
      if (context?.previousPayments) {
        queryClient.setQueryData(queryKey, context.previousPayments)
      }
      toast.error(err.message || "Не удалось сохранить платёж")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
    onSuccess: () => {
      toast.success("Платёж сохранён")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (paymentId: string) =>
      deleteProjectEstimatePayment(projectId, estimateId, paymentId),
    onMutate: async (paymentId) => {
      await queryClient.cancelQueries({ queryKey })
      const previousPayments = queryClient.getQueryData<FinancePayment[]>(queryKey) || []

      const updatedPayments = previousPayments.map((p) =>
        p.paymentId === paymentId ? { ...p, isDeleting: true } : p
      )

      queryClient.setQueryData<FinancePayment[]>(queryKey, updatedPayments)

      return { previousPayments }
    },
    onError: (err: Error, paymentId, context) => {
      if (context?.previousPayments) {
        queryClient.setQueryData(queryKey, context.previousPayments)
      }
      toast.error(err.message || "Не удалось удалить платёж")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
    onSuccess: () => {
      toast.success("Платёж удалён")
    },
  })

  const addPayment = (paymentData: Omit<FinancePayment, "paymentId">) => {
    const mappedData = {
      ...paymentData,
      sectionId: paymentData.sectionId === "general_advance" ? null : paymentData.sectionId,
    }
    addMutation.mutate(mappedData)
  }

  const updatePayment = (
    paymentId: string,
    updates: Partial<Omit<FinancePayment, "paymentId">>
  ) => {
    const mappedUpdates = {
      ...updates,
      ...(updates.sectionId !== undefined
        ? { sectionId: updates.sectionId === "general_advance" ? null : updates.sectionId }
        : {}),
    }
    updateMutation.mutate({ paymentId, input: mappedUpdates })
  }

  const deletePayment = (paymentId: string) => {
    deleteMutation.mutate(paymentId)
  }

  // Merge database estimate sections with payments from the DB
  const sections = useMemo<FinanceSection[]>(() => {
    const dbSections = content?.sections ?? []

    // Build a set of all stage material IDs and map each material ID to its section ID
    const materialIdToSectionId = new Map<string, string>()
    dbSections.forEach((sec) => {
      sec.works?.forEach((w) => {
        w.materials?.forEach((mat) => {
          if (mat.id) {
            materialIdToSectionId.set(mat.id, sec.id)
          }
        })
      })
    })

    // Map normal stages
    const mappedSections: FinanceSection[] = dbSections.map((sec) => {
      const secPayments = payments.filter((p) => p.sectionId === sec.id)
      const factAmount = secPayments
        .filter((p) => !p.isDeleting && (p.status === "conducted" || p.status === "processing"))
        .reduce((sum, p) => sum + p.amount, 0)

      // Work execution expenses
      const workExecutionExpenses = sec.works?.reduce((sum, w) => sum + (w.factTotalAmount ?? 0), 0) ?? 0

      // Purchases expenses (materials belonging to this section)
      const materialPurchasesExpenses = fallbackPurchases
        .filter((p: PurchaseRow) => p.materialId && materialIdToSectionId.get(p.materialId) === sec.id)
        .reduce((sum: number, p: PurchaseRow) => sum + (p.factTotal ?? 0), 0)

      const totalExpenses = workExecutionExpenses + materialPurchasesExpenses

      return {
        sectionId: sec.id,
        title: sec.title,
        planAmount: sec.totalAmount,
        payments: secPayments,
        expenses: totalExpenses,
        balance: factAmount - totalExpenses,
      }
    })

    // Always append virtual section for general payments
    const generalPayments = payments.filter(
      (p) => p.sectionId === null || p.sectionId === undefined || p.sectionId === "general_advance"
    )
    const generalFactAmount = generalPayments
      .filter((p) => !p.isDeleting && (p.status === "conducted" || p.status === "processing"))
      .reduce((sum, p) => sum + p.amount, 0)

    // General expenses = total purchases minus the ones associated with specific stages
    const stageSpecificPurchasesAmount = fallbackPurchases
      .filter((p: PurchaseRow) => p.materialId && materialIdToSectionId.has(p.materialId))
      .reduce((sum: number, p: PurchaseRow) => sum + (p.factTotal ?? 0), 0)

    const generalExpenses = Math.max(0, totalPurchasesAmount - stageSpecificPurchasesAmount)

    mappedSections.push({
      sectionId: "general_advance",
      title: "Общие авансы (вне этапов)",
      planAmount: 0,
      payments: generalPayments,
      expenses: generalExpenses,
      balance: generalFactAmount - generalExpenses,
    })

    return mappedSections
  }, [content?.sections, payments, fallbackPurchases, totalPurchasesAmount])

  const refetch = async () => {
    await refetchEstimate()
    await paymentsQuery.refetch()
    await purchasesQuery.refetch()
  }

  const purchasesError = purchasesQuery.error instanceof Error ? purchasesQuery.error.message : null
  const loadError = estimateError || (paymentsQuery.error instanceof Error ? paymentsQuery.error.message : null) || purchasesError

  return {
    sections,
    payments,
    loading: estimateLoading || (paymentsQuery.isLoading && !paymentsQuery.data) || (purchasesQuery.isLoading && !purchasesQuery.data), // Prevent loading skeleton on refetch/mutate
    loadError,
    refetch,
    addPayment,
    updatePayment,
    deletePayment,
    record: content?.record ?? null,
    totalPurchasesAmount,
  }
}
