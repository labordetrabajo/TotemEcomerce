const {
  contextBridge,
  ipcRenderer,
} = require("electron");

contextBridge.exposeInMainWorld(
  "electronAPI",
  {
    isElectron: true,
  }
);

contextBridge.exposeInMainWorld(
  "totemSession",
  {
    get: () =>
      ipcRenderer.invoke(
        "totem-session:get"
      ),

    save: (session) =>
      ipcRenderer.invoke(
        "totem-session:save",
        session
      ),

    clear: () =>
      ipcRenderer.invoke(
        "totem-session:clear"
      ),
  }
);

contextBridge.exposeInMainWorld(
  "totemPrinter",
  {
    list: () =>
      ipcRenderer.invoke(
        "printer:list"
      ),

    printTicket: (ticket) =>
      ipcRenderer.invoke(
        "printer:print-ticket",
        ticket
      ),
  }
);
