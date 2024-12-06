import Turn from "node-turn";

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

