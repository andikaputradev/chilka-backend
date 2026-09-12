import { Module } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { MaterialsController } from './materials.controller';

@Module({
  providers: [MaterialsService],
  controllers: [MaterialsController]
})
export class MaterialsModule {}
