import { Controller, Get, Param } from '@nestjs/common';
import { VideosService } from './videos.service';

@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get('source/:translationId')
  async getVideoSource(@Param('translationId') translationId: string) {
    return this.videosService.getVideoSource(translationId);
  }
} 