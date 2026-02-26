import { Test, TestingModule } from '@nestjs/testing';
import { ClientCompaniesService } from './client-companies.service';

describe('ClientCompaniesService', () => {
  let service: ClientCompaniesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ClientCompaniesService,
          useValue: {}, // Mock vacío por ahora
        },
      ],
    }).compile();

    service = module.get<ClientCompaniesService>(ClientCompaniesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
