import { Router } from 'express'
import { body } from 'express-validator'
import { validateInput, authenticate } from '../middleware/index.js'
import {
  sendVerificationCode,
  verifyCode,
  resendVerificationCode,
  checkEmailVerification
} from '../controllers/emailVerificationController.js'
import {
  register,
  login,
  logout,
  refreshToken,
  getProfile,
  updateProfile
} from '../controllers/authController.js'

const router = Router()

const emailRule = body('email').isEmail().normalizeEmail().withMessage('请输入有效的邮箱地址')

// ---------- 邮箱验证 ----------
router.post('/send-verification-code', [emailRule, validateInput], sendVerificationCode)

router.post(
  '/verify-code',
  [
    emailRule,
    body('code')
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage('验证码必须为 6 位数字'),
    validateInput
  ],
  verifyCode
)

router.post(
  '/resend-verification-code',
  [emailRule, validateInput],
  resendVerificationCode
)

router.post(
  '/check-email-verification',
  [
    emailRule,
    body('verificationToken').notEmpty().withMessage('验证 token 不能为空'),
    validateInput
  ],
  checkEmailVerification
)

// ---------- 注册 / 登录 ----------
router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('用户名长度为 3-20 个字符')
      .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/)
      .withMessage('用户名只能包含字母、数字、下划线和中文'),
    emailRule,
    body('password')
      .isLength({ min: 6, max: 20 })
      .withMessage('密码长度为 6-20 个字符')
      .matches(/^(?=.*[a-zA-Z])(?=.*\d).+$/)
      .withMessage('密码必须同时包含字母和数字'),
    body('verificationToken').notEmpty().withMessage('验证 token 不能为空'),
    validateInput
  ],
  register
)

router.post(
  '/login',
  [emailRule, body('password').notEmpty().withMessage('密码不能为空'), validateInput],
  login
)

router.post('/logout', authenticate, logout)
router.post('/refresh', refreshToken)

router.get('/profile', authenticate, getProfile)
router.patch(
  '/profile',
  authenticate,
  [
    body('username').optional().trim().isLength({ min: 3, max: 20 }).withMessage('用户名长度不合法'),
    body('bio').optional().isLength({ max: 500 }).withMessage('简介最多 500 个字符'),
    body('avatar').optional().isString().withMessage('头像必须是字符串'),
    validateInput
  ],
  updateProfile
)

export default router
