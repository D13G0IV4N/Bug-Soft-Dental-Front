import axios from "axios";
import { toErrorMessage } from "../../api/appointments";

export function toDentistRequestError(error: unknown, fallbackMessage: string): string {
  const message = toErrorMessage(error, fallbackMessage);

  if (!axios.isAxiosError(error)) return message;

  const status = error.response?.status;
  const isAuthorizationStatus = status === 401 || status === 403;
  const isAuthorizationMessage = /no autorizado para este recurso/i.test(message);

  if (isAuthorizationMessage && !isAuthorizationStatus) {
    return fallbackMessage;
  }

  return message;
}
