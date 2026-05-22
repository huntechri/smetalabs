import { supabase } from "@/db"
import { insertNotification, type InsertNotificationParams, type DbNotification } from "./notifications.repository"

// Типы настроек из user_settings.notifications
export interface UserNotificationPreferences {
  projectUpdates?: boolean
  estimateUpdates?: boolean
  procurementUpdates?: boolean
  teamInvitations?: boolean
  billingNotifications?: boolean
  weeklySummary?: boolean
}

// Карта соответствия типов событий и ключей настроек пользователя
const EVENT_TYPE_TO_PREFERENCE_KEY: Record<string, keyof UserNotificationPreferences> = {
  // Уведомления проектов
  project_created: "projectUpdates",
  project_updated: "projectUpdates",
  project_deleted: "projectUpdates",
  // Уведомления смет
  estimate_created: "estimateUpdates",
  estimate_updated: "estimateUpdates",
  estimate_approved: "estimateUpdates",
  estimate_rejected: "estimateUpdates",
  estimate_deleted: "estimateUpdates",
  // Уведомления закупок
  procurement_created: "procurementUpdates",
  procurement_updated: "procurementUpdates",
  procurement_approved: "procurementUpdates",
  procurement_cancelled: "procurementUpdates",
  // Приглашения
  team_invitation_created: "teamInvitations",
  team_invitation_accepted: "teamInvitations",
  // Биллинг
  billing_invoice_created: "billingNotifications",
  billing_limit_reached: "billingNotifications",
}

/**
 * Проверка настроек уведомлений пользователя.
 */
async function checkUserPreference(
  userId: string,
  eventType: string
): Promise<boolean> {
  const prefKey = EVENT_TYPE_TO_PREFERENCE_KEY[eventType]
  if (!prefKey) {
    // Если тип события не привязан к конкретной настройке, разрешаем по умолчанию
    return true
  }

  try {
    const { data, error } = await supabase
      .from("user_settings")
      .select("notifications")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      console.error("[NotificationsService] Error loading user preferences:", error)
      return true // В случае ошибки разрешаем
    }

    if (!data || !data.notifications) {
      return true // По умолчанию все уведомления включены
    }

    const preferences = data.notifications as UserNotificationPreferences
    const isEnabled = preferences[prefKey]

    // Если настройка явно задана, возвращаем её значение. Если нет — разрешаем по умолчанию.
    return isEnabled !== false
  } catch (err) {
    console.error("[NotificationsService] Exception in checkUserPreference:", err)
    return true
  }
}

/**
 * Модульный интерфейс транспорта отправки писем.
 */
export interface EmailTransporter {
  sendEmail(params: {
    to: string
    title: string
    body: string
    link?: string | null
  }): Promise<void>
}

// Простейший консольный логгер писем (в продакшене заменяется на Resend/SendGrid)
const consoleEmailTransporter: EmailTransporter = {
  async sendEmail({ to, title, body, link }) {
    console.log(`\n========================================\n[EMAIL SENDER] Sending mail to: ${to}\nSubject: ${title}\nBody: ${body}\nLink: ${link || "None"}\n========================================\n`)
  },
}

/**
 * Основной класс для отправки уведомлений.
 */
export class NotificationsService {
  private emailTransporter: EmailTransporter

  constructor(emailTransporter: EmailTransporter = consoleEmailTransporter) {
    this.emailTransporter = emailTransporter
  }

  /**
   * Отправка уведомления пользователю.
   * Проверяет настройки, записывает в БД (in-app) и отправляет на email (если включено).
   */
  async dispatchNotification(
    params: InsertNotificationParams
  ): Promise<DbNotification | null> {
    const { recipientId, workspaceOwnerId, actorId, type, title, body, link, metadata } = params

    // 1. Проверяем настройки получателя
    const isEnabled = await checkUserPreference(recipientId, type)
    if (!isEnabled) {
      console.log(
        `[NotificationsService] Notification of type '${type}' for user ${recipientId} is disabled by preferences.`
      )
      return null
    }

    // 2. Записываем в БД (In-App уведомление)
    let dbRecord: DbNotification
    try {
      dbRecord = await insertNotification({
        recipientId,
        workspaceOwnerId,
        actorId,
        type,
        title,
        body,
        link,
        metadata,
      })
      console.log(`[NotificationsService] In-app notification created: ${dbRecord.id}`)
    } catch (err) {
      console.error("[NotificationsService] Error writing notification to DB:", err)
      return null
    }

    // 3. Отправка email уведомления (если тип события предполагает email)
    // Для простоты отправляем email для критических событий (приглашения, одобрения смет, биллинг)
    // или если настройки пользователя разрешают.
    const shouldSendEmail = ["team_invitation_created", "billing_limit_reached", "estimate_approved"].includes(type)

    if (shouldSendEmail) {
      try {
        // Мы вытаскиваем email из auth.users. Поскольку у нас бэкенд,
        // мы можем сделать служебный запрос в auth.admin.getUserById().
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(recipientId)
        
        if (authError) {
          console.error(`[NotificationsService] Error fetching user auth data:`, authError)
        }

        const email = authUser?.user?.email

        if (email) {
          await this.emailTransporter.sendEmail({
            to: email,
            title,
            body,
            link,
          })
        } else {
          console.warn(`[NotificationsService] Email for user ${recipientId} not found, skipping email dispatch.`)
        }
      } catch (emailErr) {
        console.error("[NotificationsService] Error sending email:", emailErr)
      }
    }

    return dbRecord
  }
}

// Экспортируем дефолтный инстанс сервиса
export const notificationsService = new NotificationsService()
