import React, { useState } from 'react'
import { Plus, X, Shield, Wand2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface LibraryRulesInputProps {
  value: string[]
  onChange: (rules: string[]) => void
}

const COMMON_RULES = [
  'Maintain silence inside',
  'No food allowed at desk',
  'Keep phone on silent mode',
  'Keep your desk clean',
  'No sleeping allowed',
  'Carry ID card at all times',
  'No group discussions',
  'Remove shoes outside',
  'Switch off lights when leaving',
  'No reservation of seats'
]

export function LibraryRulesInput({ value, onChange }: LibraryRulesInputProps) {
  const [customRule, setCustomRule] = useState('')

  const handleAddRule = (rule: string) => {
    if (rule && !value.includes(rule)) {
      onChange([...value, rule])
    }
    setCustomRule('')
  }

  const handleRemoveRule = (ruleToRemove: string) => {
    onChange(value.filter(rule => rule !== ruleToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddRule(customRule)
    }
  }

  const suggestedRules = COMMON_RULES.filter(rule => !value.includes(rule))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
        <AnimatePresence>
          {value.map((rule, index) => (
            <motion.span
              key={rule}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm group"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              {rule}
              <button
                type="button"
                onClick={() => handleRemoveRule(rule)}
                className="ml-1 p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        
        <input
          type="text"
          value={customRule}
          onChange={(e) => setCustomRule(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? "Type a rule and press Enter..." : "Add another rule..."}
          className="flex-1 min-w-[200px] bg-transparent border-none text-sm focus:ring-0 placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
        {customRule && (
          <button
            type="button"
            onClick={() => handleAddRule(customRule)}
            className="p-1 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {suggestedRules.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <Wand2 className="w-3 h-3" />
            Quick Add
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedRules.map((rule) => (
              <button
                key={rule}
                type="button"
                onClick={() => handleAddRule(rule)}
                className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-purple-50 dark:bg-gray-800 dark:hover:bg-purple-900/20 text-xs text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 border border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-800 transition-all text-left"
              >
                + {rule}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
