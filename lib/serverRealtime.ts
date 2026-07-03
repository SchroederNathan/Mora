// @supabase/realtime-js requires a WebSocket implementation at client
// construction time. Node < 22 (Metro server-route rendering, EAS export)
// has none, and realtime is never used server-side — hand it an inert
// transport so createClient doesn't throw during module evaluation.
class NoopWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3
  readyState = NoopWebSocket.CLOSED
  onopen: ((ev?: unknown) => void) | null = null
  onclose: ((ev?: unknown) => void) | null = null
  onerror: ((ev?: unknown) => void) | null = null
  onmessage: ((ev?: unknown) => void) | null = null
  send() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
}

export const serverRealtimeOptions =
  typeof WebSocket === 'undefined'
    ? { realtime: { transport: NoopWebSocket as any } }
    : {}
