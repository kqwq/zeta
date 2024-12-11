import Turn from "node-turn";
import fs from "fs";
import { createCanvas } from "canvas";


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
console.log("Listening on port", listenToPort);


let lastExecutionTime = 0;

let kaas = '-lQBVN8tUfuctm7y5opbXg';

function readableSize(size) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  while (size > 1024 && unitIndex < units.length) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

async function updateProgram(username, password, programId, title, textData) {

  // First, get a 2D context
  const enc = new TextEncoder();
  const inData = enc.encode(textData);
  const canvas = createCanvas(600, 600);
  const ctx = canvas.getContext("2d");
  const d = ctx.createImageData(600, 600);
  d.data.fill(255); // Fill with white

  // Write metadata (just length for now) to first row of canvas
  const metadata = new Uint8Array(600 * 3);
  metadata[0] = inData.length & 0xff;
  metadata[1] = (inData.length >> 8) & 0xff;
  metadata[2] = (inData.length >> 16) & 0xff;
  let n = 1;
  for (let b = 0; b < metadata.length; b++) {
    d.data[n - 1] = metadata[b];
    n++;
    if (n % 4 === 0) n++;
  }
  ctx.putImageData(d, 0, 0);

  // Write the text data to the canvas
  if (inData.length > 600 * 600 * 3) {
    throw new Error("Data too large to fit in canvas.");
  }
  n = 1;
  for (let b = 0; b < inData.length; b++) {
    d.data[n - 1] = inData[b];
    n++;
    if (n % 4 === 0) n++;
  }
  for (let i = 4 + 1; i < 600 * 1 * 4; i += 4) {
    d.data[i] = 255;   // Fill the rest green
  }
  ctx.putImageData(d, 0, 1);

  // Add a human-readable message
  ctx.font = "16px Arial";
  ctx.fillStyle = "black";
  const tag = `Zeta ${inData.length} ${readableSize(inData.length)} ${programId} 🕓${Math.floor(new Date().getTime() / 1000)} ${title}`;
  ctx.fillText(tag, 2, 600 - 5);

  // Convert the canvas to a data URL
  const du = canvas.toDataURL();
  const imageUrl = `data:image/png;base64,${du.split(",")[1]}`;
  console.log(imageUrl);

  const emptyImageUrl = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  // Login if KAAS is not set
  const fkey = 'lol';
  if (!kaas) {
    const loginRes = await fetch(
      "https://www.khanacademy.org/api/internal/graphql/loginWithPasswordMutation",
      {
        headers: {
          "Content-Type": "application/json",
          Cookie: `fkey=${fkey}`,
          "x-ka-fkey": fkey,
        },
        method: "POST",
        body: JSON.stringify({ "operationName": "loginWithPasswordMutation", "variables": { "identifier": username, "password": password }, "query": "mutation loginWithPasswordMutation($identifier: String!, $password: String!) {\n  loginWithPassword(identifier: $identifier, password: $password) {\n    user {\n      id\n      kaid\n      canAccessDistrictsHomepage\n      isTeacher\n      hasUnresolvedInvitations\n      preferredKaLocale {\n        id\n        kaLocale\n        status\n        __typename\n      }\n      __typename\n    }\n    isFirstLogin\n    error {\n      code\n      __typename\n    }\n    __typename\n  }\n}" }),
      }
    )
    const loginResCookies = loginRes.headers.get("set-cookie");
    let kaas = loginResCookies.match(/KAAS=([^;]+)/)?.[1];
    if (!kaas) {
      throw new Error(`Failed to login with username ${username} and password ********.`);
    } else {
      console.log("KAAS", kaas);
    }
  }

  // Update the program
  const udpateRes = await fetch(
    "https://www.khanacademy.org/api/internal/graphql/updateProgram",
    {
      headers: {
        "Content-Type": "application/json",
        Cookie: `fkey=${fkey};KAAS=${kaas}`,
        "x-ka-fkey": fkey,
      },
      body: JSON.stringify({
        "operationName": "updateProgram",
        "query": "mutation updateProgram($programId: ID!, $title: String, $revision: ProgramRevisionInput!) {\n  updateProgram(programId: $programId, title: $title, revision: $revision) {\n    program {\n      ...Program\n      __typename\n    }\n    error {\n      code\n      debugMessage\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment Program on Program {\n  id\n  latestRevision {\n    id\n    code\n    __typename\n  }\n  title\n  url\n  userAuthoredContentType\n  __typename\n}",
        "variables": {
          "programId": programId,
          "title": title,
          "revision": {
            "code": "// Multiplayer connector\n\n", "folds": [],
            "imageUrl": imageUrl,
            "configVersion": 0
          }
        }
      }),
      method: "POST",
    });
  const updateJson = await udpateRes.json();
  console.log(updateJson);
}

// const genesis = fs.readFileSync("genesis.txt", "utf-8");
// updateProgram("kqwq2", "FuckKhan", "5943507339362304", "Genesis", genesis);

async function onCompletedMessage(x, hash) {
  const currentTime = Date.now();
  if (currentTime - lastExecutionTime < 1000) {
    return;
  }
  lastExecutionTime = currentTime;

  console.log("completed message", x);

  const [programId, sdp] = x.split(" ", 2);

  updateProgram("kqwq2", "FuckKhan", programId, "Zeta Connect", sdp);

}

