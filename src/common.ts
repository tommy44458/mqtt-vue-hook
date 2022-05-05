export const eq = (str1: string, str2: string) => {
    let arr1 = str1.split('/')
    let arr2 = str2.split('/')
    if (!str1.includes('#') && !str2.includes('#') && arr1.length !== arr2.length) {
        return false
    }
    if (arr2.length < arr1.length) {
        arr2 = str1.split('/')
        arr1 = str2.split('/')
    }
    let ret = true
    arr1.forEach((val, i) => {
        if (val === '+' || val === '#'
            || (arr2[i] && arr2[i] === '+')
            || (arr2[i] && arr2[i] === '#')
            || (arr2[i] && arr2[i] === val)) {
            return
        }
        ret = false
    })
    return ret
}
