export function sqrt(value: bigint) {
  if (value < 0n) {
    throw new Error('value must greater or eq 0n')
  }

  if (value < 2) {
    return value
  }

  if (value <= 2n ** 52n) {
    return BigInt(Math.sqrt(Number(value)) | 0)
  }

  let x0 = 0n
  let x1 = 1n << BigInt(((value.toString().length + 1) / Math.log10(2) / 2) | 0)

  do {
    x0 = x1
    x1 = (value / x0 + x0) >> 1n
  } while (x0 !== x1 && x0 !== x1 - 1n)
  return x0
}
