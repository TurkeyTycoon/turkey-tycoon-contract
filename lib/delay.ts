export default async function delay(timeoutMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeoutMs)
  })
}
