import { InvalidOidError } from '../errors/InvalidOidError.js'
import { GitSideBand } from '../models/GitSideBand.js'

export async function parseUploadPackResponse(stream) {
  const { packetlines, packfile, progress } = GitSideBand.demux(stream)

  const shallows = []
  const unshallows = []
  const acks = []
  let nak = false

  while (true) {
    const { value, done } = await packetlines.next()
    if (done === true) break
    if (value === null) continue
    if (value === undefined) continue
    const line = value.toString('utf8').replace(/\n$/, '')
    if (line.startsWith('shallow') && !line.startsWith('shallow-info')) {
      const oid = line.slice(-41).trim()
      if (oid.length !== 40) {
        throw new InvalidOidError(oid)
      }
      shallows.push(oid)
    } else if (line.startsWith('unshallow')) {
      const oid = line.slice(-41).trim()
      if (oid.length !== 40) {
        throw new InvalidOidError(oid)
      }
      unshallows.push(oid)
    } else if (line.startsWith('ACK')) {
      const [, oid, status] = line.split(' ')
      acks.push({ oid, status })
      if (!status) break
    } else if (line.startsWith('NAK')) {
      nak = true
      break
    }
  }
  return { shallows, unshallows, acks, nak, packfile, progress }
}
