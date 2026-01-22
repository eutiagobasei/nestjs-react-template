import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationGuard } from './guards/organization.guard';
import { JobsModule } from '../../jobs/jobs.module';

@Module({
  imports: [JobsModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationGuard],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
