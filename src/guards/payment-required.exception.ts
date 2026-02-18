import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Excepción personalizada para suscripciones expiradas
 * HTTP 402 Payment Required
 */
export class PaymentRequiredException extends HttpException {
  constructor(message?: string) {
    super(
      message || 'Se requiere pago para continuar',
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
