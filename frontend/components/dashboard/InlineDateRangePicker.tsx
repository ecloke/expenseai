'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface InlineDateRangePickerProps {
  startDate: Date | null
  endDate: Date | null
  onDateChange: (startDate: Date | null, endDate: Date | null) => void
  className?: string
}

export function InlineDateRangePicker({ startDate, endDate, onDateChange, className = '' }: InlineDateRangePickerProps) {
  const [tempStartDate, setTempStartDate] = useState('')
  const [tempEndDate, setTempEndDate] = useState('')

  useEffect(() => {
    setTempStartDate(startDate ? format(startDate, 'yyyy-MM-dd') : '')
    setTempEndDate(endDate ? format(endDate, 'yyyy-MM-dd') : '')
  }, [startDate, endDate])

  const handleApply = () => {
    const start = tempStartDate ? new Date(tempStartDate) : null
    const end = tempEndDate ? new Date(tempEndDate) : null
    onDateChange(start, end)
  }

  const handleClear = () => {
    setTempStartDate('')
    setTempEndDate('')
    onDateChange(null, null)
  }

  const handlePresetRange = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days + 1)
    
    const startStr = format(start, 'yyyy-MM-dd')
    const endStr = format(end, 'yyyy-MM-dd')
    
    setTempStartDate(startStr)
    setTempEndDate(endStr)
    onDateChange(start, end)
  }

  return (
    <div className={`bg-gray-700 border border-gray-600 rounded-md shadow-lg p-4 ${className}`}>
      <div className="space-y-4">
        {/* Quick Presets */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Quick Select</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handlePresetRange(7)}
              className="px-2 py-1 text-xs bg-gray-600 text-gray-300 rounded hover:bg-gray-500 hover:text-white transition-colors"
            >
              Last 7 days
            </button>
            <button
              type="button"
              onClick={() => handlePresetRange(30)}
              className="px-2 py-1 text-xs bg-gray-600 text-gray-300 rounded hover:bg-gray-500 hover:text-white transition-colors"
            >
              Last 30 days
            </button>
            <button
              type="button"
              onClick={() => handlePresetRange(90)}
              className="px-2 py-1 text-xs bg-gray-600 text-gray-300 rounded hover:bg-gray-500 hover:text-white transition-colors"
            >
              Last 90 days
            </button>
            <button
              type="button"
              onClick={() => handlePresetRange(365)}
              className="px-2 py-1 text-xs bg-gray-600 text-gray-300 rounded hover:bg-gray-500 hover:text-white transition-colors"
            >
              Last year
            </button>
          </div>
        </div>
        
        <div className="border-t border-gray-600 pt-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
            <input
              type="date"
              value={tempStartDate}
              onChange={(e) => setTempStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
            />
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
            <input
              type="date"
              value={tempEndDate}
              onChange={(e) => setTempEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
            />
          </div>
        </div>
        <div className="flex justify-between gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1 text-sm text-gray-300 hover:text-white transition-colors"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}