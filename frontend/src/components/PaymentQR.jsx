import {
  useEffect,
  useRef,
  useState,
} from "react";
import { QRCodeSVG } from "qrcode.react";

import "./PaymentQR.css";

import { getQrPaymentStatus } from "../services/api";
import { useTotemAuth } from "../context/TotemAuthContext";

const QR_DURATION_SECONDS = 15 * 60;
const RETURN_TO_MENU_DELAY = 7000;

function PaymentQR({
  qrData,
  orderId,
  total,
  items = [],
  onCancel,
  onPaymentApproved,
}) {
  const { isElectron, totem } = useTotemAuth();

  const [paymentState, setPaymentState] = useState("waiting");
  const [statusError, setStatusError] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(
    QR_DURATION_SECONDS
  );

  const [printState, setPrintState] = useState("idle");
  const [printError, setPrintError] = useState("");

  // Evita que el polling imprima la misma orden más de una vez.
  const paidHandledRef = useRef(false);

  const formatPrice = (price) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(Number(price));

  const formatTime = (seconds) => {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (paymentState !== "waiting") {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [paymentState]);

  useEffect(() => {
    let isActive = true;
    let intervalId;
    let returnTimer;

    const finishApprovedPayment = async () => {
      // En navegador web no imprimimos localmente.
      if (
        !isElectron ||
        !window.totemPrinter?.printTicket
      ) {
        setPrintState("skipped");

        returnTimer = window.setTimeout(() => {
          onPaymentApproved();
        }, RETURN_TO_MENU_DELAY);

        return;
      }

      try {
        setPrintState("printing");
        setPrintError("");

        const printerName =
          import.meta.env.VITE_PRINTER_NAME?.trim();

        const printResult =
          await window.totemPrinter.printTicket({
            ...(printerName
              ? { deviceName: printerName }
              : {}),
            orderId,
            total,
            items,
            totemUsername: totem?.username || "",
            totemName: totem?.name || "",
            brandName:
              import.meta.env.VITE_BRAND_NAME ||
              "Punto Pedido",
          });

        if (!isActive) {
          return;
        }

        if (!printResult?.success) {
          throw new Error(
            printResult?.error ||
              "La impresora no pudo imprimir el ticket"
          );
        }

        setPrintState("printed");

        returnTimer = window.setTimeout(() => {
          onPaymentApproved();
        }, RETURN_TO_MENU_DELAY);
      } catch (error) {
        console.error(
          "Error imprimiendo ticket:",
          error
        );

        if (!isActive) {
          return;
        }

        setPrintState("error");
        setPrintError(
          error.message ||
            "No se pudo imprimir el ticket"
        );
      }
    };

    const checkPaymentStatus = async () => {
      try {
        const result = await getQrPaymentStatus(orderId);

        if (!isActive) {
          return;
        }

        setStatusError("");

        if (result.paid === true || result.status === "paid") {
          if (paidHandledRef.current) {
            return;
          }

          paidHandledRef.current = true;

          setPaymentState("approved");
          window.clearInterval(intervalId);

          await finishApprovedPayment();

          return;
        }

        const failedStatuses = [
          "cancelled",
          "canceled",
          "expired",
          "rejected",
          "refunded",
        ];

        if (
          failedStatuses.includes(result.status) ||
          failedStatuses.includes(result.paymentStatus)
        ) {
          setPaymentState(
            result.status === "expired" ? "expired" : "failed"
          );
          window.clearInterval(intervalId);
        }
      } catch (error) {
        console.error("Error consultando el pago:", error);

        if (isActive) {
          setStatusError(
            "No pudimos verificar el pago. Seguimos reintentando..."
          );
        }
      }
    };

    checkPaymentStatus();
    intervalId = window.setInterval(checkPaymentStatus, 3000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      window.clearTimeout(returnTimer);
    };
  }, [
    orderId,
    total,
    items,
    isElectron,
    totem,
    onPaymentApproved,
  ]);

  const handleCancel = async (options = {}) => {
    if (isCancelling) {
      return;
    }

    try {
      setIsCancelling(true);
      setStatusError("");
      await onCancel(options);
    } catch (error) {
      console.error("Error cancelando la orden:", error);
      setStatusError(
        error.message || "No se pudo cancelar la orden"
      );
    } finally {
      setIsCancelling(false);
    }
  };

  if (paymentState === "approved") {
    const isPrinting = printState === "printing";
    const printed = printState === "printed";
    const printFailed = printState === "error";

    return (
      <div className="payment-screen payment-success-screen">
        <div className="payment-result-card">
          <div className="payment-result-symbol success-symbol">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m5 12 4 4L19 6" />
            </svg>
          </div>

          <p className="payment-result-kicker">Todo listo</p>
          <h1>Pago aprobado</h1>

          {isPrinting && (
            <div className="ticket-print-message printing">
              <strong>IMPRIMIENDO TICKET...</strong>
              <span>
                Esperá tu comprobante antes de retirarte
              </span>
            </div>
          )}

          {printed && (
            <div className="ticket-print-message printed">
              <strong>✓ TICKET IMPRESO</strong>
              <span>
                Retirá tu comprobante
              </span>
            </div>
          )}

          {printFailed && (
            <>
              <div className="ticket-print-message print-error">
                <strong>
                  ⚠ NO SE PUDO IMPRIMIR
                </strong>
                <span>
                  El pago fue aprobado. Solicitá asistencia.
                </span>
              </div>

              {printError && (
                <div className="payment-status-error">
                  {printError}
                </div>
              )}

              <button
                type="button"
                className="payment-primary-button"
                onClick={onPaymentApproved}
              >
                Volver al menú
              </button>
            </>
          )}

          {printState === "skipped" && (
            <p className="payment-result-description">
              Tu pedido fue confirmado correctamente.
            </p>
          )}

          <div className="payment-order-pill">
            Orden #{orderId}
          </div>

          {(printed || printState === "skipped") && (
            <>
              <div className="return-progress">
                <span />
              </div>
              <p className="return-copy">
                Volviendo al menú en unos segundos...
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (
    paymentState === "failed" ||
    paymentState === "expired"
  ) {
    const expired = paymentState === "expired";

    return (
      <div className="payment-screen payment-failed-screen">
        <div className="payment-result-card">
          <div className="payment-result-symbol failed-symbol">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {expired ? (
                <>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </>
              ) : (
                <path d="M6 6l12 12M18 6 6 18" />
              )}
            </svg>
          </div>

          <p className="payment-result-kicker">
            {expired ? "Tiempo finalizado" : "Pago no completado"}
          </p>
          <h1>{expired ? "El QR venció" : "No se pudo pagar"}</h1>
          <p className="payment-result-description">
            {expired
              ? "Volvé al pedido para generar un nuevo código QR."
              : "La orden fue cancelada o no pudo completarse."}
          </p>

          <button
            type="button"
            className="payment-primary-button"
            onClick={() => handleCancel({ skipRemote: true })}
            disabled={isCancelling}
          >
            {isCancelling ? "Volviendo..." : "Volver al pedido"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-screen">
      <div className="payment-layout">
        <section className="payment-instructions">
          <div className="payment-brand-row">
            <div className="payment-brand-mark">PP</div>
            <div>
              <p>Pago seguro</p>
              <strong>Mercado Pago QR</strong>
            </div>
          </div>

          <div className="payment-title-block">
            <p className="payment-kicker">Último paso</p>
            <h1>Escaneá y pagá</h1>
            <p>
              Abrí Mercado Pago o tu aplicación bancaria y
              escaneá el código.
            </p>
          </div>

          <ol className="payment-steps">
            <li>
              <span>1</span>
              <div>
                <strong>Abrí la app</strong>
                <p>Ingresá a la opción de pagar con QR.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Escaneá el código</strong>
                <p>Apuntá la cámara hacia la pantalla.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Confirmá el pago</strong>
                <p>La pantalla se actualizará automáticamente.</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="payment-qr-card">
          <div className="payment-timer-row">
            <span>Tiempo disponible</span>
            <strong className={secondsLeft <= 60 ? "urgent" : ""}>
              {formatTime(secondsLeft)}
            </strong>
          </div>

          <div className="payment-qr-code">
            <QRCodeSVG
              value={qrData}
              size={360}
              level="M"
              marginSize={4}
            />
          </div>

          <div className="payment-total-block">
            <span>Total a pagar</span>
            <strong>{formatPrice(total)}</strong>
          </div>

          <div className="payment-order-number">
            Orden #{orderId}
          </div>

          <div className="payment-waiting-row">
            <span className="payment-pulse" />
            Esperando confirmación del pago
          </div>

          {statusError && (
            <div className="payment-status-error">
              {statusError}
            </div>
          )}

          <button
            type="button"
            className="payment-cancel-button"
            onClick={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling
              ? "Cancelando orden..."
              : "Cancelar y volver"}
          </button>
        </section>
      </div>
    </div>
  );
}

export default PaymentQR;
