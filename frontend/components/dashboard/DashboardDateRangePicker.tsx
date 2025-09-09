'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'

interface DashboardDateRangePickerProps {
  startDate: Date | null
  endDate: Date | null
  onDateChange: (startDate: Date | null, endDate: Date | null) => void
  className?: string
}

export function DashboardDateRangePicker({ startDate, endDate, onDateChange, className = '' }: DashboardDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempStartDate, setTempStartDate] = useState('')
  const [tempEndDate, setTempEndDate] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setTempStartDate(startDate ? format(startDate, 'yyyy-MM-dd') : '')
    setTempEndDate(endDate ? format(endDate, 'yyyy-MM-dd') : '')
  }, [startDate, endDate])

  const getDisplayText = () => {
    if (startDate && endDate) {
      return `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')}`
    } else if (startDate) {
      return `From ${format(startDate, 'MMM dd')}`
    } else if (endDate) {
      return `Until ${format(endDate, 'MMM dd')}`
    }
    return 'Select date range'
  }

  const handleApply = () => {
    const start = tempStartDate ? new Date(tempStartDate) : null
    const end = tempEndDate ? new Date(tempEndDate) : null
    onDateChange(start, end)
    setIsOpen(false)
  }

  const handleClear = () => {
    setTempStartDate('')
    setTempEndDate('')
    onDateChange(null, null)
    setIsOpen(false)
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
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md hover:bg-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className={startDate || endDate ? 'text-white' : 'text-gray-400'}>
            {getDisplayText()}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-72 sm:w-80 mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg p-4 right-0 sm:left-0">
          <div className="space-y-4">
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
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1 text-sm border border-gray-600 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
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
        </div>
      )}
    </div>
  )
}