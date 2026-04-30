"""
Seed survey questions from the TFA Training Landscape Study Excel files.
Clears existing questions for the target survey and recreates all 29 from the Excel source.

Run inside the backend container:
    python scripts/seed_survey_questions.py
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy.orm import Session
from sqlalchemy import select, delete as sa_delete
from app.core.database import SessionLocal
from app.models.survey import (
    Survey, SurveySection, Question, QuestionTranslation,
    QuestionOption, OptionTranslation, QuestionVisibilityRule,
)

SURVEY_SLUG = 'tfa-training-landscape-2025'

# ─── Question definitions ─────────────────────────────────────────────────────
# Each entry:
#   key          : unique question_key
#   type         : 'open_text' | 'single_choice'
#   roles        : subset of ['ceo','chro','ld']
#   module       : section label
#   en / ar      : question text
#   opts         : list of (en_text, ar_text) tuples  (empty for open_text)
#   other        : True → add has_open_text_option
# ─────────────────────────────────────────────────────────────────────────────

QUESTIONS = [
    {
        'key': 'q01_training_headcount',
        'type': 'open_text',
        'roles': ['ceo', 'chro', 'ld'],
        'module': 'Budget',
        'en': 'Approximately how many employees (a range is fine) are included in your annual training agenda?',
        'ar': 'كم عدد الموظفين تقريباً (لا بأس بذكر نطاق معين) المدرجين في برنامج التدريب السنوي الخاص بكم؟',
        'opts': [],
        'other': False,
    },
    {
        'key': 'q02_ld_budget',
        'type': 'open_text',
        'roles': ['ceo', 'chro', 'ld'],
        'module': 'Budget',
        'en': 'What is your approximate annual L&D budget (provide range in SAR)?',
        'ar': 'ما هي ميزانيتك السنوية التقريبية للتدريب والتطوير (يرجى تحديد النطاق بالريال السعودي)؟',
        'opts': [],
        'other': False,
    },
    {
        'key': 'q03_ld_proportion',
        'type': 'single_choice',
        'roles': ['chro', 'ld'],
        'module': 'Budget',
        'en': 'What proportion of total L&D spend is allocated to financial services-specific training versus enterprise-wide or cross-functional programs?',
        'ar': 'ما هي نسبة إجمالي الإنفاق على التعلم والتطوير المخصصة للتدريب الخاص بالخدمات المالية مقابل البرامج على مستوى المؤسسة أو البرامج متعددة الوظائف؟',
        'opts': [
            ('Financial services-specific training accounts for less than 25% of total L&D spend.',
             'تمثل التدريبات الخاصة بالخدمات المالية أقل من 25% من إجمالي الإنفاق على التعلم والتطوير.'),
            ('Financial services-specific training accounts for 25% to 49% of total L&D spend.',
             'تمثل التدريبات الخاصة بالخدمات المالية ما بين 25% إلى 49% من إجمالي الإنفاق على التعلم والتطوير.'),
            ('Financial services-specific training accounts for 50% to 74% of total L&D spend.',
             'تمثل التدريبات الخاصة بالخدمات المالية ما بين 50% إلى 74% من إجمالي الإنفاق على التعلم والتطوير.'),
            ('Financial services-specific training accounts for 75% or more of total L&D spend.',
             'تمثل التدريبات الخاصة بالخدمات المالية 75% أو أكثر من إجمالي الإنفاق على التعلم والتطوير.'),
        ],
        'other': True,
    },
    {
        'key': 'q04_build_vs_buy',
        'type': 'single_choice',
        'roles': ['ceo', 'chro'],
        'module': 'Budget',
        'en': 'What share of training is delivered internally versus through external providers?',
        'ar': 'ما نسبة التدريب الذي يتم تقديمه داخلياً مقارنةً بمقدمي الخدمات الخارجيين؟',
        'opts': [
            ('Mostly internal delivery (75%+ internal)',    'معظم عمليات التسليم داخلية (75%+ داخلي)'),
            ('Internal-led mix (50%-74% internal)',         'مزيج بقيادة داخلية (50%-74% داخلي)'),
            ('External-led mix (50%-74% external)',         'مزيج بقيادة خارجية (50%-74% خارجي)'),
            ('Mostly external delivery (75%+ external)',    'معظم عمليات التسليم خارجية (أكثر من 75٪ خارجية)'),
        ],
        'other': True,
    },
    {
        'key': 'q05_overseas_vs_incountry',
        'type': 'single_choice',
        'roles': ['chro', 'ld'],
        'module': 'Budget',
        'en': 'How much is spending overseas vs. in country?',
        'ar': 'كم تبلغ نسبة الإنفاق على التدريب خارج المملكة مقارنة بالإنفاق داخلها؟',
        'opts': [
            ('0–20% overseas / 80–100% in-country',  '0-20% في الخارج / 80-100% داخل المملكة'),
            ('21–40% overseas / 60–79% in-country',  '21-40% في الخارج / 60-79% داخل المملكة'),
            ('41–60% overseas / 40–59% in-country',  '41-60% في الخارج / 40-59% داخل المملكة'),
            ('61–80% overseas / 20–39% in-country',  '61-80% في الخارج / 20-39% داخل المملكة'),
            ('81–100% overseas / 0–19% in-country',  '81-100% في الخارج / 0-19% داخل المملكة'),
        ],
        'other': False,
    },
    {
        'key': 'q06_economic_impact',
        'type': 'single_choice',
        'roles': ['ceo', 'chro', 'ld'],
        'module': 'Budget',
        'en': "How do current economic challenges impact your organization's training and development plans over the coming years?",
        'ar': 'كيف تؤثر التحديات الاقتصادية الحالية على خطط التدريب والتطوير الخاصة بمؤسستكم خلال السنوات القادمة؟',
        'opts': [
            ('No significant impact; plans remain unchanged',
             'لا يوجد تأثير يُذكر؛ تبقى الخطط دون تغيير'),
            ('Moderate impact; selective prioritization of critical programs',
             'تأثير متوسط؛ تحديد أولويات انتقائية للبرامج الحيوية'),
            ('Significant impact; budget reductions and scaling back initiatives',
             'تأثير كبير؛ تخفيضات في الميزانية وتقليص المبادرات'),
            ('Strategic shift; increased focus on efficiency, reskilling, and high-impact programs',
             'تحول استراتيجي؛ تركيز متزايد على الكفاءة، وإعادة تأهيل المهارات، والبرامج ذات التأثير الكبير'),
        ],
        'other': True,
    },
    {
        'key': 'q07_budget_reduction',
        'type': 'single_choice',
        'roles': ['ceo', 'chro', 'ld'],
        'module': 'Budget',
        'en': 'If a budget reduction is planned, what percentage decrease is expected?',
        'ar': 'إذا تم التخطيط لخفض الميزانية، فما هي النسبة المئوية المتوقعة للانخفاض؟',
        'opts': [
            ('0–10%',         '0–10%'),
            ('11–20%',        '11–20%'),
            ('21–30%',        '21–30%'),
            ('More than 30%', 'أكثر من 30%'),
        ],
        'other': True,
    },
    {
        'key': 'q08_participant_levels',
        'type': 'single_choice',
        'roles': ['chro', 'ld'],
        'module': 'Audience',
        'en': 'What is the distribution of training participants across levels (C-suite, middle management, junior)?',
        'ar': 'ما هو توزيع المشاركين في التدريب عبر المستويات (الإدارة العليا، والإدارة الوسطى، والمستويات المبتدئة)؟',
        'opts': [
            ('Majority of participants are entry-level or early-career employees.',
             'أغلبية المشاركين هم موظفون مبتدئون أو في بداية حياتهم المهنية.'),
            ('Junior employees dominate, with moderate participation from middle management.',
             'يهيمن الموظفون المبتدئون على المشهد، مع مشاركة معتدلة من الإدارة الوسطى.'),
            ('Participants are relatively evenly split across junior, middle, and senior levels.',
             'يتوزع المشاركون بالتساوي نسبياً بين المستويات الابتدائية والمتوسطة والثانوية.'),
            ('Majority of participants are middle management and senior leaders, with limited junior participation.',
             'أغلبية المشاركين هم من الإدارة الوسطى وكبار القادة، مع مشاركة محدودة من الموظفين المبتدئين.'),
        ],
        'other': True,
    },
    {
        'key': 'q09_prioritize_levels',
        'type': 'single_choice',
        'roles': ['chro'],
        'module': 'Audience',
        'en': 'Which employee populations do you expect to prioritize for training investment going forward?',
        'ar': 'ما هي فئات الموظفين التي تتوقعون إعطاءها الأولوية في استثمارات التدريب مستقبلاً؟',
        'opts': [
            ('Primarily new hires and entry-level employees',      'في المقام الأول الموظفين الجدد والموظفين المبتدئين'),
            ('Primarily junior and mid-level specialists',         'أخصائيون مبتدئون ومتوسط المستوى بشكل أساسي'),
            ('Primarily experienced managers and functional leads', 'مديرون ذوو خبرة ورؤساء أقسام وظيفية بشكل أساسي'),
            ('Primarily senior leaders and executives',            'في المقام الأول كبار القادة والمديرين التنفيذيين'),
        ],
        'other': True,
    },
    {
        'key': 'q10_training_hours',
        'type': 'single_choice',
        'roles': ['chro', 'ld'],
        'module': 'Audience',
        'en': 'What is the target number of training hours per learner?',
        'ar': 'ما هو العدد المستهدف لساعات التدريب لكل متدرب؟',
        'opts': [
            ('Fewer than 10 training hours per learner per year.',   'أقل من 10 ساعات تدريبية لكل متدرب سنوياً.'),
            ('Around 10–20 training hours per learner per year.',    'حوالي 10-20 ساعة تدريبية لكل متدرب سنوياً.'),
            ('Around 21–40 training hours per learner per year.',    'حوالي 21-40 ساعة تدريبية لكل متدرب سنوياً.'),
            ('More than 40 training hours per learner per year.',    'أكثر من 40 ساعة تدريبية لكل متدرب سنوياً.'),
        ],
        'other': True,
    },
    {
        'key': 'q11_current_providers',
        'type': 'open_text',
        'roles': ['ceo', 'chro', 'ld'],
        'module': 'Current providers',
        'en': 'Which training providers or content partners does your organization currently use most? Please list some of the key provider names.',
        'ar': 'ما هي جهات التدريب أو شركاء المحتوى الذين تستخدمهم مؤسستكم بكثرة حالياً؟ يرجى ذكر بعض أسماء الجهات الرئيسية.',
        'opts': [],
        'other': False,
    },
    {
        'key': 'q12_provider_gaps',
        'type': 'open_text',
        'roles': ['ceo', 'chro', 'ld'],
        'module': 'Current providers',
        'en': 'Where do your current providers underperform or leave gaps? Which capability areas are not adequately served?',
        'ar': 'في أي الجوانب التي لا يلبّي مزودو التدريب الحاليون احتياجاتكم بالشكل المطلوب، أو أين توجد الفجوات؟ ما هي مجالات القدرات التي لا يتم تغطيتها بشكل كافٍ؟',
        'opts': [],
        'other': False,
    },
    {
        'key': 'q13_fa_awareness',
        'type': 'single_choice',
        'roles': ['ceo', 'chro', 'ld'],
        'module': 'The Financial Academy Brand Perception',
        'en': 'When considering external providers for financial services training, how prominent is The Financial Academy in your consideration set?',
        'ar': 'عند النظر في مقدمي الخدمات الخارجية للتدريب على الخدمات المالية، ما مدى حضور الأكاديمية المالية في مجموعة خياراتك؟',
        'opts': [
            ('Not currently considered',                        'لا يعتبر حاليا'),
            ('Occasionally considered for selected needs',      'يُؤخذ في الاعتبار أحيانًا لتلبية احتياجات محددة'),
            ('Frequently shortlisted',                          'يتم ترشيحه بشكل متكرر'),
            ('Top-tier or preferred provider',                  'مقدم خدمة من الدرجة الأولى أو مقدم خدمة مفضل'),
        ],
        'other': True,
    },
    {
        'key': 'q14_fa_improvement',
        'type': 'single_choice',
        'roles': ['chro', 'ld'],
        'module': 'The Financial Academy Brand Perception',
        'en': 'What would need to change for you to be more likely to engage with The Financial Academy?',
        'ar': 'ما الذي يجب أن يتغير لكي تكون أكثر ميلاً للتفاعل مع الأكاديمية المالية؟',
        'opts': [
            ("Greater awareness of The Financial Academy's relevant offerings and capabilities",
             'زيادة الوعي بالعروض والقدرات ذات الصلة التي تقدمها الأكاديمية المالية'),
            ('Stronger evidence of quality, impact, and sector relevance',
             'أدلة أقوى على الجودة والتأثير والملاءمة القطاعية'),
            ("More tailored solutions aligned to our organization's needs",
             'حلول أكثر تخصيصًا تتوافق مع احتياجات مؤسستنا'),
            ('More competitive pricing or more flexible commercial terms',
             'أسعار أكثر تنافسية أو شروط تجارية أكثر مرونة'),
        ],
        'other': True,
    },
    {
        'key': 'q15_fa_product_awareness',
        'type': 'single_choice',
        'roles': ['chro', 'ld'],
        'module': 'The Financial Academy products',
        'en': "What is your level of awareness of The Financial Academy's products and offerings?",
        'ar': 'ما هو مستوى وعيك بمنتجات وعروض الأكاديمية المالية؟',
        'opts': [
            ('Not aware of most offerings',                               'غير مدرك لمعظم العروض'),
            ('Aware, but have not used them',                             'على علم بها، لكن لم أستخدمها'),
            ('Used selectively with mixed results',                       'يستخدم بشكل انتقائي مع نتائج متباينة'),
            ('Used multiple offerings with generally positive experience', 'استخدمت عروضًا متعددة وكانت التجربة بشكل عام إيجابية'),
        ],
        'other': True,
    },
    {
        'key': 'q16_competency_framework',
        'type': 'single_choice',
        'roles': ['chro', 'ld'],
        'module': 'The Financial Academy products',
        'en': "Are you aware of the Financial Academy's competency framework, and do you currently use it?",
        'ar': 'هل أنت على دراية بإطار جدارات الأكاديمية المالية، وهل تستخدمه حاليًا؟',
        'opts': [
            ('Not aware of the competency framework',                              'غير مدرك لإطار الجدارات'),
            ('Aware, but not using it',                                            'على علم بها، لكن لم أستخدمها'),
            ('Using it selectively for specific purposes',                          'استخدام بشكل انتقائي لأغراض محددة'),
            ('Actively using it across multiple HR or L&D processes',              'استخدام بشكل فعال في مختلف عمليات الموارد البشرية أو التدريب والتطوير'),
        ],
        'other': True,
    },
    {
        'key': 'q17_market_reports',
        'type': 'single_choice',
        'roles': ['chro', 'ld'],
        'module': 'The Financial Academy products',
        'en': "Are you aware of the Financial Academy's published market reports or research?",
        'ar': 'هل أنت على علم بتقارير السوق أو الأبحاث المنشورة من قبل الأكاديمية المالية؟',
        'opts': [
            ('Not aware of them',                                              'غير مدرك لهم'),
            ('Aware, but not familiar with the content',                       'على علم بها، لكن لم أستخدمها'),
            ('Familiar with them, but not actively used',                      'مألوف بهم، لكن لا يُستخدمون بشكل نشط'),
            ('Actively used as a reference for decisions or insights',         'يتم استخدامه بنشاط كمصدر للرجوع إليه عند اتخاذ القرارات أو للحصول على رؤى'),
        ],
        'other': True,
    },
    {
        'key': 'q18_graduate_program',
        'type': 'single_choice',
        'roles': ['chro', 'ld'],
        'module': 'The Financial Academy products',
        'en': 'Would you see value in a standardized industry-wide Graduate Development Program or other forms of external support/advisory?',
        'ar': 'هل ترى قيمة في برنامج تطوير خريجين موحد على مستوى الصناعة أو أشكال أخرى من الدعم/الاستشارات الخارجية؟',
        'opts': [
            ('No clear value for our organization',                    'لا قيمة واضحة لمنظمتنا'),
            ('Limited value for selected use cases only',              'قيمة محدودة لحالات الاستخدام المحددة فقط'),
            ('Moderate value as a complementary support',              'قيمة معتدلة كدعم تكميلي'),
            ('High value as a structured solution to improve outcomes', 'قيمة عالية كحل منظم لتحسين النتائج'),
        ],
        'other': True,
    },
    {
        'key': 'q19_training_formats',
        'type': 'single_choice',
        'roles': ['chro', 'ld'],
        'module': 'Delivery model',
        'en': 'What training formats and durations tend to work best?',
        'ar': 'ما أساليب التدريب والمدد التي ترون أنها الأكثر فاعلية؟',
        'opts': [
            ('Short, focused modules',                       'وحدات قصيرة ومركّزة'),
            ('Workshop-based formats',                       'تنسيقات قائمة على ورش العمل'),
            ('Multi-day or multi-week learning journeys',    'رحلات تعليمية متعددة الأيام أو متعددة الأسابيع'),
            ('Academy-style programs',                       'برامج على طراز الأكاديمية'),
        ],
        'other': True,
    },
    {
        'key': 'q20_arabic_delivery',
        'type': 'single_choice',
        'roles': ['chro', 'ld'],
        'module': 'Delivery model',
        'en': 'What is the preference regarding Arabic delivery, bilingual materials, local case studies, or regulator-specific contextualisation?',
        'ar': 'ما تفضيلاتكم بشأن تقديم التدريب باللغة العربية، وتوفير مواد ثنائية اللغة، واستخدام دراسات حالة محلية، أو تخصيص المحتوى بما يتوافق مع سياق الجهات التنظيمية؟',
        'opts': [
            ('English delivery and materials are sufficient',
             'تقديم التدريب والمواد باللغة الإنجليزية كافية'),
            ('English delivery with bilingual materials preferred',
             'يفضل تقديم التدريب باللغة الإنجليزية مع مواد ثنائية اللغة'),
            ('Bilingual delivery with local case studies is required',
             'يُشترط تقديم التدريب بلغتين مع دراسات حالة محلية.'),
            ('Arabic or heavily localised delivery with regulator context is required',
             'مطلوب تقديم المحتوى باللغة العربية أو بنسخة محلية للغاية مع مراعاة السياق التنظيمي'),
        ],
        'other': True,
    },
    {
        'key': 'q21_delivery_format',
        'type': 'single_choice',
        'roles': ['chro', 'ld'],
        'module': 'Delivery model',
        'en': 'What is the current distribution of training delivery across remote, hybrid, and in-person formats?',
        'ar': 'ما هو التوزيع الحالي لأساليب تقديم التدريب لديكم (عن بُعد، حضوري، أو مزيج بينهما)؟',
        'opts': [
            ('Majority of training is delivered fully online (self-paced).',
             'يتم تقديم غالبية التدريب بالكامل عبر الإنترنت (بمعدل تعلم ذاتي).'),
            ('Majority of training is delivered online (synchronised virtual class-room).',
             'يتم تقديم غالبية التدريب عبر الإنترنت (فصل افتراضي متزامن).'),
            ('Remote is dominant, with some hybrid and limited in-person delivery.',
             'التعلم عن بُعد هو السائد، مع بعض التعليم المختلط والمخصص بشكل محدود وجهاً لوجه.'),
            ('Remote, hybrid, and in-person delivery are used in similar proportions.',
             'يتم استخدام التعليم عن بعد والتعليم المختلط والتعليم الحضوري بنسبة متشابهة.'),
            ('Majority of training is delivered in-person or through hybrid formats.',
             'يتم تقديم غالبية التدريب بشكل شخصي أو من خلال الصيغ المختلطة.'),
        ],
        'other': True,
    },
    {
        'key': 'q22_regulatory_proportion',
        'type': 'single_choice',
        'roles': ['ceo', 'chro', 'ld'],
        'module': 'Regulatory',
        'en': 'What proportion of your learning agenda is driven by regulatory or mandatory requirements?',
        'ar': 'ما نسبة برامج التعلّم لديكم التي تُدار أو تُفرض بناءً على متطلبات تنظيمية أو إلزامية؟',
        'opts': [
            ('< 25% of the agenda',     '< 25٪ من جدول الأعمال'),
            ('25%-49% of the agenda',   '25%-49% من جدول الأعمال'),
            ('50%-74% of the agenda',   '50%-74% من جدول الأعمال'),
            ('75%+ of the agenda',      'أكثر من 75٪ من جدول الأعمال'),
        ],
        'other': True,
    },
    {
        'key': 'q23_digital_platforms',
        'type': 'single_choice',
        'roles': ['chro', 'ld'],
        'module': 'Self-provision and EdTech',
        'en': 'Are you currently using digital learning platforms (e.g., Coursera, LinkedIn Learning, edX, or regional equivalents) as part of your training agenda?',
        'ar': 'هل تستخدم حاليًا منصات التعلم الرقمي (Coursera، LinkedIn Learning، edX، وما يعادلها إقليميًا) كجزء من برنامج التدريب الخاص بك؟',
        'opts': [
            ('Not currently using any digital learning platforms',              'لا أستخدم حاليًا أي منصات تعليمية رقمية'),
            ('Using digital platforms on a limited or ad hoc basis',            'استخدام المنصات الرقمية على أساس محدود أو مخصص'),
            ('Using digital platforms regularly as part of the training mix',   'استخدام المنصات الرقمية بانتظام كجزء من مزيج التدريب'),
            ('Digital platforms are a core component of our training strategy', 'تُعد المنصات الرقمية عنصراً أساسياً في استراتيجيتنا التدريبية'),
        ],
        'other': True,
    },
    {
        'key': 'q24_certifications_pct',
        'type': 'single_choice',
        'roles': ['ld'],
        'module': 'Prof Certifications & Exams',
        'en': 'Approximately what percentage of your workforce is currently pursuing or holds employer-sponsored professional certifications?',
        'ar': 'ما النسبة التقريبية من القوى العاملة لديكم التي تسعى حاليًا للحصول على شهادات مهنية ممولة من جهة العمل أو حاصل عليها بالفعل؟',
        'opts': [
            ('< 10% of employees',    '< 10٪ من الموظفين'),
            ('10%-24% of employees',  '10٪-24٪ من الموظفين'),
            ('25%-49% of employees',  '25٪-49٪ من الموظفين'),
            ('50%+ of employees',     'أكثر من 50٪ من الموظفين'),
        ],
        'other': True,
    },
    {
        'key': 'q25_cert_types',
        'type': 'single_choice',
        'roles': ['ld'],
        'module': 'Prof Certifications & Exams',
        'en': 'Which professional certifications, licenses, or exams are most commonly pursued or required in your organization?',
        'ar': 'ما هي الشهادات المهنية أو الرخص أو الامتحانات التي يتم متابعتها أو يتطلبها أكثر في منظمتك؟',
        'opts': [
            ('Primarily regulator-mandated licenses or exams',
             'رخص أو اختبارات مفروضة أساسًا من قبل الجهة المنظمة'),
            ('Primarily role-specific professional certifications',
             'الشهادات المهنية المحددة بشكل أساسي وفق الدور'),
            ('A mix of mandated exams and voluntary professional certifications',
             'مزيج من الامتحانات الإلزامية والشهادات المهنية التطوعية'),
            ('Limited use of formal certifications; most development is training-based',
             'استخدام محدود للشهادات الرسمية؛ معظم التطوير يعتمد على التدريب'),
        ],
        'other': True,
    },
    {
        'key': 'q26_contract_timing',
        'type': 'single_choice',
        'roles': ['ld'],
        'module': 'Commercial fit',
        'en': 'When are most external training decisions typically made in your organization?',
        'ar': 'متى يتم عادة اتخاذ معظم قرارات التدريب الخارجي في مؤسستك؟',
        'opts': [
            ('Once a year during the annual budget cycle',    'مرة واحدة في السنة خلال دورة الميزانية السنوية'),
            ('Twice a year around set budget windows',        'مرتين في السنة حول نوافذ الميزانية المحددة'),
            ('Quarterly or rolling throughout the year',      'ربع سنوي أو متداول طوال السنة'),
            ('Ad hoc as needs arise',                         'حسب الحاجة عند ظهورها'),
        ],
        'other': True,
    },
    {
        'key': 'q27_training_topics',
        'type': 'single_choice',
        'roles': ['chro', 'ld'],
        'module': 'Demand Themes',
        'en': 'What are the most common training topics purchased or delivered over the past 12 months?',
        'ar': 'ما أبرز موضوعات التدريب التي تم تقديمها خلال آخر 12 شهرًا؟',
        'opts': [
            ('Compliance and regulatory',                   'الامتثال واللوائح التنظيمية'),
            ('Technical Financial Services',                'الخدمات المالية التقنية'),
            ('Leadership and management',                   'القيادة والإدارة'),
            ('Digital, data, AI, customer-facing',          'رقمي، بيانات، ذكاء اصطناعي، موجه نحو العملاء'),
        ],
        'other': True,
    },
    {
        'key': 'q28_growing_capabilities',
        'type': 'single_choice',
        'roles': ['chro'],
        'module': 'Demand Themes',
        'en': 'Which capability areas are growing most quickly in priority for your organization right now?',
        'ar': 'ما مجالات القدرات التي تشهد أعلى نمو في الأولوية لدى مؤسستكم حالياً؟',
        'opts': [
            ('Compliance and regulatory',           'الامتثال واللوائح التنظيمية'),
            ('Industry specific knowledge',         'المعرفة الخاصة بالصناعة'),
            ('Digital, data & AI',                  'الرقمية، البيانات والذكاء الاصطناعي'),
            ('Customer-facing & sales',             'التعامل مع العملاء والمبيعات'),
        ],
        'other': True,
    },
    {
        'key': 'q29_capability_gaps_ceo',
        'type': 'single_choice',
        'roles': ['ceo'],
        'module': 'Demand Themes',
        'en': 'Where do you see the biggest capability gaps in your senior team and across your organization that you wish you had more depth in?',
        'ar': 'أين ترى أكبر فجوات القدرات في فريقك الإداري وعبر مؤسستك والتي ترغبون في التعمق فيها أكثر؟',
        'opts': [
            ('Leadership, strategy, and decision-making capabilities',
             'القيادة والاستراتيجية وقدرات اتخاذ القرار'),
            ('Advanced technical or financial-services expertise',
             'الخبرة المتقدمة في المجال التقني أو الخدمات المالية'),
            ('Digital, data, and AI capabilities',
             'القدرات الرقمية والبيانية والذكاء الاصطناعي'),
            ('Commercial, customer, or innovation capabilities',
             'القدرات التجارية أو المتعلقة بالعملاء أو الابتكار'),
        ],
        'other': True,
    },
]


def run(db: Session):
    # 1. Find the survey
    survey = db.execute(select(Survey).where(Survey.slug == SURVEY_SLUG)).scalar_one_or_none()
    if not survey:
        print(f'ERROR: Survey "{SURVEY_SLUG}" not found.')
        return

    print(f'Found survey: {survey.slug} (id={survey.id})')

    # 2. Find or create default section
    section = db.execute(
        select(SurveySection).where(SurveySection.survey_id == survey.id)
    ).scalars().first()
    if not section:
        section = SurveySection(survey_id=survey.id, section_key='main', display_order=0, is_active=True)
        db.add(section)
        db.flush()
        print(f'Created section id={section.id}')
    else:
        print(f'Using section id={section.id}')

    # 3. Delete all existing questions for this survey's sections
    section_ids = [
        r[0] for r in db.execute(
            select(SurveySection.id).where(SurveySection.survey_id == survey.id)
        ).all()
    ]
    existing_q_ids = [
        r[0] for r in db.execute(
            select(Question.id).where(Question.section_id.in_(section_ids))
        ).all()
    ]
    if existing_q_ids:
        print(f'Deleting {len(existing_q_ids)} existing questions...')
        db.execute(sa_delete(Question).where(Question.id.in_(existing_q_ids)))
        db.flush()

    # 4. Create all questions
    for order, qdef in enumerate(QUESTIONS):
        q = Question(
            section_id=section.id,
            question_key=qdef['key'],
            question_type=qdef['type'],
            display_order=order,
            is_required=True,
            is_active=True,
            has_open_text_option=qdef['other'],
            open_text_label_en='Other (please specify)' if qdef['other'] else None,
            open_text_label_ar='أخرى (يرجى التحديد)' if qdef['other'] else None,
            module=qdef.get('module'),
        )
        db.add(q)
        db.flush()

        # Translations
        db.add(QuestionTranslation(question_id=q.id, language_code='en', text=qdef['en']))
        db.add(QuestionTranslation(question_id=q.id, language_code='ar', text=qdef['ar']))

        # Options
        for opt_order, (en_txt, ar_txt) in enumerate(qdef['opts']):
            opt_key = f"{qdef['key']}_opt{opt_order + 1}"
            opt = QuestionOption(
                question_id=q.id,
                option_key=opt_key,
                display_order=opt_order,
                is_active=True,
            )
            db.add(opt)
            db.flush()
            db.add(OptionTranslation(option_id=opt.id, language_code='en', text=en_txt))
            db.add(OptionTranslation(option_id=opt.id, language_code='ar', text=ar_txt))

        # Visibility rules
        for role in qdef['roles']:
            db.add(QuestionVisibilityRule(question_id=q.id, role=role))

        print(f'  Created Q{order + 1}: {qdef["key"]} ({qdef["type"]}, roles={qdef["roles"]}, opts={len(qdef["opts"])}{"+ other" if qdef["other"] else ""})')

    db.commit()
    print(f'\nDone — {len(QUESTIONS)} questions seeded.')


if __name__ == '__main__':
    db = SessionLocal()
    try:
        run(db)
    finally:
        db.close()
