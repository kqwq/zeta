import Turn from "node-turn";
import simpleGit from "simple-git";
import fs from "fs";


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
      onCompletedMessage(data, hash);
    } else if (requests[hash]) {
      if (requests[hash].addData(fragIndex, data)) {
        onCompletedMessage(requests[hash].data.join(""), hash);
        delete requests[hash];
      }
    } else {
      requests[hash] = new ZetaRequest(hash, fragIndex, parseInt(totalFrags), data);
    }
  }
}
turnServer.start();


async function onCompletedMessage(x, hash) {
  console.log("completed message", x);

  const obj = JSON.parse(x);
  const url = obj._;
  delete obj._;
  const res = await fetch(url, obj);
  const text = await res.text();
  console.log(text);

  fs.writeFileSync(`text/${hash}.js`, `onzetch(${JSON.stringify(text)});`);
  await simpleGit().add(`text/${hash}.js`).commit(`commit ${hash}`).push();
  // if (fs.existsSync(`text/${hash}.js`)) {
  //   fs.unlinkSync(`text/${hash}.js`);
  // }

  console.log("done"); 
}

