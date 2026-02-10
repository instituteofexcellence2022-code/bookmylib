'use client'

import React, { isValidElement } from 'react'
import { AnimatedCard } from './AnimatedCard'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
    title: string
    value: string | number
    icon: React.ElementType | React.ReactNode
    color: 'blue' | 'green' | 'purple' | 'orange' | 'red'
    delay?: number
    trend?: string
    trendUp?: boolean
    loading?: boolean
    subValue?: string
    className?: string
    padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const StatCard = ({ title, value, icon, color, delay = 0, trend, trendUp, loading, subValue, className, padding = 'md' }: StatCardProps) => {
    const colorStyles: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
        green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
        orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
        red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    }

    if (loading) {
        return (
            <div className={`bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm animate-pulse ${className}`}>
                <div className="flex justify-between items-center">
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                    </div>
                    <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                </div>
            </div>
        )
    }

    return (
        <AnimatedCard delay={delay} className={className} padding={padding}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</h3>
                    {subValue && (
                        <p className="text-xs text-gray-400 mt-1">{subValue}</p>
                    )}
                    {trend && (
                        <div className="flex items-center mt-1 gap-1">
                            {trendUp === true ? (
                                <TrendingUp size={14} className="text-green-500" />
                            ) : trendUp === false ? (
                                <TrendingDown size={14} className="text-red-500" />
                            ) : (
                                <Minus size={14} className="text-gray-400" />
                            )}
                            <span className={`text-xs ${
                                trendUp === true ? 'text-green-500' : 
                                trendUp === false ? 'text-red-500' : 'text-gray-400'
                            }`}>
                                {trend}
                            </span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-xl ${colorStyles[color] || colorStyles.blue}`}>
                    {isValidElement(icon) ? icon : (() => {
                        const Icon = icon as React.ElementType
                        return <Icon size={24} />
                    })()}
                </div>
            </div>
        </AnimatedCard>
    )
}
