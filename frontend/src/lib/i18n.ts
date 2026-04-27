import type { Language } from '@/types/survey'

type Translations = {
  [key: string]: string
}

const en: Translations = {
  // Navigation
  'nav.home': 'Home',
  'nav.admin': 'Admin',

  // Landing page
  'landing.title': 'Training Landscape Study',
  'landing.subtitle': 'The Financial Academy Strategy Refresh',
  'landing.description':
    'Help shape the future of financial services training in Saudi Arabia. Your insights are invaluable.',
  'landing.cta': 'Begin Survey',
  'landing.language': 'العربية',

  // Verification
  'verify.title': 'Verify Your Identity',
  'verify.subtitle': 'Enter your email address to receive a verification code.',
  'verify.email.label': 'Email address',
  'verify.email.placeholder': 'your.email@organization.com',
  'verify.submit': 'Send Verification Code',
  'verify.otp.title': 'Enter Verification Code',
  'verify.otp.description': 'We sent a 6-digit code to {email}. Enter it below.',
  'verify.otp.label': 'Verification Code',
  'verify.otp.placeholder': '000000',
  'verify.otp.submit': 'Verify',
  'verify.otp.resend': 'Resend code',
  'verify.error.invalid': 'Invalid or expired code. Please try again.',
  'verify.success': 'Identity verified successfully.',

  // Survey overview
  'survey.overview.title': 'Survey Overview',
  'survey.overview.start': 'Start Survey',
  'survey.overview.role': 'Your Role',
  'survey.overview.org': 'Organization',
  'survey.overview.questions': 'questions',

  // Survey form
  'survey.required': '* Required',
  'survey.optional': 'Optional',
  'survey.other': 'Other (please specify)',
  'survey.next': 'Next Section',
  'survey.prev': 'Previous',
  'survey.save': 'Save Progress',
  'survey.saving': 'Saving...',
  'survey.saved': 'Progress saved',
  'survey.section': 'Section {current} of {total}',

  // Review
  'review.title': 'Review Your Answers',
  'review.description': 'Please review your answers before submitting.',
  'review.submit': 'Submit Survey',
  'review.back': 'Edit Answers',
  'review.warning': 'Once submitted, your responses cannot be changed without administrator assistance.',

  // Thank you
  'thankyou.title': 'Thank You',
  'thankyou.description': 'Your responses have been submitted successfully.',
  'thankyou.ref': 'Reference',

  // Errors
  'error.required': 'This field is required.',
  'error.generic': 'An error occurred. Please try again.',
  'error.network': 'Network error. Please check your connection.',

  // Admin
  'admin.login.title': 'Admin Portal',
  'admin.login.subtitle': 'The Financial Academy Survey Platform',
  'admin.login.email': 'Email',
  'admin.login.password': 'Password',
  'admin.login.submit': 'Sign In',
  'admin.nav.dashboard': 'Dashboard',
  'admin.nav.organizations': 'Organizations',
  'admin.nav.contacts': 'Contacts',
  'admin.nav.surveys': 'Surveys',
  'admin.nav.submissions': 'Submissions',
  'admin.nav.cms': 'CMS',
  'admin.nav.settings': 'Settings',
  'admin.nav.logout': 'Sign Out',

  // Role labels
  'role.ceo': 'CEO / Executive Level',
  'role.chro': 'CHRO / Head of Human Capital',
  'role.ld': 'L&D Leader / Head of L&D',
}

