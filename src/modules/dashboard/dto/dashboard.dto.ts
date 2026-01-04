import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty({
    description: 'Número total de clientes registrados en el sistema',
    example: 150,
  })
  totalClients: number;

  @ApiProperty({
    description: 'Número total de transacciones procesadas',
    example: 847,
  })
  totalTransactions: number;

  @ApiProperty({
    description: 'Total de puntos emitidos acumulados históricamente',
    example: 847,
  })
  totalPointsIssued: number;

  @ApiProperty({
    description: 'Lista de las 10 transacciones más recientes',
    example: [
      {
        _id: '507f1f77bcf86cd799439011',
        clientId: { name: 'Juan Pérez', dni: '11223344' },
        cashierId: { name: 'Cajero 1' },
        saleCode: 'SALE123',
        pointsAdded: 1,
        date: '2026-01-02T22:30:00.000Z',
        createdAt: '2026-01-02T22:30:00.000Z',
      },
    ],
  })
  recentTransactions: any[];
}
