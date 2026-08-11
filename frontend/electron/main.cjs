const {
  app,
  BrowserWindow,
  ipcMain,
} = require("electron");

const path = require("path");

const {
  saveSession,
  getSession,
  clearSession,
} = require("./sessionStore.cjs");

const isDev = !app.isPackaged;

let mainWindow;

// ================================
// IPC - SESIÓN DEL TÓTEM
// ================================

ipcMain.handle(
  "totem-session:get",
  () => {
    return getSession();
  }
);

ipcMain.handle(
  "totem-session:save",
  (event, session) => {
    return saveSession(session);
  }
);

ipcMain.handle(
  "totem-session:clear",
  () => {
    return clearSession();
  }
);

// ================================
// UTILIDADES DE IMPRESIÓN
// ================================

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPrice(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function buildTicketHtml(ticket) {
  const items = Array.isArray(ticket.items)
    ? ticket.items
    : [];

  const itemsHtml = items
    .map((item) => {
      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const subtotal = quantity * price;

      return `
        <div class="item">
          <div class="item-name">
            <strong>${quantity} x ${escapeHtml(item.name)}</strong>
          </div>
          <div class="item-line">
            <span>${formatPrice(price)} c/u</span>
            <strong>${formatPrice(subtotal)}</strong>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Ticket Orden ${escapeHtml(ticket.orderId)}</title>

        <style>
          @page {
            margin: 0;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #fff;
            color: #000;
            font-family:
              "Courier New",
              Courier,
              monospace;
          }

          body {
            width: 72mm;
            padding: 4mm 3mm 7mm;
            font-size: 12px;
            line-height: 1.35;
          }

          .center {
            text-align: center;
          }

          .brand {
            margin: 0;
            font-size: 20px;
            font-weight: 900;
          }

          .subtitle {
            margin: 2px 0 0;
            font-size: 11px;
          }

          .separator {
            margin: 10px 0;
            border-top: 1px dashed #000;
          }

          .meta {
            display: grid;
            gap: 3px;
          }

          .meta-row,
          .item-line,
          .total {
            display: flex;
            justify-content: space-between;
            gap: 8px;
          }

          .item {
            margin-bottom: 9px;
          }

          .item-name {
            margin-bottom: 2px;
          }

          .item-line {
            font-size: 11px;
          }

          .total {
            align-items: baseline;
            font-size: 17px;
            font-weight: 900;
          }

          .paid {
            margin-top: 12px;
            padding: 7px 5px;
            border: 2px solid #000;
            font-size: 14px;
            font-weight: 900;
            text-align: center;
          }

          .footer {
            margin-top: 12px;
            text-align: center;
            font-size: 10px;
          }
        </style>
      </head>

      <body>
        <div class="center">
          <h1 class="brand">
            ${escapeHtml(ticket.brandName || "PUNTO PEDIDO")}
          </h1>

          <p class="subtitle">
            Comprobante de pedido
          </p>
        </div>

        <div class="separator"></div>

        <div class="meta">
          <div class="meta-row">
            <span>Orden</span>
            <strong>#${escapeHtml(ticket.orderId)}</strong>
          </div>

          ${
            ticket.totemName
              ? `
                <div class="meta-row">
                  <span>Tótem</span>
                  <strong>${escapeHtml(ticket.totemName)}</strong>
                </div>
              `
              : ""
          }

          ${
            ticket.totemUsername
              ? `
                <div class="meta-row">
                  <span>Equipo</span>
                  <strong>${escapeHtml(ticket.totemUsername)}</strong>
                </div>
              `
              : ""
          }

          <div class="meta-row">
            <span>Fecha</span>
            <strong>${escapeHtml(
              new Date().toLocaleString("es-AR")
            )}</strong>
          </div>
        </div>

        <div class="separator"></div>

        ${itemsHtml}

        <div class="separator"></div>

        <div class="total">
          <span>TOTAL</span>
          <strong>${formatPrice(ticket.total)}</strong>
        </div>

        <div class="paid">
          PAGO APROBADO
        </div>

        <p class="footer">
          Conservá este ticket hasta retirar tu pedido.
        </p>
      </body>
    </html>
  `;
}

async function getAvailablePrinters() {
  if (!mainWindow) {
    return [];
  }

  const printers =
    await mainWindow.webContents.getPrintersAsync();

  return printers.map((printer) => ({
    name: printer.name,
    displayName:
      printer.displayName || printer.name,
    description:
      printer.description || "",
    status: printer.status,
    isDefault: printer.isDefault,
  }));
}

async function printTicket(ticket) {
  if (!ticket?.orderId) {
    throw new Error(
      "Falta el número de orden para imprimir"
    );
  }

  const printWindow = new BrowserWindow({
    show: false,
    width: 420,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    const html = buildTicketHtml(ticket);

    await printWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(
        html
      )}`
    );

    return await new Promise(
      (resolve, reject) => {
        const printOptions = {
          silent: true,
          printBackground: true,
        };

        if (ticket.deviceName) {
          printOptions.deviceName =
            ticket.deviceName;
        }

        printWindow.webContents.print(
          printOptions,
          (success, failureReason) => {
            if (!success) {
              reject(
                new Error(
                  failureReason ||
                    "La impresora rechazó el trabajo"
                )
              );
              return;
            }

            resolve({
              success: true,
            });
          }
        );
      }
    );
  } finally {
    if (!printWindow.isDestroyed()) {
      printWindow.close();
    }
  }
}

// ================================
// IPC - IMPRESORA
// ================================

ipcMain.handle(
  "printer:list",
  async () => {
    try {
      return {
        success: true,
        printers:
          await getAvailablePrinters(),
      };
    } catch (error) {
      console.error(
        "Error listando impresoras:",
        error
      );

      return {
        success: false,
        printers: [],
        error: error.message,
      };
    }
  }
);

ipcMain.handle(
  "printer:print-ticket",
  async (event, ticket) => {
    try {
      const result =
        await printTicket(ticket);

      return result;
    } catch (error) {
      console.error(
        "Error imprimiendo ticket:",
        error
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }
);

// ================================
// VENTANA PRINCIPAL
// ================================

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 1920,

    // Por ahora false para desarrollar.
    // Después el tótem abre fullscreen.
    fullscreen: false,

    autoHideMenuBar: true,

    webPreferences: {
      preload: path.join(
        __dirname,
        "preload.cjs"
      ),

      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // ================================
  // DESARROLLO
  // ================================

  if (isDev) {
    mainWindow.loadURL(
      "http://localhost:5173"
    );
  }

  // ================================
  // PRODUCCIÓN / EXE
  // ================================

  else {
    mainWindow.loadFile(
      path.join(
        __dirname,
        "../dist/index.html"
      )
    );
  }

  mainWindow.on(
    "closed",
    () => {
      mainWindow = null;
    }
  );
}

// ================================
// ELECTRON LISTO
// ================================

app.whenReady().then(() => {
  createWindow();

  app.on(
    "activate",
    () => {
      if (
        BrowserWindow.getAllWindows()
          .length === 0
      ) {
        createWindow();
      }
    }
  );
});

// ================================
// CERRAR APLICACIÓN
// ================================

app.on(
  "window-all-closed",
  () => {
    if (
      process.platform !== "darwin"
    ) {
      app.quit();
    }
  }
);
