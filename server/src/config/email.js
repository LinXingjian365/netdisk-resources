import nodemailer from 'nodemailer'
import env from './env.js'

let transporter = null

/**
 * 创建邮件传输器。
 *
 * MAIL_TRANSPORT=smtp  -> 真实 SMTP 发信（生产/日常使用）
 * MAIL_TRANSPORT=json  -> nodemailer 内置 jsonTransport，只渲染报文不真正投递，
 *                         仅供自动化测试在没有 SMTP 凭据的环境下跑通完整流程。
 */
export function getTransporter() {
  if (transporter) return transporter

  if (env.MAIL_TRANSPORT === 'json') {
    transporter = nodemailer.createTransport({ jsonTransport: true })
  } else {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined
    })
  }

  return transporter
}

export function getFromAddress() {
  return `"${env.MAIL_FROM_NAME}" <${env.MAIL_FROM_ADDRESS}>`
}

/** 验证码邮件模板（HTML + 纯文本） */
export function buildVerificationEmail(code, expiresInMinutes = 10) {
  const subject = `【${env.MAIL_FROM_NAME}】邮箱验证码`

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,'Microsoft YaHei',sans-serif;">
      <div style="background:#3b82f6;color:#fff;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:22px;">${env.MAIL_FROM_NAME}</h1>
        <p style="margin:6px 0 0;font-size:14px;opacity:.9;">邮箱验证通知</p>
      </div>
      <div style="background:#f9fafb;padding:30px;border-radius:0 0 8px 8px;">
        <p style="color:#333;font-size:16px;margin:0 0 16px;">尊敬的用户，您好！</p>
        <p style="color:#666;font-size:14px;margin:0 0 20px;">
          您正在进行邮箱验证，请勿将验证码告诉任何人。
        </p>
        <div style="background:#fff;border:2px dashed #3b82f6;padding:20px;text-align:center;margin:20px 0;border-radius:4px;">
          <p style="margin:0 0 8px;color:#999;font-size:12px;">您的验证码</p>
          <div style="font-size:32px;font-weight:bold;color:#3b82f6;letter-spacing:8px;font-family:'Courier New',monospace;">${code}</div>
          <p style="margin:10px 0 0;color:#999;font-size:12px;">有效期：${expiresInMinutes} 分钟</p>
        </div>
        <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;margin:20px 0;border-radius:4px;">
          <p style="margin:0;color:#92400e;font-size:12px;">
            ⚠️ <strong>安全提示：</strong>本网站工作人员永远不会向您索要验证码。
          </p>
        </div>
        <p style="color:#666;font-size:14px;">如果您未申请此验证码，请忽略此邮件。</p>
        <div style="border-top:1px solid #e5e7eb;padding-top:15px;color:#999;font-size:12px;">
          <p style="margin:0 0 5px;">${env.MAIL_FROM_NAME}</p>
          <p style="margin:0;">© ${new Date().getFullYear()} 版权所有</p>
        </div>
      </div>
    </div>
  `.trim()

  const text = [
    `您的邮箱验证码是：${code}`,
    '',
    `有效期：${expiresInMinutes} 分钟`,
    '',
    '请勿将验证码告诉任何人。本网站工作人员永远不会向您索要验证码。',
    '如果您未申请此验证码，请忽略此邮件。',
    '',
    `--- ${env.MAIL_FROM_NAME} © ${new Date().getFullYear()} 版权所有`
  ].join('\n')

  return { subject, html, text }
}

/**
 * 发送验证码邮件。
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendVerificationEmail(email, code) {
  const expiresInMinutes = Math.round(env.VERIFICATION_CODE_TTL_SECONDS / 60)
  const { subject, html, text } = buildVerificationEmail(code, expiresInMinutes)

  try {
    const info = await getTransporter().sendMail({
      from: getFromAddress(),
      to: email,
      subject,
      html,
      text
    })
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('[email] 发送失败:', error.message)
    return { success: false, error: error.message }
  }
}

export default { getTransporter, sendVerificationEmail, buildVerificationEmail }
