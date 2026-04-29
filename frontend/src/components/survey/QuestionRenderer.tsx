import { useCallback } from 'react'
import { clsx } from 'clsx'
import type { Question, AnswerInput } from '@/types/survey'
import type { Language } from '@/types/survey'
import { getTranslation, t } from '@/lib/i18n'

interface QuestionRendererProps {
  question: Question
  value: AnswerInput | undefined
  onChange: (answer: AnswerInput) => void
  language: Language
}

export function QuestionRenderer({ question, value, onChange, language }: QuestionRendererProps) {
  const trans = getTranslation(question.translations, language)
  const questionText = trans?.text ?? ''
  const helperText = trans?.helper_text

  const openTextLabel =
    language === 'ar'
      ? (question.open_text_label_ar ?? t('survey.other', language))
      : (question.open_text_label_en ?? t('survey.other', language))

  const handleOptionToggle = useCallback(
    (optKey: string) => {
      if (question.question_type === 'single_choice') {
        onChange({
          question_id: question.id,
          selected_option_keys: [optKey],
          open_text_value: optKey === '__open_text__' ? (value?.open_text_value ?? '') : undefined,
        })
      } else {
        const current = value?.selected_option_keys ?? []
        const updated = current.includes(optKey)
          ? current.filter((k) => k !== optKey)
          : [...current, optKey]
        onChange({ question_id: question.id, selected_option_keys: updated })
      }
    },
    [question, value, onChange]
  )

  const isSelected = (key: string) => value?.selected_option_keys?.includes(key) ?? false

  return (
    <fieldset className="mb-8">
      <legend className="text-base font-medium text-tfa-gray-900 mb-1 leading-snug">
        {questionText}
        {question.is_required && (
          <span className="text-red-500 ms-1 text-sm font-normal">{t('survey.required', language)}</span>
        )}
      </legend>

      {helperText && (
        <p className="text-sm text-tfa-gray-500 mb-3">{helperText}</p>
      )}

      {(question.question_type === 'open_text' || question.question_type === 'textarea') && (
        <textarea
          rows={question.question_type === 'textarea' ? 5 : 3}
          value={value?.open_text_value ?? ''}
          onChange={(e) => onChange({ question_id: question.id, open_text_value: e.target.value })}
          placeholder={language === 'ar' ? 'أدخل إجابتك هنا...' : 'Enter your answer here...'}
          className={clsx(
            'w-full rounded-lg border border-tfa-gray-300 bg-white px-3.5 py-2.5 text-sm text-tfa-gray-800',
            'focus:outline-none focus:ring-2 focus:ring-tfa-navy focus:border-tfa-navy',
            'placeholder:text-tfa-gray-400 resize-none'
          )}
        />
      )}

      {question.question_type === 'number' && (
        <input
          type="number"
          value={value?.numeric_value ?? ''}
          onChange={(e) => onChange({ question_id: question.id, numeric_value: e.target.value === '' ? undefined : Number(e.target.value) })}
          placeholder="0"
          className={clsx(
            'w-40 rounded-lg border border-tfa-gray-300 bg-white px-3.5 py-2.5 text-sm text-tfa-gray-800',
            'focus:outline-none focus:ring-2 focus:ring-tfa-navy focus:border-tfa-navy'
          )}
        />
      )}

      {(question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && (
        <div className="space-y-2 mt-2">
          {question.options.map((opt) => {
            const optTrans = getTranslation(opt.translations, language)
            const optText = optTrans?.text ?? opt.option_key
            const selected = isSelected(opt.option_key)

            return (
              <label
                key={opt.id}
                className={clsx(
                  'flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors',
                  selected
                    ? 'border-tfa-navy bg-tfa-gray-100'
                    : 'border-tfa-gray-200 hover:border-tfa-gray-300 bg-white'
                )}
              >
                <input
                  type={question.question_type === 'single_choice' ? 'radio' : 'checkbox'}
                  name={`question-${question.id}`}
                  checked={selected}
                  onChange={() => handleOptionToggle(opt.option_key)}
                  className="mt-0.5 shrink-0 accent-tfa-navy"
                />
                <span className="text-sm text-tfa-gray-800">{optText}</span>
              </label>
            )
          })}

          {question.has_open_text_option && (
            <div>
              <label
                className={clsx(
                  'flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors',
                  isSelected('__open_text__')
                    ? 'border-tfa-navy bg-tfa-gray-100'
                    : 'border-tfa-gray-200 hover:border-tfa-gray-300 bg-white'
                )}
              >
                <input
                  type={question.question_type === 'single_choice' ? 'radio' : 'checkbox'}
                  name={`question-${question.id}`}
                  checked={isSelected('__open_text__')}
                  onChange={() => handleOptionToggle('__open_text__')}
                  className="mt-0.5 shrink-0 accent-tfa-navy"
                />
                <span className="text-sm text-tfa-gray-800 italic">{openTextLabel}</span>
              </label>

              {isSelected('__open_text__') && (
                <textarea
                  rows={2}
                  value={value?.open_text_value ?? ''}
                  onChange={(e) =>
                    onChange({
                      question_id: question.id,
                      selected_option_keys: value?.selected_option_keys,
                      open_text_value: e.target.value,
                    })
                  }
                  className={clsx(
                    'mt-2 w-full rounded-lg border border-tfa-gray-300 px-3.5 py-2.5 text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-tfa-navy focus:border-tfa-navy',
                    'placeholder:text-tfa-gray-400 resize-none'
                  )}
                  placeholder={language === 'ar' ? 'يرجى التحديد...' : 'Please specify...'}
                />
              )}
            </div>
          )}
        </div>
      )}
    </fieldset>
  )
}
