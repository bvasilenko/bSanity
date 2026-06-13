import { handleBSanityProxyEvent, type ProxyHandlerEvent } from '../src/runtime/proxy.js'

export default async function handler(event: ProxyHandlerEvent) {
  const expectedCycleToken = process.env.BSANITY_CYCLE_TOKEN

  return handleBSanityProxyEvent(event, expectedCycleToken === undefined ? {} : { expectedCycleToken })
}
