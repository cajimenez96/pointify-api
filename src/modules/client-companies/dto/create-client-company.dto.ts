import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO para crear una relación Cliente-Empresa
 */
export class CreateClientCompanyDto {
  @IsNotEmpty()
  @IsString()
  clientId: string; // ObjectId del cliente (viene como string del body)

  // companyId NO va aquí porque viene del guard (req.companyId)
}
