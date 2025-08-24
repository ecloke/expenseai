export interface UserConfig {
  id: string
  telegram_bot_token: string | null
  telegram_bot_username: string | null
  gemini_api_key: string | null
}

export interface BotSession {
  bot_username: string
  is_active: boolean
  last_activity: string
}

export interface Expense {
  id: string
  receipt_date: string
  store_name: string
  category: string
  total_amount: number
  created_at: string
}