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

  // Group Registration — public form
  'gr.title': 'Group Registration Form',
  'gr.subtitle': 'Technical Learning Offerings – Bulk Submission by Training Academies / L&D Departments',
  'gr.description': 'This form enables Training Academies, HR Development teams, and L&D departments to submit bulk nominations for technical training programs offered by the Financial Academy.',
  'gr.cta': 'Start Registration',
  'gr.section1': 'Organization Details',
  'gr.org_name': 'Organization / Bank',
  'gr.department': 'Requester: Training Academy / L&D Department / Business Function',
  'gr.focal_name': 'Focal Point Name',
  'gr.focal_position': 'Focal Point Position',
  'gr.email': 'Email Address',
  'gr.mobile': 'Mobile Number',
  'gr.section2': 'Sector / Functional Area Selection',
  'gr.sector': 'Sector',
  'gr.functional_area': 'Functional Area',
  'gr.section3': 'Bulk Learning Needs & Nominations',
  'gr.section3_note': 'For each program you wish to nominate participants for, insert details in the table below.',
  'gr.add_row': 'Add Training Request',
  'gr.col_sector': 'Sector',
  'gr.col_area': 'Functional Area',
  'gr.col_code': 'Course Code',
  'gr.col_title': 'Course Title',
  'gr.col_mode': 'Delivery Mode',
  'gr.col_quarter': 'Preferred Quarter',
  'gr.col_nominations': 'No. of Nominations',
  'gr.select_sector': '— Select Sector —',
  'gr.select_area': '— Select Area —',
  'gr.select_course': '— Select Course —',
  'gr.section4': 'Special Requests',
  'gr.special_requests': 'Any special requirements or additional information',
  'gr.section5': 'Authorization',
  'gr.submitted_by': 'Submitted By',
  'gr.pdpl': 'I hereby confirm that all information provided is accurate and complete. I authorize the Financial Academy to use, analyze, and securely store this data in accordance with the Personal Data Protection Law (PDPL) of the Kingdom of Saudi Arabia.',
  'gr.submit': 'Submit – Digital Approval',
  'gr.submitting': 'Submitting…',
  'gr.success_title': 'Registration Submitted Successfully',
  'gr.success_desc': 'The Financial Academy will review your nominations and propose a delivery schedule.',
  'gr.ref_label': 'Reference Number',

  // Admin group registration nav
  'admin.nav.group_registration': 'Group Registration',
  'admin.nav.training_courses': 'Course Catalog',
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

  // Group Registration — public form (Arabic)
  'gr.title': 'نموذج التسجيل الجماعي',
  'gr.subtitle': 'العروض التعليمية التقنية – تقديم جماعي من أكاديميات التدريب / أقسام التعلم والتطوير',
  'gr.description': 'يُمكّن هذا النموذج أكاديميات التدريب وفرق تطوير الموارد البشرية وأقسام التعلم والتطوير من تقديم ترشيحات جماعية للبرامج التدريبية التقنية التي تقدمها الأكاديمية المالية.',
  'gr.cta': 'بدء التسجيل',
  'gr.section1': 'بيانات المنظمة',
  'gr.org_name': 'المنظمة / البنك',
  'gr.department': 'مقدم الطلب: أكاديمية التدريب / قسم التعلم والتطوير / وظيفة الأعمال',
  'gr.focal_name': 'اسم جهة الاتصال',
  'gr.focal_position': 'منصب جهة الاتصال',
  'gr.email': 'البريد الإلكتروني',
  'gr.mobile': 'رقم الجوال',
  'gr.section2': 'اختيار القطاع / المجال الوظيفي',
  'gr.sector': 'القطاع',
  'gr.functional_area': 'المجال الوظيفي',
  'gr.section3': 'احتياجات التعلم الجماعية والترشيحات',
  'gr.section3_note': 'لكل برنامج تودّ ترشيح مشاركين له، أدخل التفاصيل في الجدول أدناه.',
  'gr.add_row': 'إضافة طلب تدريبي',
  'gr.col_sector': 'القطاع',
  'gr.col_area': 'المجال الوظيفي',
  'gr.col_code': 'رمز الدورة',
  'gr.col_title': 'اسم الدورة',
  'gr.col_mode': 'أسلوب التنفيذ',
  'gr.col_quarter': 'الربع المفضل',
  'gr.col_nominations': 'عدد المرشحين',
  'gr.select_sector': '— اختر القطاع —',
  'gr.select_area': '— اختر المجال —',
  'gr.select_course': '— اختر الدورة —',
  'gr.section4': 'طلبات خاصة',
  'gr.special_requests': 'أي متطلبات خاصة أو معلومات إضافية',
  'gr.section5': 'التفويض',
  'gr.submitted_by': 'مقدم الطلب',
  'gr.pdpl': 'أقر بأن جميع المعلومات المقدمة دقيقة وكاملة. كما أفوّض الأكاديمية المالية باستخدام هذه البيانات وتحليلها وتخزينها بأمان وفقاً لنظام حماية البيانات الشخصية (PDPL) في المملكة العربية السعودية.',
  'gr.submit': 'إرسال – الموافقة الرقمية',
  'gr.submitting': 'جارٍ الإرسال…',
  'gr.success_title': 'تم تقديم التسجيل بنجاح',
  'gr.success_desc': 'ستراجع الأكاديمية المالية ترشيحاتك وتقترح جدولاً زمنياً للتنفيذ.',
  'gr.ref_label': 'الرقم المرجعي',

  // Admin group registration nav
  'admin.nav.group_registration': 'التسجيل الجماعي',
  'admin.nav.training_courses': 'كتالوج الدورات',
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
