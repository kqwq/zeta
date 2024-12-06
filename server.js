import Turn from "node-turn";


const listenToPort = 47777;
const server = new Turn({
  listeningPort: listenToPort,
  authMech: "long-term",
  credentials: {
    username: "password",
  },
});

server.onSdpPacket = async (contents) => {
    console.log("sdp", JSON.stringify(contents));
}

server.start();