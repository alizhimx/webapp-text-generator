'use client'
import type { FC } from 'react'
import React, { useEffect, useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import Loading from '../loading'

export type ExcelPreviewProps = {
    url: string
    maxRows?: number
}

// 最大宽度限制（单位：像素，约等于 7cm）
const MAX_COLUMN_WIDTH_PX = 264 // 7cm ≈ 264px
// 估算每个字符的像素宽度（中文约 14px，英文约 8px，取平均值）
const AVG_CHAR_WIDTH_PX = 12

export const ExcelPreview: FC<ExcelPreviewProps> = ({ url, maxRows = 100 }) => {
    const [data, setData] = useState<any[][]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchExcel = async () => {
            try {
                const response = await fetch(url)
                if (!response.ok) {
                    setError('无法加载文件')
                    setLoading(false)
                    return
                }
                const arrayBuffer = await response.arrayBuffer()
                const workbook = XLSX.read(arrayBuffer, { type: 'array' })
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]
                setData(jsonData.slice(0, maxRows))
            }
            catch (err) {
                setError('解析表格失败')
            }
            finally {
                setLoading(false)
            }
        }

        if (url)
            fetchExcel()
    }, [url, maxRows])

    // 计算每列是否需要固定宽度（根据内容长度）
    const columnStyles = useMemo(() => {
        if (!data.length)
            return []

        const rows = data
        const colCount = rows[0]?.length || 0

        return Array.from({ length: colCount }, (_, colIdx) => {
            // 获取该列所有内容的最大长度
            let maxContentLength = 0
            for (const row of rows) {
                const cellContent = String(row[colIdx] || '')
                maxContentLength = Math.max(maxContentLength, cellContent.length)
            }

            // 估算所需像素宽度
            const estimatedWidth = maxContentLength * AVG_CHAR_WIDTH_PX

            // 如果超过最大宽度，则固定宽度并允许换行
            if (estimatedWidth > MAX_COLUMN_WIDTH_PX) {
                return {
                    width: `${MAX_COLUMN_WIDTH_PX}px`,
                    minWidth: `${MAX_COLUMN_WIDTH_PX}px`,
                    maxWidth: `${MAX_COLUMN_WIDTH_PX}px`,
                    whiteSpace: 'normal' as const,
                    wordBreak: 'break-all' as const,
                }
            }

            // 否则自适应，不换行
            return null
        })
    }, [data])

    if (loading) {
        return (
            <div className="py-4">
                <Loading type='area' />
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-sm text-red-500 py-4">
                {error}
            </div>
        )
    }

    if (!data.length)
        return null

    return (
        <div className="mt-4 overflow-auto max-h-[400px] border border-gray-200 rounded-lg">
            <table className="text-sm" style={{ tableLayout: 'fixed' }}>
                <thead className="bg-gray-50 sticky top-0">
                    <tr>
                        {data[0]?.map((cell, idx) => {
                            const style = columnStyles[idx]
                            return (
                                <th
                                    key={idx}
                                    className="px-3 py-2 text-left font-medium text-gray-700 border-b border-gray-200"
                                    style={style || { whiteSpace: 'nowrap' }}
                                >
                                    {cell}
                                </th>
                            )
                        })}
                    </tr>
                </thead>
                <tbody>
                    {data.slice(1).map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-gray-50">
                            {row.map((cell, cellIdx) => {
                                const style = columnStyles[cellIdx]
                                return (
                                    <td
                                        key={cellIdx}
                                        className="px-3 py-2 border-b border-gray-100 text-gray-600"
                                        style={style || { whiteSpace: 'nowrap' }}
                                    >
                                        {cell}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default ExcelPreview
