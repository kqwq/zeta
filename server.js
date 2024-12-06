import Turn from "node-turn";
import { App } from 'uWebSockets.js'

const listenToPort = 47777;
const turnServer = new Turn({
  listeningPort: listenToPort,
  authMech: "long-term",
  credentials: {
    username: "password",
  },
});
turnServer.onSdpPacket = async (contents) => {
  console.log("sdp", JSON.stringify(contents));
}
turnServer.start();


const port = 48888;
const app = new App()

app
  .ws('/ws-zeta', {
    compression: 0,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 10,
    open: (ws) => {
      ws.subscribe('test1channel')
    },
    message: (ws, message, isBinary) => {
      try {
        const str = Buffer.from(message).toString()
        const data = JSON.parse(str)
        console.log("Data: ", data)
      } catch (error) {
        console.error('Error processing message:', error)
      }
    },
    close: (ws, code, message) => {
      console.log('A WebSocket was closed:', code, message)
      // app.publish('test1channel', JSON.stringify({ type: 'update-players', players: state.players }))
    },
  })
  .listen(port, (listenSocket) => {
    if (listenSocket) {
      console.log(`Started websocket server on port ${port}`)
    } else {
      console.error(`Failed to listen to websocket server on port ${port}`)
    }
  })
