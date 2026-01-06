import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceRequestsController } from './maintenance-requests.controller';

describe('MaintenanceRequestsController', () => {
  let controller: MaintenanceRequestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaintenanceRequestsController],
    }).compile();

    controller = module.get<MaintenanceRequestsController>(MaintenanceRequestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
