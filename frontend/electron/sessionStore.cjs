const fs = require("fs");
const path = require("path");
const {
  app,
  safeStorage,
} = require("electron");

function getBasePath() {
  // Desarrollo
  if (!app.isPackaged) {
    return path.join(__dirname, "..");
  }

  // EXE portable
  return (
    process.env.PORTABLE_EXECUTABLE_DIR ||
    path.dirname(process.execPath)
  );
}

function getDataPath() {
  return path.join(
    getBasePath(),
    "data"
  );
}

function getSessionPath() {
  return path.join(
    getDataPath(),
    "session.json"
  );
}

function ensureDataFolder() {
  const dataPath = getDataPath();

  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, {
      recursive: true,
    });
  }
}

function saveSession(session) {
  ensureDataFolder();

  let token = session.token;
  let encrypted = false;

  if (
    token &&
    safeStorage.isEncryptionAvailable()
  ) {
    token = safeStorage
      .encryptString(token)
      .toString("base64");

    encrypted = true;
  }

  const data = {
    totem: session.totem,
    token,
    encrypted,
    savedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    getSessionPath(),
    JSON.stringify(data, null, 2),
    "utf8"
  );

  return true;
}

function getSession() {
  const sessionPath = getSessionPath();

  if (!fs.existsSync(sessionPath)) {
    return null;
  }

  try {
    const data = JSON.parse(
      fs.readFileSync(
        sessionPath,
        "utf8"
      )
    );

    let token = data.token;

    if (
      data.encrypted &&
      token &&
      safeStorage.isEncryptionAvailable()
    ) {
      token = safeStorage.decryptString(
        Buffer.from(token, "base64")
      );
    }

    return {
      totem: data.totem,
      token,
      savedAt: data.savedAt,
    };
  } catch (error) {
    console.error(
      "Error leyendo sesión:",
      error
    );

    return null;
  }
}

function clearSession() {
  const sessionPath = getSessionPath();

  if (fs.existsSync(sessionPath)) {
    fs.unlinkSync(sessionPath);
  }

  return true;
}

module.exports = {
  saveSession,
  getSession,
  clearSession,
};