import { IsString, IsNotEmpty, IsMongoId } from 'class-validator';

/**
 * DTO para canjear puntos (REDEEM)
 */
export class RedeemPointsDto {
  @IsString()
  @IsNotEmpty()
  dni: string; // DNI del cliente

  @IsMongoId()
  @IsNotEmpty()
  rewardId: string; // ID del premio a canjear (subdocumento en Settings.rewards)
}
