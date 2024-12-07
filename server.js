import Turn from "node-turn";


class ZetaRequest {
  constructor(hash, fragIndex, totalFrags, data) {
    this.hash = hash;
    this.fragIndex = parseInt(fragIndex);
    this.completedFrags = 1;
    this.totalFrags = parseInt(totalFrags);
    this.data = []
    this.data[fragIndex] = data;
  }

  addData(fragIndex, data) {
    this.data[fragIndex] = data;
    this.completedFrags++;
    return this.completedFrags >= this.totalFrags;
  }
}

const requests = {}

const listenToPort = 47777;
const turnServer = new Turn({
  listeningPort: listenToPort,
  authMech: "long-term",
  credentials: {
    username: "password",
  },
});
turnServer.onSdpPacket = async (message) => {
  console.log("sdp", JSON.stringify(message));

  if (message.startsWith("ZETA ")) {
    const [protocol, hash, fragIndex, totalFrags, ...dataParts] = message.split(" ");
    const data = dataParts.join(" ");
    if (totalFrags == "1") {
      onCompletedMessage(data);
    } else if (requests[hash]) {
      if (requests[hash].addData(fragIndex, data)) {
        onCompletedMessage(requests[hash].data.join(""));
        delete requests[hash];
      }
    } else {
      requests[hash] = new ZetaRequest(hash, fragIndex, parseInt(totalFrags), data);
    }
  }
}
turnServer.start();

function onCompletedMessage(x) {
  console.log("completed message", x);
}
