import { Test, TestingModule } from '@nestjs/testing';
import { ClientCompaniesController } from './client-companies.controller';
import { ClientCompaniesService } from './client-companies.service';

describe('ClientCompaniesController', () => {
  let controller: ClientCompaniesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientCompaniesController],
      providers: [
        {
          provide: ClientCompaniesService,
          useValue: {}, // Mock vacío por ahora
        },
      ],
    }).compile();

    controller = module.get<ClientCompaniesController>(
      ClientCompaniesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
