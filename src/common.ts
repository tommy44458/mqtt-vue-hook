const eq = (filter: string, topic: string, handleSharedSubscription: boolean = false) => {
    const filterArray = filter.split('/')

    if (handleSharedSubscription && filterArray.length > 2 && filter.startsWith('$share/')) {
        filterArray.splice(0, 2)
    }

    const length = filterArray.length
    const topicArray = topic.split('/')

    for (let i = 0; i < length; ++i) {
        const left = filterArray[i]
        const right = topicArray[i]
        if (left === '#') return topicArray.length >= length - 1
        if (left !== '+' && left !== right) return false
    }

    return length === topicArray.length
}

const debugVoid = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
    log: (...data: any[]): void => {
        return
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
    error: (...data: any[]): void => {
        return
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
    warn: (...data: any[]): void => {
        return
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
    info: (...data: any[]): void => {
        return
    },
}

const debugConsole = console

const debug = () => {
    return process.env.NODE_ENV === 'production' ? debugVoid : debugConsole
}

export default { eq, debug }
