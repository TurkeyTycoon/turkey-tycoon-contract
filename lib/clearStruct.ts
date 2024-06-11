export default function clearStruct(data: any) {
  if (data && typeof data == 'object') {
    if ('toBigInt' in data) {
      return data.toBigInt()
    }

    var keys = Object.keys(data)
    var stringKeys = keys.filter((key) => !isFinite(key as any))
    if (stringKeys.length == 0) {
      var obj: any = []
      data.forEach((v: any) => obj.push(clearStruct(v)))
      return obj
    } else {
      var obj: any = {}
      stringKeys.forEach((key) => {
        obj[key] = clearStruct(data[key])
      })
      return obj
    }
  }
  return data
}
