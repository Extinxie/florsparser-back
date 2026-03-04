import { Module } from '@nestjs/common';
import { AnimesService } from './animes.service';
import { AnimesController } from './animes.controller';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [HttpModule.register({}), PrismaModule],
  controllers: [AnimesController],
  providers: [AnimesService],
})
export class AnimesModule {}