const ar: Translations = {
  // Navigation
  'nav.home': 'الرئيسية',
  'nav.admin': 'لوحة التحكم',

  // Landing page
  'landing.title': 'دراسة مشهد التدريب',
  'landing.subtitle': 'تحديث استراتيجية الأكاديمية المالية',
  'landing.description':
    'ساهم في تشكيل مستقبل تدريب الخدمات المالية في المملكة العربية السعودية. آراؤك ذات قيمة لا تُقدَّر.',
  'landing.cta': 'ابدأ الاستطلاع',
  'landing.language': 'English',

  // Verification
  'verify.title': 'التحقق من هويتك',
  'verify.subtitle': 'أدخل بريدك الإلكتروني لاستلام رمز التحقق.',
  'verify.email.label': 'البريد الإلكتروني',
  'verify.email.placeholder': 'your.email@organization.com',
  'verify.submit': 'إرسال رمز التحقق',
  'verify.otp.title': 'أدخل رمز التحقق',
  'verify.otp.description': 'أرسلنا رمزًا مكونًا من 6 أرقام إلى {email}. أدخله أدناه.',
  'verify.otp.label': 'رمز التحقق',
  'verify.otp.placeholder': '000000',
  'verify.otp.submit': 'تحقق',
  'verify.otp.resend': 'إعادة إرسال الرمز',
  'verify.error.invalid': 'الرمز غير صحيح أو منتهي الصلاحية. يرجى المحاولة مجددًا.',
  'verify.success': 'تم التحقق من هويتك بنجاح.',

  // Survey overview
  'survey.overview.title': 'نظرة عامة على الاستطلاع',
  'survey.overview.start': 'ابدأ الاستطلاع',
  'survey.overview.role': 'دورك',
  'survey.overview.org': 'المؤسسة',
  'survey.overview.questions': 'سؤال',

  // Survey form
  'survey.required': '* مطلوب',
  'survey.optional': 'اختياري',
  'survey.other': 'أخرى (يرجى التحديد)',
  'survey.next': 'القسم التالي',
  'survey.prev': 'السابق',
  'survey.save': 'حفظ التقدم',
  'survey.saving': 'جارٍ الحفظ...',
  'survey.saved': 'تم حفظ التقدم',
  'survey.section': 'القسم {current} من {total}',

  // Review
  'review.title': 'مراجعة إجاباتك',
  'review.description': 'يرجى مراجعة إجاباتك قبل الإرسال.',
  'review.submit': 'إرسال الاستطلاع',
  'review.back': 'تعديل الإجابات',
  'review.warning': 'بعد الإرسال، لا يمكن تغيير إجاباتك إلا بمساعدة المسؤول.',

  // Thank you
  'thankyou.title': 'شكرًا لك',
  'thankyou.description': 'تم إرسال إجاباتك بنجاح.',
  'thankyou.ref': 'المرجع',

  // Errors
  'error.required': 'هذا الحقل مطلوب.',
  'error.generic': 'حدث خطأ. يرجى المحاولة مرة أخرى.',
  'error.network': 'خطأ في الشبكة. يرجى التحقق من اتصالك.',

  // Admin
  'admin.login.title': 'بوابة الإدارة',
  'admin.login.subtitle': 'منصة استطلاع الأكاديمية المالية',
  'admin.login.email': 'البريد الإلكتروني',
  'admin.login.password': 'كلمة المرور',
  'admin.login.submit': 'تسجيل الدخول',
  'admin.nav.dashboard': 'لوحة التحكم',
  'admin.nav.organizations': 'المؤسسات',
  'admin.nav.contacts': 'جهات الاتصال',
  'admin.nav.surveys': 'الاستطلاعات',
  'admin.nav.submissions': 'الاستجابات',
  'admin.nav.cms': 'إدارة المحتوى',
  'admin.nav.settings': 'الإعدادات',
  'admin.nav.logout': 'تسجيل الخروج',

  // Role labels
  'role.ceo': 'الرئيس التنفيذي / المستوى التنفيذي',
  'role.chro': 'مدير الموارد البشرية / رئيس رأس المال البشري',
  'role.ld': 'قائد التعلم والتطوير',
}

const messages: Record<Language, Translations> = { en, ar }

export function t(key: string, lang: Language, vars?: Record<string, string | number>): string {
  let msg = messages[lang][key] ?? messages['en'][key] ?? key
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      msg = msg.replace(`{${k}}`, String(v))
    })
  }
  return msg
}

export function getTranslation<T extends { language_code: string }>(
  items: T[],
  lang: Language
): T | undefined {
  return items.find((i) => i.language_code === lang) ?? items.find((i) => i.language_code === 'en')
}
