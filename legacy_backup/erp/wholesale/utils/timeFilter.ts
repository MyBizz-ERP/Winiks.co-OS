export function getDateBounds(searchParams: { range?: string, date?: string }) {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    let start = new Date(today)

    if (searchParams.date) {
        // Specific user-selected Date
        start = new Date(searchParams.date)
        start.setHours(0, 0, 0, 0)
        today.setTime(start.getTime())
        today.setHours(23, 59, 59, 999)
    } else {
        const rangeStr = searchParams.range || 'TODAY'

        if (rangeStr === 'TODAY') {
            start.setHours(0, 0, 0, 0)
        } else if (rangeStr === '7D') {
            start.setDate(today.getDate() - 7)
            start.setHours(0, 0, 0, 0)
        } else if (rangeStr === '30D') {
            start.setDate(today.getDate() - 30)
            start.setHours(0, 0, 0, 0)
        } else if (rangeStr === '3M') {
            start.setMonth(today.getMonth() - 3)
            start.setHours(0, 0, 0, 0)
        } else if (rangeStr === '6M') {
            start.setMonth(today.getMonth() - 6)
            start.setHours(0, 0, 0, 0)
        } else if (rangeStr === '1Y') {
            start.setFullYear(today.getFullYear() - 1)
            start.setHours(0, 0, 0, 0)
        } else if (rangeStr === 'ALL') {
            start = new Date(0) // 1970
        }
    }

    return {
        startIso: start.toISOString(),
        endIso: today.toISOString()
    }
}
