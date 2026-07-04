/**
 * 邮件转发服务 — 将用户反馈通过 SMTP 发送至管理员邮箱
 *
 * 配置方式（环境变量）：
 *   SMTP_HOST      — SMTP 服务器地址，如 smtp.qq.com
 *   SMTP_PORT      — SMTP 端口，默认 465
 *   SMTP_USER      — 发件邮箱地址
 *   SMTP_PASS      — 发件邮箱授权码（非登录密码）
 *   NOTIFY_EMAIL   — 接收通知的邮箱地址
 *
 * 常用 SMTP：
 *   QQ 邮箱:  host=smtp.qq.com   port=465  (需开启 SMTP 服务获取授权码)
 *   163 邮箱:  host=smtp.163.com  port=465
 *   Gmail:    host=smtp.gmail.com port=587
 */
import nodemailer from 'nodemailer'

interface FeedbackData {
  type: 'bug' | 'feature' | 'general'
  message: string
  email?: string
  page: string
  userAgent: string
  createdAt: string
}

const TYPE_LABELS: Record<string, string> = {
  bug: '🐛 Bug 报告',
  feature: '💡 功能建议',
  general: '💬 其他反馈',
}

function buildHtml(entry: FeedbackData): string {
  return `
<div style="font-family:system-ui,sans-serif;max-width:600px;padding:20px">
  <h2 style="color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:8px">
    ${TYPE_LABELS[entry.type] || '反馈'}
  </h2>
  <table style="width:100%;border-collapse:collapse;margin:12px 0">
    <tr><td style="color:#64748b;padding:4px 12px 4px 0;white-space:nowrap;vertical-align:top">类型</td><td style="padding:4px 0">${TYPE_LABELS[entry.type]}</td></tr>
    <tr><td style="color:#64748b;padding:4px 12px 4px 0;white-space:nowrap;vertical-align:top">页面</td><td style="padding:4px 0">${entry.page}</td></tr>
    <tr><td style="color:#64748b;padding:4px 12px 4px 0;white-space:nowrap;vertical-align:top">时间</td><td style="padding:4px 0">${entry.createdAt}</td></tr>
    ${entry.email ? `<tr><td style="color:#64748b;padding:4px 12px 4px 0;white-space:nowrap;vertical-align:top">邮箱</td><td style="padding:4px 0">${entry.email}</td></tr>` : ''}
    <tr><td style="color:#64748b;padding:4px 12px 4px 0;white-space:nowrap;vertical-align:top">UA</td><td style="padding:4px 0;font-size:12px;color:#94a3b8">${entry.userAgent}</td></tr>
  </table>
  <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-top:12px">
    <p style="margin:0;white-space:pre-wrap;line-height:1.7;color:#334155">${entry.message}</p>
  </div>
  <p style="color:#94a3b8;font-size:12px;margin-top:20px">此邮件由 PDF Elf 自动发送</p>
</div>`
}

function buildText(entry: FeedbackData): string {
  return [
    `[${TYPE_LABELS[entry.type]}]`,
    `页面: ${entry.page}`,
    `时间: ${entry.createdAt}`,
    entry.email ? `邮箱: ${entry.email}` : '',
    ``,
    entry.message,
    ``,
    `---`,
    `UA: ${entry.userAgent}`,
    `此邮件由 PDF Elf 自动发送`,
  ].join('\n')
}

/**
 * 发送反馈邮件通知。所有 SMTP 配置从环境变量读取，
 * 如果未配置 SMTP_HOST，则静默跳过（不报错）。
 */
export async function sendFeedbackEmail(entry: FeedbackData): Promise<boolean> {
  const host = process.env.SMTP_HOST
  if (!host) {
    console.log('[mail] SMTP_HOST not configured, email notification skipped')
    return false
  }

  const port = Number(process.env.SMTP_PORT) || 465
  const user = process.env.SMTP_USER || ''
  const pass = process.env.SMTP_PASS || ''
  const to = process.env.NOTIFY_EMAIL || user

  if (!user || !pass) {
    console.warn('[mail] SMTP_USER or SMTP_PASS not configured, email notification skipped')
    return false
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465=SSL, 其他=STARTTLS
      auth: { user, pass },
    })

    const subject = `[PDF Elf] ${TYPE_LABELS[entry.type]} — ${entry.page}`

    await transporter.sendMail({
      from: user,
      to,
      subject,
      text: buildText(entry),
      html: buildHtml(entry),
    })

    console.log(`[mail] Feedback email sent to ${to}`)
    return true
  } catch (e: any) {
    console.error(`[mail] Failed to send email: ${e.message}`)
    return false
  }
}
